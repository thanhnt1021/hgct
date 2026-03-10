# HGCT - Hạt Giống Chiêm Tinh

## Project Overview
Migrating astrology web app from **~/mo** (Python/Flask) to **~/hgct** (Next.js 15 + TypeScript).
Source reference: `~/mo` — read files there for logic reference, but **NEVER edit files outside ~/hgct**.

## Tech Stack
- Next.js 15.2.3, React 19, App Router, Tailwind v4
- Prisma v5 + PostgreSQL (db: zodiacdb)
- Swiss Ephemeris (`swisseph` npm) for astronomical calculations
- Puppeteer for PDF generation
- OpenRouter API (Claude Sonnet 4.6) for AI essay generation
- Nodemailer for email
- NextAuth.js for auth
- APP_PORT=65498, domain=hatgiongchiemtinh.com

## Key Architecture
**Report flow:** Calculate chart → Get KB from DB → Run logic blocks → Build prompt → AI generates essay → Generate PDF → Send email

**Environments:**
- Production: hatgiongchiemtinh.com → port 65498, hgct.service, deploy with `sudo bash /root/hgct/deploy.sh`
- Demo: demo.hatgiongchiemtinh.com → port 65500, hgct-demo.service, deploy with `sudo bash /root/hgct/deploy-demo.sh [branch]`

**Workflow:**
- Làm việc trên nhánh `feature/...` → push GitHub → deploy demo để test
- Khi OK → merge vào `main` → deploy production

## What's DONE ✓
- [x] Project scaffolding (Next.js, Prisma, Tailwind)
- [x] Auth system (NextAuth.js, register, forgot-password)
- [x] `/src/lib/astrology/calculations.ts` — Swiss Ephemeris chart calculator (TESTED, working)
- [x] `/src/lib/astrology/knowledge.ts` — Prisma KB query
- [x] `/src/lib/astrology/base.ts` — KB lookup utilities
- [x] `/src/lib/astrology/constants.ts` — Astrology constants
- [x] `/src/lib/openrouter.ts` — OpenRouter AI client
- [x] `/src/lib/pdf/generator.ts` — Uses @sparticuz/chromium + puppeteer-core (system Chrome deps not needed)
- [x] `/src/lib/email.ts` — Nodemailer + sendReportEmail()
- [x] `/src/lib/logic/career/` — block1-4 + manager + prompt (Career service)
- [x] `/src/lib/logic/love/` — manager + prompt (Love service)
- [x] `/src/lib/logic/relationship/` — manager + prompt (Relationship/Synastry service)
- [x] `/src/lib/logic/vanhan/` — manager + prompt (Transit service)
- [x] `/src/lib/astrology/transit-stubs.ts` — Full transit functions: scanHouseTransitsInRange, findExactAspectTimes, getOuterPlanetCycleData
- [x] `/src/app/api/astrology/report/route.ts` — Unified report API (all 4 services)
- [x] `/src/app/api/astrology/calculate/route.ts` — Chart calculation API
- [x] Fonts copied from ~/mo to /public/fonts/
- [x] Prompt templates copied to /src/prompts/
- [x] All 4 report services TESTED end-to-end (career, love, synastry, transit) — AI + PDF working
- [x] UI pages — homepage, /services, /input, /checkout, /success, /profile, /auth/*
- [x] `/deploy.sh` — Deploy script (run as root to update systemd service)
- [x] Typography — Cinzel, Cinzel Decorative, Cormorant Garamond, EB Garamond, Lora (next/font/google), navy #0a0a1a + gold #c9a84c palette
- [x] Auth — NextAuth + Prisma DB (migrated from localStorage mock); session includes uid, username, isPremium
- [x] Profile page — split name (Họ/Đệm/Tên), date/time pickers, multi-profile management, profiles synced to DB via /api/profiles
- [x] LocationPicker component — Nominatim geocoding + geo-tz timezone lookup, `/api/location/search`
- [x] Profile selection flow — services page shows profile dropdown before checkout
- [x] Test email service — `/test-email` page + `/api/test-email` (Hostinger SMTP, detailed error reporting)
- [x] `.env.example` — with all required keys
- [x] Job system — persisted to DB (jobs table) with in-memory cache; `getJobFromDb` survives server restarts
- [x] PDF storage — moved from /tmp/hgct-pdfs to /var/hgct/pdfs (persistent, created by deploy.sh)
- [x] Demo environment — demo.hatgiongchiemtinh.com on port 65500 (hgct-demo.service, deploy-demo.sh, nginx config)
- [x] GitHub — private repo hentaiikidd/hgct, SSH key at /home/hgct/.ssh/github_hgct
- [x] Sudoers — hgct has NOPASSWD: ALL (full sudo, needed for Claude Code automation)

## What's TODO
- [ ] **Payment integration** — QR code placeholder; needs real bank transfer verification or payment gateway
- [ ] **Port chart drawing** — natal chart, synastry chart, vanhan map, timeline, aspect grid (Python PIL → Canvas/SVG or skip)
- [ ] **Nginx/SSL** — reverse proxy + SSL cert for hatgiongchiemtinh.com + demo.hatgiongchiemtinh.com
- [ ] **Merge feature/auth-db-migration → main** — sau khi test xong trên demo

## Known Fixes Applied
- `siderealTime` → `siderialTime` (swisseph library typo)
- House cusps: 0-indexed (swisseph returns array[0..11])
- Prisma model: `knowledgeBase` (camelCase auto-mapping from knowledge_base table)
- Vanhan route calls `buildVanhanEssayPrompt(chart, startDate, endDate, profile)` directly (no blocks needed)

## Important Notes
- Run dev server: `PORT=65498 npm run dev`
- Run standalone: `cd .next/standalone && PORT=65498 node server.js` (needs `.env.local` in that dir)
- After build: `cp .env.local .next/standalone/.env.local`
- PDF generation uses `@sparticuz/chromium` + `puppeteer-core` (no system Chrome deps needed)
- Python source reference at ~/mo — READ ONLY, never edit
- The `swisseph` npm package has typo: property is `siderialTime` not `siderealTime`
- When user says "continue" — pick up from the TODO list above
