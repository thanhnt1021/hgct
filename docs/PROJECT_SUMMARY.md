# HGCT — Project Summary

> Đọc file này TRƯỚC khi code feature mới / fix bug (theo `AGENTS.md` bảng "Bản đồ rule"). Bổ sung cho `docs/GOAL.md` (mục tiêu + tiến độ) — file này là bản đồ kỹ thuật + vận hành.

## Project Overview
Web app chiêm tinh học — Next.js 15 + TypeScript. Dự án độc lập, hoàn chỉnh. **KHÔNG liên quan** đến bất kỳ source code cũ nào. Chỉ làm việc trong `/home/hgct/hgct`.

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

**Environments (server 185.197.30.234 — Docker stack):**
- Production: `hatgiongchiemtinh.com` → container `hgct-prod` (internal :65498), nginx proxy 80/443 + Cloudflare Full Strict SSL
- Demo: `demo.hatgiongchiemtinh.com` → container `hgct-demo` (internal :65500), clone riêng tại `/home/hgct/hgct-demo/`
- Subdomains: `dashboard.` `daisu.` `admin.` (placeholder) `mo.` (placeholder) — Next.js middleware rewrite theo Host
- Cron: Docker sidecar `hgct-cron` (alpine + crond) chạy `/api/cron/{order-check,cleanup,retention,kb-sync}` qua `CRON_SECRET`
- Compose + nginx config: **live** tại `/home/hgct/docker-compose.yml`, `/home/hgct/nginx/conf.d/`, `/home/hgct/cron/start.sh`. **Snapshot tracked** trong `infra/` — xem `infra/README.md` cho setup fresh server + sync workflow.
- Deploy: `cd /home/hgct && docker compose build hgct-prod && docker compose up -d --force-recreate hgct-prod && docker compose restart nginx`

**Workflow:**
- Làm việc trên nhánh `feature/...` → iterate nhanh với **quick deploy** (không cần commit) → **DỪNG, chờ user confirm**
- Khi commit: dựa vào `docs/MD_FILES_TO_UPDATE.md` để update đúng các file MD liên quan, sau đó **clear file đó**
- Nếu tính năng mới có thêm env var / service / dependency mới → **phải update `docs/REQUIREMENTS_CHECK.md`**
- Khi OK → merge vào `main` → deploy production (MD files đã được commit cùng)

**Deploy workflow (Docker):**
1. **Quick deploy demo** (iterate nhanh, chưa commit): build từ `/home/hgct/hgct` working tree, sync tới hgct-demo
   - **⚠️ BẮT BUỘC sync trước khi build** — demo build từ clone riêng `/home/hgct/hgct-demo` (context `./hgct-demo` trong compose), KHÔNG phải `/home/hgct/hgct`. Bỏ bước sync = build ra code cũ:
   - `rsync -a /home/hgct/hgct/src/ /home/hgct/hgct-demo/src/ && rsync -a /home/hgct/hgct/prisma/ /home/hgct/hgct-demo/prisma/`
   - `cd /home/hgct && docker compose build hgct-demo && docker compose up -d --force-recreate hgct-demo && docker compose restart nginx`
   - **⚠️ `git` trong `hgct-demo` KHÔNG tự cập nhật qua rsync** — rsync chỉ đổi file trên đĩa, không đổi git history. `hgct-demo` và `hgct` cùng trỏ 1 remote (`origin/main` chung), nên nếu lâu không `git pull`, `hgct-demo` sẽ tụt lại phía sau và bất kỳ `commit`/`full update` nào trong `hgct-demo` sẽ bị `git push` reject (non-fast-forward). Trước khi `commit`/`full update` trong `hgct-demo`: LUÔN `git fetch origin && git status -sb` trước — nếu thấy `[behind N]`, phải đồng bộ (`git pull --ff-only`, hoặc nếu có commit riêng thì `git reset --hard origin/main` + áp lại đúng diff cần giữ) trước khi commit/push. Đổi gì trong `hgct-demo` mà không phải preview riêng (giá test, mã ưu đãi demo...) thì nên `git pull` sang `hgct` luôn (cùng remote, fast-forward không xung đột) để tránh lần rsync tiếp theo đè mất.
2. **Full deploy production** (sau khi merge main): checkout main + rebuild + recreate
   - `cd /home/hgct/hgct && git checkout main && git pull && cd /home/hgct && docker compose build hgct-prod && docker compose up -d --force-recreate hgct-prod && docker compose restart nginx`

**Shorthand commands (dùng trong chat) — bảng chung nay ở `docs/univ3/INDEX.md` + `docs/univ3/rules/WORKFLOWS.md`. Bổ sung riêng cho HGCT:**
- **"check server"** → chạy `sudo bash /home/hgct/security-check.sh` → parse output → tóm tắt ⚠/✗ + action items. Dùng hàng tháng để audit drift.
- **"read context" / "report context"** → đọc `CLAUDE.md` + `AGENTS.md` + `docs/GOAL.md` + file này (`PROJECT_SUMMARY.md`) + `docs/univ3/SPINE.md`. Tuỳ task đọc thêm: `prisma/schema.prisma` (models), `src/app/api/astrology/report/route.ts` (report flow), `src/lib/jobs.ts` (job system), `src/lib/astrology/calculations.ts` (chart engine).

## Cấu trúc thư mục chính
```
src/
  app/                    # Next.js App Router pages + API routes
    api/
      astrology/          # calculate/, report/ — chart + report APIs
      auth/               # NextAuth handlers
      chart/              # Lưu/lấy chart
      email/               # Gửi email
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
    pdf/chartSvg.ts       # SVG chart generation (natal/synastry/transit) — dùng bởi generator.ts
    pdf/svgIcons.ts       # SVG icon cache — đọc public/chart-symbols/ lúc module load
    coin/                 # Coin service (packages.ts, unlock-job.ts) — atomic add/deduct
  prompts/                # AI prompt templates (4 loại dịch vụ)
  types/                  # TypeScript types
```

## Prisma Schema (models)
- `User` — auth, planType (free/premium/lifetime), isPremium, avatar, reportEmail, resetToken, resetTokenExpiry, coin
- `Profile` — hồ sơ người dùng (name, gender, data JSON)
- `KnowledgeBase` — dữ liệu KB chiêm tinh từ DB
- `Job` — job tracking (status, progress, label, result, error)
- `Order` — đơn hàng (service, profileData, email, status, pdfUrl)
- `CoinTransaction` — audit log atomic cộng/trừ xu
- `Reading` / `essays` — nội dung luận giải đã mở, đọc lại vĩnh viễn

## What's DONE ✓

> Lịch sử đầy đủ: `docs/DONE_HISTORY.md`

**Tính năng đã hoàn thiện:** Auth (Google OAuth + credentials), 4 report services (career adult/young/love/synastry/transit), payment SePay QR, PDF generation (Puppeteer + Ghostscript), job system + watchdog, order recovery v4, admin dashboard (dashboard subdomain), CTV affiliate system (daisu subdomain), free preview (typewriter stream), admin Telegram bot + notify bot, dual pricing, maintenance mode, OG image, 7-day retention email, OpenRouter retry/timeout, resilient order system, DiscountModal + LuckyWheel flow (referral code 99k flat + vòng xoay giảm giá 5–30%), display price update (199k/269k).

**Coin rework (coin top-up + unlock-per-section):** Mô hình mới — nạp xu (SePay QR) → mở từng mục luận giải online (stream) thay vì trả 1 lần lấy PDF. Models mới: `User.coin`, `CoinTransaction` (audit log atomic), `Reading` (lưu nội dung đã mở). Lib: `src/lib/coin/` (service atomic add/deduct), `src/lib/catalog/sections.ts` (8 dịch vụ + giá lẻ/bundle), `src/lib/essay/` (gen + cache essay), `src/lib/logic/relations/` (4 loại quan hệ mới). API: `src/app/api/coin/{balance,topup-order,unlock-section,unlock-bundle,reading-list}`. Webhook SePay dual-mode (`order.service==='coin-topup'` → cộng xu; ngược lại → report cũ). transferCode coin dùng chung prefix `HGCT######`. Luồng PDF/email cũ giữ nguyên sau feature flag `NEXT_PUBLIC_ENABLE_PDF_FLOW` (mặc định OFF = coin mode). Migration DB đã apply.

**Coin hardening v3.4 (go-live 2026-06-04):** gen chạy ngầm dạng **job** (`src/lib/coin/unlock-job.ts` + `generateEssayStreaming` retry — never-fail, % thật qua `/api/job/[id]`), essay lưu DB (`essays` table, nhất quán + đọc lại vĩnh viễn), check đủ xu trước gen, trang "Hồ sơ đã xem" (`/reading` + nút navbar + `essays.name` + `/api/coin/my-readings`), section gập/mở, modal nhập liệu đồng nhất (dropdown hồ sơ + redirect same-tab), profile dedup, relations 4 thân bài de-romanticize. Chi tiết: `docs/UPGRADE_LOG.md`.

**Bảng giá nạp xu + mã ưu đãi (go-live 2026-07-09, 2026-07-19):** Gói 1-4 (69k/99k/199k/399k), mã ưu đãi ẩn qua `src/lib/coin/packages.ts` (`promoCode` field) — validate cả ở `/api/coin/promo` (lộ gói ẩn) lẫn `topup-order` (tạo đơn).

**Đăng ký (mở lại 2026-06-04):** credentials (`/api/auth/register` — bcrypt + rate-limit 5/giờ/IP) + Google user mới tự tạo tài khoản (`signIn` callback trong `lib/auth.ts`). ⚠️ Google OAuth "Access blocked" = vấn đề Google Console (consent/redirect URI), không phải code.

<!-- Khi hoàn thành feature mới → append vào docs/DONE_HISTORY.md, update dòng tóm tắt trên -->

## What's TODO
Xem `docs/GOAL.md` mục "Pending / Cần Quyết Định" — nguồn duy nhất, không duplicate ở đây.

## Known Fixes Applied

> Lịch sử đầy đủ: `docs/FIXES_HISTORY.md`

Xem file trên khi cần debug — danh sách bug đã gặp + cách fix để tránh tìm lại.

## Important Notes
- Run dev server: `PORT=65498 npm run dev`
- Run standalone: `cd .next/standalone && PORT=65498 node server.js` (cần `.env.local` trong đó)
- After build: `cp .env.local .next/standalone/.env.local`
- DB: zodiacdb (PostgreSQL), user: nguydev
- SMTP: smtp.hostinger.com:465 (SSL), env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
