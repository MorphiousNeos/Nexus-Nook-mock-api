-- Nexus Nook database schema (PostgreSQL)

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  rsi_connected BOOLEAN DEFAULT FALSE,
  rsi_handle VARCHAR(255),
  rsi_organization VARCHAR(255),
  last_rsi_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User ships table
CREATE TABLE IF NOT EXISTS user_ships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ship_name VARCHAR(255) NOT NULL,
  manufacturer VARCHAR(255),
  type VARCHAR(255),
  pledge BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, ship_name)
);

-- User progress table
CREATE TABLE IF NOT EXISTS user_progress (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Discord OAuth identity (idempotent backfill for existing installs)
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_id VARCHAR(32);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_discord_id
  ON users(discord_id) WHERE discord_id IS NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_user_ships_user_id ON user_ships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);

-- =============================================================================
-- COMMUNITY
-- =============================================================================

-- Looking For Group posts
CREATE TABLE IF NOT EXISTS lfg_posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(140) NOT NULL,
  activity VARCHAR(60),
  region VARCHAR(60),
  players_needed INTEGER,
  body TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lfg_created ON lfg_posts(created_at DESC);

-- Community feed posts
CREATE TABLE IF NOT EXISTS community_posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_posts_created ON community_posts(created_at DESC);

-- Player marketplace listings
CREATE TABLE IF NOT EXISTS market_listings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  kind VARCHAR(10) NOT NULL DEFAULT 'sell',
  title VARCHAR(140) NOT NULL,
  price BIGINT,
  body TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_market_created ON market_listings(created_at DESC);

-- Orgs / groups
CREATE TABLE IF NOT EXISTS orgs (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  tag VARCHAR(20),
  description TEXT,
  rsi_sid VARCHAR(30),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orgs_created ON orgs(created_at DESC);
-- Idempotent backfill for existing installs that pre-date rsi_sid.
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS rsi_sid VARCHAR(30);

-- Org membership
CREATE TABLE IF NOT EXISTS org_members (
  org_id INTEGER REFERENCES orgs(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);

-- Crowd-sourced event timer observations (e.g. Executive Hangar cycle).
-- Each row: a user reporting "the OPEN phase started at observed_at".
CREATE TABLE IF NOT EXISTS timer_observations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  kind VARCHAR(20) NOT NULL DEFAULT 'exec_hangar',
  observed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_timer_obs ON timer_observations(kind, created_at DESC);

-- Content reports (moderation queue)
CREATE TABLE IF NOT EXISTS content_reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  kind VARCHAR(10) NOT NULL,
  content_id INTEGER NOT NULL,
  reason VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_created ON content_reports(created_at DESC);

-- Scheduled operations / events for an org
CREATE TABLE IF NOT EXISTS ops_events (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES orgs(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(140) NOT NULL,
  starts_at TIMESTAMP,
  body TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ops_org ON ops_events(org_id, starts_at);
