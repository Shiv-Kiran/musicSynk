"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import type { AppShellStatus, AuthHealth } from "@/lib/types";
import styles from "./app-shell-layout.module.css";

type AppShellLayoutProps = {
  children: ReactNode;
  shellStatus: AppShellStatus;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "⌂" },
  { href: "/unmatched", label: "Unmatched", icon: "!" },
  { href: "/settings", label: "Settings", icon: "⋯" },
];

function statusClass(status: AuthHealth) {
  if (status === "healthy") return styles.statusHealthy;
  if (status === "invalid") return styles.statusInvalid;
  return styles.statusMissing;
}

function statusText(status: AuthHealth) {
  if (status === "healthy") return "healthy";
  if (status === "invalid") return "needs attention";
  return "not connected";
}

export function AppShellLayout({ children, shellStatus }: AppShellLayoutProps) {
  const pathname = usePathname();
  const [disconnectBusy, setDisconnectBusy] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  async function disconnectSpotifySession() {
    setDisconnectBusy(true);
    setDisconnectError(null);
    try {
      const response = await fetch("/api/auth/spotify/logout", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      window.location.assign("/setup");
    } catch {
      setDisconnectBusy(false);
      setDisconnectError("Could not disconnect Spotify.");
    }
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Primary navigation">
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            ♪
          </span>
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>music sync</span>
            <span className={styles.brandSub}>maintenance console</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => {
            const active = pathname === item.href;
            const isUnmatched = item.href === "/unmatched";
            const showBadge = isUnmatched && shellStatus.pendingUnmatchedCount > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${active ? styles.navActive : ""}`.trim()}
                aria-current={active ? "page" : undefined}
              >
                <span className={styles.navLabel}>
                  <span className={styles.navIcon} aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </span>
                {showBadge ? (
                  <span className={styles.badge} aria-label="Pending unmatched items">
                    {Math.min(shellStatus.pendingUnmatchedCount, 99)}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter} aria-label="Service health">
          <div className={styles.serviceRow}>
            <span className={styles.serviceLabel}>
              <span
                className={`${styles.statusDot} ${statusClass(shellStatus.spotifyAuth)}`.trim()}
                aria-hidden="true"
              />
              Spotify
            </span>
            <span>{statusText(shellStatus.spotifyAuth)}</span>
          </div>
          {shellStatus.readOnlyMode && shellStatus.spotifyAuth !== "missing" ? (
            <div className={styles.serviceActionRow}>
              <button
                type="button"
                className={styles.serviceActionBtn}
                onClick={() => void disconnectSpotifySession()}
                disabled={disconnectBusy}
              >
                {disconnectBusy ? "Disconnecting..." : "Disconnect Spotify"}
              </button>
              {disconnectError ? <span className={styles.serviceError}>{disconnectError}</span> : null}
            </div>
          ) : null}
          <div className={styles.serviceRow}>
            <span className={styles.serviceLabel}>
              <span
                className={`${styles.statusDot} ${statusClass(shellStatus.appleAuth)}`.trim()}
                aria-hidden="true"
              />
              Apple
            </span>
            <span>{statusText(shellStatus.appleAuth)}</span>
          </div>
        </div>
      </aside>

      <main className={styles.content}>
        <div className={styles.frame}>{children}</div>
      </main>
    </div>
  );
}
