import type {
  AppShellStatus,
  DashboardView,
  RunCounts,
  RunDetailView,
  RunHistoryRowView,
  RunPreviewItem,
  SettingsView,
  SetupScanStatus,
  SetupStatusView,
  SourceService,
  SyncRunStatus,
  TriggeredBy,
  UnmatchedCandidate,
  UnmatchedListView,
  UnmatchedPlaylistCardView,
  UnmatchedSongCardView,
} from "@/lib/types";

type MockRunRecord = {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: SyncRunStatus;
  triggeredBy: TriggeredBy;
  durationSeconds: number | null;
  counts: RunCounts;
  addedToSpotify: RunPreviewItem[];
  addedToApple: RunPreviewItem[];
  unmatchedPreview: RunPreviewItem[];
  playlistsScanned: number;
  playlistsSkipped: number;
  warning?: string;
  error?: string;
  notes?: string;
};

type MockSetupState = {
  spotifyConnected: boolean;
  appleConnected: boolean;
  initialScanStatus: SetupScanStatus;
  initialScanRunId: string | null;
  stageLabel: string | null;
  initialScanStartedAtMs: number | null;
  initialScanRunningAtMs: number | null;
  initialScanCompleteAtMs: number | null;
};

type MockPlaylistSetting = { id: string; name: string; excluded: boolean };

type MockSong = UnmatchedSongCardView;
type MockPlaylist = UnmatchedPlaylistCardView;

type SyncSimulation = {
  runId: string;
  completeAtMs: number;
  templateIndex: number;
};

type MockState = {
  nextId: number;
  setup: MockSetupState;
  runs: MockRunRecord[];
  unmatchedSongs: MockSong[];
  unmatchedPlaylists: MockPlaylist[];
  settings: SettingsView;
  syncSimulation: SyncSimulation | null;
};

type UnmatchedQuery = {
  status?: "all" | "pending" | "dismissed";
  sourceService?: "all" | SourceService;
  playlist?: string;
  runId?: string;
  sort?: "newest" | "oldest" | "playlist" | "reason";
};

const STATE_KEY = "__musicsynk_mock_state__";

const manualSyncTemplates = [
  {
    counts: { addedToSpotify: 3, addedToApple: 1, unmatched: 2 },
    addedToSpotify: [
      { title: "Too Sweet", artist: "Hozier", playlist: "Late Night Drives", confidence: 0.98 },
      { title: "Birds of a Feather", artist: "Billie Eilish", playlist: "2024 Favs", confidence: 0.95 },
      { title: "Timeless", artist: "The Weeknd", playlist: "Rap Rotation", confidence: 0.91 },
    ],
    addedToApple: [
      { title: "Pink + White", artist: "Frank Ocean", playlist: "Night Mix", confidence: 0.96 },
    ],
    unmatchedPreview: [
      { title: "Obscure Track", artist: "Unknown Artist", playlist: "Late Night Drives" },
      { title: "Live at the Apollo", artist: "James Brown", playlist: "Classics" },
    ],
    warning: undefined,
    error: undefined,
  },
  {
    counts: { addedToSpotify: 0, addedToApple: 0, unmatched: 0 },
    addedToSpotify: [],
    addedToApple: [],
    unmatchedPreview: [],
    warning: undefined,
    error: undefined,
  },
];

function makeRun(
  id: string,
  status: SyncRunStatus,
  triggeredBy: TriggeredBy,
  startedAt: string,
  durationSeconds: number | null,
  counts: RunCounts,
  details?: Partial<MockRunRecord>,
): MockRunRecord {
  const startedAtMs = Date.parse(startedAt);
  const completedAt =
    durationSeconds && status !== "running"
      ? new Date(startedAtMs + durationSeconds * 1000).toISOString()
      : status === "running"
        ? null
        : details?.completedAt ?? null;

  return {
    id,
    startedAt,
    completedAt,
    status,
    triggeredBy,
    durationSeconds,
    counts,
    addedToSpotify: details?.addedToSpotify ?? [],
    addedToApple: details?.addedToApple ?? [],
    unmatchedPreview: details?.unmatchedPreview ?? [],
    playlistsScanned: details?.playlistsScanned ?? 3,
    playlistsSkipped: details?.playlistsSkipped ?? 9,
    warning: details?.warning,
    error: details?.error,
    notes: details?.notes,
  };
}

function seedRuns(): MockRunRecord[] {
  return [
    makeRun(
      "run_20260223_0001",
      "completed",
      "cron",
      "2026-02-23T00:01:00.000Z",
      102,
      { addedToSpotify: 3, addedToApple: 1, unmatched: 2 },
      {
        addedToSpotify: [
          { title: "Too Sweet", artist: "Hozier", playlist: "Late Night Drives", confidence: 0.98 },
          { title: "Birds of a Feather", artist: "Billie Eilish", playlist: "2024 Favs", confidence: 0.95 },
          { title: "Good Luck, Babe!", artist: "Chappell Roan", playlist: "2024 Favs", confidence: 0.92 },
        ],
        addedToApple: [
          { title: "Timeless", artist: "The Weeknd", playlist: "Rap Rotation", confidence: 0.91 },
        ],
        unmatchedPreview: [
          { title: "Obscure Track", artist: "Unknown Artist", playlist: "Late Night Drives" },
          { title: "Live at the Apollo", artist: "James Brown", playlist: "Classics" },
        ],
      },
    ),
    makeRun("run_20260222_0001", "completed", "cron", "2026-02-22T00:01:00.000Z", 38, {
      addedToSpotify: 0,
      addedToApple: 0,
      unmatched: 0,
    }),
    makeRun("run_20260221_0001", "completed", "cron", "2026-02-21T00:01:00.000Z", 41, {
      addedToSpotify: 0,
      addedToApple: 0,
      unmatched: 0,
    }),
    makeRun(
      "run_20260220_0001",
      "partial",
      "cron",
      "2026-02-20T00:01:00.000Z",
      55,
      { addedToSpotify: 1, addedToApple: 0, unmatched: 0 },
      { warning: "Apple auth warning" },
    ),
    makeRun("run_20260219_0001", "completed", "cron", "2026-02-19T00:01:00.000Z", 89, {
      addedToSpotify: 5,
      addedToApple: 0,
      unmatched: 0,
    }),
    makeRun(
      "run_20260218_0001",
      "failed",
      "cron",
      "2026-02-18T00:01:00.000Z",
      22,
      { addedToSpotify: 0, addedToApple: 0, unmatched: 0 },
      { error: "selector 'song_title' broke" },
    ),
  ];
}

function seedUnmatchedSongs(): MockSong[] {
  return [
    {
      id: "ums_1",
      sourceService: "apple_music",
      sourceId: "am_001",
      title: "Obscure Track",
      artist: "Some Artist",
      album: "Album Name",
      playlistName: "Late Night Drives",
      reason: "no_results",
      reasonLabel: "no results found on Spotify",
      bestCandidate: null,
      status: "pending",
      syncRunId: "run_20260223_0001",
      createdAt: "2026-02-23T00:01:40.000Z",
    },
    {
      id: "ums_2",
      sourceService: "apple_music",
      sourceId: "am_002",
      title: "Live at the Apollo",
      artist: "James Brown",
      album: "Live Album",
      playlistName: "Classics",
      reason: "low_confidence",
      reasonLabel: "low confidence (best match: 61%)",
      bestCandidate: {
        id: "sp_002_guess",
        title: "Live at the Apollo",
        artist: "James Brown",
        album: "Studio Version",
        confidence: 0.61,
        year: 1962,
      },
      status: "pending",
      syncRunId: "run_20260223_0001",
      createdAt: "2026-02-23T00:01:41.000Z",
    },
    {
      id: "ums_3",
      sourceService: "spotify",
      sourceId: "sp_003",
      title: "Bedroom Demo",
      artist: "Indie Kid",
      album: "B-Sides",
      playlistName: "Rough Cuts",
      reason: "multiple_ambiguous",
      reasonLabel: "multiple ambiguous matches",
      bestCandidate: {
        id: "am_guess_3",
        title: "Bedroom Demo",
        artist: "Indie Kid",
        album: "Bedroom Demo - Single",
        confidence: 0.78,
      },
      status: "dismissed",
      syncRunId: "run_20260219_0001",
      createdAt: "2026-02-19T00:02:01.000Z",
    },
  ];
}

function seedUnmatchedPlaylists(): MockPlaylist[] {
  return [
    {
      id: "ump_1",
      sourceService: "spotify",
      sourceId: "sp_pl_1",
      playlistName: "Gym Rotation 2026",
      songCount: 28,
      reasonLabel: "name match ambiguous across multiple playlists",
      status: "pending",
      syncRunId: "run_20260223_0001",
      createdAt: "2026-02-23T00:01:39.000Z",
    },
    {
      id: "ump_2",
      sourceService: "apple_music",
      sourceId: "am_pl_2",
      playlistName: "Old Imports",
      songCount: 11,
      reasonLabel: "user dismissed",
      status: "dismissed",
      syncRunId: "run_20260220_0001",
      createdAt: "2026-02-20T00:01:20.000Z",
    },
  ];
}

function seedSettings(): SettingsView {
  const playlists: MockPlaylistSetting[] = [
    { id: "pl_1", name: "Late Night Drives", excluded: false },
    { id: "pl_2", name: "2024 Favs", excluded: false },
    { id: "pl_3", name: "Rap Rotation", excluded: false },
    { id: "pl_4", name: "Classics", excluded: false },
    { id: "pl_5", name: "Gym Rotation 2026", excluded: true },
  ];

  return {
    notifications: {
      success: true,
      failure: true,
      reauth: true,
    },
    matchThreshold: 0.85,
    playlists,
  };
}

function createInitialState(): MockState {
  return {
    nextId: 200,
    setup: {
      spotifyConnected: false,
      appleConnected: false,
      initialScanStatus: "not_started",
      initialScanRunId: null,
      stageLabel: null,
      initialScanStartedAtMs: null,
      initialScanRunningAtMs: null,
      initialScanCompleteAtMs: null,
    },
    runs: seedRuns(),
    unmatchedSongs: seedUnmatchedSongs(),
    unmatchedPlaylists: seedUnmatchedPlaylists(),
    settings: seedSettings(),
    syncSimulation: null,
  };
}

function getState(): MockState {
  const globalRef = globalThis as typeof globalThis & {
    [STATE_KEY]?: MockState;
  };

  if (!globalRef[STATE_KEY]) {
    globalRef[STATE_KEY] = createInitialState();
  }

  return globalRef[STATE_KEY]!;
}

function formatDateLabel(isoString: string) {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatTimeLabel(isoString: string) {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function createRunSummaryLine(run: MockRunRecord) {
  if (run.status === "failed") {
    return `failed${run.error ? ` · ${run.error}` : ""}`;
  }

  if (run.status === "partial") {
    return `partial${run.warning ? ` · ${run.warning}` : ""}`;
  }

  if (
    run.counts.addedToSpotify === 0 &&
    run.counts.addedToApple === 0 &&
    run.counts.unmatched === 0
  ) {
    return "0 changes";
  }

  const parts: string[] = [];
  if (run.counts.addedToSpotify > 0) parts.push(`${run.counts.addedToSpotify} -> Spotify`);
  if (run.counts.addedToApple > 0) parts.push(`${run.counts.addedToApple} -> Apple`);
  if (run.counts.unmatched > 0) parts.push(`${run.counts.unmatched} unmatched`);
  return parts.join(" · ");
}

function createRunHistoryRow(run: MockRunRecord): RunHistoryRowView {
  return {
    id: run.id,
    startedAt: run.startedAt,
    status: run.status,
    summaryLine: createRunSummaryLine(run),
    durationSeconds: run.durationSeconds,
    counts: run.counts,
    warning: run.warning,
    error: run.error,
  };
}

function createRunDetail(run: MockRunRecord): RunDetailView {
  return {
    id: run.id,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    status: run.status,
    durationSeconds: run.durationSeconds,
    triggeredBy: run.triggeredBy,
    counts: run.counts,
    addedToSpotify: run.addedToSpotify,
    addedToApple: run.addedToApple,
    unmatchedPreview: run.unmatchedPreview,
    playlistsScanned: run.playlistsScanned,
    playlistsSkipped: run.playlistsSkipped,
    notes: run.notes,
    warning: run.warning,
    error: run.error,
  };
}

function setupComplete(state: MockState) {
  return (
    state.setup.spotifyConnected &&
    state.setup.appleConnected &&
    state.setup.initialScanStatus === "completed"
  );
}

function deriveAppShellStatus(state: MockState): AppShellStatus {
  const pendingSongs = state.unmatchedSongs.filter((song) => song.status === "pending").length;
  const pendingPlaylists = state.unmatchedPlaylists.filter(
    (playlist) => playlist.status === "pending",
  ).length;

  const spotifyAuth = state.setup.spotifyConnected ? "healthy" : "missing";
  const appleAuth = state.setup.appleConnected ? "healthy" : "missing";

  return {
    spotifyAuth,
    appleAuth,
    pendingUnmatchedCount: pendingSongs + pendingPlaylists,
  };
}

function advanceInitialScan(state: MockState) {
  const now = Date.now();
  if (state.setup.initialScanStatus === "queued") {
    if (state.setup.initialScanRunningAtMs && now >= state.setup.initialScanRunningAtMs) {
      state.setup.initialScanStatus = "running";
      state.setup.stageLabel = "Scanning Apple Music playlists";
    } else {
      state.setup.stageLabel = "Queued";
    }
  }

  if (state.setup.initialScanStatus === "running") {
    const start = state.setup.initialScanRunningAtMs ?? now;
    const elapsed = now - start;

    if (elapsed > 1400) {
      state.setup.stageLabel = "Comparing libraries";
    } else if (elapsed > 700) {
      state.setup.stageLabel = "Scanning Spotify playlists";
    } else {
      state.setup.stageLabel = "Scanning Apple Music playlists";
    }

    if (state.setup.initialScanCompleteAtMs && now >= state.setup.initialScanCompleteAtMs) {
      state.setup.initialScanStatus = "completed";
      state.setup.stageLabel = "Completed";

      if (state.setup.initialScanRunId) {
        const run = state.runs.find((item) => item.id === state.setup.initialScanRunId);
        if (run && run.status === "running") {
          run.status = "completed";
          run.completedAt = new Date(now).toISOString();
          run.durationSeconds = Math.max(
            1,
            Math.round((now - Date.parse(run.startedAt)) / 1000),
          );
          run.counts = { addedToSpotify: 0, addedToApple: 0, unmatched: 0 };
          run.notes = "Initial library scan completed";
          run.playlistsScanned = 12;
          run.playlistsSkipped = 0;
        }
      }
    }
  }
}

function createSimulatedUnmatchedSong(runId: string, suffix: number): MockSong {
  const candidates: UnmatchedCandidate[] = [
    {
      id: `sp_guess_${suffix}`,
      title: "Studio Version",
      artist: "Some Band",
      album: "Anniversary Edition",
      confidence: 0.62,
      year: 2011,
    },
    {
      id: `am_guess_${suffix}`,
      title: "Alt Mix",
      artist: "Unknown Artist",
      album: "Collector Cuts",
      confidence: 0.58,
    },
  ];

  return {
    id: `ums_sim_${suffix}`,
    sourceService: suffix % 2 === 0 ? "apple_music" : "spotify",
    sourceId: `src_${suffix}`,
    title: suffix % 2 === 0 ? "Live Version" : "Obscure B-Side",
    artist: suffix % 2 === 0 ? "Some Band" : "Unknown Artist",
    album: suffix % 2 === 0 ? "Live Album" : "Deep Cuts",
    playlistName: suffix % 2 === 0 ? "Classics" : "Late Night Drives",
    reason: "low_confidence",
    reasonLabel: "low confidence (best match: 62%)",
    bestCandidate: candidates[0],
    status: "pending",
    syncRunId: runId,
    createdAt: new Date().toISOString(),
  };
}

function completeManualSync(state: MockState) {
  if (!state.syncSimulation) return;

  const now = Date.now();
  const run = state.runs.find((item) => item.id === state.syncSimulation?.runId);
  if (!run || run.status !== "running") {
    state.syncSimulation = null;
    return;
  }

  const template =
    manualSyncTemplates[state.syncSimulation.templateIndex % manualSyncTemplates.length];

  run.status = "completed";
  run.completedAt = new Date(now).toISOString();
  run.durationSeconds = Math.max(1, Math.round((now - Date.parse(run.startedAt)) / 1000));
  run.counts = template.counts;
  run.addedToSpotify = template.addedToSpotify;
  run.addedToApple = template.addedToApple;
  run.unmatchedPreview = template.unmatchedPreview;
  run.playlistsScanned = template.counts.addedToSpotify === 0 && template.counts.addedToApple === 0 ? 1 : 3;
  run.playlistsSkipped = 9;
  run.warning = template.warning;
  run.error = template.error;

  if (template.counts.unmatched > 0) {
    state.unmatchedSongs.unshift(createSimulatedUnmatchedSong(run.id, state.nextId++));
  }

  state.syncSimulation = null;
}

function advanceManualSync(state: MockState) {
  if (!state.syncSimulation) return;

  const now = Date.now();
  if (now >= state.syncSimulation.completeAtMs) {
    completeManualSync(state);
  }
}

function advanceSimulations(state: MockState) {
  advanceInitialScan(state);
  advanceManualSync(state);
}

export function getAppShellStatusView(): AppShellStatus {
  const state = getState();
  advanceSimulations(state);
  return deriveAppShellStatus(state);
}

export function getDashboardView(limit = 30): DashboardView {
  const state = getState();
  advanceSimulations(state);
  const [lastRun] = state.runs;

  return {
    lastRun: lastRun
      ? {
          runId: lastRun.id,
          status: lastRun.status,
          startedAt: lastRun.startedAt,
          durationSeconds: lastRun.durationSeconds,
          counts: lastRun.counts,
          addedToSpotifyPreview: lastRun.addedToSpotify.slice(0, 2),
          addedToApplePreview: lastRun.addedToApple.slice(0, 2),
          unmatchedPreview: lastRun.unmatchedPreview.slice(0, 2),
          warning: lastRun.warning,
          error: lastRun.error,
        }
      : null,
    history: state.runs.slice(0, limit).map(createRunHistoryRow),
    setupRequired: !setupComplete(state),
  };
}

export function listRuns(limit = 30): { runs: RunHistoryRowView[] } {
  const state = getState();
  advanceSimulations(state);
  return { runs: state.runs.slice(0, limit).map(createRunHistoryRow) };
}

export function getRunDetailView(id: string): RunDetailView | null {
  const state = getState();
  advanceSimulations(state);
  const run = state.runs.find((item) => item.id === id);
  return run ? createRunDetail(run) : null;
}

export function getSetupStatusView(): SetupStatusView {
  const state = getState();
  advanceSimulations(state);

  return {
    spotifyConnected: state.setup.spotifyConnected,
    appleConnected: state.setup.appleConnected,
    initialScanStatus: state.setup.initialScanStatus,
    initialScanRunId: state.setup.initialScanRunId,
    stageLabel: state.setup.stageLabel,
    setupComplete: setupComplete(state),
  };
}

export function mockConnectSpotify() {
  const state = getState();
  advanceSimulations(state);
  state.setup.spotifyConnected = true;
  return getSetupStatusView();
}

export function mockDisconnectSpotify() {
  const state = getState();
  advanceSimulations(state);
  state.setup.spotifyConnected = false;
  return getSetupStatusView();
}

export function mockConnectApple() {
  const state = getState();
  advanceSimulations(state);
  state.setup.appleConnected = true;
  return getSetupStatusView();
}

export function startInitialScan() {
  const state = getState();
  advanceSimulations(state);

  if (state.setup.initialScanStatus === "queued" || state.setup.initialScanStatus === "running") {
    return getSetupStatusView();
  }

  if (!state.setup.spotifyConnected || !state.setup.appleConnected) {
    return getSetupStatusView();
  }

  const now = Date.now();
  const runId = `run_init_${state.nextId++}`;

  state.setup.initialScanStatus = "queued";
  state.setup.initialScanRunId = runId;
  state.setup.stageLabel = "Queued";
  state.setup.initialScanStartedAtMs = now;
  state.setup.initialScanRunningAtMs = now + 500;
  state.setup.initialScanCompleteAtMs = now + 2600;

  state.runs.unshift(
    makeRun(runId, "running", "initial_setup", new Date(now).toISOString(), null, {
      addedToSpotify: 0,
      addedToApple: 0,
      unmatched: 0,
    }),
  );

  return getSetupStatusView();
}

export function triggerManualSync() {
  const state = getState();
  advanceSimulations(state);

  const existingRunning = state.runs.find((run) => run.status === "running");
  if (existingRunning) {
    return { queued: false, run: createRunHistoryRow(existingRunning) };
  }

  const now = Date.now();
  const runId = `run_manual_${state.nextId++}`;
  const run = makeRun(runId, "running", "manual", new Date(now).toISOString(), null, {
    addedToSpotify: 0,
    addedToApple: 0,
    unmatched: 0,
  });

  state.runs.unshift(run);
  state.syncSimulation = {
    runId,
    completeAtMs: now + 2200,
    templateIndex: state.nextId % manualSyncTemplates.length,
  };

  return { queued: true, run: createRunHistoryRow(run) };
}

function sortSongs(items: MockSong[], sort: UnmatchedQuery["sort"]) {
  const clone = [...items];
  switch (sort) {
    case "oldest":
      clone.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
      break;
    case "playlist":
      clone.sort((a, b) => a.playlistName.localeCompare(b.playlistName));
      break;
    case "reason":
      clone.sort((a, b) => a.reasonLabel.localeCompare(b.reasonLabel));
      break;
    case "newest":
    default:
      clone.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
  return clone;
}

function sortPlaylists(items: MockPlaylist[], sort: UnmatchedQuery["sort"]) {
  const clone = [...items];
  switch (sort) {
    case "oldest":
      clone.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
      break;
    case "playlist":
      clone.sort((a, b) => a.playlistName.localeCompare(b.playlistName));
      break;
    case "reason":
      clone.sort((a, b) => a.reasonLabel.localeCompare(b.reasonLabel));
      break;
    case "newest":
    default:
      clone.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
  return clone;
}

export function getUnmatchedListView(query: UnmatchedQuery = {}): UnmatchedListView {
  const state = getState();
  advanceSimulations(state);

  const filters: UnmatchedListView["filters"] = {
    sourceService: query.sourceService ?? "all",
    playlist: query.playlist ?? "all",
    runId: query.runId ?? "all",
    sort: query.sort ?? "newest",
    status: query.status ?? "all",
  };

  const songFilter = (song: MockSong) => {
    if (filters.sourceService !== "all" && song.sourceService !== filters.sourceService) return false;
    if (filters.playlist !== "all" && song.playlistName !== filters.playlist) return false;
    if (filters.runId !== "all" && song.syncRunId !== filters.runId) return false;
    if (filters.status === "pending" && song.status !== "pending") return false;
    if (filters.status === "dismissed" && song.status !== "dismissed") return false;
    return true;
  };

  const playlistFilter = (playlist: MockPlaylist) => {
    if (filters.sourceService !== "all" && playlist.sourceService !== filters.sourceService) return false;
    if (filters.playlist !== "all" && playlist.playlistName !== filters.playlist) return false;
    if (filters.runId !== "all" && playlist.syncRunId !== filters.runId) return false;
    if (filters.status === "pending" && playlist.status !== "pending") return false;
    if (filters.status === "dismissed" && playlist.status !== "dismissed") return false;
    return true;
  };

  const filteredSongs = sortSongs(state.unmatchedSongs.filter(songFilter), filters.sort);
  const filteredPlaylists = sortPlaylists(
    state.unmatchedPlaylists.filter(playlistFilter),
    filters.sort,
  );

  const allPlaylistNames = Array.from(
    new Set(
      [
        ...state.unmatchedSongs.map((song) => song.playlistName),
        ...state.unmatchedPlaylists.map((playlist) => playlist.playlistName),
      ].sort((a, b) => a.localeCompare(b)),
    ),
  );

  const runOptions = state.runs.slice(0, 30).map((run) => ({
    id: run.id,
    label: `${formatDateLabel(run.startedAt)} · ${formatTimeLabel(run.startedAt)} · ${run.status}`,
  }));

  return {
    songs: {
      pending: filteredSongs.filter((song) => song.status === "pending"),
      dismissed: filteredSongs.filter((song) => song.status === "dismissed"),
    },
    playlists: {
      pending: filteredPlaylists.filter((playlist) => playlist.status === "pending"),
      dismissed: filteredPlaylists.filter((playlist) => playlist.status === "dismissed"),
    },
    counts: {
      pendingSongs: state.unmatchedSongs.filter((song) => song.status === "pending").length,
      pendingPlaylists: state.unmatchedPlaylists.filter((playlist) => playlist.status === "pending")
        .length,
    },
    filters,
    filterOptions: {
      playlists: allPlaylistNames,
      runs: runOptions,
    },
  };
}

export function applyBestGuessForUnmatchedSong(id: string) {
  const state = getState();
  advanceSimulations(state);
  const song = state.unmatchedSongs.find((item) => item.id === id);

  if (!song) {
    return { ok: false as const, error: "not_found" };
  }

  if (!song.bestCandidate) {
    return { ok: false as const, error: "no_best_candidate" };
  }

  song.status = "mapped";
  return { ok: true as const, item: song };
}

export function dismissUnmatchedSong(id: string) {
  const state = getState();
  advanceSimulations(state);
  const song = state.unmatchedSongs.find((item) => item.id === id);

  if (!song) {
    return { ok: false as const, error: "not_found" };
  }

  song.status = "dismissed";
  return { ok: true as const, item: song };
}

export function dismissUnmatchedPlaylist(id: string) {
  const state = getState();
  advanceSimulations(state);
  const playlist = state.unmatchedPlaylists.find((item) => item.id === id);

  if (!playlist) {
    return { ok: false as const, error: "not_found" };
  }

  playlist.status = "dismissed";
  playlist.reasonLabel = "user dismissed";
  return { ok: true as const, item: playlist };
}

export function getSettingsView(): SettingsView {
  const state = getState();
  advanceSimulations(state);
  return structuredClone(state.settings);
}

type SettingsUpdatePayload = Partial<SettingsView>;

export function updateSettings(payload: SettingsUpdatePayload) {
  const state = getState();
  advanceSimulations(state);

  if (payload.notifications) {
    state.settings.notifications = {
      ...state.settings.notifications,
      ...payload.notifications,
    };
  }

  if (
    typeof payload.matchThreshold === "number" &&
    Number.isFinite(payload.matchThreshold)
  ) {
    state.settings.matchThreshold = Math.max(0.7, Math.min(0.95, payload.matchThreshold));
  }

  if (Array.isArray(payload.playlists)) {
    const byId = new Map(payload.playlists.map((playlist) => [playlist.id, playlist]));
    state.settings.playlists = state.settings.playlists.map((playlist) => {
      const patch = byId.get(playlist.id);
      return patch ? { ...playlist, excluded: patch.excluded } : playlist;
    });
  }

  return getSettingsView();
}

export function resetMockState() {
  const globalRef = globalThis as typeof globalThis & {
    [STATE_KEY]?: MockState;
  };
  globalRef[STATE_KEY] = createInitialState();
  return true;
}
