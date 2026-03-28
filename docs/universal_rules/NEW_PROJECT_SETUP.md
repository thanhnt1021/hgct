# New Project Setup

Chạy lệnh `check requirements` — Claude đọc file này và tự động:
1. Kiểm tra từng mục bên dưới
2. Tạo các file placeholder còn thiếu
3. Hỏi user input cho những gì cần cấu hình thủ công
4. Thêm dòng reference vào `CLAUDE.md` nếu chưa có

---

## Checklist Tự Động (Claude tự kiểm tra + tạo)

### Files bắt buộc

- [ ] `CLAUDE.md` ở root — nếu chưa có: tạo template cơ bản, hỏi user điền thông tin project. **KHÔNG overwrite nếu đã có** (file chứa thông tin project-specific, overwrite = mất hết context).
- [ ] Dòng trong `CLAUDE.md`: `> Chi tiết đầy đủ: docs/universal_rules/UNIVERSAL_WORKFLOW.md` — nếu chưa có: tự thêm vào (append). **KHÔNG sửa nội dung khác.**
- [ ] Block **Available Commands** trong `CLAUDE.md` — nếu chưa có: tự thêm vào sau dòng reference. Nội dung:
  ```
  ## Available Commands
  | Lệnh | Hành động |
  |---|---|
  | `read context` | Đọc toàn bộ docs + GOAL.md → báo "Đã hiểu, sẵn sàng nhận lệnh." |
  | `report context` | Đọc docs → output structured summary |
  | `feature: [tên]` | Tạo branch → Q&A → implement → quick deploy → DỪNG |
  | `quick deploy` / `test demo` | Build + deploy demo, KHÔNG commit |
  | `commit` | Commit + push nhánh hiện tại |
  | `merge main` / `lên production` | Merge vào main + deploy production |
  | `full update` | One-shot: update MD → commit → push → merge main → restart service → report |
  | `sync uni` | Pull latest universal rules từ GitHub repo |
  | `check requirements` | Kiểm tra + setup mọi thứ còn thiếu |
  | `check goal` | Show GOAL.md + tiến độ + đề xuất |
  | `update goal` | Update GOAL.md dựa trên việc vừa làm |
  | `docs project` | Tạo/update tài liệu dự án |
  ```
- [ ] `docs/universal_rules/` — folder này (đã copy vào là có)
- [ ] `docs/MD_FILES_TO_UPDATE.md` — nếu chưa có: tự tạo với nội dung template trống
- [ ] `docs/REQUIREMENTS_CHECK.md` — nếu chưa có: tự tạo template, hỏi user điền thông tin server
- [ ] `README.md` ở root — nếu chưa có: copy từ `docs/universal_rules/README_TEMPLATE.md`, hỏi user điền thông tin project. **KHÔNG overwrite nếu đã có.**
- [ ] `docs/GOAL.md` — nếu chưa có: copy từ `docs/universal_rules/GOAL_TEMPLATE.md` và hỏi user điền 3 câu (mục tiêu / thành công / không làm gì). **KHÔNG overwrite nếu đã có.**

### Auto-detect project type → apply specialized rules

Khi `check requirements`, Claude tự detect project type và thêm reference lines vào `CLAUDE.md`. User confirm trước khi ghi.

| Detect signal | Rule file | Ghi vào CLAUDE.md |
|---|---|---|
| Có `package.json` với `next` hoặc `react` + UI components | `UI_MOBILE_RULES.md` | `> Mobile rules: docs/universal_rules/UI_MOBILE_RULES.md` |
| Có viewport meta, bottom-nav pattern, hoặc user nói "webapp" | `MOBILE_APP_STRICT_RULES.md` | `> Webapp strict rules: docs/universal_rules/MOBILE_APP_STRICT_RULES.md` |
| Có `python-telegram-bot` hoặc bot framework trong dependencies | `BOT_COMMAND_RULES.md` | `> Bot rules: docs/universal_rules/BOT_COMMAND_RULES.md` |
| Có strings tiếng Việt trong code hoặc user nói project tiếng Việt | `VIETNAMESE_DIACRITICS.md` | `> Vietnamese: docs/universal_rules/VIETNAMESE_DIACRITICS.md` |
| Có `docs/tdk/` folder | TDK Pipeline | `> TDK Pipeline: docs/tdk/HDSD.md` |
| Có Google OAuth / NextAuth config | `GOOGLE_OAUTH_SETUP.md` | `> Google OAuth: docs/universal_rules/GOOGLE_OAUTH_SETUP.md` |
| Có SePay / payment integration | `SEPAY_PAYMENT.md` | `> SePay: docs/universal_rules/SEPAY_PAYMENT.md` |

**Quy trình:**
1. Claude scan codebase (package.json, templates, config files)
2. Detect signals → list rule files cần apply
3. Output: "Phát hiện project type: [X]. Đề xuất apply: [list rule files]. OK?"
4. User confirm → Claude thêm reference lines vào CLAUDE.md

### Template `docs/MD_FILES_TO_UPDATE.md` (khi tạo mới)

```markdown
# MD Files To Update

## Current Feature
_(trống — sẵn sàng cho feature tiếp theo)_

## Files To Update
_(trống)_
```

### Template `docs/REQUIREMENTS_CHECK.md` (khi tạo mới)

```markdown
# Server Requirements Checklist

[Claude hỏi user để điền: project name, tech stack, domain, ports, DB, env vars cần thiết]
```

---

## Checklist Thủ Công (cần user input)

### Git & GitHub

- [ ] Git repo khởi tạo: `git init`
- [ ] Remote GitHub: `git remote add origin git@github.com:[user]/[repo].git`
- [ ] SSH key cho GitHub — hỏi user: key đã có chưa? Ở đâu?
  _Lý do dùng SSH thay HTTPS: server không có browser để auth HTTPS, SSH key không hết hạn và không cần nhập password mỗi lần push._
- [ ] Branch mặc định là `main`: `git branch -M main`

### Environment

- [ ] File `.env.local` (hoặc `.env`) — hỏi user các biến cần thiết theo stack:
  - `[WEB/Next.js]`: NEXTAUTH_URL, NEXTAUTH_SECRET, DATABASE_URL, API keys...
  - `[BOT]`: BOT_TOKEN, WEBHOOK_URL...
  - `[API]`: DATABASE_URL, SECRET_KEY, PORT...
- [ ] `.gitignore` có chứa `.env*` — kiểm tra và thêm nếu thiếu.
  _Lý do: nếu `.env` bị commit vào repo (kể cả private), secrets (API keys, DB password, JWT secret) sẽ nằm trong git history mãi mãi — xóa file đi cũng không xóa được khỏi history. Một khi lộ là coi như đã lộ._

### Server (nếu self-hosted)

- [ ] Xem `docs/REQUIREMENTS_CHECK.md` của project để biết yêu cầu cụ thể
- [ ] Deploy scripts: `deploy.sh` (production), `deploy-demo-local.sh` (quick)

### Per Project Type

**[WEB/Next.js]**
- [ ] `pnpm install` (dùng pnpm thay npm — shared store tiết kiệm disk)
- [ ] `pnpm dlx prisma generate` (nếu dùng Prisma)
- [ ] `pnpm dlx prisma migrate deploy` (nếu có DB)
- [ ] Test build: `pnpm run build`

**[MOBILE/React Native]**
- [ ] `pnpm install`
- [ ] iOS: `cd ios && pod install`
- [ ] Test: `pnpm dlx react-native run-android` / `run-ios`

**[BOT/API -- Node]**
- [ ] `pnpm install`
- [ ] Test start: `pnpm start` hoặc `node index.js`

**[BOT/API -- Python]**
- [ ] Tạo venv: `python3 -m venv venv && source venv/bin/activate`
- [ ] `pip install -r requirements.txt`
- [ ] Test start: `python <main_file>` hoặc `systemctl start <service>`
- [ ] Verify syntax: `python -m py_compile <main_file>`

---

## Sau khi setup xong

Claude báo cáo:
- ✅ Đã tạo/kiểm tra những file nào
- ✅ Đã detect project type + apply rule files nào
- ⚠️ Những gì còn cần user xử lý thủ công
- 📋 Bước tiếp theo để bắt đầu dev