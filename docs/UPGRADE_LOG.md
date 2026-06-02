# UPGRADE LOG

Nhật ký nâng cấp theo phiên bản. Mục mới nhất ở trên cùng.

---

## v3.4 — Coin Rework: Production Hardening (branch `feature/coin-prod-hardening`)

_2026-06-02 · **Trạng thái: đã build + chạy trên DEMO, CHƯA merge main / CHƯA lên production.**_
_Lưu lại để không mất; chờ QA xong rồi `full update` (merge main + deploy prod + mở lại cho user)._

Tiếp nối `COIN_PRODUCTION_HARDENING_PLAN.md` (A–E) + nhiều fix UX/flow phát sinh khi test.

### Backend / độ tin cậy
- **A. Essay → lưu DB** (bảng `essays`, thay cache `/tmp`): gen 1 lần/(user,profile,service), mọi mục cắt từ cùng 1 bài → **nhất quán + sống qua restart/redeploy + đọc lại vĩnh viễn**. `src/lib/essay/cache.ts` đọc/ghi DB; `generate.ts` race-safe re-read.
- **B. Check đủ xu TRƯỚC khi gen** (`unlock-section`/`unlock-bundle`): user thiếu xu → 402 ngay, không đốt LLM.
- **Gen "không bao giờ lỗi" + chạy NGẦM (job):** `src/lib/coin/unlock-job.ts` — gen chạy background bằng `generateEssayStreaming` (retry 4 lần nội bộ), client poll `/api/job/[id]`. unlock-section/bundle trả `{done|jobId}`; essay đã có → mở sync ngay (không job).
- **D. Test double-spend:** `scripts/test-double-spend.cjs` (10 luồng đồng thời → trừ đúng 1 lần). PASS.
- **E. /security-review** trên code coin → **không lỗ hổng**.
- **Profile dedup:** POST `/api/profiles` cùng user + trùng dữ liệu → trả bản cũ (`duplicate:true`), không tạo mới; client dedup list + toast "đã có trong danh sách".

### UX
- **Modal loading khi mở mục:** thanh **% thật** (theo số chữ stream, ước lượng độ dài theo số mục) + **"đã chờ" / ETA / "sắp hoàn tất"**; nội dung hiện dần kiểu đánh máy. Mục lần sau (đã có essay) → hiện ngay, không modal.
- **Chuyển tab khi đang gen:** gen chạy ngầm server-side; listener `visibilitychange`/`focus` đồng bộ lại khi quay lại tab. Bỏ cảnh báo "giữ trang mở".
- **Redirect same-tab:** nút "Hoàn Thành" dùng `window.location.href` (bỏ `window.open _blank` bị popup-blocker chặn — desktop mở tab mới, mobile không hiện gì).
- **Trang "Hồ sơ đã xem"** (`/reading`) + nút 📜 trên Navbar: liệt kê hồ sơ đã tạo nội dung + tiến độ mở; cột `essays.name` lưu tên hồ sơ.
- **Section gập/mở** bằng arrow (mặc định đóng khi vào; mục vừa mua tự mở).
- **Modal nhập liệu đồng nhất:** dropdown "Chọn hồ sơ đã lưu" (cả 1 người & 2 người), **bỏ email**, **1 nút "Hoàn Thành"** (coin mode). `GuestSynastryModal` + `ProfileFormModal`.
- **Relations 4 loại:** gỡ khung lãng mạn khỏi thân bài + note riêng từng loại; bỏ `relationsContextBlock` runtime (xóa `relations/context.ts`).
- **Ẩn gói nạp 2.000đ** khỏi UI.

### DB migrations (manual — ĐÃ apply vào `zodiacdb` chung)
- `prisma/migrations/manual/20260602_essays.sql` — bảng `essays`.
- `prisma/migrations/manual/20260602_essays_name.sql` — cột `essays.name`.

### Infra (đã live trên server)
- nginx: thêm `location /api/coin/` với `proxy_ignore_client_abort on` + timeout 600s (cả block prod & demo) → server hoàn tất gen kể cả khi Cloudflare ngắt client (~100s). Snapshot tại `/home/hgct/nginx/conf.d/hgct.conf`.

### Lưu ý vận hành
- OpenRouter giữ `max_tokens: 32000` (KHÔNG giảm). Lỗi 402 từng gặp là do **spend limit của API key thấp** — đã nâng. Theo dõi số dư OpenRouter, nạp trước khi cạn.
- **Production vẫn đóng với new user** đến khi go-live bản này.

### Còn lại trước khi go-live
- QA end-to-end trên demo (đã test phần lớn).
- `full update`: merge `main` + deploy prod + cập nhật `DONE_HISTORY.md`/`GOAL.md` + mở lại cho user.
