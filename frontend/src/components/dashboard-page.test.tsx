import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DashboardView } from "@/lib/types";
import { DashboardPage } from "./dashboard-page";

const routerMock = {
  refresh: vi.fn(),
  replace: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const dashboardFixture: DashboardView = {
  setupRequired: false,
  lastRun: {
    runId: "run_1",
    status: "completed",
    startedAt: "2026-02-23T00:01:00.000Z",
    durationSeconds: 102,
    counts: { addedToSpotify: 3, addedToApple: 1, unmatched: 2 },
    addedToSpotifyPreview: [
      { title: "Too Sweet", artist: "Hozier", playlist: "Late Night Drives", confidence: 0.98 },
      { title: "Birds of a Feather", artist: "Billie Eilish", playlist: "2024 Favs", confidence: 0.95 },
    ],
    addedToApplePreview: [
      { title: "Timeless", artist: "The Weeknd", playlist: "Rap Rotation", confidence: 0.91 },
    ],
    unmatchedPreview: [
      { title: "Obscure Track", artist: "Unknown Artist", playlist: "Late Night Drives" },
    ],
  },
  history: [
    {
      id: "run_1",
      startedAt: "2026-02-23T00:01:00.000Z",
      status: "completed",
      summaryLine: "3 -> Spotify | 1 -> Apple | 2 unmatched",
      durationSeconds: 102,
      counts: { addedToSpotify: 3, addedToApple: 1, unmatched: 2 },
    },
  ],
};

describe("DashboardPage", () => {
  beforeEach(() => {
    routerMock.refresh.mockReset();
    routerMock.replace.mockReset();
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders the top banner and nightly review link", () => {
    render(<DashboardPage initialData={dashboardFixture} />);

    expect(screen.getByText(/Last sync/i)).toBeInTheDocument();
    expect(screen.getByText("OK completed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review ->" })).toHaveAttribute(
      "href",
      "/unmatched?runId=run_1&status=pending",
    );
  });

  it("keeps Sync Now low-prominence and asks confirmation", async () => {
    const user = userEvent.setup();
    render(<DashboardPage initialData={dashboardFixture} />);

    await user.click(screen.getByRole("button", { name: "Sync Now ->" }));

    expect(screen.getByText("Start manual sync?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("switches the primary action label in read-only mode", async () => {
    const user = userEvent.setup();
    render(
      <DashboardPage
        initialData={{
          ...dashboardFixture,
          readOnlyMode: true,
          primaryActionLabel: "Refresh Snapshot",
          modeBannerNote: "Read-only validation mode: no playlist writes enabled.",
        }}
      />,
    );

    expect(screen.getByText(/Read-only validation mode/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Refresh Snapshot ->" }));
    expect(screen.getByText("Start snapshot refresh?")).toBeInTheDocument();
  });
});
