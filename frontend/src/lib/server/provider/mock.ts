import "server-only";

import * as mockStore from "@/lib/mock/store";
import type {
  AppShellStatus,
  DashboardView,
  RunDetailView,
  RunHistoryRowView,
  SettingsView,
  SetupStatusView,
  UnmatchedListView,
} from "@/lib/types";
import type { AppProvider, UnmatchedQueryInput } from "./types";

function withMode<T extends object>(value: T): T {
  return value;
}

function patchAppShell(value: AppShellStatus): AppShellStatus {
  return {
    ...value,
    backendMode: "mock",
    readOnlyMode: false,
  };
}

function patchRunRow(value: RunHistoryRowView): RunHistoryRowView {
  return {
    ...value,
    runKind: value.runKind ?? "sync",
  };
}

function patchRunDetail(value: RunDetailView): RunDetailView {
  return {
    ...value,
    runKind: value.runKind ?? "sync",
  };
}

function patchDashboard(value: DashboardView): DashboardView {
  return {
    ...value,
    backendMode: "mock",
    readOnlyMode: false,
    primaryActionLabel: "Sync Now",
    history: value.history.map(patchRunRow),
  };
}

function patchSetup(value: SetupStatusView): SetupStatusView {
  return {
    ...value,
    mode: "mock",
    readOnlyMode: false,
    appleDeferred: false,
  };
}

export const mockProvider: AppProvider = {
  async getAppShellStatusView() {
    return patchAppShell(mockStore.getAppShellStatusView());
  },
  async getDashboardView(limit = 30) {
    return patchDashboard(mockStore.getDashboardView(limit));
  },
  async listRuns(limit = 30) {
    const result = mockStore.listRuns(limit);
    return { runs: result.runs.map(patchRunRow) };
  },
  async getRunDetailView(id: string) {
    const detail = mockStore.getRunDetailView(id);
    return detail ? patchRunDetail(detail) : null;
  },
  async getSetupStatusView() {
    return patchSetup(mockStore.getSetupStatusView());
  },
  async connectSpotify() {
    return patchSetup(mockStore.mockConnectSpotify());
  },
  async connectApple() {
    return patchSetup(mockStore.mockConnectApple());
  },
  async startInitialScan() {
    return patchSetup(mockStore.startInitialScan());
  },
  async triggerManualSync() {
    const result = mockStore.triggerManualSync();
    return { ...result, run: patchRunRow(result.run) };
  },
  async getUnmatchedListView(query?: UnmatchedQueryInput) {
    return withMode<UnmatchedListView>(mockStore.getUnmatchedListView(query));
  },
  async applyBestGuessForUnmatchedSong(id: string) {
    return mockStore.applyBestGuessForUnmatchedSong(id);
  },
  async dismissUnmatchedSong(id: string) {
    return mockStore.dismissUnmatchedSong(id);
  },
  async dismissUnmatchedPlaylist(id: string) {
    return mockStore.dismissUnmatchedPlaylist(id);
  },
  async getSettingsView() {
    return mockStore.getSettingsView();
  },
  async updateSettings(payload: Partial<SettingsView>) {
    return mockStore.updateSettings(payload);
  },
};
