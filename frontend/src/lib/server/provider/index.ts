import "server-only";

import { getServerConfig } from "@/lib/server/config";
import { mockProvider } from "./mock";
import { spotifyReadonlyProvider } from "./spotify-readonly";
import type { AppProvider } from "./types";

function resolveProvider(): AppProvider {
  const config = getServerConfig();
  if (config.appMode === "spotify_readonly") {
    return spotifyReadonlyProvider;
  }
  return mockProvider;
}

export async function getAppShellStatusView() {
  return resolveProvider().getAppShellStatusView();
}

export async function getDashboardView(limit?: number) {
  return resolveProvider().getDashboardView(limit);
}

export async function listRuns(limit?: number) {
  return resolveProvider().listRuns(limit);
}

export async function getRunDetailView(id: string) {
  return resolveProvider().getRunDetailView(id);
}

export async function getSetupStatusView() {
  return resolveProvider().getSetupStatusView();
}

export async function connectSpotify() {
  return resolveProvider().connectSpotify();
}

export async function connectApple() {
  return resolveProvider().connectApple();
}

export async function startInitialScan() {
  return resolveProvider().startInitialScan();
}

export async function triggerManualSync() {
  return resolveProvider().triggerManualSync();
}

export async function getUnmatchedListView(
  query?: import("./types").UnmatchedQueryInput,
) {
  return resolveProvider().getUnmatchedListView(query);
}

export async function applyBestGuessForUnmatchedSong(id: string) {
  return resolveProvider().applyBestGuessForUnmatchedSong(id);
}

export async function dismissUnmatchedSong(id: string) {
  return resolveProvider().dismissUnmatchedSong(id);
}

export async function dismissUnmatchedPlaylist(id: string) {
  return resolveProvider().dismissUnmatchedPlaylist(id);
}

export async function getSettingsView() {
  return resolveProvider().getSettingsView();
}

export async function updateSettings(
  payload: Partial<import("@/lib/types").SettingsView>,
) {
  return resolveProvider().updateSettings(payload);
}
