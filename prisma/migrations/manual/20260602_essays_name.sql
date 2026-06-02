-- Add profile name to essays (for the "Hồ sơ đã xem" listing). Additive, nullable.
--   docker exec -i hgct-postgres psql -U nguydev -d zodiacdb < prisma/migrations/manual/20260602_essays_name.sql

ALTER TABLE "essays" ADD COLUMN IF NOT EXISTS "name" TEXT;
