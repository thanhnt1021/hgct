# Universal Workflow Rules

File index cho toàn bộ universal rules. Claude đọc file này trước, sau đó đọc các file liên quan theo context.

**Cách dùng:** Copy toàn bộ folder `docs/universal_rules/` vào project mới. Chạy lệnh `check requirements` — Claude tự setup phần còn lại.

---

## Index — Đọc file nào khi nào

| Tình huống | File cần đọc |
|---|---|
| Cần nắm toàn bộ context | `CLAUDE.md` + tất cả files trong `docs/` — dùng lệnh `read context` |
| Bắt đầu bất kỳ việc gì | `GIT_WORKFLOW.md` |
| Có liên quan đến file MD | `MD_SYSTEM.md` |
| Trước khi commit | `QUALITY_GATES.md` |
| Project có UI/web/mobile | `UI_MOBILE_RULES.md` |
| Setup project mới / `check requirements` | `NEW_PROJECT_SETUP.md` |

---

## Universal Commands (áp dụng mọi project)

| Lệnh | Hành động |
|---|---|
| `feature: [tên]` | Tạo branch `feature/tên`, re-read context → Q&A → implement + test từng bước → quick deploy → **DỪNG chờ feedback** (xem **`feature:` Workflow** bên dưới) |
| `test demo` / `quick deploy` | Build + deploy demo từ code hiện tại, **KHÔNG commit/push** |
| `commit` | Commit + push nhánh hiện tại (update MD files trước) |
| `merge main` / `lên production` | Merge vào main + deploy production |
| `deploy demo` | Full deploy từ GitHub (sau khi đã commit) |
| `check requirements` | Kiểm tra và setup mọi thứ còn thiếu theo `NEW_PROJECT_SETUP.md` |
| `update workflow` | Review + đề xuất cải tiến các file trong `universal_rules/` |
| `read context` | Đọc CLAUDE.md + toàn bộ files trong `docs/` (kể cả `universal_rules/`) + source files project-specific (xem CLAUDE.md). **Sau khi đọc xong → bắt buộc output structured summary** theo format định nghĩa trong mục "read context — Output Format" bên dưới. |

---

## Core Rules (không bao giờ vi phạm)

1. **KHÔNG tự ý** `git commit`, `git push`, `git merge`, hay deploy production — chỉ làm khi được lệnh rõ ràng.
   _Lý do: commit/deploy là hành động không thể undo dễ dàng, ảnh hưởng production và người dùng thật. Claude làm sai một lần có thể mất code, phá production, hoặc expose code chưa review._

2. Sau `quick deploy` → báo cáo kết quả rồi **DỪNG**, không làm gì thêm.
   _Lý do: user cần tự verify tính năng trên môi trường thật trước khi quyết định bước tiếp theo. Claude không thể biết kết quả có đúng ý user không._

3. Mọi file `.md` mới (trừ `CLAUDE.md`) → tạo trong `/docs/`.
   _Lý do: giữ root project sạch, dễ tìm tài liệu, tránh lẫn lộn với config files._

4. `CLAUDE.md` bắt buộc ở root project — Claude Code CLI đọc file này khi khởi động session để biết context project.
   _Lý do: nếu không có hoặc không ở root, Claude sẽ không có context gì về project, mọi câu hỏi/task đều phải giải thích lại từ đầu._

5. Khi commit: update MD files liên quan + clear `docs/MD_FILES_TO_UPDATE.md`.
   _Lý do: MD files là tài liệu sống của project. Nếu code thay đổi mà docs không cập nhật, lần sau setup server hoặc onboard người mới sẽ làm theo tài liệu cũ → sai._

6. Nếu thêm env var / service / dependency mới → update `docs/REQUIREMENTS_CHECK.md`.
   _Lý do: file này là checklist để deploy lên server mới. Thiếu một env var là app crash khi deploy — và rất khó debug nếu không có danh sách đầy đủ._

7. Nếu có chỉnh sửa bất kỳ file nào trong `docs/universal_rules/` → **push lên repo `universal-workflow` ngay trong cùng session**, trước hoặc cùng lúc với commit project hiện tại.
   _Lý do: universal-workflow repo là nguồn gốc của rules, dùng chung nhiều project. Nếu chỉ update local mà không push, các project khác sẽ dùng rules cũ khi bootstrap — rules bị phân kỳ._
   → Xem `GIT_WORKFLOW.md` mục **"Push lên universal-workflow repo"** để biết cách thực hiện.

8. Khi backup DB hoặc file quan trọng: **luôn lưu 2 nơi** — `/tmp/` (nhanh) + một thư mục persistent (`/var/[project]/backups/` hoặc tương đương) ngay trong cùng lệnh.
   _Lý do: `/tmp/` bị xóa khi server reboot. Backup trong `/tmp/` thôi là không có backup — mất dữ liệu khi cần nhất._

---

## feature: Workflow

Khi nhận lệnh `feature: [tên]`, tuân theo 2 phase sau — **không nhảy thẳng vào code**.

> **⚠️ BƯỚC 0 — BẮT BUỘC, KHÔNG CÓ EXCEPTION:**
> Nhận lệnh `feature: [tên]` → **tạo branch `feature/tên` NGAY LẬP TỨC**, trước khi đọc context hay làm bất cứ thứ gì.
> Dù user đính kèm code/plan/patch đầy đủ đến đâu → **vẫn tạo branch trước.**
> _Lý do: không có branch = làm thẳng trên main = không thể rollback, không thể review riêng, không thể test song song._

> **⚠️ RULE CỨNG — KHÔNG BAO GIỜ bỏ qua Phase 1, dù user đính kèm plan chi tiết đến đâu.**
> Plan là input để Claude đối chiếu với codebase — **KHÔNG phải lệnh implement.**
> Vẫn phải đọc context, hỏi Q&A, và **chờ user confirm rõ ràng** trước khi viết bất kỳ dòng code nào.
>
> - **SAI:** `feature: [tên]` + plan → tạo branch → implement ngay.
> - **ĐÚNG:** `feature: [tên]` + plan → tạo branch → đọc context → hỏi Q&A → **chờ user trả lời** → implement.

### Phase 1 — Hiểu rõ trước khi làm

1. Đọc plan/prompt từ user.
2. **Re-read context project** — đọc các file liên quan đến feature (schema, API routes, components, types...) để đối chiếu với plan.
3. **Identify blind spots** — liệt kê những điểm chưa rõ: quyết định kỹ thuật còn mở, edge cases chưa được cover, rủi ro, dependency giữa các bước.
4. **Gom tất cả câu hỏi vào 1 message duy nhất** — hỏi user để làm rõ, bao gồm:
   - Những quyết định kỹ thuật cần xác nhận
   - Edge cases cần biết cách xử lý
   - Chiến lược test cho từng thay đổi (xác định trước để sau khi làm xong mỗi bước có thể verify ngay)
5. Nếu câu trả lời vẫn còn điểm mù — hỏi tiếp, **nhưng luôn gom thành 1 batch**, không hỏi lẻ từng câu.
6. **Bắt đầu implement khi — phải thỏa MỌI điều kiện sau:**
   - User đã **trả lời batch Q&A** (không phải chỉ đính kèm plan)
   - User xác nhận rõ ràng bằng tín hiệu như `làm đi`, `make it`, `go ahead`, `proceed`, `ok làm`, hoặc tương đương
   - **Lưu ý:** "tương đương" ở đây nghĩa là câu chủ động ra lệnh — **KHÔNG phải** chỉ đính kèm plan chi tiết, KHÔNG phải im lặng sau Q&A.

> **Mục tiêu của Phase 1:** Sau khi Q&A xong, có thể implement một mạch từ đầu đến cuối mà không cần dừng lại hỏi thêm.

### Phase 2 — Implement từng bước, test ngay

1. **Implement từng function/fix một** theo thứ tự đã thống nhất — không làm hết rồi mới test.
2. **Test kỹ sau mỗi bước** bằng chiến lược đã thống nhất trong Phase 1:
   - Quick deploy → verify trên browser/app
   - Hoặc test endpoint trực tiếp (curl, server log, DB state...)
3. **Confirm works** → mới chuyển sang bước tiếp theo.
4. Khi tất cả xong → quick deploy lần cuối → **báo cáo tổng kết** → **DỪNG chờ feedback**.

> **Exception:** Nếu gặp vấn đề không giải quyết được hoặc loop >2 lần → **dừng, tham vấn user ngay** — không tự thử mãi.

---

## read context — Output Format

Sau khi đọc xong tất cả files, **bắt buộc output** một summary có cấu trúc như sau. Không được chỉ im lặng sau khi đọc — output này là mục đích chính của lệnh `read context`.

### 1. Tech Stack
Liệt kê ngắn: framework, DB, auth, AI/external services, deploy, port/domain.

### 2. Architecture Overview
Mô tả ngắn cách hệ thống hoạt động tổng thể: các lớp chính, data flow cốt lõi.
Nếu có background job / async processing → mô tả rõ pattern đó.

### 3. Key Flows
Các luồng người dùng / nghiệp vụ chính — mỗi flow 3–5 bước, dạng bullet ngắn gọn.
Chỉ list các flow quan trọng, không cần list hết.

### 4. Current Status
- **Done:** các tính năng đã hoàn chỉnh và tested (chỉ list những cái quan trọng)
- **TODO / In Progress:** những gì còn cần làm hoặc đang dở

### 5. Workflow Quick Ref
- Branch hiện tại + strategy
- Deploy commands (demo / production)
- Các rules cứng cần nhắc lại (KHÔNG tự commit/push/merge/deploy)
