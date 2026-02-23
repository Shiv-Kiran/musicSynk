import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { buildSpotifyAuthorizeUrl, createSpotifyOAuthState } from "@/lib/server/spotify/oauth";

const SPOTIFY_OAUTH_STATE_COOKIE = "musicsynk_spotify_oauth_state";

export default async function SpotifyAuthStartPage() {
  const state = createSpotifyOAuthState();
  const jar = await cookies();
  jar.set(SPOTIFY_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  redirect(buildSpotifyAuthorizeUrl(state));
}
