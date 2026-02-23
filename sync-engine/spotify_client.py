from __future__ import annotations

from typing import Any
from urllib.parse import parse_qsl, urlparse

import requests


class SpotifyReadOnlyClient:
    def __init__(self, access_token: str, timeout_seconds: int = 20) -> None:
        self._timeout = timeout_seconds
        self._session = requests.Session()
        self._session.headers.update({"Authorization": f"Bearer {access_token}"})

    def _get(self, endpoint: str, *, params: dict[str, Any] | None = None) -> dict[str, Any]:
        response = self._session.get(
            f"https://api.spotify.com{endpoint}",
            params=params,
            timeout=self._timeout,
        )
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict):
            raise RuntimeError("Unexpected Spotify API response")
        return data

    def get_profile(self) -> dict[str, Any]:
        return self._get("/v1/me")

    def list_user_playlists(self, *, page_limit: int = 50) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        endpoint = "/v1/me/playlists"
        params: dict[str, Any] | None = {"limit": min(max(page_limit, 1), 50)}

        while endpoint:
            page = self._get(endpoint, params=params)
            page_items = page.get("items") or []
            for item in page_items:
                if isinstance(item, dict):
                    items.append(item)

            next_url = page.get("next")
            if not next_url:
                break

            parsed = urlparse(str(next_url))
            endpoint = parsed.path
            params = None
            if parsed.query:
                params = dict(parse_qsl(parsed.query))

        return items

    def summarize_user_owned_playlists(self) -> dict[str, Any]:
        profile = self.get_profile()
        user_id = str(profile.get("id") or "")
        all_playlists = self.list_user_playlists()

        user_owned = []
        for playlist in all_playlists:
            owner = playlist.get("owner")
            owner_id = owner.get("id") if isinstance(owner, dict) else None
            if owner_id == user_id:
                user_owned.append(playlist)

        total_tracks = 0
        preview: list[dict[str, Any]] = []
        for playlist in user_owned:
            tracks = playlist.get("tracks")
            track_total = 0
            if isinstance(tracks, dict):
                raw_total = tracks.get("total")
                if isinstance(raw_total, int):
                    track_total = raw_total
            total_tracks += track_total
            if len(preview) < 5:
                preview.append(
                    {
                        "id": playlist.get("id"),
                        "name": playlist.get("name"),
                        "track_total": track_total,
                    }
                )

        return {
            "profile_id": profile.get("id"),
            "display_name": profile.get("display_name"),
            "playlist_count": len(user_owned),
            "total_tracks_estimate": total_tracks,
            "playlists_preview": preview,
        }
