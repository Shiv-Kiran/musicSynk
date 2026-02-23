import "server-only";

import { decryptJson, encryptJson } from "@/lib/server/security/crypto";
import { getSupabaseAdminClient } from "@/lib/server/supabase/client";

export type AuthSessionService = "spotify" | "apple_music";

export type StoredAuthEnvelope = {
  kind: "spotify_token_set" | "apple_music_session";
  payload: unknown;
  meta?: Record<string, unknown>;
};

type AuthSessionRow = {
  id: string;
  service: AuthSessionService;
  encrypted_data: unknown;
  is_valid: boolean;
  last_validated_at: string | null;
  invalidated_reason: string | null;
  created_at: string;
  updated_at: string;
};

export async function getAuthSessionRow(service: AuthSessionService) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("auth_sessions")
    .select("*")
    .eq("service", service)
    .maybeSingle<AuthSessionRow>();

  if (error) {
    throw new Error(`Failed to read auth session for ${service}: ${error.message}`);
  }

  return data;
}

export async function getDecryptedAuthSession<T>(
  service: AuthSessionService,
) {
  const row = await getAuthSessionRow(service);
  if (!row) return null;
  return {
    ...row,
    decrypted: decryptJson<T>(row.encrypted_data),
  };
}

export async function upsertEncryptedAuthSession(
  service: AuthSessionService,
  envelope: StoredAuthEnvelope,
) {
  const supabase = getSupabaseAdminClient();
  const encrypted = encryptJson(envelope);
  const { data, error } = await supabase
    .from("auth_sessions")
    .upsert(
      {
        service,
        encrypted_data: encrypted,
        is_valid: true,
        invalidated_reason: null,
        last_validated_at: new Date().toISOString(),
      },
      {
        onConflict: "service",
      },
    )
    .select("*")
    .single<AuthSessionRow>();

  if (error) {
    throw new Error(`Failed to upsert auth session for ${service}: ${error.message}`);
  }

  return data;
}

export async function markAuthSessionInvalid(
  service: AuthSessionService,
  reason: string,
) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("auth_sessions")
    .update({
      is_valid: false,
      invalidated_reason: reason,
      last_validated_at: new Date().toISOString(),
    })
    .eq("service", service);

  if (error) {
    throw new Error(`Failed to invalidate auth session for ${service}: ${error.message}`);
  }
}
