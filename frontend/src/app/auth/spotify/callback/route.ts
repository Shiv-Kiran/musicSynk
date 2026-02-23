import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { upsertEncryptedAuthSession } from "@/lib/server/data/auth-sessions";
import {
  exchangeSpotifyCodeForTokens,
  fetchSpotifyProfile,
  SPOTIFY_READONLY_SCOPES,
} from "@/lib/server/spotify/oauth";

const SPOTIFY_OAUTH_STATE_COOKIE = "musicsynk_spotify_oauth_state";

function redirectWithError(requestUrl: URL, message: string) {
  const redirectUrl = new URL("/setup", requestUrl);
  redirectUrl.searchParams.set("error", message);
  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    return redirectWithError(
      url,
      `spotify_oauth_${error}${errorDescription ? `:${errorDescription}` : ""}`,
    );
  }

  if (!code || !state) {
    return redirectWithError(url, "spotify_oauth_missing_code_or_state");
  }

  const jar = await cookies();
  const expectedState = jar.get(SPOTIFY_OAUTH_STATE_COOKIE)?.value;
  jar.delete(SPOTIFY_OAUTH_STATE_COOKIE);

  if (!expectedState || expectedState !== state) {
    return redirectWithError(url, "spotify_oauth_state_mismatch");
  }

  try {
    const tokenSet = await exchangeSpotifyCodeForTokens(code);
    const profile = await fetchSpotifyProfile(tokenSet.access_token);

    await upsertEncryptedAuthSession("spotify", {
      kind: "spotify_token_set",
      payload: tokenSet,
      meta: {
        profile,
        scopes: tokenSet.scope || SPOTIFY_READONLY_SCOPES.join(" "),
        connected_at: new Date().toISOString(),
      },
    });

    return NextResponse.redirect(new URL("/setup?spotify=connected", url));
  } catch (exchangeError) {
    const message =
      exchangeError instanceof Error ? exchangeError.message : "spotify_oauth_failed";
    return redirectWithError(url, message.slice(0, 180));
  }
}
