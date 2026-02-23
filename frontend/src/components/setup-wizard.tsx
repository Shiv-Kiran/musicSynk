"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { SetupStatusView } from "@/lib/types";
import styles from "./setup-wizard.module.css";

type Props = {
  initialStatus: SetupStatusView;
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
  if (!status.appleConnected) return 2;
  if (!status.setupComplete) return 3;
  return 3;
}

export function SetupWizard({ initialStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [spotifyAction, setSpotifyAction] = useState<AsyncState>("idle");
  const [appleAction, setAppleAction] = useState<AsyncState>("idle");
  const [scanAction, setScanAction] = useState<AsyncState>("idle");
  const [statusError, setStatusError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const currentStep = getCurrentStep(status);

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
    if (
      status.initialScanStatus !== "queued" &&
      status.initialScanStatus !== "running"
    ) {
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
          return;
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
    try {
      const next = await api<SetupStatusView>("/api/setup/connect/spotify", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setStatus(next);
      setSpotifyAction("idle");
    } catch {
      setSpotifyAction("error");
      setStatusError("Spotify mock connect failed.");
    }
  }

  async function connectApple() {
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
      setStatusError("Apple Music mock connect failed.");
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

  const scanBusy =
    status.initialScanStatus === "queued" || status.initialScanStatus === "running";

  return (
    <main className={styles.wrap}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              ♪
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
              sub: status.spotifyConnected ? "Connected" : "OAuth setup",
            },
            {
              index: 2,
              title: "Connect Apple",
              done: status.appleConnected,
              active: currentStep === 2,
              sub: status.appleConnected ? "Connected" : "One-time login",
            },
            {
              index: 3,
              title: "Initial Scan",
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
              <div className={styles.progressTitle}>
                {step.done ? "✓ " : ""}
                {step.title}
              </div>
              <div className={styles.progressSub}>{step.sub}</div>
            </div>
          ))}
        </div>

        {currentStep === 1 ? (
          <section className={styles.card}>
            <h1 className={styles.cardTitle}>Connect Spotify</h1>
            <p className={styles.cardBody}>
              This is the mock onboarding path for fast UI testing. In the real
              flow, this button redirects to Spotify OAuth.
            </p>
            <div className={styles.statusLine}>
              <span
                className={`${styles.statusDot} ${
                  status.spotifyConnected ? styles.statusDone : ""
                }`.trim()}
                aria-hidden="true"
              />
              {status.spotifyConnected ? "Connected" : "Not connected"}
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
                    ? "Connecting…"
                    : "Connect with Spotify →"}
              </button>
              <button className={styles.ghostBtn} type="button" onClick={() => void refreshStatus()}>
                Refresh status
              </button>
            </div>
          </section>
        ) : null}

        {currentStep === 2 ? (
          <section className={styles.card}>
            <h1 className={styles.cardTitle}>Connect Apple Music</h1>
            <p className={styles.cardBody}>
              We open a login session once and save it for nightly syncs. This mock
              version completes instantly so you can test the UX flow.
            </p>
            <div className={styles.statusLine}>
              <span
                className={`${styles.statusDot} ${
                  status.appleConnected ? styles.statusDone : ""
                }`.trim()}
                aria-hidden="true"
              />
              {status.appleConnected ? "Connected" : "Waiting for login"}
            </div>
            <div className={styles.ctaRow}>
              <button
                className={styles.primaryBtn}
                type="button"
                onClick={connectApple}
                disabled={appleAction === "pending" || status.appleConnected}
              >
                {status.appleConnected
                  ? "Apple Music Connected"
                  : appleAction === "pending"
                    ? "Opening login…"
                    : "Open Apple Music Login →"}
              </button>
              <button className={styles.ghostBtn} type="button" onClick={() => void refreshStatus()}>
                Refresh status
              </button>
            </div>
          </section>
        ) : null}

        {currentStep === 3 ? (
          <section className={styles.card}>
            <h1 className={styles.cardTitle}>Initial Library Scan</h1>
            <p className={styles.cardBody}>
              We do a first pass across your playlists so future syncs can be
              incremental. This runs in the background.
            </p>

            <div className={styles.scanBox}>
              <div className={styles.scanHint}>
                You can close this tab after starting the scan. We will keep the UI
                lightweight and rely on a completion state (and later email) instead
                of a laggy live progress bar.
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
                {status.stageLabel ? ` · ${status.stageLabel}` : ""}
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
                    ? "Scan Running…"
                    : scanAction === "pending"
                      ? "Starting…"
                      : "Start Initial Scan →"}
              </button>

              <button className={styles.ghostBtn} type="button" onClick={() => void refreshStatus()}>
                Refresh status
              </button>
            </div>

            {status.setupComplete ? (
              <div className={`${styles.note} ${styles.ok}`}>
                Setup complete. Redirecting to dashboard…
              </div>
            ) : null}
          </section>
        ) : null}

        {statusError ? <p className={`${styles.note} ${styles.error}`}>{statusError}</p> : null}
      </section>
    </main>
  );
}
