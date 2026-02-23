# Fast-Track UX Testing Runbook

This repo currently includes a **frontend-first UX vertical slice** for the music sync app.

## What Is Implemented (Mocked Backend)

- App shell with sidebar, auth status dots, and unmatched badge
- `/setup` wizard (Spotify, Apple, initial scan)
- `/dashboard` maintenance-first layout
- `/unmatched` inline triage with filters + optimistic actions
- `/settings` notifications / threshold / playlist exclusion toggles
- Mock API routes (`/api/...`) backed by an in-memory store
- Component tests (Vitest + Testing Library)

## What Is Not Implemented Yet (Real Integrations)

- Supabase persistence
- Spotify OAuth + tokens
- Railway Apple Music auth flow
- Apple Music Playwright scraper
- Python sync engine
- GitHub Actions runner
- Resend email notifications

## Local Run (UX Slice)

```bash
cd frontend
npm install
npm run dev
```

Open:

- `http://localhost:3000`

You will be redirected to `/setup` until onboarding is complete.

## Fast Manual Test Checklist

1. Finish setup flow
   - Click `Connect with Spotify →`
   - Click `Open Apple Music Login →`
   - Click `Start Initial Scan →`
   - Wait for redirect to `/dashboard`
2. Verify dashboard
   - Top banner shows latest run status
   - `Sync Now →` opens confirmation instead of triggering immediately
   - `Review →` in unmatched column links to `/unmatched` with query params
   - Run history rows expand inline
3. Verify unmatched triage
   - `Use this ↑` removes a pending card quickly
   - `Dismiss` removes/moves a card and updates pending count
   - Filters update the URL query params
   - Dismissed sections stay collapsed by default
4. Verify settings
   - Toggle notification switches
   - Adjust sensitivity slider
   - Exclude/include playlists
   - Save and confirm state persists across navigation (same dev session)

## Automated Checks

```bash
cd frontend
npm run test
npm run build
npm run lint
```

## Mock State Behavior (Important)

- State is held in memory on the Next.js server process.
- Restarting `npm run dev` resets all setup progress and mock data.
- Manual sync (`Sync Now`) is simulated and transitions from `running` to `completed`.
- Initial setup scan is simulated and transitions from `queued` to `running` to `completed`.

## Next Phase Integration Map (No UI Rewrite Required)

The UI is intentionally wired to stable API contracts so real integrations can replace the mock store incrementally.

### Phase A: Replace Mock Store with Supabase Reads/Writes

- Keep existing route URLs and response shapes.
- Re-implement route handlers in:
  - `frontend/src/app/api/app-shell/route.ts`
  - `frontend/src/app/api/dashboard/route.ts`
  - `frontend/src/app/api/runs/...`
  - `frontend/src/app/api/unmatched/...`
  - `frontend/src/app/api/settings/route.ts`
  - `frontend/src/app/api/setup/...`
- Source data from Supabase tables instead of `src/lib/mock/store.ts`.

### Phase B: Real Setup Integrations

- `/api/setup/connect/spotify` -> redirect / callback flow (or replace with `/auth/spotify`)
- `/api/setup/connect/apple` -> call Railway auth service and poll status
- `/api/setup/initial-scan` -> enqueue real sync run trigger
- `/api/setup/initial-scan/status` -> poll real run status

### Phase C: Real Sync / Dashboard Data

- `/api/sync/trigger` -> GitHub Actions `workflow_dispatch`
- `/api/dashboard` + `/api/runs` -> `sync_runs` + summaries
- `/api/unmatched` -> `unmatched_songs` / `unmatched_playlists`

### Phase D: Remove Mock-Only Code

- Delete `frontend/src/lib/mock/store.ts`
- Keep type contracts in `frontend/src/lib/types.ts`
- Keep tests and switch fixtures to API-level mocks where needed

## Known Limitations in This UX Slice

- `Confirm →` on unmatched songs only works after selecting the existing best guess (manual search is deferred)
- Auth dots reflect setup completion only (not token/session validity yet)
- Setup route guard is mock-state based, not identity/user-session based
