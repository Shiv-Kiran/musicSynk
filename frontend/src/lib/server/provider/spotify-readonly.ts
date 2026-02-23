import "server-only";

import type { AppProvider } from "./types";

// Implemented in subsequent commits. This stub allows the provider seam and mode
// switch to land independently from the Supabase/Spotify integration work.
export const spotifyReadonlyProvider: AppProvider = {
  async getAppShellStatusView() {
    throw new Error("spotify_readonly provider not implemented yet");
  },
  async getDashboardView() {
    throw new Error("spotify_readonly provider not implemented yet");
  },
  async listRuns() {
    throw new Error("spotify_readonly provider not implemented yet");
  },
  async getRunDetailView() {
    throw new Error("spotify_readonly provider not implemented yet");
  },
  async getSetupStatusView() {
    throw new Error("spotify_readonly provider not implemented yet");
  },
  async connectSpotify() {
    throw new Error("spotify_readonly provider not implemented yet");
  },
  async connectApple() {
    throw new Error("spotify_readonly provider not implemented yet");
  },
  async startInitialScan() {
    throw new Error("spotify_readonly provider not implemented yet");
  },
  async triggerManualSync() {
    throw new Error("spotify_readonly provider not implemented yet");
  },
  async getUnmatchedListView() {
    throw new Error("spotify_readonly provider not implemented yet");
  },
  async applyBestGuessForUnmatchedSong() {
    throw new Error("spotify_readonly provider not implemented yet");
  },
  async dismissUnmatchedSong() {
    throw new Error("spotify_readonly provider not implemented yet");
  },
  async dismissUnmatchedPlaylist() {
    throw new Error("spotify_readonly provider not implemented yet");
  },
  async getSettingsView() {
    throw new Error("spotify_readonly provider not implemented yet");
  },
  async updateSettings() {
    throw new Error("spotify_readonly provider not implemented yet");
  },
};
