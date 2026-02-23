# musicSynk

Frontend-first MVP scaffold for a personal Apple Music <-> Spotify sync tool.

## Fast Track Scope (Current)

- `frontend/` testable UX vertical slice (mock APIs + in-memory state)
- `railway-auth/` placeholder service directory
- `sync-engine/` placeholder service directory
- `supabase/` placeholder migrations directory

## Repo Layout

- `frontend/` Next.js app (dashboard, setup wizard, unmatched triage, settings)
- `railway-auth/` FastAPI + Playwright auth service (later)
- `sync-engine/` Python sync runner (later)
- `supabase/migrations/` SQL schema migrations (later)
- `.github/workflows/` CI/CD and scheduled sync workflows (later)

## Local Development (planned)

`frontend` will be runnable with:

```bash
cd frontend
npm install
npm run dev
```

## Notes

- `music-sync-plan.md` is intentionally ignored and kept local-only.
