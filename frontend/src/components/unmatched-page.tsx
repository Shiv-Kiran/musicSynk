"use client";

import { startTransition, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { UnmatchedListView, UnmatchedSongCardView } from "@/lib/types";
import styles from "./unmatched-page.module.css";

type Props = {
  initialData: UnmatchedListView;
};

type FilterState = UnmatchedListView["filters"];

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function buildQuery(filters: FilterState) {
  const params = new URLSearchParams();
  if (filters.sourceService !== "all") params.set("sourceService", filters.sourceService);
  if (filters.playlist !== "all") params.set("playlist", filters.playlist);
  if (filters.runId !== "all") params.set("runId", filters.runId);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.status !== "all") params.set("status", filters.status);
  return params;
}

function formatSource(value: UnmatchedSongCardView["sourceService"]) {
  return value === "apple_music" ? "Apple Music" : "Spotify";
}

export function UnmatchedPage({ initialData }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [data, setData] = useState(initialData);
  const [loadingFilters, startFilterTransition] = useTransition();
  const [busyCardIds, setBusyCardIds] = useState<Record<string, string>>({});
  const [uiError, setUiError] = useState<string | null>(null);
  const [showDismissedSongs, setShowDismissedSongs] = useState(false);
  const [showDismissedPlaylists, setShowDismissedPlaylists] = useState(false);

  const [selectedBestGuessIds, setSelectedBestGuessIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const song of initialData.songs.pending) {
      if (song.bestCandidate) {
        initial[song.id] = false;
      }
    }
    return initial;
  });

  async function reload(nextFilters: FilterState) {
    const params = buildQuery(nextFilters);
    const query = params.toString();
    const url = query ? `/api/unmatched?${query}` : "/api/unmatched";
    const next = await fetchJson<UnmatchedListView>(url);
    setData(next);
  }

  function updateFilters(patch: Partial<FilterState>) {
    const nextFilters = { ...data.filters, ...patch };
    setUiError(null);

    startFilterTransition(() => {
      const params = buildQuery(nextFilters);
      const current = searchParams.toString();
      const next = params.toString();
      const href = next ? `${pathname}?${next}` : pathname;
      if (current !== next) {
        router.replace(href, { scroll: false });
      }
    });

    void reload(nextFilters).catch(() => {
      setUiError("Could not refresh unmatched items.");
    });
  }

  function markBusy(id: string, action: string | null) {
    setBusyCardIds((prev) => {
      if (action == null) {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: action };
    });
  }

  function markMappedOptimistically(songId: string) {
    setData((prev) => ({
      ...prev,
      songs: {
        ...prev.songs,
        pending: prev.songs.pending.filter((song) => song.id !== songId),
      },
      counts: {
        ...prev.counts,
        pendingSongs: Math.max(0, prev.counts.pendingSongs - 1),
      },
    }));
  }

  function markDismissedSongOptimistically(songId: string) {
    setData((prev) => {
      const target = prev.songs.pending.find((song) => song.id === songId);
      if (!target) return prev;
      const dismissed = { ...target, status: "dismissed" as const };
      return {
        ...prev,
        songs: {
          pending: prev.songs.pending.filter((song) => song.id !== songId),
          dismissed: [dismissed, ...prev.songs.dismissed],
        },
        counts: {
          ...prev.counts,
          pendingSongs: Math.max(0, prev.counts.pendingSongs - 1),
        },
      };
    });
  }

  function markDismissedPlaylistOptimistically(playlistId: string) {
    setData((prev) => {
      const target = prev.playlists.pending.find((playlist) => playlist.id === playlistId);
      if (!target) return prev;
      const dismissed = {
        ...target,
        status: "dismissed" as const,
        reasonLabel: "user dismissed",
      };
      return {
        ...prev,
        playlists: {
          pending: prev.playlists.pending.filter((playlist) => playlist.id !== playlistId),
          dismissed: [dismissed, ...prev.playlists.dismissed],
        },
        counts: {
          ...prev.counts,
          pendingPlaylists: Math.max(0, prev.counts.pendingPlaylists - 1),
        },
      };
    });
  }

  async function useBestGuess(song: UnmatchedSongCardView) {
    if (!song.bestCandidate) return;
    setUiError(null);
    markBusy(song.id, "mapping");
    markMappedOptimistically(song.id);
    try {
      await fetchJson(`/api/unmatched/songs/${song.id}/use-best-guess`, { method: "POST" });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setUiError("Could not apply best guess.");
      await reload(data.filters).catch(() => {});
    } finally {
      markBusy(song.id, null);
    }
  }

  async function dismissSong(songId: string) {
    setUiError(null);
    markBusy(songId, "dismissing");
    markDismissedSongOptimistically(songId);
    try {
      await fetchJson(`/api/unmatched/songs/${songId}/dismiss`, { method: "POST" });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setUiError("Could not dismiss song.");
      await reload(data.filters).catch(() => {});
    } finally {
      markBusy(songId, null);
    }
  }

  async function dismissPlaylist(playlistId: string) {
    setUiError(null);
    markBusy(playlistId, "dismissing");
    markDismissedPlaylistOptimistically(playlistId);
    try {
      await fetchJson(`/api/unmatched/playlists/${playlistId}/dismiss`, { method: "POST" });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setUiError("Could not dismiss playlist.");
      await reload(data.filters).catch(() => {});
    } finally {
      markBusy(playlistId, null);
    }
  }

  return (
    <section className={styles.stack}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            Unmatched Songs ({data.counts.pendingSongs} pending)
          </h1>
          <p className={styles.subtitle}>
            Fast inline triage. Resolve or dismiss without leaving the page.
          </p>
        </div>
        {data.counts.pendingSongs + data.counts.pendingPlaylists > 0 ? (
          <div className={styles.pill}>
            {data.counts.pendingSongs + data.counts.pendingPlaylists} needs review
          </div>
        ) : null}
      </header>

      <section className={styles.filters} aria-label="Filters">
        <div className={styles.filtersRow}>
          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Source</span>
            <select
              className={styles.filterControl}
              value={data.filters.sourceService}
              onChange={(e) =>
                updateFilters({
                  sourceService: e.target.value as FilterState["sourceService"],
                })
              }
            >
              <option value="all">All</option>
              <option value="apple_music">Apple Music</option>
              <option value="spotify">Spotify</option>
            </select>
          </label>

          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Playlist</span>
            <select
              className={styles.filterControl}
              value={data.filters.playlist}
              onChange={(e) => updateFilters({ playlist: e.target.value })}
            >
              <option value="all">All playlists</option>
              {data.filterOptions.playlists.map((playlist) => (
                <option key={playlist} value={playlist}>
                  {playlist}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Run</span>
            <select
              className={styles.filterControl}
              value={data.filters.runId}
              onChange={(e) => updateFilters({ runId: e.target.value })}
            >
              <option value="all">All runs</option>
              {data.filterOptions.runs.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Sort</span>
            <select
              className={styles.filterControl}
              value={data.filters.sort}
              onChange={(e) => updateFilters({ sort: e.target.value as FilterState["sort"] })}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="playlist">Playlist</option>
              <option value="reason">Reason</option>
            </select>
          </label>
        </div>
        <div className={styles.filtersHint}>
          {loadingFilters ? "Refreshing…" : "Filters are kept in the URL so dashboard deep-links work."}
        </div>
        {uiError ? <div className={`${styles.filtersHint} ${styles.error}`}>{uiError}</div> : null}
      </section>

      <section className={styles.section} aria-labelledby="pending-songs-heading">
        <div className={styles.sectionHead}>
          <div>
            <h2 id="pending-songs-heading" className={styles.sectionTitle}>
              Pending Songs
            </h2>
            <div className={styles.sectionMeta}>
              Inline actions are optimistic so bulk triage stays fast.
            </div>
          </div>
        </div>

        {data.songs.pending.length === 0 ? (
          <div className={styles.empty}>No pending unmatched songs for the current filters.</div>
        ) : (
          <div className={styles.cards}>
            {data.songs.pending.map((song) => {
              const busy = !!busyCardIds[song.id];
              const selected = selectedBestGuessIds[song.id] ?? false;
              return (
                <article
                  key={song.id}
                  className={`${styles.card} ${busy ? styles.cardBusy : ""}`.trim()}
                >
                  <div>
                    <h3 className={styles.cardTitle}>{song.title}</h3>
                    <div className={styles.cardSub}>
                      {song.artist}
                      {song.album ? ` · ${song.album}` : ""}
                    </div>
                  </div>

                  <div className={styles.metaLine}>
                    from {formatSource(song.sourceService)} · in "{song.playlistName}"
                  </div>

                  <div className={styles.reason}>Reason: {song.reasonLabel}</div>

                  {song.bestCandidate ? (
                    <div className={styles.bestGuess}>
                      <div className={styles.bestGuessLabel}>Best guess</div>
                      <div className={styles.bestGuessMain}>
                        {song.bestCandidate.title} · {song.bestCandidate.artist}
                      </div>
                      <div className={styles.bestGuessMeta}>
                        {song.bestCandidate.album ?? "Unknown album"} ·{" "}
                        {Math.round(song.bestCandidate.confidence * 100)}%
                        {song.bestCandidate.year ? ` · ${song.bestCandidate.year}` : ""}
                      </div>
                      <div className={styles.bestGuessActions}>
                        <button
                          className={styles.useBtn}
                          type="button"
                          onClick={() => void useBestGuess(song)}
                          disabled={busy}
                        >
                          Use this ↑
                        </button>
                        <button
                          className={styles.ghostBtn}
                          type="button"
                          onClick={() =>
                            setSelectedBestGuessIds((prev) => ({
                              ...prev,
                              [song.id]: !prev[song.id],
                            }))
                          }
                          disabled={busy}
                        >
                          {selected ? "Best guess selected" : "Select for confirm"}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className={styles.actions}>
                    <button
                      className={styles.dismissBtn}
                      type="button"
                      onClick={() => void dismissSong(song.id)}
                      disabled={busy}
                    >
                      Dismiss
                    </button>

                    <div>
                      <button
                        className={styles.confirmBtn}
                        type="button"
                        onClick={() => void useBestGuess(song)}
                        disabled={busy || !song.bestCandidate || !selected}
                        title={
                          song.bestCandidate
                            ? selected
                              ? "Confirm selected best guess"
                              : "Select the best guess first"
                            : "Manual search is coming in the next phase"
                        }
                      >
                        Confirm →
                      </button>
                    </div>
                  </div>

                  {busy ? (
                    <div className={styles.inlineStatus}>
                      {busyCardIds[song.id] === "mapping" ? "Resolving…" : "Dismissing…"}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="pending-playlists-heading">
        <div className={styles.sectionHead}>
          <div>
            <h2 id="pending-playlists-heading" className={styles.sectionTitle}>
              Unmatched Playlists
            </h2>
            <div className={styles.sectionMeta}>
              MVP only supports dismissing playlists here.
            </div>
          </div>
          <div className={styles.sectionMeta}>{data.counts.pendingPlaylists} pending</div>
        </div>

        {data.playlists.pending.length === 0 ? (
          <div className={styles.empty}>No pending unmatched playlists for the current filters.</div>
        ) : (
          <div className={styles.cards}>
            {data.playlists.pending.map((playlist) => {
              const busy = !!busyCardIds[playlist.id];
              return (
                <article
                  key={playlist.id}
                  className={`${styles.playlistCard} ${busy ? styles.cardBusy : ""}`.trim()}
                >
                  <div className={styles.cardTitle}>{playlist.playlistName}</div>
                  <div className={styles.metaLine}>
                    from {playlist.sourceService === "apple_music" ? "Apple Music" : "Spotify"} ·{" "}
                    {playlist.songCount} songs
                  </div>
                  <div className={styles.reason}>Reason: {playlist.reasonLabel}</div>
                  <div className={styles.playlistActions}>
                    <button
                      className={styles.dismissBtn}
                      type="button"
                      onClick={() => void dismissPlaylist(playlist.id)}
                      disabled={busy}
                    >
                      Dismiss
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="dismissed-songs-heading">
        <div className={styles.sectionHead}>
          <div>
            <h2 id="dismissed-songs-heading" className={styles.sectionTitle}>
              Dismissed Songs
            </h2>
            <div className={styles.sectionMeta}>Collapsed by default in case you change your mind.</div>
          </div>
          <button
            className={styles.collapseBtn}
            type="button"
            onClick={() => setShowDismissedSongs((prev) => !prev)}
          >
            {showDismissedSongs ? "Hide" : "Show"} ({data.songs.dismissed.length})
          </button>
        </div>

        {showDismissedSongs ? (
          data.songs.dismissed.length > 0 ? (
            <div className={styles.cards}>
              {data.songs.dismissed.map((song) => (
                <article key={song.id} className={styles.card}>
                  <div className={styles.cardTitle}>{song.title}</div>
                  <div className={styles.cardSub}>
                    {song.artist}
                    {song.album ? ` · ${song.album}` : ""}
                  </div>
                  <div className={styles.metaLine}>
                    {formatSource(song.sourceService)} · "{song.playlistName}"
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>No dismissed songs.</div>
          )
        ) : null}
      </section>

      <section className={styles.section} aria-labelledby="dismissed-playlists-heading">
        <div className={styles.sectionHead}>
          <div>
            <h2 id="dismissed-playlists-heading" className={styles.sectionTitle}>
              Dismissed Playlists
            </h2>
            <div className={styles.sectionMeta}>Hidden unless you need to review older decisions.</div>
          </div>
          <button
            className={styles.collapseBtn}
            type="button"
            onClick={() => setShowDismissedPlaylists((prev) => !prev)}
          >
            {showDismissedPlaylists ? "Hide" : "Show"} ({data.playlists.dismissed.length})
          </button>
        </div>

        {showDismissedPlaylists ? (
          data.playlists.dismissed.length > 0 ? (
            <div className={styles.cards}>
              {data.playlists.dismissed.map((playlist) => (
                <article key={playlist.id} className={styles.playlistCard}>
                  <div className={styles.cardTitle}>{playlist.playlistName}</div>
                  <div className={styles.metaLine}>
                    {playlist.sourceService === "apple_music" ? "Apple Music" : "Spotify"} ·{" "}
                    {playlist.songCount} songs
                  </div>
                  <div className={styles.reason}>Reason: {playlist.reasonLabel}</div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>No dismissed playlists.</div>
          )
        ) : null}
      </section>
    </section>
  );
}
