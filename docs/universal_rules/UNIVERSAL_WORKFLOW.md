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
| Project là bot (Telegram/Discord/...) | `BOT_COMMAND_RULES.md` |
| Setup project mới / `check requirements` | `NEW_PROJECT_SETUP.md` |
| Hỏi ngược trước khi thực thi (standalone) | `ASK-BACK.md` |
| Theo dõi mục tiêu / goal drift | `OUTCOME.md` |
| Tạo GOAL.md cho project mới | `GOAL_TEMPLATE.md` |
| Tích hợp Google Login (NextAuth.js) | `GOOGLE_OAUTH_SETUP.md` |
| Tích hợp thanh toán QR (SePay) | `SEPAY_PAYMENT.md` |
| Bootstrap universal rules vào project mới | `BOOTSTRAP.md` |

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
| `read context` | Đọc CLAUDE.md + toàn bộ files trong `docs/` (kể cả `universal_rules/`) + source files project-specific (xem CLAUDE.md của từng project). Sau đó: **Goal Check** theo protocol trong `OUTCOME.md` (xem mục Goal Tracking Protocol bên dưới). Xong → báo ngắn "Đã hiểu, sẵn sàng nhận lệnh." → **DỪNG. Không output gì thêm.** |
| `report context` | Giống `read context` nhưng sau khi đọc xong → **output full structured summary** theo format định nghĩa trong mục **"report context — Output Format"** bên dưới. |
| `check goal` | Show tóm tắt GOAL.md + tiến độ + đề xuất bước tiếp theo (xem `OUTCOME.md` mục "Bất kỳ lúc nào") |
| `update goal` | Claude đề xuất những gì nên update GOAL.md dựa trên việc vừa làm trong session (xem `OUTCOME.md`) |

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
> - **ĐÚNG:** `feature: [tên]` + plan → tạo branch → đọc context → **Analysis Phase** (Q&A unified + update GOAL) → **print Full Plan** → **chờ user confirm** → implement.

### Phase 1 — Analysis Phase

> ⚠️ **RULE CỨNG:** Không bao giờ bỏ qua Phase 1, dù user đính kèm plan chi tiết đến đâu. Plan là input để đối chiếu — **KHÔNG phải lệnh implement.**

**Bước 1.** Đọc plan/prompt của user.

**Bước 2.** Re-read context: các files codebase liên quan (schema, API routes, components, types...) + `GOAL.md` nếu có.

**Bước 3.** Chạy 3 tracks phân tích song song (ngầm, không output ra):
- **Track A — Codebase (ASK-BACK):** So plan vs code thực tế → classify findings: 🔴 CONFLICT / 🟡 AMBIGUITY / 🟠 RISK / 🔵 GAP / ⚪ ASSUMPTION. Quy tắc + format: xem `ASK-BACK.md`.
- **Track B — Goal (OUTCOME):** So plan vs `GOAL.md` → serve milestone nào? conflict goal nào? goal drift không? Quy tắc: xem `OUTCOME.md`.
- **Track C — Implementation:** Dependencies, technical decisions còn mở, test strategy cho từng bước.

**Bước 4.** Gom tất cả findings từ 3 tracks → dùng **AskUserQuestion tool** với tất cả questions (tối đa 7, ưu tiên 🔴>🟡>🟠>🔵>⚪, tối đa 4 câu/lần gọi, recommended option đặt đầu tiên, "Other" tự động có). Xem format chi tiết: `ASK-BACK.md` §6.

**Bước 5.** User chọn options → nhận answers.

**Bước 6.** Nếu có `GOAL.md` → update ngay dựa trên answers: link milestone, resolve conflicts, cập nhật `_Last reviewed_`.

**Bước 7.** Print **Full Implementation Plan** — đủ chi tiết để implement không cần hỏi thêm:
- Approach tổng thể
- Các bước theo thứ tự (mỗi bước test được độc lập)
- Files sẽ thay đổi
- Edge cases + cách xử lý (đã xác nhận ở bước 5)

**Bước 8.** Chờ user confirm (`làm đi`, `proceed`, `ok`, hoặc tương đương) → chuyển Phase 2.

> **Mục tiêu Phase 1:** Sau khi xong, implement được một mạch từ đầu đến cuối không cần dừng hỏi thêm.

> **Exception:** Plan đơn giản (< 3 files, không có ambiguity, không ảnh hưởng goal) → gom bước 3–5 thành 1 confirm ngắn, skip bước 7 nếu approach đã rõ.

### Phase 2 — Implement từng bước, test ngay

1. **Implement từng function/fix một** theo thứ tự đã thống nhất — không làm hết rồi mới test.
2. **Test kỹ sau mỗi bước** bằng chiến lược đã thống nhất trong Phase 1:
   - Quick deploy → verify trên browser/app
   - Hoặc test endpoint trực tiếp (curl, server log, DB state...)
3. **Confirm works** → mới chuyển sang bước tiếp theo.
4. Khi tất cả xong → quick deploy lần cuối → **báo cáo tổng kết** → **DỪNG chờ feedback**.

> **Exception:** Nếu gặp vấn đề không giải quyết được hoặc loop >2 lần → **dừng, tham vấn user ngay** — không tự thử mãi.

---

## Goal Tracking Protocol

Áp dụng khi project có `docs/GOAL.md` + `docs/OUTCOME.md`. Chi tiết từ góc độ user: xem `OUTCOME.md` mục **CÁCH VẬN HÀNH**.

### Trigger A — `read context`

Sau khi đọc xong tất cả docs:

1. Đọc `GOAL.md` → extract mục tiêu cuối + milestone hiện tại
2. Output 1 dòng: `📌 Goal: [X] | 📍 Đang ở: [milestone]`
3. Nếu `_Last reviewed_` > 7 ngày **hoặc** có `Pending / Cần Quyết Định` chưa giải quyết → hiện danh sách + hỏi user có gì cần update không (options A/B/C theo format trong OUTCOME.md)
4. Nếu user confirm OK → cập nhật `_Last reviewed_` thành ngày hôm nay trong `GOAL.md`
5. Nếu không có `GOAL.md` → hỏi muốn tạo không (theo OUTCOME.md mục 7)
6. **Sau đó mới báo "Đã hiểu, sẵn sàng nhận lệnh."**

### Trigger B — `feature: [tên]` (Track B trong Analysis Phase)

Chạy song song với Track A trong Phase 1 bước 3. Claude so plan vs `GOAL.md`:
1. Feature serve milestone nào? Nếu không có → flag để thêm mới.
2. Plan có conflict với goal hiện tại không?
3. Plan có nằm ngoài scope goals không (goal drift)?

Findings gom vào batch Q&A chung (bước 4). Sau khi user confirm → **update `GOAL.md` ngay** (bước 6): link milestone, resolve conflicts, cập nhật `_Last reviewed_`.

### Trigger C — `commit`

Trước khi viết commit message, check: commit này có hoàn thành milestone nào không?
- **Có** → đề xuất update `GOAL.md` (tick `[x]`, cập nhật "Hiện tại đang ở đâu") — user confirm trước khi include trong commit
- **Không** → skip hoàn toàn, không hỏi thừa

### Goal-Check và Drift-Check (implicit, không trigger bởi lệnh)

Mỗi khi nhận task bất kỳ: tự check ngầm task có dẫn đến goal không. Nếu lệch → cảnh báo + options. Xem đầy đủ trong `OUTCOME.md` mục 3-4.

---

## report context — Output Format

Sau khi đọc xong tất cả files, **bắt buộc output** một summary có cấu trúc như sau. Chỉ dùng khi lệnh là `report context` — nếu lệnh là `read context` thì **không output gì**, chỉ báo "Đã hiểu, sẵn sàng nhận lệnh."

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

### 4b. Goals (nếu project có GOAL.md)
- **Mục tiêu cuối:** [1 câu]
- **Milestone đang ở:** [tên milestone + % ước tính]
- **Pending:** [danh sách items nếu có, hoặc "không có"]

### 5. Workflow Quick Ref
- Branch hiện tại + strategy
- Deploy commands (demo / production)
- Các rules cứng cần nhắc lại (KHÔNG tự commit/push/merge/deploy)
