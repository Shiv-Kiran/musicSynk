import "server-only";

import { randomBytes } from "node:crypto";

import { getServerConfig } from "@/lib/server/config";

export const SPOTIFY_READONLY_SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-library-read",
] as const;

export type SpotifyTokenSet = {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
  expires_at: string;
};

export type SpotifyProfile = {
  id: string;
  display_name: string | null;
  product?: string;
};

function requireSpotifyOAuthConfig() {
  const config = getServerConfig();
  if (!config.spotifyClientId || !config.spotifyClientSecret || !config.spotifyRedirectUri) {
    throw new Error(
      "Missing Spotify OAuth envs. Set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REDIRECT_URI.",
    );
  }
  return {
    clientId: config.spotifyClientId,
    clientSecret: config.spotifyClientSecret,
    redirectUri: config.spotifyRedirectUri,
  };
}

export function createSpotifyOAuthState() {
  return randomBytes(16).toString("base64url");
}

export function buildSpotifyAuthorizeUrl(state: string) {
  const { clientId, redirectUri } = requireSpotifyOAuthConfig();
  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", SPOTIFY_READONLY_SCOPES.join(" "));
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("show_dialog", "true");
  return url.toString();
}

function basicAuthHeader(clientId: string, clientSecret: string) {
  const token = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

export async function exchangeSpotifyCodeForTokens(code: string): Promise<SpotifyTokenSet> {
  const { clientId, clientSecret, redirectUri } = requireSpotifyOAuthConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const json = (await response.json()) as {
    access_token?: string;
    token_type?: string;
    scope?: string;
    expires_in?: number;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !json.access_token || !json.token_type || !json.expires_in) {
    throw new Error(
      `Spotify token exchange failed: ${json.error ?? response.status} ${json.error_description ?? ""}`.trim(),
    );
  }

  return {
    access_token: json.access_token,
    token_type: json.token_type,
    scope: json.scope ?? "",
    expires_in: json.expires_in,
    refresh_token: json.refresh_token,
    expires_at: new Date(Date.now() + json.expires_in * 1000).toISOString(),
  };
}

export async function refreshSpotifyAccessToken(refreshToken: string): Promise<SpotifyTokenSet> {
  const { clientId, clientSecret } = requireSpotifyOAuthConfig();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const json = (await response.json()) as {
    access_token?: string;
    token_type?: string;
    scope?: string;
    expires_in?: number;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !json.access_token || !json.token_type || !json.expires_in) {
    throw new Error(
      `Spotify token refresh failed: ${json.error ?? response.status} ${json.error_description ?? ""}`.trim(),
    );
  }

  return {
    access_token: json.access_token,
    token_type: json.token_type,
    scope: json.scope ?? "",
    expires_in: json.expires_in,
    refresh_token: json.refresh_token ?? refreshToken,
    expires_at: new Date(Date.now() + json.expires_in * 1000).toISOString(),
  };
}

export async function fetchSpotifyProfile(accessToken: string): Promise<SpotifyProfile> {
  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const json = (await response.json()) as {
    id?: string;
    display_name?: string | null;
    product?: string;
    error?: { message?: string };
  };

  if (!response.ok || !json.id) {
    throw new Error(
      `Spotify profile fetch failed: ${json.error?.message ?? response.statusText}`,
    );
  }

  return {
    id: json.id,
    display_name: json.display_name ?? null,
    product: json.product,
  };
}
