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
| Auth | localStorage mock (AuthContext) | Không dùng NextAuth thực tế |
| Chiêm tinh | `swisseph` npm (Swiss Ephemeris) | Ephemeris files tại `/ephe/` |
| AI | OpenRouter → Claude Sonnet 4.6 | Streaming SSE |
| PDF | `@sparticuz/chromium` + `puppeteer-core` | Không cần Chrome hệ thống |
| Email | Nodemailer + Hostinger SMTP (port 465 SSL) | support@hatgiongchiemtinh.com |
| Runtime | Node.js, standalone build | Chạy qua systemd `hgct.service` |
| Port | 65498 | APP_PORT |

---

## 2. Sơ Đồ Kết Nối Tổng Thể

```
Browser (Client)
│
├── localStorage
│   ├── hatgiong_auth      — session user hiện tại {username, name, email, isPremium, premiumToken}
│   ├── hatgiong_users     — DB user local {[username]: {name, email, passwordHash, isPremium}}
│   └── hatgiong_profiles  — danh sách Profile {id, ho, dem, ten, dob, tob, loc, ...}
│
├── sessionStorage (tạm thời giữa pages)
│   ├── selectedService    — 'career'|'love'|'synastry'|'transit'
│   ├── inputData          — ChartInput cho người A
│   ├── inputDataB         — ChartInput cho người B (synastry)
│   └── reportResult       — {pdfUrl, pdfFilename, emailSent, email}
│
└── HTTP calls → Next.js API Routes
        │
        ├── /api/astrology/report   POST — tạo job, chạy background
        ├── /api/job/:id            GET  — poll job progress
        ├── /api/pdf/:id            GET  — download PDF từ /tmp/hgct-pdfs/
        ├── /api/location/search    GET  — Nominatim geocoding + geo-tz
        ├── /api/user/upgrade       POST — validate upgrade code, trả token
        └── /api/auth/*             — register, forgot-password (mock)

Next.js Server (Node.js, port 65498)
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
│   └── puppeteer-core + @sparticuz/chromium → HTML → PDF Buffer → /tmp/hgct-pdfs/
│
└── Email
    └── Nodemailer → smtp.hostinger.com:465 → gửi PDF đính kèm
```

---

## 3. User Journey Chính

### 3.1 Đặt Báo Cáo (Happy Path)

```
/services           chọn dịch vụ + chọn profile
    ↓ sessionStorage: selectedService, inputData
/input              nhập thông tin nếu chưa có profile
    ↓ sessionStorage: inputData (inputDataB nếu synastry)
/checkout           nhập email, xác nhận
    ↓ POST /api/astrology/report → { jobId }
/processing?job=... polling GET /api/job/:id mỗi 2 giây
    ↓ job.status === 'done' → sessionStorage: reportResult
/success            download PDF, confirm email đã gửi
```

### 3.2 Luồng Auth

```
/auth/register → AuthContext.register() → localStorage (hatgiong_users)
/auth/login    → AuthContext.login()    → localStorage (hatgiong_auth)
Profile page   → useAuth() hook        → đọc hatgiong_auth
Logout         → AuthContext.logout()  → xóa hatgiong_auth
```

### 3.3 Upgrade Premium

```
Profile page → nhập upgrade code
    ↓ POST /api/user/upgrade { code }
    ↓ Server: validate code == UPGRADE_CODE (env)
    ↓ Trả { token: sha256(code + ':hgct-premium') }
    ↓ AuthContext: lưu { isPremium: true, premiumToken } vào localStorage
    ↓ Checkout: gửi premiumToken khi POST /api/astrology/report
    ↓ Server: verify token → cho phép tạo báo cáo
```

---

## 4. Cấu Trúc Thư Mục

```
/root/hgct/
├── src/
│   ├── app/                        — Next.js App Router pages + API routes
│   │   ├── layout.tsx              — Root layout, font loading, Providers
│   │   ├── page.tsx                — Homepage
│   │   ├── services/page.tsx       — Chọn dịch vụ
│   │   ├── input/page.tsx          — Nhập thông tin sinh
│   │   ├── checkout/page.tsx       — Xác nhận + email
│   │   ├── processing/page.tsx     — Progress polling
│   │   ├── success/page.tsx        — Kết quả, download PDF
│   │   ├── profile/page.tsx        — Quản lý profile + tài khoản
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   └── api/
│   │       ├── astrology/
│   │       │   ├── report/route.ts     — Main report endpoint
│   │       │   └── calculate/route.ts  — Chart calculation endpoint
│   │       ├── job/[id]/route.ts       — Job status polling
│   │       ├── pdf/[id]/route.ts       — PDF download
│   │       ├── location/search/route.ts — Geocoding
│   │       ├── user/upgrade/route.ts   — Premium upgrade
│   │       ├── auth/register/route.ts
│   │       └── auth/forgot-password/route.ts
│   ├── lib/
│   │   ├── astrology/
│   │   │   ├── calculations.ts     — Swiss Ephemeris wrapper
│   │   │   ├── knowledge.ts        — Prisma KB query
│   │   │   ├── base.ts             — KB lookup utilities
│   │   │   ├── constants.ts        — Zodiac, planets, aspects
│   │   │   ├── symbols.ts          — Unicode symbols
│   │   │   ├── synastry.ts         — Synastry calculations
│   │   │   └── transit-stubs.ts    — Transit/vanhan calculations
│   │   ├── logic/
│   │   │   ├── career/             — block1-4, manager, prompt
│   │   │   ├── love/               — manager, prompt
│   │   │   ├── relationship/       — manager, prompt
│   │   │   └── vanhan/             — manager, prompt
│   │   ├── db.ts                   — Prisma client singleton
│   │   ├── jobs.ts                 — In-memory job store
│   │   ├── openrouter.ts           — OpenRouter AI client
│   │   ├── pdf/generator.ts        — Puppeteer PDF generator
│   │   ├── email.ts                — Nodemailer sendReportEmail()
│   │   └── auth.ts                 — NextAuth config (chưa dùng thực tế)
│   ├── components/
│   │   ├── layout/                 — Navbar, Footer, ShootingStars, StarField
│   │   ├── home/                   — HeroSection, FeaturesSection, ProcessSection, CTASection
│   │   ├── astrology/              — InputForm
│   │   ├── chart/                  — NatalWheel (SVG chart)
│   │   ├── profile/                — LocationPicker
│   │   └── Providers.tsx           — AuthProvider wrapper
│   ├── contexts/
│   │   └── AuthContext.tsx         — Auth state, login/register/logout/upgrade
│   ├── prompts/                    — AI prompt templates (text files)
│   └── types/index.ts              — Shared TypeScript types
├── prisma/
│   └── schema.prisma               — DB schema: User, Profile, KnowledgeBase, Order
├── public/
│   └── fonts/                      — Font files dùng cho PDF
├── ephe/                           — Swiss Ephemeris data files
├── docs/                           — Tài liệu này
├── .env.local                      — Secrets (DATABASE_URL, OPENROUTER_API_KEY, SMTP_PASS, ...)
├── deploy.sh                       — Build + systemd restart
└── next.config.js
```

---

## 5. Background Job System

API report dùng **fire-and-forget pattern**:

```
POST /api/astrology/report
  1. Validate premiumToken
  2. createJob(uuid) → in-memory Map (global.__hgctJobs)
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

Job store tự dọn sau 1 giờ. Nếu server restart, jobs mất (không persist).

---

## 6. Environment Variables

| Biến | Dùng cho |
|---|---|
| `DATABASE_URL` | Prisma → PostgreSQL |
| `NEXTAUTH_SECRET` | NextAuth (chưa dùng thực tế) |
| `OPENROUTER_API_KEY` | OpenRouter AI |
| `SMTP_HOST/PORT/USER/PASS` | Nodemailer |
| `EMAIL_FROM` | Header email gửi đi |
| `UPGRADE_CODE` | Premium validation |
| `NEXT_PUBLIC_APP_URL` | Public URL |
| `APP_PORT` | Port (65498) |

---

## 7. Deploy

```bash
# Chạy với quyền root
bash /root/hgct/deploy.sh

# Script làm gì:
# 1. rm -rf .next && npx next build
# 2. Copy static assets + public + .env.local vào .next/standalone/
# 3. Ghi /etc/systemd/system/hgct.service (User=root)
# 4. fuser -k 65498/tcp
# 5. systemctl daemon-reload && systemctl restart hgct
```

**Lưu ý:** `.next/` owned by root sau deploy. User `hgct` không build được trực tiếp → phải dùng `sudo bash deploy.sh`.
