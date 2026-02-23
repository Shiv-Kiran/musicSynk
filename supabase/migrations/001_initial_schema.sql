-- musicSynk initial schema (single-user, read-only validation ready)
-- Forward-compatible with later sync-engine and Apple integration phases.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared trigger for updated_at maintenance
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Sync runs (created early so unmatched tables can reference it)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_kind TEXT NOT NULL DEFAULT 'sync' CHECK (run_kind IN ('snapshot_refresh', 'sync')),
  triggered_by TEXT NOT NULL CHECK (triggered_by IN (
    'cron',
    'manual',
    'post_reauth',
    'initial_setup'
  )),
  status TEXT NOT NULL CHECK (status IN (
    'running',
    'completed',
    'failed',
    'partial'
  )),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  summary JSONB,
  error_details TEXT,
  scraper_version TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_started_at_desc
  ON sync_runs (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_runs_status_started_at_desc
  ON sync_runs (status, started_at DESC);

-- ---------------------------------------------------------------------------
-- Auth sessions (encrypted Spotify tokens / Apple cookies)
-- Single-user constraint: one row per service
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL CHECK (service IN ('spotify', 'apple_music')),
  encrypted_data JSONB NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT TRUE,
  last_validated_at TIMESTAMPTZ,
  invalidated_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (service)
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_service_valid
  ON auth_sessions (service, is_valid);

DROP TRIGGER IF EXISTS trg_auth_sessions_set_updated_at ON auth_sessions;
CREATE TRIGGER trg_auth_sessions_set_updated_at
BEFORE UPDATE ON auth_sessions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Snapshots (full point-in-time library state per service)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL CHECK (service IN ('spotify', 'apple_music')),
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshot_data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshots_service_taken_at_desc
  ON snapshots (service, taken_at DESC);

-- ---------------------------------------------------------------------------
-- Song mapping cache (used in later phases)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS song_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spotify_id TEXT,
  apple_music_id TEXT,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  isrc TEXT,
  is_explicit BOOLEAN,
  match_confidence DOUBLE PRECISION CHECK (match_confidence >= 0 AND match_confidence <= 1),
  match_method TEXT CHECK (match_method IN ('isrc', 'exact', 'fuzzy', 'manual', 'cache')),
  needs_review BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (spotify_id, apple_music_id)
);

CREATE INDEX IF NOT EXISTS idx_song_map_spotify_id ON song_map (spotify_id);
CREATE INDEX IF NOT EXISTS idx_song_map_apple_music_id ON song_map (apple_music_id);
CREATE INDEX IF NOT EXISTS idx_song_map_isrc ON song_map (isrc);

-- ---------------------------------------------------------------------------
-- Playlist registry (known cross-platform playlists + local state)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS playlist_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spotify_id TEXT UNIQUE,
  apple_music_id TEXT UNIQUE,
  name TEXT NOT NULL,
  is_excluded BOOLEAN NOT NULL DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,
  last_known_fingerprint_spotify TEXT,
  last_known_fingerprint_apple TEXT,
  song_count_spotify INTEGER,
  song_count_apple INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playlist_registry_name ON playlist_registry (name);

-- ---------------------------------------------------------------------------
-- User settings (single-user app; seed/ensure one row in app bootstrap)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL DEFAULT '',
  match_confidence_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.85
    CHECK (match_confidence_threshold >= 0.5 AND match_confidence_threshold <= 1),
  send_email_on_success BOOLEAN NOT NULL DEFAULT TRUE,
  send_email_on_failure BOOLEAN NOT NULL DEFAULT TRUE,
  send_email_on_reauth_needed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_user_settings_set_updated_at ON user_settings;
CREATE TRIGGER trg_user_settings_set_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Scraper config (used later; seeded optionally in app/admin script)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scraper_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  selectors JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_verified_at TIMESTAMPTZ,
  broke_at TIMESTAMPTZ,
  broke_on_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scraper_config_active
  ON scraper_config (is_active, created_at DESC);

-- ---------------------------------------------------------------------------
-- Unmatched entities (later phases; read endpoints may return empty in this PR)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS unmatched_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_service TEXT NOT NULL CHECK (source_service IN ('spotify', 'apple_music')),
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  isrc TEXT,
  is_explicit BOOLEAN,
  found_in_playlist TEXT NOT NULL,
  reason TEXT CHECK (reason IN ('no_results', 'low_confidence', 'multiple_ambiguous')),
  best_candidate JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'mapped', 'dismissed')),
  sync_run_id UUID REFERENCES sync_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_unmatched_songs_status_created_at_desc
  ON unmatched_songs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unmatched_songs_sync_run_id
  ON unmatched_songs (sync_run_id);

CREATE TABLE IF NOT EXISTS unmatched_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_service TEXT NOT NULL CHECK (source_service IN ('spotify', 'apple_music')),
  source_id TEXT NOT NULL,
  playlist_name TEXT NOT NULL,
  song_count INTEGER,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'mapped', 'dismissed', 'created')),
  sync_run_id UUID REFERENCES sync_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_unmatched_playlists_status_created_at_desc
  ON unmatched_playlists (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unmatched_playlists_sync_run_id
  ON unmatched_playlists (sync_run_id);

