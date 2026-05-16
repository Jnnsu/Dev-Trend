CREATE TABLE IF NOT EXISTS trending_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key   TEXT UNIQUE NOT NULL,
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON trending_cache(expires_at);
ALTER TABLE trending_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON trending_cache USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS user_watchlist (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID REFERENCES auth.users ON DELETE CASCADE,
  owner    TEXT NOT NULL,
  name     TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, owner, name)
);
ALTER TABLE user_watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own watchlist" ON user_watchlist FOR ALL USING (auth.uid() = user_id);
