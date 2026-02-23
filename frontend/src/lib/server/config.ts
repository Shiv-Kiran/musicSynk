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
};

export function getServerConfig(): ServerConfig {
  return {
    appMode: readMode(process.env.MUSICSYNC_APP_MODE),
    syncWriteEnabled: readBoolean(process.env.SYNC_WRITE_ENABLED, false),
  };
}
