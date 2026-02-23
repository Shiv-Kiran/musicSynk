# Supabase Schema Notes (Initial Migration)

The initial schema is defined in `supabase/migrations/001_initial_schema.sql`.

## Tables used in the Spotify read-only validation PR

- `auth_sessions`
  - stores encrypted auth payloads (`encrypted_data`) for services like Spotify
- `sync_runs`
  - stores run lifecycle entries (includes `run_kind = snapshot_refresh`)
- `snapshots`
  - stores timestamped snapshot JSON payloads by service
- `playlist_registry`
  - stores cross-service playlist bookkeeping (Spotify fields used now)
- `user_settings`
  - stores UI/settings values (single-user row)

## Snapshot JSON shape used in read-only mode (Spotify)

`snapshots.snapshot_data` (service = `spotify`) currently stores:

```json
{
  "playlists": [
    {
      "id": "spotify_playlist_id",
      "name": "Playlist Name",
      "song_count": 42,
      "fingerprint": "hexhash",
      "songs": [
        {
          "id": "spotify_track_id",
          "title": "Track",
          "artist": "Artist 1, Artist 2",
          "album": "Album Name",
          "isrc": "USXXX...",
          "is_explicit": false,
          "duration_ms": 123456
        }
      ]
    }
  ]
}
```

## `sync_runs.summary` shape used in read-only mode (snapshot refresh)

```json
{
  "mode": "spotify_readonly",
  "source": "spotify",
  "playlists_scanned": 12,
  "playlists_skipped": 0,
  "spotify_total_songs": 340,
  "spotify_total_playlists": 12,
  "spotify_profile_name": "your-name",
  "note": "Read-only validation mode: no playlist writes enabled"
}
```
