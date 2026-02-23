import "server-only";

import { createHash } from "node:crypto";

import {
  fetchSpotifyProfile,
  refreshSpotifyAccessToken,
  type SpotifyProfile,
  type SpotifyTokenSet,
} from "@/lib/server/spotify/oauth";
import {
  getDecryptedAuthSession,
  upsertEncryptedAuthSession,
  type StoredAuthEnvelope,
} from "@/lib/server/data/auth-sessions";

type SpotifyPlaylistListItem = {
  id: string;
  name: string;
  owner: { id: string };
  tracks: { total: number };
};

type SnapshotSong = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  isrc: string | null;
  is_explicit: boolean | null;
  duration_ms: number | null;
};

type SnapshotPlaylist = {
  id: string;
  name: string;
  song_count: number;
  fingerprint: string;
  songs: SnapshotSong[];
};

export type SpotifyLibrarySnapshotResult = {
  profile: SpotifyProfile;
  snapshot: {
    playlists: SnapshotPlaylist[];
  };
  playlistCount: number;
  totalSongs: number;
};

function ensureSpotifyTokenPayload(
  envelope: StoredAuthEnvelope | null,
): { tokenSet: SpotifyTokenSet; meta: Record<string, unknown> } | null {
  if (!envelope || envelope.kind !== "spotify_token_set") return null;
  if (!envelope.payload || typeof envelope.payload !== "object") return null;
  const tokenSet = envelope.payload as SpotifyTokenSet;
  return {
    tokenSet,
    meta: (envelope.meta ?? {}) as Record<string, unknown>,
  };
}

export async function getValidSpotifyTokenSet() {
  const session = await getDecryptedAuthSession<StoredAuthEnvelope>("spotify");
  const parsed = ensureSpotifyTokenPayload(session?.decrypted ?? null);
  if (!session || !parsed) return null;

  const expiresAtMs = Date.parse(parsed.tokenSet.expires_at ?? "");
  const needsRefresh =
    !Number.isFinite(expiresAtMs) ||
    expiresAtMs <= Date.now() + 60_000;

  if (!needsRefresh) {
    return parsed;
  }

  if (!parsed.tokenSet.refresh_token) {
    return parsed;
  }

  const refreshed = await refreshSpotifyAccessToken(parsed.tokenSet.refresh_token);
  const profileMeta = parsed.meta.profile;
  const scopes = parsed.meta.scopes;

  await upsertEncryptedAuthSession("spotify", {
    kind: "spotify_token_set",
    payload: refreshed,
    meta: {
      ...parsed.meta,
      scopes: scopes ?? refreshed.scope,
      profile: profileMeta,
      refreshed_at: new Date().toISOString(),
    },
  });

  return {
    tokenSet: refreshed,
    meta: parsed.meta,
  };
}

async function spotifyApi<T>(accessToken: string, endpoint: string): Promise<T> {
  const response = await fetch(`https://api.spotify.com${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const json = (await response.json()) as T & {
    error?: { message?: string; status?: number };
  };

  if (!response.ok) {
    throw new Error(json.error?.message ?? `Spotify API error: ${response.status}`);
  }

  return json;
}

async function listAllUserPlaylists(accessToken: string) {
  const playlists: SpotifyPlaylistListItem[] = [];
  let nextEndpoint = "/v1/me/playlists?limit=50";

  while (nextEndpoint) {
    const page = await spotifyApi<{
      items: SpotifyPlaylistListItem[];
      next: string | null;
    }>(accessToken, nextEndpoint);
    playlists.push(...page.items);
    if (!page.next) {
      nextEndpoint = "";
    } else {
      const nextUrl = new URL(page.next);
      nextEndpoint = `${nextUrl.pathname}${nextUrl.search}`;
    }
  }

  return playlists;
}

async function listAllPlaylistTracks(accessToken: string, playlistId: string): Promise<SnapshotSong[]> {
  const songs: SnapshotSong[] = [];
  let nextEndpoint = `/v1/playlists/${encodeURIComponent(playlistId)}/tracks?limit=100`;

  while (nextEndpoint) {
    const page = await spotifyApi<{
      items: Array<{
        is_local?: boolean;
        track?: {
          type?: string;
          id?: string | null;
          name?: string;
          explicit?: boolean;
          duration_ms?: number;
          external_ids?: { isrc?: string };
          album?: { name?: string };
          artists?: Array<{ name?: string }>;
        } | null;
      }>;
      next: string | null;
    }>(accessToken, nextEndpoint);

    for (const item of page.items) {
      if (item.is_local) continue;
      const track = item.track;
      if (!track || track.type !== "track" || !track.id || !track.name) continue;
      songs.push({
        id: track.id,
        title: track.name,
        artist:
          track.artists?.map((artist) => artist.name).filter(Boolean).join(", ") ?? "Unknown Artist",
        album: track.album?.name ?? null,
        isrc: track.external_ids?.isrc ?? null,
        is_explicit: typeof track.explicit === "boolean" ? track.explicit : null,
        duration_ms: typeof track.duration_ms === "number" ? track.duration_ms : null,
      });
    }

    if (!page.next) {
      nextEndpoint = "";
    } else {
      const nextUrl = new URL(page.next);
      nextEndpoint = `${nextUrl.pathname}${nextUrl.search}`;
    }
  }

  return songs;
}

function computeFingerprint(songIds: string[]) {
  return createHash("sha256")
    .update(songIds.slice().sort().join(","))
    .digest("hex")
    .slice(0, 16);
}

export async function fetchSpotifyLibrarySnapshot(): Promise<SpotifyLibrarySnapshotResult> {
  const session = await getValidSpotifyTokenSet();
  if (!session) {
    throw new Error("Spotify auth session not found");
  }

  const accessToken = session.tokenSet.access_token;
  const profile = await fetchSpotifyProfile(accessToken);

  // Persist profile metadata for setup/dashboard confidence.
  await upsertEncryptedAuthSession("spotify", {
    kind: "spotify_token_set",
    payload: session.tokenSet,
    meta: {
      ...session.meta,
      profile,
      profile_synced_at: new Date().toISOString(),
    },
  });

  const allPlaylists = await listAllUserPlaylists(accessToken);
  const userOwned = allPlaylists.filter((playlist) => playlist.owner?.id === profile.id);

  const snapshotPlaylists: SnapshotPlaylist[] = [];
  let totalSongs = 0;

  for (const playlist of userOwned) {
    const songs = await listAllPlaylistTracks(accessToken, playlist.id);
    totalSongs += songs.length;
    snapshotPlaylists.push({
      id: playlist.id,
      name: playlist.name,
      song_count: songs.length,
      fingerprint: computeFingerprint(songs.map((song) => song.id)),
      songs,
    });
  }

  return {
    profile,
    snapshot: {
      playlists: snapshotPlaylists,
    },
    playlistCount: snapshotPlaylists.length,
    totalSongs,
  };
}
