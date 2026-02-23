export type AuthHealth = "healthy" | "invalid" | "missing";
export type BackendMode = "mock" | "spotify_readonly";
export type RunKind = "snapshot_refresh" | "sync";

export type AppShellStatus = {
  spotifyAuth: AuthHealth;
  appleAuth: AuthHealth;
  pendingUnmatchedCount: number;
  backendMode?: BackendMode;
  readOnlyMode?: boolean;
};

export type SyncRunStatus = "running" | "completed" | "partial" | "failed";
export type TriggeredBy = "cron" | "manual" | "initial_setup";
export type SetupScanStatus = "not_started" | "queued" | "running" | "completed" | "failed";
export type UnmatchedStatus = "pending" | "mapped" | "dismissed";
export type SourceService = "spotify" | "apple_music";

export type RunPreviewItem = {
  title: string;
  artist: string;
  playlist: string;
  confidence?: number;
};

export type RunCounts = {
  addedToSpotify: number;
  addedToApple: number;
  unmatched: number;
};

export type RunHistoryRowView = {
  id: string;
  startedAt: string;
  status: SyncRunStatus;
  runKind?: RunKind;
  summaryLine: string;
  durationSeconds: number | null;
  counts: RunCounts;
  warning?: string;
  error?: string;
};

export type RunDetailView = {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: SyncRunStatus;
  runKind?: RunKind;
  durationSeconds: number | null;
  triggeredBy: TriggeredBy;
  counts: RunCounts;
  addedToSpotify: RunPreviewItem[];
  addedToApple: RunPreviewItem[];
  unmatchedPreview: RunPreviewItem[];
  playlistsScanned: number;
  playlistsSkipped: number;
  notes?: string;
  warning?: string;
  error?: string;
};

export type DashboardLastRunView = {
  runId: string;
  status: SyncRunStatus;
  startedAt: string;
  durationSeconds: number | null;
  counts: RunCounts;
  addedToSpotifyPreview: RunPreviewItem[];
  addedToApplePreview: RunPreviewItem[];
  unmatchedPreview: RunPreviewItem[];
  warning?: string;
  error?: string;
};

export type DashboardView = {
  lastRun: DashboardLastRunView | null;
  history: RunHistoryRowView[];
  setupRequired: boolean;
  backendMode?: BackendMode;
  readOnlyMode?: boolean;
  primaryActionLabel?: "Sync Now" | "Refresh Snapshot";
  modeBannerNote?: string;
};

export type SetupStatusView = {
  spotifyConnected: boolean;
  appleConnected: boolean;
  initialScanStatus: SetupScanStatus;
  initialScanRunId: string | null;
  stageLabel: string | null;
  setupComplete: boolean;
  mode?: BackendMode;
  readOnlyMode?: boolean;
  appleDeferred?: boolean;
  spotifyProfileName?: string;
};

export type UnmatchedCandidate = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  confidence: number;
  year?: number;
};

export type UnmatchedSongCardView = {
  id: string;
  sourceService: SourceService;
  sourceId: string;
  title: string;
  artist: string;
  album?: string;
  playlistName: string;
  reason: "no_results" | "low_confidence" | "multiple_ambiguous";
  reasonLabel: string;
  bestCandidate: UnmatchedCandidate | null;
  status: UnmatchedStatus;
  syncRunId: string;
  createdAt: string;
};

export type UnmatchedPlaylistCardView = {
  id: string;
  sourceService: SourceService;
  sourceId: string;
  playlistName: string;
  songCount: number;
  reasonLabel: string;
  status: UnmatchedStatus | "created";
  syncRunId: string;
  createdAt: string;
};

export type UnmatchedListView = {
  songs: {
    pending: UnmatchedSongCardView[];
    dismissed: UnmatchedSongCardView[];
  };
  playlists: {
    pending: UnmatchedPlaylistCardView[];
    dismissed: UnmatchedPlaylistCardView[];
  };
  counts: {
    pendingSongs: number;
    pendingPlaylists: number;
  };
  filters: {
    sourceService: "all" | SourceService;
    playlist: string;
    runId: string;
    sort: "newest" | "oldest" | "playlist" | "reason";
    status: "all" | "pending" | "dismissed";
  };
  filterOptions: {
    playlists: string[];
    runs: Array<{ id: string; label: string }>;
  };
};

export type SettingsView = {
  notifications: {
    success: boolean;
    failure: boolean;
    reauth: boolean;
  };
  matchThreshold: number;
  playlists: Array<{
    id: string;
    name: string;
    excluded: boolean;
  }>;
};
