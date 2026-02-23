import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UnmatchedListView } from "@/lib/types";
import { UnmatchedPage } from "./unmatched-page";

const routerMock = {
  refresh: vi.fn(),
  replace: vi.fn(),
};

const pathnameState = { value: "/unmatched" };
const searchParamsState = { value: "" };

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => pathnameState.value,
  useSearchParams: () => new URLSearchParams(searchParamsState.value),
}));

const unmatchedFixture: UnmatchedListView = {
  songs: {
    pending: [
      {
        id: "song_1",
        sourceService: "apple_music",
        sourceId: "am_1",
        title: "Live at the Apollo",
        artist: "James Brown",
        album: "Live Album",
        playlistName: "Classics",
        reason: "low_confidence",
        reasonLabel: "low confidence (best match: 61%)",
        bestCandidate: {
          id: "cand_1",
          title: "Live at the Apollo",
          artist: "James Brown",
          album: "Studio Version",
          confidence: 0.61,
          year: 1962,
        },
        status: "pending",
        syncRunId: "run_1",
        createdAt: "2026-02-23T00:01:41.000Z",
      },
      {
        id: "song_2",
        sourceService: "spotify",
        sourceId: "sp_2",
        title: "Obscure Track",
        artist: "Unknown Artist",
        album: "Album Name",
        playlistName: "Late Night Drives",
        reason: "no_results",
        reasonLabel: "no results found on Spotify",
        bestCandidate: null,
        status: "pending",
        syncRunId: "run_1",
        createdAt: "2026-02-23T00:01:40.000Z",
      },
    ],
    dismissed: [],
  },
  playlists: {
    pending: [],
    dismissed: [],
  },
  counts: {
    pendingSongs: 2,
    pendingPlaylists: 0,
  },
  filters: {
    sourceService: "all",
    playlist: "all",
    runId: "all",
    sort: "newest",
    status: "all",
  },
  filterOptions: {
    playlists: ["Classics", "Late Night Drives"],
    runs: [{ id: "run_1", label: "Feb 23 · 12:01 AM · completed" }],
  },
};

describe("UnmatchedPage", () => {
  beforeEach(() => {
    routerMock.refresh.mockReset();
    routerMock.replace.mockReset();
    searchParamsState.value = "";
  });

  it("resolves a song with Use this and updates pending count optimistically", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UnmatchedPage initialData={unmatchedFixture} />);

    expect(screen.getByRole("heading", { name: /Unmatched Songs \(2 pending\)/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Use this ↑" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Unmatched Songs \(1 pending\)/ })).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/unmatched/songs/song_1/use-best-guess",
      expect.objectContaining({ method: "POST", cache: "no-store" }),
    );
    expect(routerMock.refresh).toHaveBeenCalled();
  });

  it("dismisses a song and moves it out of the pending list", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UnmatchedPage initialData={unmatchedFixture} />);

    await user.click(screen.getAllByRole("button", { name: "Dismiss" })[0]);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Unmatched Songs \(1 pending\)/ })).toBeInTheDocument();
    });
    expect(routerMock.refresh).toHaveBeenCalled();
  });
});
