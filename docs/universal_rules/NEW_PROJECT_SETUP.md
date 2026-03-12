# New Project Setup

Chạy lệnh `check requirements` — Claude đọc file này và tự động:
1. Kiểm tra từng mục bên dưới
2. Tạo các file placeholder còn thiếu
3. Hỏi user input cho những gì cần cấu hình thủ công
4. Thêm dòng reference vào `CLAUDE.md` nếu chưa có

---

## Checklist Tự Động (Claude tự kiểm tra + tạo)

### Files bắt buộc

- [ ] `CLAUDE.md` ở root — nếu chưa có: tạo template cơ bản, hỏi user điền thông tin project. **KHÔNG overwrite nếu đã có.**
- [ ] Dòng trong `CLAUDE.md`: `Đọc docs/universal_rules/UNIVERSAL_WORKFLOW.md để áp dụng universal workflow rules.` — nếu chưa có: tự thêm vào (append). **KHÔNG sửa nội dung khác.**
- [ ] `docs/universal_rules/` — folder này (đã copy vào là có)
- [ ] `docs/MD_FILES_TO_UPDATE.md` — nếu chưa có: tự tạo với nội dung template trống
- [ ] `docs/REQUIREMENTS_CHECK.md` — nếu chưa có: tự tạo template, hỏi user điền thông tin server

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
- [ ] Branch mặc định là `main`: `git branch -M main`

### Environment

- [ ] File `.env.local` (hoặc `.env`) — hỏi user các biến cần thiết theo stack:
  - `[WEB/Next.js]`: NEXTAUTH_URL, NEXTAUTH_SECRET, DATABASE_URL, API keys...
  - `[BOT]`: BOT_TOKEN, WEBHOOK_URL...
  - `[API]`: DATABASE_URL, SECRET_KEY, PORT...
- [ ] `.gitignore` có chứa `.env*` — kiểm tra và thêm nếu thiếu

### Server (nếu self-hosted)

- [ ] Xem `docs/REQUIREMENTS_CHECK.md` của project để biết yêu cầu cụ thể
- [ ] Deploy scripts: `deploy.sh` (production), `deploy-demo-local.sh` (quick)

### Per Project Type

**[WEB/Next.js]**
- [ ] `npm install`
- [ ] `npx prisma generate` (nếu dùng Prisma)
- [ ] `npx prisma migrate deploy` (nếu có DB)
- [ ] Test build: `npm run build`

**[MOBILE/React Native]**
- [ ] `npm install`
- [ ] iOS: `cd ios && pod install`
- [ ] Test: `npx react-native run-android` / `run-ios`

**[BOT/API/Node]**
- [ ] `npm install`
- [ ] Test start: `npm start` hoặc `node index.js`

---

## Sau khi setup xong

Claude báo cáo:
- ✅ Đã tạo/kiểm tra những file nào
- ⚠️ Những gì còn cần user xử lý thủ công
- 📋 Bước tiếp theo để bắt đầu dev
