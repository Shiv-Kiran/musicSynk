import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SetupStatusView } from "@/lib/types";
import { SetupWizard } from "./setup-wizard";

const routerMock = {
  replace: vi.fn(),
  refresh: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => new URLSearchParams(),
}));

describe("SetupWizard", () => {
  beforeEach(() => {
    routerMock.replace.mockReset();
    routerMock.refresh.mockReset();
    vi.unstubAllGlobals();
  });

  it("renders background-first initial scan messaging on step 3", () => {
    const step3Status: SetupStatusView = {
      spotifyConnected: true,
      appleConnected: true,
      initialScanStatus: "not_started",
      initialScanRunId: null,
      stageLabel: null,
      setupComplete: false,
    };

    render(<SetupWizard initialStatus={step3Status} />);

    expect(screen.getByText("Initial Library Scan")).toBeInTheDocument();
    expect(screen.getByText(/You can close this tab/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Initial Scan ->" })).toBeInTheDocument();
  });

  it("advances from Spotify connect to Apple connect using mock API", async () => {
    const user = userEvent.setup();
    const initial: SetupStatusView = {
      spotifyConnected: false,
      appleConnected: false,
      initialScanStatus: "not_started",
      initialScanRunId: null,
      stageLabel: null,
      setupComplete: false,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () =>
        ({
          spotifyConnected: true,
          appleConnected: false,
          initialScanStatus: "not_started",
          initialScanRunId: null,
          stageLabel: null,
          setupComplete: false,
        }) satisfies SetupStatusView,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SetupWizard initialStatus={initial} />);
    await user.click(screen.getByRole("button", { name: "Connect with Spotify ->" }));

    await waitFor(() => {
      expect(screen.getByText("Connect Apple Music")).toBeInTheDocument();
    });
  });

  it("skips Apple as a blocker in spotify read-only mode and shows deferred messaging", () => {
    const readOnlyStatus: SetupStatusView = {
      spotifyConnected: true,
      appleConnected: false,
      initialScanStatus: "not_started",
      initialScanRunId: null,
      stageLabel: null,
      setupComplete: false,
      mode: "spotify_readonly",
      readOnlyMode: true,
      appleDeferred: true,
      spotifyProfileName: "test-user",
    };

    render(<SetupWizard initialStatus={readOnlyStatus} />);

    expect(screen.getByRole("heading", { name: "Initial Spotify Scan" })).toBeInTheDocument();
    expect(screen.getByText(/Deferred in read-only mode/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Initial Spotify Scan ->" })).toBeInTheDocument();
  });
});
