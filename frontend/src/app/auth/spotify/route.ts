import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { buildSpotifyAuthorizeUrl, createSpotifyOAuthState } from "@/lib/server/spotify/oauth";

const SPOTIFY_OAUTH_STATE_COOKIE = "musicsynk_spotify_oauth_state";

export async function GET() {
  const state = createSpotifyOAuthState();
  const jar = await cookies();
  jar.set(SPOTIFY_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(buildSpotifyAuthorizeUrl(state));
}
