import "server-only";

import type { BackendMode } from "@/lib/types";

function readMode(value: string | undefined): BackendMode {
  if (value === "spotify_readonly") return "spotify_readonly";
  return "mock";
}

function readBoolean(value: string | undefined, defaultValue: boolean) {
  if (value == null || value === "") return defaultValue;
  const normalized = value.toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

export type ServerConfig = {
  appMode: BackendMode;
  syncWriteEnabled: boolean;
  supabaseUrl?: string;
  supabaseServiceKey?: string;
  encryptionKey?: string;
  spotifyClientId?: string;
  spotifyClientSecret?: string;
  spotifyRedirectUri?: string;
  appBaseUrl?: string;
};

export function getServerConfig(): ServerConfig {
  return {
    appMode: readMode(process.env.MUSICSYNC_APP_MODE),
    syncWriteEnabled: readBoolean(process.env.SYNC_WRITE_ENABLED, false),
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
    encryptionKey: process.env.ENCRYPTION_KEY,
    spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
    spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    spotifyRedirectUri: process.env.SPOTIFY_REDIRECT_URI,
    appBaseUrl: process.env.NEXT_PUBLIC_BASE_URL,
  };
}

function requireString(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing required server env: ${name}`);
  }
  return value;
}

export function getSupabaseServerEnv() {
  const config = getServerConfig();
  return {
    url: requireString(config.supabaseUrl, "SUPABASE_URL"),
    serviceKey: requireString(config.supabaseServiceKey, "SUPABASE_SERVICE_KEY"),
  };
}

export function getEncryptionSecret() {
  const config = getServerConfig();
  return requireString(config.encryptionKey, "ENCRYPTION_KEY");
}

export function hasSpotifyReadonlyEnv() {
  const config = getServerConfig();
  return Boolean(
    config.supabaseUrl &&
      config.supabaseServiceKey &&
      config.encryptionKey &&
      config.spotifyClientId &&
      config.spotifyClientSecret &&
      config.spotifyRedirectUri,
  );
}
