import "server-only";

import type { SettingsView } from "@/lib/types";
import { getSupabaseAdminClient } from "@/lib/server/supabase/client";

type UserSettingsRow = {
  id: string;
  email: string;
  match_confidence_threshold: number;
  send_email_on_success: boolean;
  send_email_on_failure: boolean;
  send_email_on_reauth_needed: boolean;
};

const DEFAULT_SETTINGS_INSERT = {
  email: "",
  match_confidence_threshold: 0.85,
  send_email_on_success: true,
  send_email_on_failure: true,
  send_email_on_reauth_needed: true,
};

function mapSettingsRowToView(row: UserSettingsRow): SettingsView {
  return {
    notifications: {
      success: row.send_email_on_success,
      failure: row.send_email_on_failure,
      reauth: row.send_email_on_reauth_needed,
    },
    matchThreshold: row.match_confidence_threshold,
    playlists: [],
  };
}

export async function ensureUserSettingsRow(): Promise<UserSettingsRow> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    throw new Error(`Failed to read user settings: ${error.message}`);
  }

  const row = (data?.[0] ?? null) as UserSettingsRow | null;
  if (row) return row;

  const { data: inserted, error: insertError } = await supabase
    .from("user_settings")
    .insert(DEFAULT_SETTINGS_INSERT)
    .select("*")
    .single<UserSettingsRow>();

  if (insertError) {
    throw new Error(`Failed to create default user settings: ${insertError.message}`);
  }

  return inserted;
}

export async function getSettingsViewFromSupabase() {
  const row = await ensureUserSettingsRow();
  return mapSettingsRowToView(row);
}

export async function updateSettingsInSupabase(payload: Partial<SettingsView>) {
  const supabase = getSupabaseAdminClient();
  const row = await ensureUserSettingsRow();

  const patch: Partial<UserSettingsRow> = {};

  if (payload.notifications) {
    if (typeof payload.notifications.success === "boolean") {
      patch.send_email_on_success = payload.notifications.success;
    }
    if (typeof payload.notifications.failure === "boolean") {
      patch.send_email_on_failure = payload.notifications.failure;
    }
    if (typeof payload.notifications.reauth === "boolean") {
      patch.send_email_on_reauth_needed = payload.notifications.reauth;
    }
  }

  if (
    typeof payload.matchThreshold === "number" &&
    Number.isFinite(payload.matchThreshold)
  ) {
    patch.match_confidence_threshold = Math.max(0.7, Math.min(0.95, payload.matchThreshold));
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from("user_settings")
      .update(patch)
      .eq("id", row.id);

    if (error) {
      throw new Error(`Failed to update user settings: ${error.message}`);
    }
  }

  const refreshed = await ensureUserSettingsRow();
  const view = mapSettingsRowToView(refreshed);

  if (Array.isArray(payload.playlists)) {
    // Playlist exclusions move to playlist_registry in later commit.
    view.playlists = payload.playlists.map((item) => ({
      id: item.id,
      name: item.name,
      excluded: item.excluded,
    }));
  }

  return view;
}
