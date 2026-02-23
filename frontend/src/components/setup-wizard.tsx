"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { SetupStatusView } from "@/lib/types";
import styles from "./setup-wizard.module.css";

type Props = {
  initialStatus: SetupStatusView;
  oauthError?: string | null;
};

type AsyncState = "idle" | "pending" | "error";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

function getCurrentStep(status: SetupStatusView) {
  if (!status.spotifyConnected) return 1;
  if (!status.appleConnected && !status.appleDeferred) return 2;
  if (!status.setupComplete) return 3;
  return 3;
}

export function SetupWizard({ initialStatus, oauthError = null }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [spotifyAction, setSpotifyAction] = useState<AsyncState>("idle");
  const [appleAction, setAppleAction] = useState<AsyncState>("idle");
  const [scanAction, setScanAction] = useState<AsyncState>("idle");
  const [statusError, setStatusError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const currentStep = getCurrentStep(status);
  const readOnlyMode = Boolean(status.readOnlyMode);
  const appleDeferred = Boolean(status.appleDeferred);
  const spotifyConnectedLabel = status.spotifyProfileName
    ? `Connected as ${status.spotifyProfileName}`
    : "Connected";
  const oauthErrorMessage =
    oauthError === "spotify_oauth_state_mismatch"
      ? "Spotify login verification failed (state mismatch). Make sure you are using the same host (127.0.0.1) for the full flow, then try again."
      : oauthError === "spotify_oauth_missing_code_or_state"
        ? "Spotify callback was missing OAuth data. Start again from the Connect Spotify button."
        : oauthError
          ? `Spotify auth error: ${oauthError}`
          : null;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function refreshStatus() {
    try {
      const next = await api<SetupStatusView>("/api/setup/status");
      if (!mountedRef.current) return;
      setStatus(next);
      setStatusError(null);
      if (next.setupComplete) {
        startTransition(() => {
          router.replace("/dashboard");
          router.refresh();
        });
      }
    } catch {
      if (!mountedRef.current) return;
      setStatusError("Could not refresh setup status.");
    }
  }

  useEffect(() => {
    if (status.setupComplete) return;
    if (status.initialScanStatus !== "queued" && status.initialScanStatus !== "running") {
      return;
    }

    let active = true;
    const tick = async () => {
      if (!active) return;
      try {
        const poll = await api<{
          initialScanStatus: SetupStatusView["initialScanStatus"];
          initialScanRunId: string | null;
          stageLabel: string | null;
          setupComplete: boolean;
        }>("/api/setup/initial-scan/status");

        if (!active || !mountedRef.current) return;

        setStatus((prev) => ({
          ...prev,
          initialScanStatus: poll.initialScanStatus,
          initialScanRunId: poll.initialScanRunId,
          stageLabel: poll.stageLabel,
          setupComplete: poll.setupComplete,
        }));

        if (poll.setupComplete) {
          startTransition(() => {
            router.replace("/dashboard");
            router.refresh();
          });
        }
      } catch {
        if (!active || !mountedRef.current) return;
        setStatusError("Lost connection while checking scan progress.");
      }
    };

    void tick();
    const id = window.setInterval(() => {
      void tick();
    }, 900);

    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [router, status.initialScanStatus, status.setupComplete]);

  const stepMeta = useMemo(
    () => ({
      step: currentStep,
      total: 3,
    }),
    [currentStep],
  );

  async function connectSpotify() {
    setSpotifyAction("pending");
    setStatusError(null);

    if (status.mode === "spotify_readonly") {
      window.location.assign("/auth/spotify");
      return;
    }

    try {
      const next = await api<SetupStatusView>("/api/setup/connect/spotify", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setStatus(next);
      setSpotifyAction("idle");
    } catch {
      setSpotifyAction("error");
      setStatusError("Spotify connect failed.");
    }
  }

  async function connectApple() {
    if (appleDeferred) {
      await refreshStatus();
      return;
    }

    setAppleAction("pending");
    setStatusError(null);
    try {
      const next = await api<SetupStatusView>("/api/setup/connect/apple", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setStatus(next);
      setAppleAction("idle");
    } catch {
      setAppleAction("error");
      setStatusError("Apple Music connect failed.");
    }
  }

  async function startInitialScan() {
    setScanAction("pending");
    setStatusError(null);
    try {
      const next = await api<SetupStatusView>("/api/setup/initial-scan", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setStatus(next);
      setScanAction("idle");
    } catch {
      setScanAction("error");
      setStatusError("Could not start initial scan.");
    }
  }

  async function disconnectSpotify() {
    setSpotifyAction("pending");
    setStatusError(null);
    try {
      await api<SetupStatusView>("/api/auth/spotify/logout", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const next = await api<SetupStatusView>("/api/setup/status");
      setStatus(next);
      setSpotifyAction("idle");
      startTransition(() => {
        router.replace("/setup");
        router.refresh();
      });
    } catch {
      setSpotifyAction("error");
      setStatusError("Could not disconnect Spotify.");
    }
  }

  const scanBusy = status.initialScanStatus === "queued" || status.initialScanStatus === "running";

  return (
    <main className={styles.wrap}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              *
            </span>
            <span>music sync</span>
          </div>
          <div className={styles.stepMeta}>
            Step {stepMeta.step} / {stepMeta.total}
          </div>
        </header>

        <div className={styles.progressRail} aria-label="Setup progress">
          {[
            {
              index: 1,
              title: "Connect Spotify",
              done: status.spotifyConnected,
              active: currentStep === 1,
              sub: status.spotifyConnected ? spotifyConnectedLabel : "OAuth setup",
            },
            {
              index: 2,
              title: "Connect Apple",
              done: status.appleConnected,
              active: currentStep === 2,
              sub: appleDeferred
                ? "Deferred in read-only mode"
                : status.appleConnected
                  ? "Connected"
                  : "One-time login",
            },
            {
              index: 3,
              title: readOnlyMode ? "Initial Spotify Scan" : "Initial Scan",
              done: status.setupComplete,
              active: currentStep === 3,
              sub: status.stageLabel ?? "Background scan",
            },
          ].map((step) => (
            <div
              key={step.index}
              className={[
                styles.progressStep,
                step.active ? styles.progressStepActive : "",
                step.done ? styles.progressStepDone : "",
              ]
                .join(" ")
                .trim()}
            >
              <div className={styles.progressTitle}>{step.done ? "Done: " : ""}{step.title}</div>
              <div className={styles.progressSub}>{step.sub}</div>
            </div>
          ))}
        </div>

        {currentStep === 1 ? (
          <section className={styles.card}>
            <h1 className={styles.cardTitle}>Connect Spotify</h1>
            <p className={styles.cardBody}>
              {readOnlyMode
                ? "Read-only validation mode is enabled. This button opens Spotify OAuth and stores a read-only session for snapshot validation."
                : "This is the mock onboarding path for fast UI testing. In the real flow, this button redirects to Spotify OAuth."}
            </p>
            {readOnlyMode ? (
              <p className={styles.cardBody}>No playlist writes are enabled in this phase.</p>
            ) : null}
            <div className={styles.statusLine}>
              <span
                className={`${styles.statusDot} ${status.spotifyConnected ? styles.statusDone : ""}`.trim()}
                aria-hidden="true"
              />
              {status.spotifyConnected ? spotifyConnectedLabel : "Not connected"}
            </div>
            <div className={styles.ctaRow}>
              <button
                className={styles.primaryBtn}
                type="button"
                onClick={connectSpotify}
                disabled={spotifyAction === "pending" || status.spotifyConnected}
              >
                {status.spotifyConnected
                  ? "Spotify Connected"
                  : spotifyAction === "pending"
                    ? "Connecting..."
                    : "Connect with Spotify ->"}
              </button>
              <button className={styles.ghostBtn} type="button" onClick={() => void refreshStatus()}>
                Refresh status
              </button>
              {readOnlyMode && status.spotifyConnected ? (
                <button
                  className={styles.ghostBtn}
                  type="button"
                  onClick={disconnectSpotify}
                  disabled={spotifyAction === "pending"}
                >
                  {spotifyAction === "pending" ? "Disconnecting..." : "Disconnect Spotify"}
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        {currentStep === 2 ? (
          <section className={styles.card}>
            <h1 className={styles.cardTitle}>Connect Apple Music</h1>
            <p className={styles.cardBody}>
              {appleDeferred
                ? "Apple Music is intentionally deferred in this read-only validation phase. We are validating real Spotify data and Supabase persistence first."
                : "We open a login session once and save it for nightly syncs. This mock version completes instantly so you can test the UX flow."}
            </p>
            <div className={styles.statusLine}>
              <span
                className={`${styles.statusDot} ${status.appleConnected ? styles.statusDone : ""}`.trim()}
                aria-hidden="true"
              />
              {appleDeferred
                ? "Deferred in read-only mode"
                : status.appleConnected
                  ? "Connected"
                  : "Waiting for login"}
            </div>
            <div className={styles.ctaRow}>
              <button
                className={styles.primaryBtn}
                type="button"
                onClick={connectApple}
                disabled={appleDeferred || appleAction === "pending" || status.appleConnected}
              >
                {appleDeferred
                  ? "Deferred in this phase"
                  : status.appleConnected
                    ? "Apple Music Connected"
                    : appleAction === "pending"
                      ? "Opening login..."
                      : "Open Apple Music Login ->"}
              </button>
              <button className={styles.ghostBtn} type="button" onClick={() => void refreshStatus()}>
                Refresh status
              </button>
            </div>
          </section>
        ) : null}

        {currentStep === 3 ? (
          <section className={styles.card}>
            <h1 className={styles.cardTitle}>
              {readOnlyMode ? "Initial Spotify Scan" : "Initial Library Scan"}
            </h1>
            <p className={styles.cardBody}>
              {readOnlyMode
                ? "We do a read-only pass across your Spotify playlists and store a snapshot in Supabase for validation. No playlist writes are enabled."
                : "We do a first pass across your playlists so future syncs can be incremental. This runs in the background."}
            </p>

            <div className={styles.scanBox}>
              <div className={styles.scanHint}>
                You can close this tab after starting the scan. We keep this status lightweight and rely
                on completion state (and later email) instead of a live progress bar.
              </div>
              <div className={styles.statusLine}>
                <span
                  className={`${styles.statusDot} ${
                    status.initialScanStatus === "completed"
                      ? styles.statusDone
                      : scanBusy
                        ? styles.statusRunning
                        : status.initialScanStatus === "failed"
                          ? styles.statusWarn
                          : ""
                  }`.trim()}
                  aria-hidden="true"
                />
                {status.initialScanStatus.replace("_", " ")}
                {status.stageLabel ? ` | ${status.stageLabel}` : ""}
              </div>
            </div>

            <div className={styles.ctaRow}>
              <button
                className={styles.primaryBtn}
                type="button"
                onClick={startInitialScan}
                disabled={scanAction === "pending" || scanBusy || status.setupComplete}
              >
                {status.setupComplete
                  ? "Scan Complete"
                  : scanBusy
                    ? "Scan Running..."
                    : scanAction === "pending"
                      ? "Starting..."
                      : readOnlyMode
                        ? "Start Initial Spotify Scan ->"
                        : "Start Initial Scan ->"}
              </button>

              <button className={styles.ghostBtn} type="button" onClick={() => void refreshStatus()}>
                Refresh status
              </button>
              {readOnlyMode && status.spotifyConnected ? (
                <button
                  className={styles.ghostBtn}
                  type="button"
                  onClick={disconnectSpotify}
                  disabled={spotifyAction === "pending"}
                >
                  {spotifyAction === "pending" ? "Disconnecting..." : "Disconnect Spotify"}
                </button>
              ) : null}
            </div>

            {status.setupComplete ? (
              <div className={`${styles.note} ${styles.ok}`}>Setup complete. Redirecting to dashboard...</div>
            ) : null}
          </section>
        ) : null}

        {oauthErrorMessage ? <p className={`${styles.note} ${styles.error}`}>{oauthErrorMessage}</p> : null}
        {statusError ? <p className={`${styles.note} ${styles.error}`}>{statusError}</p> : null}
      </section>
    </main>
  );
}
