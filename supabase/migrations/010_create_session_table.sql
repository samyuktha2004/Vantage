-- Migration: 010_create_session_table.sql
-- Creates the session table used by connect-pg-simple for express-session.
-- Uses IF NOT EXISTS so it's safe to run multiple times or on restored DBs.

CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);

ALTER TABLE IF EXISTS "session" ADD CONSTRAINT IF NOT EXISTS "session_pkey" PRIMARY KEY ("sid");

-- Drop any previously created index variants (handle quoted/case-sensitive names)
DROP INDEX IF EXISTS "IDX_session_expire";
DROP INDEX IF EXISTS idx_session_expire;
CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);

-- Notes:
-- This schema matches the default expected by connect-pg-simple (JSON session payload).
-- The migration is idempotent and safe to run in CI or deployment scripts.
