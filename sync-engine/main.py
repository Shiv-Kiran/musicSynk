from __future__ import annotations

import argparse
import json
import sys

from config import load_config, require_read_only_mode
from db import SupabaseReadClient
from spotify_client import SpotifyReadOnlyClient


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="musicSynk sync-engine read-only smoke command (foundation for future sync runs)"
    )
    parser.add_argument(
        "--max-runs",
        type=int,
        default=5,
        help="Number of recent sync_runs rows to fetch from Supabase for inspection",
    )
    return parser


def run() -> int:
    args = build_parser().parse_args()
    config = load_config()
    require_read_only_mode(config)

    print("musicSynk sync-engine smoke (read-only)")

    if config.supabase_url and config.supabase_service_key:
        supabase = SupabaseReadClient(url=config.supabase_url, service_key=config.supabase_service_key)
        recent_runs = supabase.list_recent_runs(limit=args.max_runs)
        spotify_auth_session = supabase.get_auth_session("spotify")
        print(
            json.dumps(
                {
                    "supabase": {
                        "recent_run_count": len(recent_runs),
                        "has_spotify_auth_session_row": bool(spotify_auth_session),
                    }
                },
                indent=2,
            )
        )
    else:
        print("Supabase env not configured; skipping Supabase smoke checks.")

    if not config.spotify_access_token:
        print(
            "SPOTIFY_ACCESS_TOKEN not set; skipping Spotify API smoke checks. "
            "Set a temporary token for local validation only."
        )
        return 0

    spotify = SpotifyReadOnlyClient(config.spotify_access_token)
    summary = spotify.summarize_user_owned_playlists()
    print(json.dumps({"spotify": summary}, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(run())
    except KeyboardInterrupt:
        print("Interrupted", file=sys.stderr)
        raise SystemExit(130)
