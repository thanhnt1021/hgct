# HGCT — Kiến Trúc Tổng Thể

> Hạt Giống Chiêm Tinh — hatgiongchiemtinh.com
> Next.js 15 App Router · TypeScript · PostgreSQL · Swiss Ephemeris · OpenRouter AI

---

## 1. Stack Công Nghệ

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Framework | Next.js 15.2.3, React 19, App Router | Server + Client Components |
| Ngôn ngữ | TypeScript 5 | strict mode |
| Styling | Tailwind v4 + CSS custom properties | Design tokens trong globals.css |
| Database | PostgreSQL (`zodiacdb`) | Chạy local, port 5432 |
| ORM | Prisma v5 | schema tại `prisma/schema.prisma` |
| Auth | NextAuth.js | credentials + Google OAuth |
| Chiêm tinh | `swisseph` npm (Swiss Ephemeris) | Ephemeris files tại `/ephe/` |
| AI | OpenRouter → Claude Sonnet 4.6 | Streaming SSE |
| PDF | `@sparticuz/chromium` + `puppeteer-core` | Không cần Chrome hệ thống |
| Email | Nodemailer + Hostinger SMTP (port 465 SSL) | support@hatgiongchiemtinh.com |
| Runtime | Node.js, standalone build | Chạy qua systemd `hgct.service` |
| Port | 65498 (prod) / 65500 (demo) | APP_PORT |

---

## 2. Sơ Đồ Kết Nối Tổng Thể

```
Browser (Client)
│
├── sessionStorage (tạm thời giữa pages)
│   ├── selectedService    — 'career'|'love'|'synastry'|'transit'
│   ├── inputData          — ChartInput cho người A
│   ├── inputDataB         — ChartInput cho người B (synastry)
│   ├── chartInputData     — ChartInput cho /chart (xem bản đồ trực tiếp)
│   └── reportResult       — {pdfUrl, pdfFilename, emailSent, email}
│
└── HTTP calls → Next.js API Routes
        │
        ├── /api/astrology/report   POST — tạo job, chạy background
        ├── /api/astrology/calculate POST — tính chart đơn lẻ (debug)
        ├── /api/job/:id            GET  — poll job progress
        ├── /api/jobs               GET  — list jobs (admin)
        ├── /api/pdf/:id            GET  — download PDF từ /var/hgct/pdfs/
        ├── /api/payment/confirm    POST — SePay webhook, tự động gọi processReport()
        ├── /api/chart              GET/POST — lưu/lấy natal chart vào DB
        ├── /api/profiles           GET/POST/PUT/DELETE — CRUD profiles
        ├── /api/location/search    GET  — Nominatim geocoding
        ├── /api/user/upgrade       POST — validate upgrade code
        ├── /api/user/account       GET/PUT — thông tin tài khoản
        ├── /api/user/avatar        POST — upload avatar
        └── /api/auth/*             — NextAuth handlers

Next.js Server (Node.js, port 65498)
│
├── Auth Engine
│   └── NextAuth.js → credentials + Google OAuth → session { uid, username, isPremium, planType }
│
├── Astrology Engine
│   └── swisseph → calculateChart() → ChartData
│
├── Knowledge Base
│   └── Prisma → PostgreSQL (zodiacdb.knowledge_base) → getKnowledgeFromDB()
│
├── Logic Blocks
│   ├── career/   → getCareerBlocks() → buildCareerPrompt()
│   ├── love/     → getLoveBlocks()   → buildLovePrompt()
│   ├── relationship/ → getRelationshipBlocks() → buildRelationshipEssayPrompt()
│   └── vanhan/   → buildVanhanEssayPrompt() (no blocks)
│
├── AI Generation
│   └── OpenRouter API (HTTPS) → claude-sonnet-4-6 → streaming text
│
├── PDF Generation
│   └── puppeteer-core + @sparticuz/chromium → HTML → PDF Buffer → /var/hgct/pdfs/
│
└── Email
    └── Nodemailer → smtp.hostinger.com:465 → gửi PDF đính kèm
```

---

## 3. User Journey Chính

### 3.1 Đặt Báo Cáo (Happy Path)

```
/services           chọn dịch vụ + chọn profile (từ DB)
    ↓ sessionStorage: selectedService, inputData
/input              nhập thông tin nếu chưa có profile (có thể lưu profile lên DB)
    ↓ sessionStorage: inputData (inputDataB nếu synastry)
/checkout           nhập email, xác nhận
    ↓ POST /api/astrology/report → { jobId }
/processing?job=... polling GET /api/job/:id mỗi 2 giây
    ↓ job.status === 'done' → sessionStorage: reportResult
/success            download PDF, confirm email đã gửi
```

### 3.2 Xem Bản Đồ Sao Trực Tiếp

```
/input?for=chart    nhập thông tin sinh
    ↓ sessionStorage: chartInputData
/chart              render NatalWheel SVG
  hoặc
/chart?id=profileId auto-submit từ profile ID (DB)
```

### 3.3 Luồng Auth (NextAuth.js)

```
/auth/register   → POST /api/auth/register → tạo User trong DB
/auth/login      → NextAuth credentials → session server-side
/auth/login      → Google OAuth → NextAuth Google provider
Profile page     → useSession() hook → session { uid, username, isPremium, planType }
Logout           → signOut() → xóa session
```

### 3.4 Upgrade Premium

```
Profile page → nhập upgrade code
    ↓ POST /api/user/upgrade { code }
    ↓ Server: validate code == UPGRADE_CODE (env)
    ↓ Trả { token: sha256(code + ':hgct-premium') }
    ↓ Cập nhật User.planType = 'premium' trong DB
    ↓ Checkout: gửi premiumToken khi POST /api/astrology/report
    ↓ Server: verify token → cho phép tạo báo cáo
```

---

## 4. Cấu Trúc Thư Mục

```
/home/hgct/hgct/
├── src/
│   ├── app/                        — Next.js App Router pages + API routes
│   │   ├── layout.tsx              — Root layout, font loading, Providers
│   │   ├── page.tsx                — Homepage
│   │   ├── services/page.tsx       — Chọn dịch vụ
│   │   ├── input/page.tsx          — Nhập thông tin sinh (compact grid form)
│   │   ├── checkout/page.tsx       — Xác nhận + email
│   │   ├── processing/page.tsx     — Progress polling
│   │   ├── success/page.tsx        — Kết quả, download PDF
│   │   ├── profile/page.tsx        — Quản lý profile + tài khoản
│   │   ├── my-charts/page.tsx      — Danh sách profiles + inline edit
│   │   ├── chart/page.tsx          — Xem natal wheel SVG
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   └── api/
│   │       ├── astrology/
│   │       │   ├── report/route.ts     — Main report endpoint
│   │       │   └── calculate/route.ts  — Chart calculation endpoint
│   │       ├── auth/[...nextauth]/route.ts — NextAuth handler
│   │       ├── job/[id]/route.ts       — Job status polling
│   │       ├── jobs/route.ts           — Job list
│   │       ├── pdf/[id]/route.ts       — PDF download
│   │       ├── chart/route.ts          — Lưu/lấy natal chart
│   │       ├── profiles/route.ts       — CRUD profiles (DB)
│   │       ├── location/search/route.ts — Geocoding
│   │       ├── user/upgrade/route.ts   — Premium upgrade
│   │       ├── user/account/route.ts   — Thông tin tài khoản
│   │       └── user/avatar/route.ts    — Upload avatar
│   ├── lib/
│   │   ├── astrology/
│   │   │   ├── calculations.ts     — Swiss Ephemeris wrapper
│   │   │   ├── knowledge.ts        — Prisma KB query
│   │   │   ├── base.ts             — KB lookup utilities
│   │   │   ├── constants.ts        — Zodiac, planets, aspects
│   │   │   └── transit-stubs.ts    — Transit/vanhan calculations
│   │   ├── logic/
│   │   │   ├── career/             — block1-4, manager, prompt
│   │   │   ├── love/               — manager, prompt
│   │   │   ├── relationship/       — manager, prompt
│   │   │   └── vanhan/             — manager, prompt
│   │   ├── astrology/reportProcessor.ts — processReport() — dùng bởi report API + SePay webhook
│   │   ├── auth.ts                 — NextAuth config
│   │   ├── db.ts                   — Prisma client singleton
│   │   ├── jobs.ts                 — Job store (DB + in-memory cache)
│   │   ├── jobHistory.ts           — Lịch sử job
│   │   ├── openrouter.ts           — OpenRouter AI client
│   │   ├── pdf/generator.ts        — Puppeteer PDF generator
│   │   └── email.ts                — Nodemailer sendReportEmail()
│   ├── components/
│   │   ├── layout/                 — Navbar, Footer, ShootingStars, StarField
│   │   ├── home/                   — Hero, Features, Process, CTA, FloatingButtons
│   │   ├── chart/                  — NatalWheel.tsx (vẽ biểu đồ SVG)
│   │   ├── profile/                — LocationPicker, ProfileFormModal, AvatarCropModal,
│   │   │                             ChartList, HistoryReports, ProfileInfo, SubscriptionPlans
│   │   ├── checkout/               — CheckoutForm
│   │   └── ui/                     — Shared UI components
│   ├── contexts/
│   │   └── AuthContext.tsx         — Auth state wrapper (dùng useSession NextAuth)
│   ├── prompts/                    — AI prompt templates (text files)
│   └── types/index.ts              — Shared TypeScript types
├── prisma/
│   └── schema.prisma               — DB schema
├── public/
│   └── fonts/                      — Font files dùng cho PDF
├── ephe/                           — Swiss Ephemeris data files
├── docs/                           — Tài liệu này
├── .env.local                      — Secrets
├── deploy.sh                       — Build + systemd restart (production)
└── deploy-demo.sh                  — Build + systemd restart (demo)
```

---

## 5. Background Job System

API report dùng **fire-and-forget pattern**:

```
POST /api/astrology/report
  1. Validate premiumToken
  2. createJob(uuid) → ghi vào jobs DB table + in-memory cache
  3. processReport(jobId, body) — không await, chạy nền
  4. Return { jobId } ngay lập tức (< 100ms)

Background processReport(jobId):
  progress 5%   → calculateChart()         (swisseph, đồng bộ)
  progress 10%  → getKnowledgeFromDB()      (Prisma query)
  progress 15%  → buildPrompt()             (logic blocks)
  progress 18-85% → generateEssayStreaming() (OpenRouter SSE, 3-8 phút)
  progress 90%  → generatePdf()             (Puppeteer, 20-40 giây)
  progress 95%  → sendReportEmail()         (Nodemailer)
  progress 100% → updateJob(done)

Client polling GET /api/job/:id mỗi 2 giây
  → { status, progress, label }
  → khi status==='done': redirect /success
```

Job store **persist ra DB** (`jobs` table) — survive server restart. In-memory cache để fast read.

---

## 6. Environment Variables

| Biến | Dùng cho |
|---|---|
| `DATABASE_URL` | Prisma → PostgreSQL |
| `NEXTAUTH_SECRET` | NextAuth session signing |
| `NEXTAUTH_URL` | NextAuth callback URL |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth |
| `OPENROUTER_API_KEY` | OpenRouter AI |
| `SMTP_HOST/PORT/USER/PASS` | Nodemailer |
| `EMAIL_FROM` | Header email gửi đi |
| `UPGRADE_CODE` | Premium validation |
| `NEXT_PUBLIC_APP_URL` | Public URL |
| `APP_PORT` | Port (65498) |

---

## 7. Deploy

```bash
# Production
sudo bash /home/hgct/hgct/deploy.sh

# Demo (chỉ định branch)
sudo bash /home/hgct/hgct/deploy-demo.sh [branch]

# Script làm gì:
# 1. rm -rf .next && npx next build
# 2. Copy static assets + public + .env.local vào .next/standalone/
# 3. Ghi /etc/systemd/system/hgct.service
# 4. fuser -k PORT/tcp
# 5. systemctl daemon-reload && systemctl restart hgct
```

**Lưu ý:** `.next/` owned by root sau deploy. Luôn dùng `sudo bash deploy.sh`.

**PDF storage:** `/var/hgct/pdfs/` (persistent, tạo sẵn bởi deploy.sh).
