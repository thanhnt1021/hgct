# HGCT - Hạt Giống Chiêm Tinh

## Project Overview
Web app chiêm tinh học — Next.js 15 + TypeScript. Đây là dự án độc lập, hoàn chỉnh.
**KHÔNG liên quan** đến bất kỳ source code cũ nào nữa. Chỉ làm việc trong `/root/hgct`.

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
- Production: hatgiongchiemtinh.com → port 65498, hgct.service, deploy with `sudo bash /root/hgct/deploy.sh`
- Demo: demo.hatgiongchiemtinh.com → port 65500, hgct-demo.service, deploy with `sudo bash /root/hgct/deploy-demo.sh [branch]`

**Workflow:**
- Làm việc trên nhánh `feature/...` → iterate nhanh với **quick deploy** (không cần commit) → khi OK thì commit + push
- Khi OK → merge vào `main` → deploy production

**2 cách deploy demo:**
1. **Quick deploy** (iterate nhanh, chưa commit): `sudo bash /root/hgct/deploy-demo-local.sh`
   - Build từ code hiện tại tại `/root/hgct` (kể cả uncommitted changes)
   - Sync build sang `/root/hgct-demo`, restart service — không cần git push
2. **Full deploy** (sau khi commit + push): `sudo bash /root/hgct/deploy-demo.sh [branch]`
   - Pull từ GitHub, build từ đầu — dùng khi muốn share link demo hoặc sau khi commit

**Shorthand commands (dùng trong chat):**
- **"feature: [tên]"** → tạo branch `feature/tên`, code tính năng, **quick deploy (KHÔNG commit/push)** — chờ feedback/fix thêm
- **"test demo"** hoặc **"quick deploy"** → build code hiện tại + deploy demo, **KHÔNG commit/push**
- **"commit"** → commit lên nhánh hiện tại + push GitHub (chỉ làm khi user bảo)
- **"merge main"** hoặc **"lên production"** → merge branch hiện tại vào main, push, deploy production
- **"deploy demo"** → full deploy (pull GitHub + build) lên demo (dùng sau khi đã commit)
- **"branch hiện tại là gì"** → `git branch --show-current`

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
      payment/confirm/    # Payment webhook (placeholder)
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
- `User` — auth, planType (free/premium/lifetime), isPremium, avatar, reportEmail
- `Profile` — hồ sơ người dùng (name, gender, data JSON)
- `KnowledgeBase` — dữ liệu KB chiêm tinh từ DB
- `Job` — job tracking (status, progress, label, result, error)
- `Order` — đơn hàng (service, profileData, email, status, pdfUrl)

## What's DONE ✓
- [x] Project scaffolding (Next.js, Prisma, Tailwind)
- [x] Auth system — NextAuth.js, credentials + Google OAuth, register, forgot-password
- [x] Session: uid, username, isPremium, planType
- [x] Plan tiers: free / premium / lifetime — `/api/user/upgrade`, SubscriptionPlans UI
- [x] `/src/lib/astrology/calculations.ts` — Swiss Ephemeris chart calculator (TESTED, working)
- [x] `/src/lib/astrology/knowledge.ts` — Prisma KB query
- [x] `/src/lib/astrology/base.ts` — KB lookup utilities
- [x] `/src/lib/astrology/constants.ts` — Astrology constants
- [x] `/src/lib/openrouter.ts` — OpenRouter AI client
- [x] `/src/lib/pdf/generator.ts` — @sparticuz/chromium + puppeteer-core
- [x] `/src/lib/email.ts` — Nodemailer + sendReportEmail()
- [x] Logic blocks — career (block1-4), love, relationship/synastry, vanhan/transit
- [x] `/src/app/api/astrology/report/route.ts` — Unified report API (4 services)
- [x] `/src/app/api/astrology/calculate/route.ts` — Chart calculation API
- [x] `/src/app/api/chart/route.ts` — Lưu/lấy natal chart vào DB
- [x] All 4 report services TESTED end-to-end (career, love, synastry, transit)
- [x] UI pages — homepage, /services, /input, /checkout, /success, /profile, /auth/*, /my-charts, /chart
- [x] NatalWheel.tsx — vẽ biểu đồ natal SVG
- [x] Profile page — split name (Họ/Đệm/Tên), date/time pickers, multi-profile management
- [x] Avatar upload — crop preview, lưu vào DB (base64/URL)
- [x] Google avatar + displayTen name sync
- [x] LocationPicker — Nominatim geocoding + hardcode Asia/Ho_Chi_Minh
- [x] Profile selection flow — services page shows profile dropdown
- [x] Job system — persisted to DB + in-memory cache; survives server restarts
- [x] PDF storage — /var/hgct/pdfs (persistent, created by deploy.sh)
- [x] Deploy scripts — deploy.sh (production), deploy-demo.sh (demo)
- [x] Demo environment — port 65500, hgct-demo.service
- [x] Nginx + SSL — Certbot, HTTPS cho hatgiongchiemtinh.com + demo.hatgiongchiemtinh.com, HTTP→HTTPS redirect
- [x] GitHub — private repo hentaiikidd/hgct, SSH via /home/hgct/.ssh/github_hgct
- [x] Pricing page — 3 tiers (Free/Premium/Lifetime) + billing toggle UI
- [x] SubscriptionPlans component trong /profile
- [x] Fonts: Cinzel, Cinzel Decorative, Cormorant Garamond, EB Garamond, Lora (next/font/google)
- [x] Design: navy #0a0a1a + gold #c9a84c

## What's TODO
- [ ] **Payment integration** — `/api/payment/confirm` là placeholder; cần tích hợp SePay / PayOS hoặc xác minh chuyển khoản thật

## Known Fixes Applied
- `siderealTime` → `siderialTime` (swisseph library typo)
- House cusps: 0-indexed (swisseph returns array[0..11])
- Prisma model: `knowledgeBase` (camelCase auto-mapping from knowledge_base table)
- Vanhan route calls `buildVanhanEssayPrompt(chart, startDate, endDate, profile)` trực tiếp (không cần blocks)
- `geo-tz` sai TZ cho Việt Nam → hardcode `Asia/Ho_Chi_Minh` trong `/api/location/search`
- `.next/standalone/` owned by root sau deploy → luôn deploy qua `sudo bash deploy.sh`

## Important Notes
- Run dev server: `PORT=65498 npm run dev`
- Run standalone: `cd .next/standalone && PORT=65498 node server.js` (cần `.env.local` trong đó)
- After build: `cp .env.local .next/standalone/.env.local`
- DB: zodiacdb (PostgreSQL), user: nguydev
- SMTP: smtp.hostinger.com:465 (SSL), env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
