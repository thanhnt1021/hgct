# HGCT - Hạt Giống Chiêm Tinh

## Project Overview
Web app chiêm tinh học — Next.js 15 + TypeScript. Đây là dự án độc lập, hoàn chỉnh.
**KHÔNG liên quan** đến bất kỳ source code cũ nào nữa. Chỉ làm việc trong `/root/hgct`.

**Quy tắc file MD:** Mọi file `.md` mới (trừ `CLAUDE.md`) đều mặc định tạo trong `/docs/`. `CLAUDE.md` bắt buộc ở root (Claude Code CLI yêu cầu).

> Đọc `docs/universal_rules/UNIVERSAL_WORKFLOW.md` để áp dụng universal workflow rules cho project này.

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
1. **Quick deploy** (iterate nhanh, chưa commit): `sudo bash /root/hgct/deploy-demo-local.sh`
   - Build từ code hiện tại tại `/root/hgct` (kể cả uncommitted changes)
   - Sync build sang `/root/hgct-demo`, restart service — không cần git push
2. **Full deploy** (sau khi commit + push): `sudo bash /root/hgct/deploy-demo.sh [branch]`
   - Pull từ GitHub, build từ đầu — dùng khi muốn share link demo hoặc sau khi commit

**Shorthand commands (dùng trong chat):**
- **"feature: [tên]"** → **[BƯỚC 0] tạo branch `feature/tên` NGAY, dù user có đính kèm code/plan** → re-read context → **hỏi Q&A (BẮT BUỘC, kể cả khi đã có plan đính kèm)** → chờ user confirm rõ ràng → implement + test từng bước → quick deploy → **DỪNG chờ feedback** (xem chi tiết: `docs/universal_rules/UNIVERSAL_WORKFLOW.md` mục **`feature:` Workflow**)
- **"test demo"** hoặc **"quick deploy"** → build + deploy demo → **DỪNG chờ feedback**
- **"commit"** → commit + push nhánh hiện tại + update MD files (chỉ làm khi được lệnh)
- **"merge main"** hoặc **"lên production"** → merge + push + deploy production (chỉ làm khi được lệnh)
- **"deploy demo"** → full deploy từ GitHub (dùng sau khi đã commit)
- **"branch hiện tại là gì"** → `git branch --show-current`
- **"check requirements"** → đọc `docs/universal_rules/NEW_PROJECT_SETUP.md`, kiểm tra + tạo files còn thiếu
- **"update workflow"** → review + đề xuất cải tiến các file trong `docs/universal_rules/`
- **"read context"** → đọc toàn bộ context: `CLAUDE.md` + tất cả files trong `docs/` + `docs/universal_rules/`. Sau đó tuỳ task đọc thêm: `prisma/schema.prisma` (models), `src/app/api/astrology/report/route.ts` (report flow), `src/lib/jobs.ts` (job system), `src/lib/astrology/calculations.ts` (chart engine). **Sau khi đọc xong → output structured summary** theo format trong `docs/universal_rules/UNIVERSAL_WORKFLOW.md` mục "read context — Output Format".

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
- [x] Deploy scripts — deploy.sh (production), deploy-demo.sh (demo), deploy-demo-local.sh (quick local build, no git push)
- [x] Demo environment — port 65500, hgct-demo.service
- [x] Nginx + SSL — Certbot, HTTPS cho hatgiongchiemtinh.com + demo.hatgiongchiemtinh.com, HTTP→HTTPS redirect
- [x] GitHub — private repo hentaiikidd/hgct, SSH via /home/hgct/.ssh/github_hgct
- [x] Pricing page — 3 tiers (Free/Premium/Lifetime) + billing toggle UI
- [x] SubscriptionPlans component trong /profile
- [x] Fonts: Cinzel, Cinzel Decorative, Cormorant Garamond, EB Garamond, Lora (next/font/google)
- [x] Design: navy #0a0a1a + gold #c9a84c
- [x] PDF share via Web Share API — nút "Chia sẻ" trong `/profile?tab=history` gửi file PDF thật qua Messenger/Zalo
- [x] `/report/[id]` — viewer page: Android iframe embed, iOS card UI; bottom bar [Xem] + [Tải về] (Web Share API)
- [x] PDF download filename — `/api/pdf/[id]?filename=` dùng đúng tên từ query param (RFC 5987 UTF-8), khớp với tên file gửi email
- [x] Khung kết luận đỏ `[KTLUẬN]` — career.txt + love.txt cập nhật rule, cuối mỗi mục đều có khung đóng viền đỏ như Vận Hạn + Cặp Đôi
- [x] PDF path traversal fix — validate UUID format trước khi đọc `/var/hgct/pdfs/{id}.pdf`
- [x] Đổi mật khẩu — `/api/user/password` POST + UI trong /profile
- [x] Forgot password — full flow: token DB + email link + `/auth/reset-password` page
- [x] Lưu Order vào DB — `orders` table ghi khi tạo báo cáo (pending → completed)
- [x] **SePay payment integration** — free user thanh toán QR chuyển khoản per-order; `processReport` extracted ra `src/lib/astrology/reportProcessor.ts`; webhook tự động tạo report sau khi nhận tiền; polling frontend 3s; countdown 15 phút; QR từ `qr.sepay.vn`
- [x] PDF cải thiện — tăng font size, footer native puppeteer, orphan/widow control, fix blank page
- [x] Auto-timeout stuck jobs — sweep khi restart + `markStuckIfNeeded` khi poll (dùng `lastActivity` thay `createdAt` tránh false positive với Transit/Synastry); nút Hủy báo cáo trên `/processing`
- [x] Order recovery system — `/api/recover`: atomic lock + rollback nếu crash (không kẹt `retrying`); max 3 retries; sweep rotate token + autoRetry flag; sweep dọn `retrying` orders bị stuck; processing page tự silent-redirect lần đầu fail, frozen detection 90s; email chỉ gửi từ lần 2+ (lần đầu auto-redirect handle)
- [x] OpenRouter retry — ECONNRESET/terminated tự retry 3 lần; `StreamInterruptedError` khi stream kết thúc không có `[DONE]`
- [x] `max_tokens` tăng 16000 → 32000 — Vận Hạn cần ~22900 tokens, 16000 gây cắt giữa Phần 5
- [x] MIN_CHARS per service — transit: 12000, synastry: 10000, career/love: 4000; tự retry nếu output quá ngắn
- [x] Email template — greeting block lớn hơn, layout fixes, synastry text left-align
- [x] Email template round 2 — name adaptive sizing (≤8→42px, ≤12→38px, ≤18→32px, ≤24→26px, >24→22px); header brand 22px/domain 16px; body padding 36px 16px (mobile width); support line: "Liên hệ hỗ trợ:`<br>`link email"; synastry: 2 tên tách dòng, left-align, sync font-size
- [x] PDF `[KTTIỂU]` mini-box — kết luận tiểu mục Vận Hạn (sections 2/3/4/6): border đỏ 1.2pt `#dc2626`, nền `#fef9f9`, 15.5pt, `page-break-inside:avoid`
- [x] Vận Hạn prompt — `[KTLUẬN]` bổ sung cho section 1 (Tổng Quan) + section 6 (Sức Khỏe); rule `[KTTIỂU]` cho tất cả sections đa tiểu mục (2/3/4/6)
- [x] PDF subheading widow fix — XUNG ĐỘT/HÒA HỢP: detect h2.section → move h2 (không phải subheading); `spaceNeededFor()` dùng `offsetHeight` cho red-box/mini-box (page-break-inside:avoid)
- [x] Em dash (—) fix — Love/Synastry/Vanhan output sạch không còn dấu gạch dài: xóa ` — ` trong prompt templates (love.txt, relationship.txt, vanhan.txt) + data brief labels trong love/prompt.ts và relationship/prompt.ts
- [x] Dash bullet line break fix — inline `- ` list items bị dồn thành paragraph → tách thành dòng riêng: `splitInlineDashBullets()` pre-processing + `dash_bullet` classifyLine type + CSS `.dash-bullet` + prompt rules (vanhan/love/career) yêu cầu mỗi `- ` item xuống dòng riêng
- [x] Vanhan KB integration — inject KB data từ tab "Tool Vận Hạn" vào prompt: area descriptions (THUẬN LỢI/ỔN ĐỊNH/THÁCH THỨC) per house, planet transit descriptions (Jupiter/Saturn/Uranus/Neptune/Pluto) per house, general summary; fix "Hội Tụ" → "Trùng" cho Conjunction; thêm rule 5 major aspects only + KB usage rule trong vanhan.txt
- [x] Vanhan scoring match mo — `computeHouseScores` rewrite cho kết quả giống hệt mo: (1) `findAspectPeriods` period-based detection (orb<3° threshold + boundary bisection + exact hits) thay cho flat zero-crossing; (2) Conjunction/Opposition fix bằng target-point approach; (3) transit points đếm 1 lần/planet/house; (4) scan ±30 ngày rộng hơn analysis range; (5) per-house natal targets (cusp planet + house ruler); (6) chỉ 5 major aspects; (7) Year Conclusion formula (timĐỏ+timVàng > timĐen → THUẬN LỢI)
- [x] Telegram order notifications — sau mỗi report hoàn thành tự động gửi vào group "Nhật Ký Bóc Lột" (chat -1003849385640 thread 161): dịch vụ, tên/email khách, số tiền, OR Fee ($), OR VND (VCB Sell rate real-time), OR Balance; sequential flow: chờ 15s → lấy fee (retry 2×10s nếu null) → balance + VCB rate song song → gửi; gen ID capture từ SSE chunk `id` field; dùng **@nguyclaudebot** (`TELEGRAM_BOT_TOKEN`) — KHÔNG phải admin bot
- [x] Chặn đăng ký mới — `/api/auth/register` trả 403; Google OAuth không tạo user mới nếu email chưa có; login page ẩn link đăng ký
- [x] Giá dịch vụ dynamic từ DB — `config` table, 4 keys per-service: `price_career`, `price_love`, `price_synastry`, `price_transit`; fallback chain: `price_<svc>` → `service_price` → 3333; `src/lib/pricing.ts` (`getPrice`, `getAllPrices`, `setPrice`, `setAllPrices`); API `create-order` đọc từ DB qua `getPrice()`
- [x] Admin Telegram bot + Notify bot — **2 bot riêng biệt, 2 token khác nhau** (xem `docs/telegram_bot_spec.md`):
  - **Admin bot** `@hatgiongchiemtinhbot` (`TELEGRAM_ADMIN_BOT_TOKEN`): webhook `/api/telegram-admin/[secret]/webhook`; chỉ admin ID 1247334831; menu phân cấp (main → price/orders/system); per-service price buttons + ForceReply custom input (gõ số trực tiếp, tự retry nếu sai); hủy đơn `pending`/`failed` qua nút `🗑 Hủy #N` + `🗑 Hủy tất cả pending` (có confirm); orders stats/pending/failed/recent; graceful restart; `/check` + nút `🔍 Check đơn ngay` → gửi kết quả vào nhóm; `/setcheckinterval <N>` + nút `⏱ Set interval` (ForceReply); `setMyCommands` đăng ký `/start /help /setprice /getprice /pay /check /setcheckinterval`; files: `src/lib/telegram/bot.ts` + `src/lib/telegram/admin.ts` + `src/lib/orderCheck.ts`
  - **Notify bot** `@nguyclaudebot` (`TELEGRAM_BOT_TOKEN`): gửi 1 chiều vào group, KHÔNG nhận lệnh; 4 loại alert: đơn hoàn thành, đơn lỗi (+ Retry/Email buttons), underpayment (+ Mark Paid button), startup sweep; file: `src/lib/notify.ts`; buttons trong group callback về admin bot webhook
- [x] Wording fix — thay "AI đang biên soạn" → "Vũ trụ đang biên soạn" trong reportProcessor.ts, processing/page.tsx, services/page.tsx
- [x] `/chart` dominant planets algorithm — tie-breaking cải thiện để match mo: max-count filter → global min orb_round → total orb_round sort
- [x] `/chart` page redesign — layout 2 cột: cột trái (Wheel + BẢNG NGUYÊN TỐ & TÍNH CHẤT); Elements (Lửa/Đất/Khí/Nước) + Modality (Khởi/Cố/Biến) dạng progress bar %; Nhà Trội dạng chips (symbol hành tinh + điểm); aspect legend "Bán Lục Hợp" + "Ngũ Chiếu" tách riêng
- [x] PDF `[SUBTITLE]` marker — gray italic subtitle (NunitoItalic 12pt #6b7280) hiện giữa h2 và red rule; `pendingRule` state trong `buildHtml()` delay chèn `<hr class="section-rule">` để subtitle có thể chen vào trước; `title_heading` (XUNG ĐỘT/HÒA HỢP) get inline `<hr>` ngay; `.section` CSS bỏ `border-bottom` + `padding-bottom`
- [x] PDF `[CLOSING]` marker — khi gặp `[CLOSING]` trong output AI, kích hoạt `closingMode`: mọi dòng sau đó bị force thành `signature` (gray italic), kể cả body text — dùng cho lời cảm ơn cuối bài
- [x] Pronoun bạn — career/love/synastry đổi xưng hô `anh/chị` → `bạn` thống nhất; career có age-conditional greeting (`≥22` người đi làm vs `<22` học sinh); `Chủ lá số` → `Chủ bản đồ sao` trong career brief; `SIGN_KEYS` broadened: `"Cảm ơn bạn đã tin tưởng"` → `"Cảm ơn bạn đã"`
- [x] Section titles v2 — career (7 sections mới + `[SUBTITLE]` cho tất cả + `{greeting}` placeholder + `[CLOSING]` closing); love (6 sections, subtitle cho 2/3/4, fixed "Bạn yêu mến!" opening, `[CLOSING]`); synastry (6 sections, subtitle cho 1-4, fixed "Bạn yêu mến!" opening, `[CLOSING]`)
- [x] Periodic order check — `src/lib/orderCheck.ts` + `/api/cron/order-check`; cron chạy mỗi phút, endpoint check interval trong DB (`order_check_interval`, mặc định 15p); gửi vào group bằng `@hatgiongchiemtinhbot`; báo failed + pending quá 15p + OR Balance; interval set qua `/setcheckinterval` hoặc ForceReply; `deploy.sh` tự re-register webhook sau mỗi deploy
- [x] **Resilient Order System v4** — `smartRetryOrder()` centralized (`src/lib/smart-retry.ts`, 4 outcomes: skipped/pdfResent/quotaExceeded/retrying); `sepay-webhook` dùng `createReportJob()` (full recovery thay vì fire-and-forget cũ); `sweepPaidPendingOrders()` startup sweep tìm paid+pending+jobId=null; Job Watchdog (`src/lib/job-watchdog.ts`) mỗi 2p per-service threshold (12p career/love, 20p synastry/transit); `/api/recover` + admin bot (`o_retry_N`) + watchdog đều dùng `smartRetryOrder`
- [x] Claim Transfer — `/api/payment/claim-transfer`: khách tự báo đã CK sau countdown hết → lưu `claimedAt`/`claimInfo` vào Order → `sendCustomerClaimAlert()` admin alert với nút ✅ Mark Paid; `payment/page.tsx` countdown-expired hiện 2 nhánh choice (Chưa CK / Đã CK)
- [x] Frontend resilience — `checkout/page.tsx` retry loop 3 lần (5xx/network, delay 3s); `processing/page.tsx` failCount banner + force-redirect progress=100; `success/page.tsx` Suspense + fallback chain (sessionStorage → URL params → fetch job → static fallback); `payment/page.tsx` failCount banner + countdown pause khi failCount≥4 + claim form
- [x] Notify Bot 3 functions mới: `sendPaymentReceivedNotification()` (sepay-webhook sau mark paid), `sendCustomerClaimAlert()` (claim-transfer, nút Mark Paid), `sendUnmatchedPaymentAlert()` (sepay-webhook khi không khớp order)
- [x] OR fee delays [8s/12s/18s] front-loaded (thay [15s/10s/10s]); fix `cost != null` edge case (không bỏ qua cost=0)
- [x] Admin Bot pending/failed: hiển thị giờ tạo + thời gian trôi qua — `HH:MM (Xp trước)` / `HH:MM (Xh trước)`
- [x] OrderCheck 3-group format — ❌ LỖI (paid+not completed) / ❓ NGHI VẤN (unpaid+claimedAt) / 💤 CHƯA THANH TOÁN (summary+retarget); `sendRetargetEmail()` gửi nhắc CK sau 12h (1 lần/đơn, marks `retargetEmailSentAt`); `o_pending_detail` callback → `showPendingOrders()`
- [x] GuestSynastryModal — labels "── THÔNG TIN CỦA BẠN ──" / "── THÔNG TIN CỦA ĐỐI PHƯƠNG ──"; `initialDataA`/`initialDataB` props; `resetWith()` trong `usePersonState()`; `?edit=1` flow: sessionStorage persist + re-populate khi quay lại từ checkout
- [x] Services cards — `h-full` same height; tag inline với tên (flex row); career desc merge 2 dòng; `minHeight: '2.2rem'` căn chỉnh description Y cùng vị trí
- [x] Checkout — profile review block (tên + SN + nơi sinh, synastry: 2 người); back button "← Sửa thông tin" styled (border gold, underline, `#8a8399`); real-time email validation (`emailTouched`, `isValidEmail` regex, warning `#c8410a`, disable submit khi format sai)
- [x] Payment page compact — amount vào header, 2 notices gộp 1, tighter spacing
- [x] `/api/recover` cancelled case — trả 400 + message rõ trước khi check `status !== 'failed'`

## What's TODO

## Known Fixes Applied
- `siderealTime` → `siderialTime` (swisseph library typo)
- House cusps: 0-indexed (swisseph returns array[0..11])
- Prisma model: `knowledgeBase` (camelCase auto-mapping from knowledge_base table)
- Vanhan route calls `buildVanhanEssayPrompt(chart, startDate, endDate, profile)` trực tiếp (không cần blocks)
- `geo-tz` sai TZ cho Việt Nam → hardcode `Asia/Ho_Chi_Minh` trong `/api/location/search`
- `.next/standalone/` owned by root sau deploy → luôn deploy qua `sudo bash deploy.sh`
- `max_tokens: 16000` cắt Vận Hạn giữa Phần 5 (`finish_reason: length`) → tăng lên 32000
- Stream OpenRouter kết thúc mà không có `[DONE]` marker → `StreamInterruptedError` → retry tự động
- `findExactAspectTimes` Conjunction/Opposition bug: `|difdeg2n| - angle` never crosses zero for angle=0/180 → fix: target-point approach `difdeg2n(transitLon, natalLon + angle)`
- Vanhan transit points double-counting: planet có nhiều periods trong cùng house → chỉ đếm 1 lần (match mo `break` logic)

## Important Notes
- Run dev server: `PORT=65498 npm run dev`
- Run standalone: `cd .next/standalone && PORT=65498 node server.js` (cần `.env.local` trong đó)
- After build: `cp .env.local .next/standalone/.env.local`
- DB: zodiacdb (PostgreSQL), user: nguydev
- SMTP: smtp.hostinger.com:465 (SSL), env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
