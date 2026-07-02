-- Migration: add saved_charts table (lá số đã lưu của user đăng nhập — đồng bộ DB dùng chung).
-- Client vẫn lưu localStorage; khi đăng nhập thì gộp local + bản DB này (hiện ở mọi thiết bị/origin).
-- Backward-compatible: prod chạy được dù chưa có bảng (Prisma client cũ không có model).
-- Apply:
--   docker exec -i hgct-postgres psql -U nguydev -d zodiacdb \
--     < prisma/migrations/manual/20260702_saved_charts.sql

BEGIN;

CREATE TABLE IF NOT EXISTS "saved_charts" (
  "id" SERIAL NOT NULL,
  "user_uid" TEXT NOT NULL,
  "chart_key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "view" TEXT,
  "service" TEXT,
  "input_data" JSONB NOT NULL,
  "input_data_b" JSONB,
  "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "saved_charts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "saved_charts_user_chartkey_key"
  ON "saved_charts"("user_uid", "chart_key");

CREATE INDEX IF NOT EXISTS "saved_charts_user_idx"
  ON "saved_charts"("user_uid");

COMMIT;
