import type {
  AppShellStatus,
  DashboardView,
  RunDetailView,
  RunHistoryRowView,
  SettingsView,
  SetupStatusView,
  UnmatchedListView,
} from "@/lib/types";

export type UnmatchedQueryInput = {
  status?: "all" | "pending" | "dismissed";
  sourceService?: "all" | "spotify" | "apple_music";
  playlist?: string;
  runId?: string;
  sort?: "newest" | "oldest" | "playlist" | "reason";
};

export type AppProvider = {
  getAppShellStatusView(): Promise<AppShellStatus>;
  getDashboardView(limit?: number): Promise<DashboardView>;
  listRuns(limit?: number): Promise<{ runs: RunHistoryRowView[] }>;
  getRunDetailView(id: string): Promise<RunDetailView | null>;
  getSetupStatusView(): Promise<SetupStatusView>;
  connectSpotify(): Promise<SetupStatusView>;
  connectApple(): Promise<SetupStatusView>;
  startInitialScan(): Promise<SetupStatusView>;
  triggerManualSync(): Promise<{ queued: boolean; run: RunHistoryRowView }>;
  getUnmatchedListView(query?: UnmatchedQueryInput): Promise<UnmatchedListView>;
  applyBestGuessForUnmatchedSong(id: string): Promise<{ ok: true; item: unknown } | { ok: false; error: string }>;
  dismissUnmatchedSong(id: string): Promise<{ ok: true; item: unknown } | { ok: false; error: string }>;
  dismissUnmatchedPlaylist(id: string): Promise<{ ok: true; item: unknown } | { ok: false; error: string }>;
  getSettingsView(): Promise<SettingsView>;
  updateSettings(payload: Partial<SettingsView>): Promise<SettingsView>;
};
