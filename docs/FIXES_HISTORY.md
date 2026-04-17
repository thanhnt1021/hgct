# Fixes History — HGCT

> File này chứa toàn bộ danh sách bug đã gặp + cách fix. Tham khảo khi debug để tránh tìm lại.

## Known Fixes Applied
- **RRI-T v2.0 security hardening** (17 items, full auto-verified):
  - `auth.ts` — bcrypt dual-mode: `hashPassword` async bcrypt12; `verifyPassword` SHA256 fallback + silent rehash → migration transparent
  - `email.ts` — SMTP TLS `rejectUnauthorized: false` → `true` (tested OK with Hostinger smtp.hostinger.com:465)
  - `src/lib/ratelimit.ts` (new) — Upstash Redis rate limiting + in-memory fallback: login 10/15min, recover 5/10min, claim 3/1h
  - `api/auth/[...nextauth]/route.ts` — custom POST wrapper: check `checkLoginRateLimit` trước khi pass qua NextAuth; URL parse thay context.params (Next.js 15 compat)
  - `api/recover/route.ts` + `api/payment/claim-transfer/route.ts` — rate limit applied
  - `notify.ts` — `escHtml()` applied to `name/email/error` trong `sendOrderFailedAlert`; `AbortSignal.timeout(10_000)` cho cả `getOpenRouterBalance` và `getGenerationCost` fetches
  - `telegram/admin.ts` — `escHtml()` applied to `o.email` trong pending + recent orders display
  - `report/route.ts` — IDOR guard: profileUidA + profileUidB verify ownership khi có session
  - `api/job/[id]/route.ts` GET — owned jobs (userUid≠null) yêu cầu matching session uid
  - `pdf/generator.ts` — `let browser = null` before try + `finally { if (browser) browser.close() }` prevent leak; ghostscript `timeout: 60_000`
  - `openrouter.ts` — `AbortController` 180s per stream attempt; `AbortError` → continue retry loop
  - `checkout/page.tsx` + `api/payment/create-order/route.ts` — idempotency key (UUID sessionStorage + DB `idempotency_key` UNIQUE column)
  - `reportProcessor.ts` — recovery token preserved across retries (không xóa khi retry); CTV commission email fail → `sendOrderFailedAlert` admin alert
  - `api/cron/cleanup/route.ts` — Phase 3: xóa `/tmp/hgct-previews/` files > 24h
  - `api/payment/sepay-webhook/route.ts` — 90% underpayment hard block (< 90% → return OK, không process); 90–99% → alert + process
  - Nginx — `X-Real-IP: $http_cf_connecting_ip` (thay `$remote_addr`) cho cả production + demo → rate limit dùng đúng IP user qua Cloudflare
  - `package.json` — thêm `bcryptjs` + `@types/bcryptjs`
- RRI-T v2.3 bug sweep (31 bugs total, 2 sessions):
  - Bugs #1–#12: `report/route.ts` Bug#1 + Bug#3; `reportProcessor.ts` Bug#2 + Bug#8; `pdf/[id]/route.ts` Bug#2; `job-watchdog.ts` Bug#4 + Bug#6; `smart-retry.ts` Bug#5; `deploy/route.ts` Bug#9; `middleware.ts` Bug#10; `sepay-webhook/route.ts` Bug#11 (timingSafeEqual); `admin/config/route.ts` Bug#12 (key allowlist + numeric validation)
  - Bug#13: `openrouter.ts` — HTTP 429/5xx retry (RegExp match trên Error message, không phải TypeError)
  - Bug#15: `telegram/admin.ts` — `handleMarkPaid` kiểm tra `adminCancelledAt` trước khi mark paid
  - Bug#16: `profiles/route.ts` — IDOR: PUT/DELETE không verify ownership → thêm `userUid` check
  - Bug#17: `sepay-webhook/route.ts` — race condition duplicate job: atomic lock `updateMany` (unpaid→paid)
  - Bug#18: `jobs.ts` — `generateRecoveryToken` dùng `Math.random()` → đổi sang `crypto.randomBytes` (CSPRNG)
  - Bug#19: `auth/change-password/route.ts` — không yêu cầu mật khẩu hiện tại khi đổi mật khẩu
  - Bug#21: `cron/order-check/route.ts` + `cron/cleanup/route.ts` — CRON_SECRET dùng string compare → `timingSafeEqual`
  - Bug#25: `notify.ts` `sendCustomerClaimAlert` — `transferContent` chèn raw vào `<code>` tag → `escHtml()`
  - Bug#26: `api/email/send/route.ts` — dead stub endpoint không có auth guard → thêm `getServerSession`
  - Bug#27: `api/payment/confirm/route.ts` — placeholder endpoint không có auth guard → thêm `getServerSession`
  - Bug#28: `lib/pricing.ts` — `getPrice`/`getAllPrices` dùng `> 0` → `>= 0` (admin có thể set price=0)
  - Bug#31: `lib/email.ts` — `name`/`nameB` user-supplied chèn raw vào HTML trong tất cả email templates → `escHtml()`
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
- Telegram admin bot group chat — ForceReply `selective: true` không trigger khi bot gửi message mới (không reply message của user) trong group → thay bằng preset inline buttons cho `CHECKINTERVAL`; giữ ForceReply cho `CUSTPRICE` (chỉ dùng trong private chat context)
- Telegram group commands có suffix `@botname` — `/check@hatgiongchiemtinhbot` không match `/^\/check$/i` → fix regex thành `/^\/check(@\w+)?$/i` và tương tự cho `/setcheckinterval`
- Admin bot ForceReply handler: bỏ `replyFrom?.is_bot` gate → match trực tiếp bằng text marker (`replyText.includes('CHECKINTERVAL')`) — an toàn vì chỉ admin user ID mới reach được handler
- PDF generation silent fail: `generatePdf()` catch lỗi → trả `null` → `processReport()` mark order `completed` với `pdfUrl=null`, không retry, email không có PDF → fix: throw error khi `pdfBuffer` null (sau try-finally) để job fail → auto-retry đúng cách; thêm `page.setDefaultNavigationTimeout(60000)` trước render reference page
- HistoryReports.tsx: button "Tải PDF" bị disabled nhưng không báo lỗi khi `isDone && !pdfUrl` → fix tooltip "Lỗi tạo PDF — vui lòng liên hệ hỗ trợ"
- PDF font deduplication — career PDF bị ~3× font embed (main render + reference page render mỗi cái embed full font set, pdf-lib không deduplicate) → 7.9MB thay vì 2.3MB; fix: `compressPdf()` dùng `ghostscript -dPDFSETTINGS=/printer` sau khi build xong PDF cuối (áp dụng tất cả service); 7.9MB → 2.9MB (63% giảm); fallback: nếu gs lỗi trả PDF gốc; `apt install ghostscript` thêm vào server
- Recovery token bị xóa khi auto-retry — `smartRetryOrder()` set `recoveryToken: null` mỗi lần retry, khách nhận email với token cũ → vào trang recover → 404 "Không tìm thấy"; fix: bỏ `recoveryToken: null` khỏi update, token giữ nguyên đến khi order `completed`
- **RRI-T v2.1 CTV security** — (A) bcrypt dual-mode: `verifyCtvPassword` SHA256 fallback + silent rehash, `hashCtvPassword` bcrypt12; (B) rate limit CTV login/register qua `ratelimit.ts`; (C) setupToken IDOR fix: thay ctvId+email bằng random 64-hex token, single-use (cleared sau setup); (D) email enumeration: register duplicate → 200 thay 409; Prisma `ctv.setup_token TEXT` thêm trực tiếp SQL (prisma db push lỗi config PK)
- **Security incident + hardening (Apr 2026)** — XMRig miner bị cài qua `/root/FILE` file manager (unauthenticated `POST /run_command` shell execution); response: kill miners, clear malicious crontab, enable UFW firewall (block direct 65498/65500), add backend auth to FILE app, rotate tất cả 12 credentials, re-encrypt 629 profiles với PROFILE_ENCRYPTION_KEY mới; infrastructure: `hgct.service User=hgct` (không còn root), `admin.hatgiongchiemtinh.com` có Nginx Basic Auth (2-layer: Basic Auth popup + Flask login, cùng 1 password)
- **Docker migration audit (Apr 2026)** — full RRI-T scan Docker adapt coverage sau migrate VPS. P0 fixes: (1) `ghostscript` thiếu trong Dockerfile apt-get → PDF 9MB thay vì 3MB (compressPdf catch-silent); (2) `hgct-demo/.dockerignore` exclude `imgs/` + Dockerfile thiếu `COPY imgs` → demo PDF ENOENT; (3) container uid 1001 vs host bind-mount uid 1000 → EACCES trên `/var/hgct/pdfs` → fix dùng `USER node` (uid 1000 có sẵn trong `node:20-bookworm-slim`). P1 admin endpoints legacy systemd: xóa `/api/admin/deploy` + `/api/admin/security-interval`; refactor Telegram bot restart handlers (`handleRestartProd/Demo`) + health check dùng Docker API qua `/var/run/docker.sock` (native `http` + socketPath, không npm dep) — mount sock + `group_add: "988"` (host docker GID) trong compose; tạo `src/lib/docker.ts` helper. P2 env vars: explicit `NEXT_PUBLIC_DAISU_URL`, `CTV_JWT_SECRET`, `ADMIN_UPGRADE_CODE`, placeholder `UPSTASH_*` trong `.env.local` (cả prod + demo). Verified: 4 PDFs test (career/transit/love/synastry) tất cả sinh thành công 1.32–2.91MB.
- **Wheel email-gate + lifetime skip + bcrypt upgrade code (Apr 2026)** — (A) DiscountModal ẩn Vòng Xoay May Mắn cho returning email (đã có order `status='completed'`) → chỉ còn referral field + nút "Tiếp tục thanh toán"; first-time email giữ UI 3 options cũ. New endpoint `GET /api/referral/check-first-time?email=X` (prisma count orders completed, case-insensitive). (B) Lifetime account: `ServicesClient.handleConfirmPaid` check `user.planType === 'lifetime'` → skip DiscountModal, đi thẳng `/checkout` autoCheckout (đã có `isPremiumOrLifetime` path free flow). (C) Upgrade code unify + bcrypt: `UPGRADE_CODE` + `ADMIN_UPGRADE_CODE` plaintext → `UPGRADE_CODE_HASH` (bcryptjs 12 rounds, plaintext "adminAccountNew01" never stored); `/api/user/upgrade` dùng `bcrypt.compare`; luôn grant `planType='lifetime'`. 3 lifetime accounts hiện có: hentaiikidd, thanhphuong7903, dieuhuong_52.

