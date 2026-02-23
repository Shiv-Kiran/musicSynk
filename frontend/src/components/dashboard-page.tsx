"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState } from "react";

import type { DashboardView, RunDetailView, RunHistoryRowView } from "@/lib/types";
import styles from "./dashboard-page.module.css";

type Props = {
  initialData: DashboardView;
};

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDuration(seconds: number | null) {
  if (seconds == null) return "running";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins <= 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function statusSymbol(status: RunHistoryRowView["status"]) {
  if (status === "completed") return "✓";
  if (status === "partial") return "⚠";
  if (status === "failed") return "✗";
  return "•";
}

function statusWord(status: RunHistoryRowView["status"]) {
  if (status === "completed") return "completed";
  if (status === "partial") return "partial";
  if (status === "failed") return "failed";
  return "running";
}

function bannerClassName(lastRun: DashboardView["lastRun"]) {
  if (!lastRun) return styles.bannerSuccess;
  if (lastRun.status === "failed") return styles.bannerFailed;
  if (lastRun.status === "partial") return styles.bannerPartial;
  return styles.bannerSuccess;
}

export function DashboardPage({ initialData }: Props) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [confirmSync, setConfirmSync] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, RunDetailView>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});

  const lastRun = data.lastRun;

  const refreshDashboard = useEffectEvent(async () => {
    try {
      const next = await jsonFetch<DashboardView>("/api/dashboard?limit=30");
      setData(next);
      setSyncError(null);

      if (next.lastRun?.status !== "running") {
        setSyncBusy(false);
        setConfirmSync(false);
        router.refresh();
      }
    } catch {
      setSyncError("Could not refresh dashboard.");
    }
  });

  useEffect(() => {
    if (data.lastRun?.status !== "running") return;

    void refreshDashboard();
    const id = window.setInterval(() => {
      void refreshDashboard();
    }, 1000);

    return () => {
      window.clearInterval(id);
    };
  }, [data.lastRun?.status, refreshDashboard]);

  async function startSync() {
    setSyncBusy(true);
    setSyncError(null);
    try {
      await jsonFetch("/api/sync/trigger", { method: "POST" });
      await refreshDashboard();
    } catch {
      setSyncBusy(false);
      setSyncError("Could not start manual sync.");
    }
  }

  async function toggleRow(run: RunHistoryRowView) {
    if (expandedId === run.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(run.id);
    if (details[run.id] || detailLoading[run.id]) return;

    setDetailLoading((prev) => ({ ...prev, [run.id]: true }));
    try {
      const detail = await jsonFetch<RunDetailView>(`/api/runs/${run.id}`);
      setDetails((prev) => ({ ...prev, [run.id]: detail }));
    } catch {
      // Keep row expandable even if detail fetch fails.
    } finally {
      setDetailLoading((prev) => ({ ...prev, [run.id]: false }));
    }
  }

  return (
    <section className={styles.stack}>
      <div className={`${styles.banner} ${bannerClassName(lastRun)}`.trim()}>
        <div className={styles.bannerTop}>
          <div className={styles.bannerMeta}>
            {lastRun ? (
              <>
                <span>Last sync</span>
                <span>·</span>
                <span>{formatDate(lastRun.startedAt)}</span>
                <span>·</span>
                <span>{formatTime(lastRun.startedAt)}</span>
                <span>·</span>
                <span>{formatDuration(lastRun.durationSeconds)}</span>
              </>
            ) : (
              <span>No runs yet</span>
            )}
          </div>
          <div className={styles.syncInline}>
            {confirmSync ? (
              <span className={styles.confirmRow}>
                <span>Start manual sync?</span>
                <button
                  className={styles.confirmBtn}
                  type="button"
                  onClick={startSync}
                  disabled={syncBusy || lastRun?.status === "running"}
                >
                  {syncBusy ? "Starting…" : "Start"}
                </button>
                <button
                  className={styles.cancelBtn}
                  type="button"
                  onClick={() => setConfirmSync(false)}
                  disabled={syncBusy}
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                className={styles.syncTextBtn}
                type="button"
                onClick={() => setConfirmSync(true)}
                disabled={syncBusy || lastRun?.status === "running"}
              >
                {lastRun?.status === "running" ? "Sync running…" : "Sync Now →"}
              </button>
            )}
          </div>
        </div>

        <div className={styles.bannerStatus}>
          <div>
            <div className={styles.statusText}>
              {lastRun ? `${statusSymbol(lastRun.status)} ${statusWord(lastRun.status)}` : "No sync history"}
            </div>
            {lastRun?.error ? (
              <div className={`${styles.statusSubtle} ${styles.errorLine}`}>{lastRun.error}</div>
            ) : lastRun?.warning ? (
              <div className={`${styles.statusSubtle} ${styles.warnLine}`}>{lastRun.warning}</div>
            ) : (
              <div className={styles.statusSubtle}>
                {lastRun?.status === "completed"
                  ? "Everything looks healthy."
                  : lastRun?.status === "running"
                    ? "Manual sync is in progress."
                    : "Open run history for details."}
              </div>
            )}
          </div>
          {syncError ? <div className={`${styles.statusSubtle} ${styles.errorLine}`}>{syncError}</div> : null}
        </div>
      </div>

      <div className={styles.threeUp}>
        <div className={styles.storyCol}>
          <div className={styles.storyTitle}>
            <span>Added to Spotify</span>
            <span className={styles.storyCount}>{lastRun?.counts.addedToSpotify ?? 0}</span>
          </div>
          {lastRun && lastRun.addedToSpotifyPreview.length > 0 ? (
            <ul className={styles.storyList}>
              {lastRun.addedToSpotifyPreview.map((item, index) => (
                <li className={styles.storyItem} key={`${item.title}-${index}`}>
                  {item.title} · {item.artist}
                  <div className={styles.storyItemMeta}>{item.playlist}</div>
                </li>
              ))}
              {lastRun.counts.addedToSpotify > lastRun.addedToSpotifyPreview.length ? (
                <li className={styles.storyItemMeta}>
                  +{lastRun.counts.addedToSpotify - lastRun.addedToSpotifyPreview.length} more
                </li>
              ) : null}
            </ul>
          ) : (
            <p className={styles.storyEmpty}>0 changes</p>
          )}
        </div>

        <div className={styles.storyCol}>
          <div className={styles.storyTitle}>
            <span>Added to Apple Music</span>
            <span className={styles.storyCount}>{lastRun?.counts.addedToApple ?? 0}</span>
          </div>
          {lastRun && lastRun.addedToApplePreview.length > 0 ? (
            <ul className={styles.storyList}>
              {lastRun.addedToApplePreview.map((item, index) => (
                <li className={styles.storyItem} key={`${item.title}-${index}`}>
                  {item.title} · {item.artist}
                  <div className={styles.storyItemMeta}>{item.playlist}</div>
                </li>
              ))}
              {lastRun.counts.addedToApple > lastRun.addedToApplePreview.length ? (
                <li className={styles.storyItemMeta}>
                  +{lastRun.counts.addedToApple - lastRun.addedToApplePreview.length} more
                </li>
              ) : null}
            </ul>
          ) : (
            <p className={styles.storyEmpty}>0 changes</p>
          )}
        </div>

        <div className={styles.storyCol}>
          <div className={styles.storyTitle}>
            <span>Unmatched</span>
            <span className={styles.storyCount}>{lastRun?.counts.unmatched ?? 0}</span>
          </div>
          {lastRun && lastRun.unmatchedPreview.length > 0 ? (
            <>
              <ul className={styles.storyList}>
                {lastRun.unmatchedPreview.map((item, index) => (
                  <li className={styles.storyItem} key={`${item.title}-${index}`}>
                    {item.title} · {item.artist}
                    <div className={styles.storyItemMeta}>{item.playlist}</div>
                  </li>
                ))}
              </ul>
              <Link
                className={styles.reviewLink}
                href={`/unmatched?runId=${encodeURIComponent(lastRun.runId)}&status=pending`}
              >
                Review →
              </Link>
            </>
          ) : (
            <p className={styles.storyEmpty}>Nothing to review</p>
          )}
        </div>
      </div>

      <section className={styles.section} aria-labelledby="run-history-heading">
        <header className={styles.sectionHeader}>
          <div>
            <h2 id="run-history-heading" className={styles.sectionTitle}>
              Run History
            </h2>
            <p className={styles.sectionSub}>List-first view for quick scanning, no charts.</p>
          </div>
        </header>

        <div className={styles.historyList}>
          {data.history.map((run) => {
            const isExpanded = expandedId === run.id;
            const detail = details[run.id];
            const loading = detailLoading[run.id];

            return (
              <div className={styles.historyRow} key={run.id}>
                <button
                  className={styles.historyBtn}
                  type="button"
                  onClick={() => void toggleRow(run)}
                  aria-expanded={isExpanded}
                >
                  <div className={styles.historyDate}>{formatDate(run.startedAt)}</div>
                  <div className={styles.historySummary}>
                    <div className={styles.historyStatus}>
                      <span aria-hidden="true">{statusSymbol(run.status)}</span>
                      <span>{run.summaryLine}</span>
                    </div>
                    <div className={styles.historyMeta}>
                      {formatTime(run.startedAt)}
                      {run.durationSeconds != null ? ` · ${formatDuration(run.durationSeconds)}` : ""}
                    </div>
                  </div>
                  <div className={styles.historyChevron} aria-hidden="true">
                    {isExpanded ? "▲" : "▼"}
                  </div>
                </button>

                {isExpanded ? (
                  <div className={styles.historyDetail}>
                    {loading && !detail ? (
                      <div className={styles.loadingText}>Loading run details…</div>
                    ) : detail ? (
                      <>
                        <div className={styles.detailGrid}>
                          <div className={styles.detailBox}>
                            <div className={styles.detailBoxTitle}>Added to Spotify</div>
                            {detail.addedToSpotify.length > 0 ? (
                              <ul className={styles.detailList}>
                                {detail.addedToSpotify.map((item, index) => (
                                  <li key={`${detail.id}-sp-${index}`}>
                                    {item.title} · {item.artist}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className={styles.detailMuted}>No additions</div>
                            )}
                          </div>
                          <div className={styles.detailBox}>
                            <div className={styles.detailBoxTitle}>Added to Apple Music</div>
                            {detail.addedToApple.length > 0 ? (
                              <ul className={styles.detailList}>
                                {detail.addedToApple.map((item, index) => (
                                  <li key={`${detail.id}-am-${index}`}>
                                    {item.title} · {item.artist}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className={styles.detailMuted}>No additions</div>
                            )}
                          </div>
                        </div>
                        <div className={styles.detailMuted}>
                          Playlists scanned: {detail.playlistsScanned} · unchanged skipped:{" "}
                          {detail.playlistsSkipped}
                        </div>
                        {detail.warning ? (
                          <div className={`${styles.detailMuted} ${styles.warnLine}`}>
                            {detail.warning}
                          </div>
                        ) : null}
                        {detail.error ? (
                          <div className={`${styles.detailMuted} ${styles.errorLine}`}>
                            {detail.error}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className={`${styles.loadingText} ${styles.errorLine}`}>
                        Could not load run details.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </section>
  );
}
