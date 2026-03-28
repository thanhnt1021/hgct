# Project Docs — Tạo & Update tài liệu dự án

Khi user gọi lệnh `docs project` (hoặc tương đương: "tổng hợp dự án", "viết docs", "update docs project"), Claude thực hiện quy trình bên dưới.

---

## Quy trình

### Bước 1: Đọc & phân tích code

Đọc kỹ toàn bộ source code quan trọng của project:
- Server / backend (entry point, routes, API, socket events)
- Core logic (state management, business rules, scoring, timers)
- Types / models (data schema, interfaces)
- Constants / config (timers, ports, colors, feature flags)
- Frontend (tất cả routes/pages, components chính)
- Hooks / utilities (shared logic)
- Sound / media (nếu có)
- Auth / middleware (nếu có)

### Bước 2: Xác định cần tạo mới hay update

Kiểm tra `docs/` xem đã có file nào chưa:

**Nếu chưa có (tạo mới):** tạo tất cả files theo danh sách bên dưới.

**Nếu đã có (update):**
1. Đọc từng file docs hiện tại
2. So sánh với code thực tế
3. **Chỉ thêm/sửa**, KHÔNG xoá nội dung đã có (trừ khi rõ ràng sai/lỗi thời)
4. Thêm file mới nếu phát hiện phần chưa được document

### Bước 3: Viết / Update files

---

## Danh sách files cần tạo

### Bắt buộc (mọi project)

| File | Nội dung |
|---|---|
| `docs/PROJECT_SUMMARY.md` | **Tổng hợp dự án.** Overview, tech stack, kiến trúc, routes/endpoints, key files, constants, security, links tới các docs khác. Đây là file "đọc 1 file hiểu cả project". |
| `docs/GAME_FLOW.md` hoặc `docs/APP_FLOW.md` | **Flow chi tiết.** Tất cả phases/screens/states, ai làm gì ở mỗi bước, bấm nút nào thì chuyển sang đâu, điều kiện đặc biệt. Tên file tuỳ loại project (game → GAME_FLOW, app → APP_FLOW, API → API_FLOW). |

### Tuỳ project (tạo nếu relevant)

| File | Khi nào tạo | Nội dung |
|---|---|---|
| `docs/UI_UX.md` | Project có frontend/UI | Chi tiết UI từng route, từng phase/screen, layout, colors, animations, responsive behavior |
| `docs/SOUND_SYSTEM.md` | Project có sound/media | Danh sách sounds, duration, khi nào phát, auto vs manual, kiến trúc playback |
| `docs/SOCKET_EVENTS.md` | Project dùng WebSocket/Socket.IO | Tất cả events, payload, guards, auth, throttling, state schema |
| `docs/API_REFERENCE.md` | Project có REST API | Endpoints, methods, request/response, auth, error codes |
| `docs/DATABASE.md` | Project có database | Schema, relations, migrations, queries quan trọng |
| `docs/AUTH_SYSTEM.md` | Auth phức tạp (multi-method, roles) | Auth flow, token format, middleware, permissions |
| `docs/DEPLOY.md` | Deploy flow phức tạp | Cách deploy, scripts, CI/CD, environment setup |

---

## Quy tắc viết docs

### Format chung
- Mỗi file bắt đầu bằng heading `#` + mô tả ngắn
- `_Last reviewed: YYYY-MM-DD_` ngay dưới heading
- Dùng bảng (table) cho danh sách có nhiều cột
- Dùng code block cho schema, flow diagram, command
- Viết tiếng Việt có dấu (theo `VIETNAMESE_DIACRITICS.md`)

### Nguyên tắc nội dung
- **Chính xác theo code** — không phỏng đoán, không viết feature chưa implement
- **Cụ thể** — "timer 45 giây", không "timer vài chục giây"
- **Liệt kê đầy đủ** — tất cả events, tất cả phases, tất cả sounds, tất cả routes
- **Ghi rõ guards/conditions** — "Guard: phase === question, timer > 0, player alive"
- **Link cross-reference** — "Chi tiết: [docs/GAME_FLOW.md](./GAME_FLOW.md)"

### PROJECT_SUMMARY.md luôn có:
1. Tổng quan (1 đoạn)
2. Tech stack (bảng)
3. Kiến trúc (ASCII diagram)
4. Routes / Endpoints (bảng)
5. Flow tổng quan (1 dòng + link chi tiết)
6. Key files (bảng)
7. Constants (bảng)
8. Security (bảng)
9. Docs index (bảng link tới tất cả docs khác)

---

## Khi update (docs đã tồn tại)

1. Đọc docs hiện tại → list những gì đã có
2. Đọc code hiện tại → list những gì cần document
3. **Diff:** tìm phần thiếu, phần sai, phần lỗi thời
4. **Update:**
   - Thêm section mới cho feature mới
   - Sửa thông tin sai (VD: timer đổi từ 30s → 45s)
   - Thêm file mới nếu có phần chưa document
   - Cập nhật `_Last reviewed_` date
5. **KHÔNG:**
   - Xoá section/file mà không chắc chắn đã lỗi thời
   - Thay đổi cấu trúc file nếu không cần thiết
   - Overwrite nội dung user đã viết tay

---

## Ví dụ lệnh user

```
docs project                    → tạo mới hoặc update tất cả
tổng hợp dự án                  → giống trên
viết docs cho project này        → giống trên
update docs                     → update (không tạo mới từ đầu)
```

---

## Sau khi xong

Báo cáo:
- Đã tạo/update bao nhiêu files
- Liệt kê tên files + 1 dòng mô tả mỗi file
- Highlight thay đổi lớn (nếu update)
- **DỪNG** — chờ user review trước khi commit
