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
| Project là mobile web app (webapp native feel) | `MOBILE_APP_STRICT_RULES.md` |
| Project là bot (Telegram/Discord/...) | `BOT_COMMAND_RULES.md` |
| Dự án sử dụng tiếng Việt | `VIETNAMESE_DIACRITICS.md` |
| Setup project mới / `check requirements` | `NEW_PROJECT_SETUP.md` |
| Hỏi ngược trước khi thực thi (standalone) | `ASK-BACK.md` |
| Theo dõi mục tiêu / goal drift | `OUTCOME.md` |
| Tạo GOAL.md cho project mới | `GOAL_TEMPLATE.md` |
| Tích hợp Google Login (NextAuth.js) | `GOOGLE_OAUTH_SETUP.md` |
| Tích hợp thanh toán QR (SePay) | `SEPAY_PAYMENT.md` |
| Bootstrap universal rules vào project mới | `BOOTSTRAP.md` |
| Tạo/update tài liệu dự án | `PROJECT_DOCS.md` |
| Quản lý .env, secrets, biến môi trường | `ENV_RULES.md` |
| App-level security (OWASP, auth, upload) | `SECURITY_CHECKLIST.md` |
| CI/CD workflow templates (GitHub Actions) | `CI_CD_TEMPLATE.md` |
| Template cho CONTRIBUTING.md | `CONTRIBUTING_TEMPLATE.md` |
| Ghi lại quyết định kiến trúc (ADR) | `ADR_TEMPLATE.md` |
| PR template, issue templates (GitHub) | `github_templates/` |
| **Phân tích sản phẩm / growth / positioning** | **`docs/tdk/MASTER_v1.md` → auto-route tới PGA** |
| **Test chất lượng toàn diện (QA multi-pass)** | **`docs/tdk/RRI-T_v1.md`** |
| **Setup server / deploy / infra / CI/CD** | **`docs/tdk/INFRA_v1.md`** |
| **Đọc hướng dẫn bộ TDK Pipeline** | **`docs/tdk/HDSD_v1.md`** |

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
| `sync uni` | Pull latest từ `hentaiikidd/universal-workflow` GitHub repo → cập nhật `docs/universal_rules/` → dọn file thừa. **KHÔNG overwrite** `CLAUDE.md`, `README.md`, `docs/GOAL.md` (xem **`sync uni` Workflow** bên dưới) |
| `docs project` | Đọc code → tạo mới hoặc update tài liệu dự án (flow, UI/UX, events, summary...) theo `PROJECT_DOCS.md`. Chờ user review trước khi commit. |
| `update workflow` | Review + đề xuất cải tiến các file trong `universal_rules/` |
| `read context` | Đọc CLAUDE.md + toàn bộ files trong `docs/` (kể cả `universal_rules/`) + source files project-specific (xem CLAUDE.md của từng project). Sau đó: **Goal Check** theo protocol trong `OUTCOME.md` (xem mục Goal Tracking Protocol bên dưới). Xong → báo ngắn "Đã hiểu, sẵn sàng nhận lệnh." → **DỪNG. Không output gì thêm.** |
| `report context` | Giống `read context` nhưng sau khi đọc xong → **output full structured summary** theo format định nghĩa trong mục **"report context — Output Format"** bên dưới. |
| `check goal` | Show tóm tắt GOAL.md + tiến độ + đề xuất bước tiếp theo (xem `OUTCOME.md` mục "Bất kỳ lúc nào") |
| `update goal` | Claude đề xuất những gì nên update GOAL.md dựa trên việc vừa làm trong session (xem `OUTCOME.md`) |
| `full update` | **One-shot cuối task**: update MD files → commit + push → merge main → restart service → report (xem **`full update` Workflow** bên dưới) |
| **`tdk: [câu hỏi thô]`** | **Đọc `docs/tdk/MASTER_v1.md` → parse input → route pipeline TDK (PGA/INFRA/RRI-T)** |
| **`check quality`** | **Đọc `docs/tdk/RRI-T_v1.md` → chạy QA multi-pass theo TDK protocol** |
| **`check growth`** | **Đọc `docs/tdk/PGA_v1.md` → product growth analysis** |
| **`setup server`** | **Đọc `docs/tdk/INFRA_v1.md` → server setup / deploy / monitoring** |

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

9. **Package manager**: Dùng `pnpm` thay `npm` cho mọi project Node.js. pnpm dùng shared store (hardlink) nên nhiều project dùng chung packages mà không tốn thêm disk. Lệnh tương ứng: `pnpm install`, `pnpm run build`, `pnpm run dev`. Xem `NEW_PROJECT_SETUP.md` để biết chi tiết.
   _Lý do: `/tmp/` bị xóa khi server reboot. Backup trong `/tmp/` thôi là không có backup — mất dữ liệu khi cần nhất._

10. **KHÔNG CHẮC → HỎI NGAY.** Khi không chắc cách implement đúng (API vs subprocess, endpoint nào, flow ra sao, destructive action...) → dùng **AskUserQuestion TRƯỚC KHI code**. KHÔNG tự đoán rồi làm sai, không tự assume rồi implement, không loop fix nhiều lần.
    _Lý do: đoán sai 1 lần tốn thời gian hơn hỏi 1 câu. User muốn kết quả đúng ngay lần đầu._

11. **KHÔNG BAO GIỜ dùng subprocess Python** để tạo job/chạy operation khi web server đang live. Luôn dùng API endpoint (curl/httpx POST) — giống cách frontend làm.
    _Lý do: subprocess có event loop riêng → khi subprocess kết thúc, event loop chết → job không bao giờ chạy. Phải restart web server mới pick up được — gây downtime và confuse._

12. **Cài hooks ngay khi setup project mới.** Chạy `python3 docs/universal_rules/hooks/install_hooks.py` để cài tất cả Claude Code hooks vào `~/.claude/settings.json`. Hooks bắt buộc:
    - `claude_notify.sh` — gửi Telegram khi task xong / cần trả lời / cần permission (cần `telegram_config.env`)
    - `askback_enforce.py` — enforce ask-back trước khi execute
    - `viet_diacritics_check.py` — chặn file tiếng Việt thiếu dấu
    Setup Telegram: copy `telegram_config.env.example` → `telegram_config.env`, điền `BOT_TOKEN` + `CHAT_ID`.
    _Lý do: hooks chạy tự động mỗi session — không cần nhớ, không bị bỏ sót. Telegram notify đặc biệt quan trọng khi task chạy lâu: biết ngay khi xong mà không cần ngồi canh._

13. **KHÔNG BAO GIỜ xin lỗi.** Không viết "xin lỗi", "sorry", "apologies" trong bất kỳ output nào. Khi có lỗi: **đưa giải pháp ngay lập tức**. User cần solution, không cần apology. Apology = thừa nhận vấn đề mà không giải quyết = vô ích.
   _Lý do: thời gian viết lời xin lỗi là thời gian lãng phí. Mỗi giây dùng để xin lỗi là một giây không dùng để fix. Nếu nguyên nhân gốc được xử lý triệt để thì lỗi không tái diễn — và không cần xin lỗi._

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

## full update Workflow

One-shot command cuối task — gom toàn bộ `commit` + `merge main` + restart service + report thành 1 lệnh duy nhất. User nói `full update` = ủy quyền Claude thực hiện tất cả các bước bên dưới **không cần hỏi thêm**.

> **Lệnh `full update` là lệnh rõ ràng của user** — không vi phạm Core Rule 1 (KHÔNG tự ý commit/push/merge). Khi user nói `full update`, Claude ĐƯỢC PHÉP commit, push, merge, restart.

### Các bước (thực hiện tuần tự)

**Bước 1 — Update MD files**
- Đọc `docs/MD_FILES_TO_UPDATE.md` → update tất cả MD files trong danh sách
- Update `CLAUDE.md` nếu có thay đổi kiến trúc / commands / config
- Nếu commit hoàn thành milestone → update `GOAL.md` (tick `[x]`, cập nhật "đang ở đâu")
- Clear `docs/MD_FILES_TO_UPDATE.md` sau khi update xong

**Bước 2 — Commit + push**
- `git add [files cụ thể]` (KHÔNG `git add -A`)
- `git commit` với message mô tả "why"
- Nếu có sửa `docs/universal_rules/*` → push lên repo `universal-workflow` trước (theo `GIT_WORKFLOW.md`)
- `git push -u origin HEAD` (feature branch) hoặc `git push` (main)
- `git status` → verify "up to date"

**Bước 3 — Merge main** (chỉ khi đang trên feature branch)
- `git checkout main && git merge --no-ff feature/[tên]`
- `git push`
- `git status` → verify "up to date"
- Nếu đang trên `main` → skip bước này

**Bước 4 — Restart service** (chỉ khi project có service)
- `sudo systemctl restart [service-name]`
- Verify service running: `sudo systemctl is-active [service-name]`
- Nếu project không có service / không có systemd config → skip bước này

**Bước 5 — Report**
- Output tóm tắt ngắn gọn:
  ```
  -- full update --
  Branch: [branch] -> main
  Commit: [hash] [message ngắn]
  Service: [tên] restarted / N/A
  MD files updated: [danh sách]
  ```

### Lưu ý

- Nếu bất kỳ bước nào fail → **DỪNG ngay**, báo lỗi, KHÔNG tiếp tục bước sau
- Nếu có merge conflict → **DỪNG**, báo user, KHÔNG tự resolve
- `full update` KHÔNG bao gồm deploy demo — chỉ restart service (production)
- Nếu cần deploy demo trước khi commit → dùng `quick deploy` riêng trước

---

## sync uni Workflow

Cập nhật `docs/universal_rules/` từ repo gốc trên GitHub.

**Repo gốc:** `https://github.com/hentaiikidd/universal-workflow`

### Khi user nói `sync uni` (hoặc tương đương: "pull uni", "update uni rules", "đồng bộ universal rules"):

1. **Clone** repo `hentaiikidd/universal-workflow` vào thư mục tạm
2. **So sánh** file-by-file giữa repo mới và `docs/universal_rules/` hiện tại:
   - File nào **thay đổi** (diff)
   - File nào **mới thêm** trong repo
   - File nào **đã xoá** khỏi repo (còn trong project nhưng không còn trong repo)
3. **Báo cáo** danh sách thay đổi cho user xem trước
4. **Thực hiện** cập nhật:
   - Copy file mới/thay đổi từ repo → `docs/universal_rules/`
   - Copy subdirectories (`hooks/`, `tdk/`) nếu có
   - Xoá file không còn trong repo (trừ file project-specific)
   - **KHÔNG copy** `README.md` của repo vào `docs/universal_rules/` (đó là README của repo, không phải rule file)
5. **Tạo file project-specific nếu chưa có:**
   - `README.md` ở root ← từ `README_TEMPLATE.md`
   - `docs/GOAL.md` ← từ `GOAL_TEMPLATE.md`
6. **KHÔNG overwrite** nếu đã tồn tại: `CLAUDE.md`, `README.md`, `docs/GOAL.md`
7. **Dọn dẹp** thư mục tạm
8. **Báo cáo** kết quả → **DỪNG**, chờ user confirm commit

> **Lưu ý:** `sync uni` KHÔNG tự commit. User phải nói `commit` riêng.

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