# Real Data Read-Only Validation (Spotify + Supabase)

This phase validates real Spotify data in the existing UI without allowing playlist writes.

## Safety Rules (Must Stay True)

- `SYNC_WRITE_ENABLED=false`
- `MUSICSYNC_APP_MODE=spotify_readonly`
- Spotify OAuth scopes are read-only only:
  - `playlist-read-private`
  - `playlist-read-collaborative`
  - `user-library-read`
- No Spotify `playlist-modify-*` scopes are requested
- Dashboard action label should read `Refresh Snapshot` (not `Sync Now`) in read-only mode

## What Is Real in This PR

- Spotify OAuth connection through the website (`/auth/spotify`)
- Encrypted token storage in Supabase `auth_sessions`
- Real Spotify read-only snapshot refresh from frontend API routes
- Supabase-backed `sync_runs`, `snapshots`, `playlist_registry`, `user_settings`
- Dashboard/app shell/settings reading real Supabase state in `spotify_readonly` mode

## What Is Still Deferred

- Apple auth and scraping
- Matching/resolver pipeline
- Any playlist writes (Spotify or Apple)
- GitHub Actions and email notifications

## Local Setup (Frontend)

Create `frontend/.env.local` (or set equivalent env vars in your shell) with:

```bash
NEXT_PUBLIC_BASE_URL=http://localhost:3000
MUSICSYNC_APP_MODE=spotify_readonly
SYNC_WRITE_ENABLED=false
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
ENCRYPTION_KEY=...
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/spotify/callback
```

Notes:
- `ENCRYPTION_KEY` is required for app-layer token encryption in `auth_sessions`.
- `SPOTIFY_REDIRECT_URI` must match your Spotify developer app config exactly.

## Supabase Setup

1. Create a Supabase project.
2. Apply `supabase/migrations/001_initial_schema.sql`.
3. Keep the service role key server-side only (`SUPABASE_SERVICE_KEY`).

## Spotify App Setup

1. Create a Spotify app in the Spotify Developer Dashboard.
2. Add redirect URI:
   - `http://localhost:3000/auth/spotify/callback`
3. Copy client ID and client secret into env vars.
4. Do not use playlist modify scopes for this phase.

## Manual Validation Checklist (No Write)

1. Start frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`
2. Open the app and confirm it routes to `/setup`.
3. Connect Spotify (real OAuth).
4. Confirm Supabase `auth_sessions` has a `spotify` row and `encrypted_data` is populated.
5. Start the initial Spotify scan.
6. Confirm Supabase receives:
   - `sync_runs` row (`run_kind = snapshot_refresh`)
   - `snapshots` row (`service = spotify`)
   - `playlist_registry` rows
7. Confirm dashboard banner shows read-only note and `Refresh Snapshot`.
8. Run `Refresh Snapshot` again and verify no playlists were modified in Spotify.

## Quick Safety Checks Before Merge

1. Search for Spotify write scopes:
   - ensure no `playlist-modify-private`
   - ensure no `playlist-modify-public`
2. Search for Spotify write endpoints in runtime code:
   - no POST/PUT playlist mutation calls on `api.spotify.com` in frontend read-only path
3. Confirm `SYNC_WRITE_ENABLED` defaults to `false`

## Optional Python Smoke Command (`sync-engine`)

This command is read-only and prints a small summary.

```bash
cd sync-engine
pip install -r requirements.txt
python main.py --max-runs 5
```

Optional (local only) Spotify smoke token:
- set `SPOTIFY_ACCESS_TOKEN` to a temporary access token to test the Python Spotify client read path
- never commit that token
