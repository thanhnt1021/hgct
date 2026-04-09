# HGCT - Hạt Giống Chiêm Tinh

## ⚠️ CRITICAL WORKFLOW RULES (KHÔNG BAO GIỜ vi phạm)

1. **`feature: [tên]`** → tạo branch → đọc context → hỏi bằng **AskUserQuestion tool** — KHÔNG output Q1/Q2/Q3 text → **DỪNG chờ user confirm rõ ràng** (`làm đi`, `go ahead`...) → mới được code. Plan đính kèm là INPUT để đối chiếu, **KHÔNG phải lệnh implement**.
2. **KHÔNG tự** `git commit`, `git push`, `git merge`, deploy production — chỉ khi user ra lệnh rõ.
3. **Sau quick deploy** → báo cáo kết quả → **DỪNG**, không làm gì thêm.

> Chi tiết đầy đủ: docs/universal_rules/UNIVERSAL_WORKFLOW.md

## Project Overview
Web app chiêm tinh học — Next.js 15 + TypeScript. Đây là dự án độc lập, hoàn chỉnh.
**KHÔNG liên quan** đến bất kỳ source code cũ nào nữa. Chỉ làm việc trong `/home/hgct/hgct`.

**Quy tắc file MD:** Mọi file `.md` mới (trừ `CLAUDE.md`) đều mặc định tạo trong `/docs/`. `CLAUDE.md` bắt buộc ở root (Claude Code CLI yêu cầu).

## Tech Stack
- Next.js 15.2.3, React 19, App Router, Tailwind v4
- Prisma v5 + PostgreSQL (db: zodiacdb)
- Swiss Ephemeris (`swisseph` npm) — tính toán thiên văn
- @sparticuz/chromium + puppeteer-core — sinh PDF
- OpenRouter API (Claude Sonnet 4.6) — AI sinh luận giải
- Nodemailer — gửi email (Hostinger SMTP)
- NextAuth.js — xác thực (Google OAuth + credentials)
- APP_PORT=65498, domain=hatgiongchiemtinh.com

## Key Architecture
**Report flow:** Calculate chart → Get KB from DB → Run logic blocks → Build prompt → AI generates essay → Generate PDF → Send email

**Environments:**
- Production: hatgiongchiemtinh.com → port 65498, hgct.service (`User=hgct`), deploy with `sudo bash /home/hgct/hgct/deploy.sh`
- Demo: demo.hatgiongchiemtinh.com → port 65500, hgct-demo.service, deploy with `sudo bash /home/hgct/hgct/deploy-demo.sh [branch]`

**Workflow:**
- Làm việc trên nhánh `feature/...` → iterate nhanh với **quick deploy** (không cần commit) → **DỪNG, chờ user confirm**
- Khi commit: dựa vào `docs/MD_FILES_TO_UPDATE.md` để update đúng các file MD liên quan, sau đó **clear file đó**
- Nếu tính năng mới có thêm env var / service / dependency mới → **phải update `docs/REQUIREMENTS_CHECK.md`**
- Khi OK → merge vào `main` → deploy production (MD files đã được commit cùng)

**⚠️ RULES — KHÔNG BAO GIỜ tự ý làm các việc sau khi chưa được lệnh:**
- `git commit` — chỉ khi user nói **"commit"**
- `git push` — chỉ khi user nói **"commit"** hoặc **"merge main"**
- `git merge main` / deploy production — chỉ khi user nói **"merge main"** hoặc **"lên production"**
- Sau khi quick deploy xong → **báo cáo kết quả rồi DỪNG**, không tự commit/merge/deploy thêm

**2 cách deploy demo:**
1. **Quick deploy** (iterate nhanh, chưa commit): `sudo bash /home/hgct/hgct/deploy-demo-local.sh`
   - Build từ code hiện tại tại `/home/hgct/hgct` (kể cả uncommitted changes)
   - Sync build sang `/home/hgct/hgct-demo`, restart service — không cần git push
2. **Full deploy** (sau khi commit + push): `sudo bash /home/hgct/hgct/deploy-demo.sh [branch]`
   - Pull từ GitHub, build từ đầu — dùng khi muốn share link demo hoặc sau khi commit

**Shorthand commands (dùng trong chat):**
- **"feature: [tên]"** → **[BƯỚC 0] tạo branch `feature/tên` NGAY, dù user có đính kèm code/plan** → re-read context → **hỏi bằng AskUserQuestion tool (BẮT BUỘC — KHÔNG output Q1/Q2/Q3 text)** → chờ user confirm rõ ràng → implement + test từng bước → quick deploy → **DỪNG chờ feedback** (xem chi tiết: `docs/universal_rules/UNIVERSAL_WORKFLOW.md` mục **`feature:` Workflow**)
- **"test demo"** hoặc **"quick deploy"** → build + deploy demo → **DỪNG chờ feedback**
- **"commit"** → commit + push nhánh hiện tại + update MD files (chỉ làm khi được lệnh)
- **"merge main"** hoặc **"lên production"** → merge + push + deploy production (chỉ làm khi được lệnh)
- **"deploy demo"** → full deploy từ GitHub (dùng sau khi đã commit)
- **"check goal"** → đọc `GOAL.md` → show tóm tắt: mục tiêu + milestone đang ở đâu + pending items + đề xuất bước tiếp theo
- **"update goal"** → đọc `GOAL.md` → đề xuất những gì nên cập nhật dựa trên việc vừa làm trong session (tick milestone, cập nhật "đang ở đâu", giải quyết pending items)
- **"branch hiện tại là gì"** → `git branch --show-current`
- **"check requirements"** → đọc `docs/universal_rules/NEW_PROJECT_SETUP.md`, kiểm tra + tạo files còn thiếu
- **"update workflow"** → review + đề xuất cải tiến các file trong `docs/universal_rules/`
- **"read context"** → đọc để hiểu project: `CLAUDE.md` + tất cả files trong `docs/` (gồm `GOAL.md`) + `docs/universal_rules/` (gồm `OUTCOME.md`, `ASK-BACK.md`). Tuỳ task đọc thêm: `prisma/schema.prisma` (models), `src/app/api/astrology/report/route.ts` (report flow), `src/lib/jobs.ts` (job system), `src/lib/astrology/calculations.ts` (chart engine). Sau đó: **Goal Check** theo `docs/universal_rules/OUTCOME.md` + `UNIVERSAL_WORKFLOW.md` mục Goal Tracking Protocol. **Xong → báo ngắn "Đã hiểu, sẵn sàng nhận lệnh." → DỪNG. Không output gì thêm.**
- **"report context"** → giống `read context` nhưng sau khi đọc xong → output full structured summary theo format trong `docs/universal_rules/UNIVERSAL_WORKFLOW.md` mục "report context — Output Format".
- **"full update"** → one-shot cuối task: update MD files → commit + push → merge main → restart service → report (xem chi tiết: `docs/universal_rules/UNIVERSAL_WORKFLOW.md` mục **`full update` Workflow**)

**Universal-workflow repo (cho Rule 7):**
- Repo: `git@github.com:hentaiikidd/universal-workflow.git`
- Local clone: `/tmp/universal-workflow/` — **non-persistent**, bị xóa khi reboot, phải check trước khi dùng
- SSH key: `/home/hgct/.ssh/github_hgct` (cùng key với hgct project)
- Vai trò: là git clone thật của repo đó, dùng để commit + push khi sửa `docs/universal_rules/`. `docs/universal_rules/` trong project chỉ là thư mục thông thường, không push được lên repo universal-workflow từ đó
- Quy trình: xem `docs/universal_rules/GIT_WORKFLOW.md` mục **"Push lên universal-workflow repo"**

## Cấu trúc thư mục chính
```
src/
  app/                    # Next.js App Router pages + API routes
    api/
      astrology/          # calculate/, report/ — chart + report APIs
      auth/               # NextAuth handlers
      chart/              # Lưu/lấy chart
      email/              # Gửi email
      job/, jobs/         # Job status tracking
      location/           # Nominatim geocoding
      payment/confirm/    # SePay webhook — nhận callback thanh toán, tự động tạo report
      pdf/                # PDF generation endpoint
      profiles/           # CRUD profiles
      user/account|avatar|upgrade/  # Quản lý tài khoản
    auth/                 # Trang login/register/forgot-password
    chart/                # Trang xem biểu đồ natal
    checkout/             # Trang thanh toán
    input/                # Trang nhập liệu
    my-charts/            # Trang danh sách biểu đồ của user
    processing/           # Trang chờ xử lý report
    profile/              # Trang quản lý hồ sơ
    services/             # Trang chọn dịch vụ
    success/              # Trang sau khi order
  components/
    astrology/            # AstrologyInput, ReportCard, ...
    auth/                 # Form login/register
    chart/                # NatalWheel.tsx (vẽ biểu đồ SVG)
    checkout/             # CheckoutForm
    home/                 # Hero, Features, CTA, Process, FloatingButtons
    layout/               # Navbar, Footer, Sidebar
    profile/              # AvatarCropModal, ChartList, HistoryReports, LocationPicker, ProfileFormModal, ProfileInfo, SubscriptionPlans
    ui/                   # Shared UI components
  lib/
    astrology/            # calculations.ts, knowledge.ts, base.ts, constants.ts, transit-stubs.ts
    logic/
      career/             # block1-4 + manager + prompt
      love/               # manager + prompt
      relationship/       # manager + prompt (synastry)
      vanhan/             # manager + prompt (transit)
    astrology/reportProcessor.ts  # processReport() extracted — dùng bởi cả report API và SePay webhook
    auth.ts               # NextAuth config
    db.ts                 # Prisma client
    email.ts              # sendReportEmail()
    jobs.ts               # Job system (DB + in-memory cache)
    jobHistory.ts         # Lịch sử job
    openrouter.ts         # OpenRouter AI client
    pdf/generator.ts      # PDF generation
  prompts/                # AI prompt templates (4 loại dịch vụ)
  types/                  # TypeScript types
```

## Prisma Schema (models)
- `User` — auth, planType (free/premium/lifetime), isPremium, avatar, reportEmail, resetToken, resetTokenExpiry
- `Profile` — hồ sơ người dùng (name, gender, data JSON)
- `KnowledgeBase` — dữ liệu KB chiêm tinh từ DB
- `Job` — job tracking (status, progress, label, result, error)
- `Order` — đơn hàng (service, profileData, email, status, pdfUrl)

## What's DONE ✓

> Lịch sử đầy đủ: `docs/DONE_HISTORY.md`

**Tính năng đã hoàn thiện:** Auth (Google OAuth + credentials), 4 report services (career adult/young/love/synastry/transit), payment SePay QR, PDF generation (Puppeteer + Ghostscript), job system + watchdog, order recovery v4, admin dashboard (dashboard subdomain), CTV affiliate system (daisu subdomain), free preview (typewriter stream), admin Telegram bot + notify bot, dual pricing, maintenance mode, OG image, 7-day retention email, OpenRouter retry/timeout, resilient order system.

<!-- Khi hoàn thành feature mới → append vào docs/DONE_HISTORY.md, update dòng tóm tắt trên -->

## What's TODO

## Known Fixes Applied

> Lịch sử đầy đủ: `docs/FIXES_HISTORY.md`

Xem file trên khi cần debug — danh sách bug đã gặp + cách fix để tránh tìm lại.

## Important Notes
- Run dev server: `PORT=65498 npm run dev`
- Run standalone: `cd .next/standalone && PORT=65498 node server.js` (cần `.env.local` trong đó)
- After build: `cp .env.local .next/standalone/.env.local`
- DB: zodiacdb (PostgreSQL), user: nguydev
- SMTP: smtp.hostinger.com:465 (SSL), env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
