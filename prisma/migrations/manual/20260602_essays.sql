-- Migration: persistent essay storage (replaces /tmp filesystem cache).
-- Full generated essay per (user, profile, service); sliced per section.
-- Apply:
--     docker exec -i hgct-postgres psql -U nguydev -d zodiacdb \
--       < prisma/migrations/manual/20260602_essays.sql

CREATE TABLE IF NOT EXISTS "essays" (
  "id"          SERIAL PRIMARY KEY,
  "user_uid"    TEXT NOT NULL,
  "profile_uid" TEXT NOT NULL,
  "service"     TEXT NOT NULL,
  "content"     TEXT NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "essays_user_uid_profile_uid_service_key"
  ON "essays"("user_uid", "profile_uid", "service");
