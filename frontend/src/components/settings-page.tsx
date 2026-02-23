"use client";

import { useEffect, useState } from "react";

import type { SettingsView } from "@/lib/types";
import styles from "./settings-page.module.css";

type Props = {
  initialData: SettingsView;
};

type SaveState = "idle" | "saving" | "saved" | "error";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

export function SettingsPage({ initialData }: Props) {
  const [form, setForm] = useState<SettingsView>(initialData);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (saveState !== "saved") return;
    const id = window.setTimeout(() => setSaveState("idle"), 1200);
    return () => window.clearTimeout(id);
  }, [saveState]);

  function setNotification<K extends keyof SettingsView["notifications"]>(key: K) {
    setForm((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
    setDirty(true);
    setSaveState("idle");
  }

  function setThreshold(value: number) {
    setForm((prev) => ({
      ...prev,
      matchThreshold: Number(value.toFixed(2)),
    }));
    setDirty(true);
    setSaveState("idle");
  }

  function togglePlaylist(id: string) {
    setForm((prev) => ({
      ...prev,
      playlists: prev.playlists.map((playlist) =>
        playlist.id === id ? { ...playlist, excluded: !playlist.excluded } : playlist,
      ),
    }));
    setDirty(true);
    setSaveState("idle");
  }

  async function save() {
    setSaveState("saving");
    try {
      const next = await fetchJson<SettingsView>("/api/settings", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm(next);
      setDirty(false);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  const statusClass =
    saveState === "saving"
      ? styles.statusSaving
      : saveState === "saved"
        ? styles.statusSaved
        : saveState === "error"
          ? styles.statusError
          : "";

  const statusText =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save failed"
          : dirty
            ? "Unsaved changes"
            : "Up to date";

  return (
    <section className={styles.stack}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>
            Minimal controls for notifications, match sensitivity, and playlist exclusions.
          </p>
        </div>
        <div className={`${styles.status} ${statusClass}`.trim()}>{statusText}</div>
      </header>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div>
            <h2 className={styles.panelTitle}>Notifications</h2>
            <p className={styles.panelSub}>All enabled by default so you only step in when needed.</p>
          </div>

          <div className={styles.rows}>
            <div className={styles.toggleRow}>
              <div className={styles.toggleCopy}>
                <div className={styles.toggleTitle}>Success email</div>
                <div className={styles.toggleDesc}>Send a nightly summary when sync completes.</div>
              </div>
              <button
                className={`${styles.switch} ${form.notifications.success ? styles.switchOn : ""}`.trim()}
                type="button"
                aria-pressed={form.notifications.success}
                onClick={() => setNotification("success")}
              >
                <span className={styles.switchThumb} />
              </button>
            </div>

            <div className={styles.toggleRow}>
              <div className={styles.toggleCopy}>
                <div className={styles.toggleTitle}>Failure email</div>
                <div className={styles.toggleDesc}>Get alerts for failed sync runs.</div>
              </div>
              <button
                className={`${styles.switch} ${form.notifications.failure ? styles.switchOn : ""}`.trim()}
                type="button"
                aria-pressed={form.notifications.failure}
                onClick={() => setNotification("failure")}
              >
                <span className={styles.switchThumb} />
              </button>
            </div>

            <div className={styles.toggleRow}>
              <div className={styles.toggleCopy}>
                <div className={styles.toggleTitle}>Re-auth needed email</div>
                <div className={styles.toggleDesc}>Alert when Apple or Spotify auth needs attention.</div>
              </div>
              <button
                className={`${styles.switch} ${form.notifications.reauth ? styles.switchOn : ""}`.trim()}
                type="button"
                aria-pressed={form.notifications.reauth}
                onClick={() => setNotification("reauth")}
              >
                <span className={styles.switchThumb} />
              </button>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div>
            <h2 className={styles.panelTitle}>Match Sensitivity</h2>
            <p className={styles.panelSub}>
              Higher = fewer false matches, more unmatched songs. Lower = more matches, some may be wrong.
            </p>
          </div>

          <div className={styles.rangeWrap}>
            <div className={styles.rangeHead}>
              <div className={styles.panelSub}>Recommended default: 0.85</div>
              <div className={styles.rangeValue}>{form.matchThreshold.toFixed(2)}</div>
            </div>
            <input
              className={styles.range}
              type="range"
              min={0.7}
              max={0.95}
              step={0.01}
              value={form.matchThreshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              aria-label="Match sensitivity"
            />
            <div className={styles.rangeScale}>
              <span>Conservative (0.95)</span>
              <span>Aggressive (0.70)</span>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div>
            <h2 className={styles.panelTitle}>Playlists</h2>
            <p className={styles.panelSub}>Exclude playlists from sync without deleting anything.</p>
          </div>

          <div className={styles.playlistList}>
            {form.playlists.map((playlist) => (
              <div key={playlist.id} className={styles.playlistRow}>
                <div>
                  <div className={styles.playlistName}>{playlist.name}</div>
                  <div className={styles.playlistHint}>
                    {playlist.excluded ? "Excluded from sync" : "Included in sync"}
                  </div>
                </div>
                <button
                  className={`${styles.switch} ${!playlist.excluded ? styles.switchOn : ""}`.trim()}
                  type="button"
                  aria-pressed={!playlist.excluded}
                  onClick={() => togglePlaylist(playlist.id)}
                  title={playlist.excluded ? "Include in sync" : "Exclude from sync"}
                >
                  <span className={styles.switchThumb} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className={styles.footer}>
        <button className={styles.saveBtn} type="button" onClick={save} disabled={!dirty || saveState === "saving"}>
          {saveState === "saving" ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </section>
  );
}
