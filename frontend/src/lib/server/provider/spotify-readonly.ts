import "server-only";

import type {
  AppShellStatus,
  DashboardLastRunView,
  RunDetailView,
  RunHistoryRowView,
  SettingsView,
  SetupStatusView,
  UnmatchedListView,
} from "@/lib/types";
import { getServerConfig } from "@/lib/server/config";
import {
  getAuthSessionRow,
  getDecryptedAuthSession,
  type StoredAuthEnvelope,
} from "@/lib/server/data/auth-sessions";
import {
  ensureUserSettingsRow,
  getSettingsViewFromSupabase,
  updateSettingsInSupabase,
} from "@/lib/server/data/user-settings";
import { fetchSpotifyLibrarySnapshot } from "@/lib/server/spotify/client";
import { getSupabaseAdminClient } from "@/lib/server/supabase/client";
import type { AppProvider } from "./types";

type RunRow = {
  id: string;
  run_kind: "snapshot_refresh" | "sync";
  triggered_by: "cron" | "manual" | "post_reauth" | "initial_setup";
  status: "running" | "completed" | "failed" | "partial";
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  summary: Record<string, unknown> | null;
  error_details: string | null;
  scraper_version: string | null;
};

type SnapshotRefreshSummary = {
  mode?: "spotify_readonly";
  source?: "spotify";
  playlists_scanned?: number;
  playlists_skipped?: number;
  spotify_total_songs?: number;
  spotify_total_playlists?: number;
  spotify_profile_name?: string | null;
  note?: string;
};

function getSummary(row: RunRow): SnapshotRefreshSummary {
  if (!row.summary || typeof row.summary !== "object") return {};
  return row.summary as SnapshotRefreshSummary;
}

function buildSnapshotRefreshSummaryLine(row: RunRow) {
  const summary = getSummary(row);

  if (row.status === "failed") {
    return `snapshot refresh failed${row.error_details ? ` · ${row.error_details}` : ""}`;
  }

  if (row.status === "running") {
    return "snapshot refresh running";
  }

  const playlists = summary.playlists_scanned ?? 0;
  const songs = summary.spotify_total_songs ?? 0;
  return `snapshot refresh · ${playlists} playlists · ${songs} songs`;
}

function toRunHistoryRow(row: RunRow): RunHistoryRowView {
  const summary = getSummary(row);
  return {
    id: row.id,
    startedAt: row.started_at,
    status: row.status,
    runKind: row.run_kind,
    summaryLine:
      row.run_kind === "snapshot_refresh"
        ? buildSnapshotRefreshSummaryLine(row)
        : "sync",
    durationSeconds: row.duration_seconds,
    counts: {
      addedToSpotify: 0,
      addedToApple: 0,
      unmatched: 0,
    },
    warning:
      row.status === "partial"
        ? (summary.note ?? "partial completion")
        : undefined,
    error: row.status === "failed" ? row.error_details ?? undefined : undefined,
  };
}

function toRunDetail(row: RunRow): RunDetailView {
  const summary = getSummary(row);
  return {
    id: row.id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.status,
    runKind: row.run_kind,
    durationSeconds: row.duration_seconds,
    triggeredBy: row.triggered_by,
    counts: { addedToSpotify: 0, addedToApple: 0, unmatched: 0 },
    addedToSpotify: [],
    addedToApple: [],
    unmatchedPreview: [],
    playlistsScanned: summary.playlists_scanned ?? 0,
    playlistsSkipped: summary.playlists_skipped ?? 0,
    notes: summary.note,
    error: row.status === "failed" ? row.error_details ?? undefined : undefined,
  };
}

function toDashboardLastRun(row: RunRow): DashboardLastRunView {
  return {
    runId: row.id,
    status: row.status,
    startedAt: row.started_at,
    durationSeconds: row.duration_seconds,
    counts: { addedToSpotify: 0, addedToApple: 0, unmatched: 0 },
    addedToSpotifyPreview: [],
    addedToApplePreview: [],
    unmatchedPreview: [],
    error: row.status === "failed" ? row.error_details ?? undefined : undefined,
  };
}

async function getRunRows(limit = 30) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sync_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load sync runs: ${error.message}`);
  }

  return (data ?? []) as RunRow[];
}

async function getLatestCompletedSnapshotRun() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sync_runs")
    .select("*")
    .eq("run_kind", "snapshot_refresh")
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load latest snapshot run: ${error.message}`);
  }

  return (data as RunRow | null) ?? null;
}

async function getLatestSnapshotRunAnyStatus() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sync_runs")
    .select("*")
    .eq("run_kind", "snapshot_refresh")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load latest snapshot run: ${error.message}`);
  }

  return (data as RunRow | null) ?? null;
}

function spotifyProfileNameFromEnvelope(envelope: StoredAuthEnvelope | null | undefined) {
  const meta = envelope?.meta;
  if (!meta || typeof meta !== "object") return undefined;
  const profile = (meta as Record<string, unknown>).profile;
  if (!profile || typeof profile !== "object") return undefined;
  const displayName = (profile as Record<string, unknown>).display_name;
  if (typeof displayName === "string" && displayName.trim()) return displayName;
  const id = (profile as Record<string, unknown>).id;
  if (typeof id === "string" && id.trim()) return id;
  return undefined;
}

async function getPendingUnmatchedCount() {
  const supabase = getSupabaseAdminClient();
  const [songs, playlists] = await Promise.all([
    supabase
      .from("unmatched_songs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("unmatched_playlists")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  if (songs.error) throw new Error(`Failed to count unmatched songs: ${songs.error.message}`);
  if (playlists.error) {
    throw new Error(`Failed to count unmatched playlists: ${playlists.error.message}`);
  }

  return (songs.count ?? 0) + (playlists.count ?? 0);
}

function assertReadOnlyGuard() {
  const config = getServerConfig();
  if (config.syncWriteEnabled) {
    throw new Error("SYNC_WRITE_ENABLED must remain false in spotify_readonly mode");
  }
}

async function createRunningSnapshotRun(triggeredBy: "manual" | "initial_setup") {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sync_runs")
    .insert({
      run_kind: "snapshot_refresh",
      triggered_by: triggeredBy,
      status: "running",
      summary: {
        mode: "spotify_readonly",
        source: "spotify",
        note: "Read-only snapshot refresh started",
      },
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create snapshot run: ${error.message}`);
  }

  return data as RunRow;
}

async function completeSnapshotRun(
  runId: string,
  startedAt: string,
  result: Awaited<ReturnType<typeof fetchSpotifyLibrarySnapshot>>,
) {
  const supabase = getSupabaseAdminClient();
  const now = new Date();

  const snapshotInsert = await supabase.from("snapshots").insert({
    service: "spotify",
    snapshot_data: result.snapshot,
  });

  if (snapshotInsert.error) {
    throw new Error(`Failed to insert spotify snapshot: ${snapshotInsert.error.message}`);
  }

  const registryRows = result.snapshot.playlists.map((playlist) => ({
    spotify_id: playlist.id,
    name: playlist.name,
    song_count_spotify: playlist.song_count,
    last_known_fingerprint_spotify: playlist.fingerprint,
  }));

  if (registryRows.length > 0) {
    const registryUpsert = await supabase
      .from("playlist_registry")
      .upsert(registryRows, { onConflict: "spotify_id" });
    if (registryUpsert.error) {
      throw new Error(`Failed to update playlist registry: ${registryUpsert.error.message}`);
    }
  }

  const durationSeconds = Math.max(
    1,
    Math.round((now.getTime() - Date.parse(startedAt)) / 1000),
  );
  const summary = {
    mode: "spotify_readonly",
    source: "spotify",
    playlists_scanned: result.playlistCount,
    playlists_skipped: 0,
    spotify_total_songs: result.totalSongs,
    spotify_total_playlists: result.playlistCount,
    spotify_profile_name: result.profile.display_name ?? result.profile.id,
    note: "Read-only validation mode: no playlist writes enabled",
  };

  const { data, error } = await supabase
    .from("sync_runs")
    .update({
      status: "completed",
      completed_at: now.toISOString(),
      duration_seconds: durationSeconds,
      summary,
    })
    .eq("id", runId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to complete snapshot run: ${error.message}`);
  }

  return data as RunRow;
}

async function failSnapshotRun(runId: string, errorMessage: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("sync_runs")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_details: errorMessage,
      summary: {
        mode: "spotify_readonly",
        source: "spotify",
        note: "Read-only validation mode: snapshot refresh failed",
      },
    })
    .eq("id", runId);

  if (error) {
    throw new Error(`Failed to fail snapshot run: ${error.message}`);
  }
}

async function runSpotifySnapshotRefresh(triggeredBy: "manual" | "initial_setup") {
  assertReadOnlyGuard();
  await ensureUserSettingsRow();

  const run = await createRunningSnapshotRun(triggeredBy);
  try {
    const snapshot = await fetchSpotifyLibrarySnapshot();
    const completed = await completeSnapshotRun(run.id, run.started_at, snapshot);
    return completed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "snapshot_refresh_failed";
    await failSnapshotRun(run.id, message);
    throw error;
  }
}

async function loadPlaylistRegistrySettings() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("playlist_registry")
    .select("id, name, is_excluded")
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    throw new Error(`Failed to read playlist registry: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: String((row as { id: unknown }).id),
    name: String((row as { name: unknown }).name ?? "Unknown playlist"),
    excluded: Boolean((row as { is_excluded: unknown }).is_excluded),
  }));
}

async function updatePlaylistRegistryExclusions(playlists: SettingsView["playlists"]) {
  if (!playlists.length) return;
  const supabase = getSupabaseAdminClient();
  for (const playlist of playlists) {
    if (!playlist.id) continue;
    const { error } = await supabase
      .from("playlist_registry")
      .update({ is_excluded: playlist.excluded })
      .eq("id", playlist.id);
    if (error) {
      throw new Error(`Failed to update playlist exclusion: ${error.message}`);
    }
  }
}

function emptyUnmatched(filters: UnmatchedListView["filters"], runs: RunHistoryRowView[]): UnmatchedListView {
  return {
    songs: { pending: [], dismissed: [] },
    playlists: { pending: [], dismissed: [] },
    counts: { pendingSongs: 0, pendingPlaylists: 0 },
    filters,
    filterOptions: {
      playlists: [],
      runs: runs.map((run) => ({
        id: run.id,
        label: `${new Date(run.startedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} · ${new Date(run.startedAt).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })} · ${run.status}`,
      })),
    },
  };
}

export const spotifyReadonlyProvider: AppProvider = {
  async getAppShellStatusView() {
    const [spotifySession, unmatchedCount] = await Promise.all([
      getAuthSessionRow("spotify"),
      getPendingUnmatchedCount().catch(() => 0),
    ]);

    let spotifyAuth: AppShellStatus["spotifyAuth"] = "missing";
    if (spotifySession) {
      spotifyAuth = spotifySession.is_valid ? "healthy" : "invalid";
    }

    return {
      spotifyAuth,
      appleAuth: "missing",
      pendingUnmatchedCount: unmatchedCount,
      backendMode: "spotify_readonly",
      readOnlyMode: true,
    };
  },

  async getDashboardView(limit = 30) {
    const runs = await getRunRows(limit);
    const latest = runs[0] ?? null;
    const setup = await this.getSetupStatusView();

    return {
      lastRun: latest ? toDashboardLastRun(latest) : null,
      history: runs.map(toRunHistoryRow),
      setupRequired: !setup.setupComplete,
      backendMode: "spotify_readonly",
      readOnlyMode: true,
      primaryActionLabel: "Refresh Snapshot",
      modeBannerNote: "Read-only validation mode: no playlist writes enabled.",
    };
  },

  async listRuns(limit = 30) {
    const runs = await getRunRows(limit);
    return { runs: runs.map(toRunHistoryRow) };
  },

  async getRunDetailView(id: string) {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("sync_runs")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to load run detail: ${error.message}`);
    }
    return data ? toRunDetail(data as RunRow) : null;
  },

  async getSetupStatusView() {
    const [spotifySession, latestAny, latestCompleted] = await Promise.all([
      getDecryptedAuthSession<StoredAuthEnvelope>("spotify"),
      getLatestSnapshotRunAnyStatus().catch(() => null),
      getLatestCompletedSnapshotRun().catch(() => null),
    ]);

    const spotifyConnected = Boolean(spotifySession?.is_valid);
    const spotifyProfileName = spotifyProfileNameFromEnvelope(spotifySession?.decrypted);

    let initialScanStatus: SetupStatusView["initialScanStatus"] = "not_started";
    let stageLabel: string | null = null;
    let initialScanRunId: string | null = null;

    if (latestAny) {
      initialScanRunId = latestAny.id;
      if (latestAny.status === "running") {
        initialScanStatus = "running";
        stageLabel = "Scanning Spotify playlists";
      } else if (latestAny.status === "failed") {
        initialScanStatus = "failed";
        stageLabel = latestAny.error_details ?? "Failed";
      } else if (latestAny.status === "completed" || latestAny.status === "partial") {
        initialScanStatus = "completed";
        const summary = getSummary(latestAny);
        stageLabel =
          typeof summary.spotify_total_playlists === "number"
            ? `Imported ${summary.spotify_total_playlists} playlists`
            : "Completed";
      }
    }

    return {
      spotifyConnected,
      appleConnected: false,
      initialScanStatus,
      initialScanRunId,
      stageLabel,
      setupComplete: spotifyConnected && Boolean(latestCompleted),
      mode: "spotify_readonly",
      readOnlyMode: true,
      appleDeferred: true,
      spotifyProfileName,
    };
  },

  async connectSpotify() {
    // In real mode the UI uses /auth/spotify. Keep this endpoint shape-compatible.
    return this.getSetupStatusView();
  },

  async connectApple() {
    // Apple is explicitly deferred in this PR.
    return this.getSetupStatusView();
  },

  async startInitialScan() {
    const setup = await this.getSetupStatusView();
    if (!setup.spotifyConnected) {
      return setup;
    }

    await runSpotifySnapshotRefresh("initial_setup");
    return this.getSetupStatusView();
  },

  async triggerManualSync() {
    const completed = await runSpotifySnapshotRefresh("manual");
    return { queued: true, run: toRunHistoryRow(completed) };
  },

  async getUnmatchedListView(query = {}) {
    const runs = (await this.listRuns(30)).runs;
    const filters: UnmatchedListView["filters"] = {
      sourceService: query.sourceService ?? "all",
      playlist: query.playlist ?? "all",
      runId: query.runId ?? "all",
      sort: query.sort ?? "newest",
      status: query.status ?? "all",
    };
    return emptyUnmatched(filters, runs);
  },

  async applyBestGuessForUnmatchedSong() {
    return { ok: false as const, error: "not_found" };
  },

  async dismissUnmatchedSong() {
    return { ok: false as const, error: "not_found" };
  },

  async dismissUnmatchedPlaylist() {
    return { ok: false as const, error: "not_found" };
  },

  async getSettingsView() {
    const view = await getSettingsViewFromSupabase();
    view.playlists = await loadPlaylistRegistrySettings();
    return view;
  },

  async updateSettings(payload) {
    const updated = await updateSettingsInSupabase(payload);
    if (Array.isArray(payload.playlists)) {
      await updatePlaylistRegistryExclusions(payload.playlists);
    }
    updated.playlists = await loadPlaylistRegistrySettings();
    return updated;
  },
};
