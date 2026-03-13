# MD Files To Update

Danh sách các file `.md` cần update khi commit feature hiện tại.
Claude sẽ populate list này sau khi chốt phương án, check lại sau mỗi fix/debug, và clear sau khi commit.

## Current Feature
feature/tempuid-update — Temp Profile + Fix Nút Tải/Chia Sẻ

## Files To Update
- `docs/BACKEND.md` — thêm: `/api/profiles/confirm`, `/api/cron/cleanup` endpoints; GET /api/profiles filter isTemp
- `docs/DATABASE.md` — thêm: `isTemp`, `tempExpiry` vào Profile model/table
- `docs/FRONTEND.md` — thêm: HistoryReports Part 1 fix (isExpired vs isSoftDeleted) + Part 2 temp note + confirm modal
- `docs/REQUIREMENTS_CHECK.md` — đã update (CRON_SECRET added) ✓
