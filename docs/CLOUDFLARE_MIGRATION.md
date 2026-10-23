# HGCT — Toàn bộ dự án + Kế hoạch chuyển sang Cloudflare

> Thẻ gốc: **HGCT-23102026-01**, anh Thành giao 08:09 23/10/2026.
> File này gộp **TOÀN BỘ** thông tin dự án (không chỉ phần migration) để anh tự code hoặc đưa nguyên file này cho bên khác setup — không cần hỏi lại gì thêm. Chỉ nằm trong repo riêng tư `hentaiikidd/hgct` — **không** đẩy sang bản `thanhnt1021/hgct` (bản đó public).

---

## PHẦN A — TOÀN BỘ DỰ ÁN HIỆN TẠI

### A.1 Tổng quan

Web app chiêm tinh học thương mại — khách nhập ngày/giờ/nơi sinh → chọn dịch vụ (sự nghiệp / tình duyên / cặp đôi / vận hạn) → trả tiền qua SePay QR → hệ thống tính lá số (Swiss Ephemeris) → gọi AI (OpenRouter) sinh luận giải → xuất PDF (hoặc mở xem online theo mô hình xu) → gửi email + báo Telegram. Domain `hatgiongchiemtinh.com`, dự án độc lập, chỉ làm việc trong `/home/hgct/hgct`.

### A.2 Tech stack

- Next.js 15.5 + React 19, App Router, TypeScript, Tailwind v4
- Prisma v5 + PostgreSQL (DB `zodiacdb`, user `nguydev`)
- `swisseph` (npm, binding C — Swiss Ephemeris) — tính toán thiên văn
- `@sparticuz/chromium` + `puppeteer-core` — sinh PDF
- OpenRouter API (model Claude Sonnet) — AI sinh luận giải, tới 32.000 token/lần, mất vài phút
- Nodemailer — gửi email qua SMTP Hostinger
- NextAuth.js — xác thực (Google OAuth + credentials/bcrypt)
- `geo-tz`, `googleapis`/`gspread`-style (Google Sheets REST) — tra múi giờ + đồng bộ Knowledge Base
- APP_PORT=65498 (prod), domain `hatgiongchiemtinh.com`

### A.3 Kiến trúc & hạ tầng hiện tại (VPS HostHatch, Docker)

- `infra/docker-compose.yml`: Postgres 16, container `hgct-prod` (:65498), `hgct-demo` (:65500, clone riêng tại `/home/hgct/hgct-demo/`), sidecar cron `hgct-cron` (alpine + crond), `docker-socket-proxy` (admin bot dùng để restart container).
- Nginx proxy 80/443 + Cloudflare Full Strict SSL (DNS đã ở Cloudflare từ trước, đang proxy).
- Subdomain: `dashboard.` (admin), `daisu.` (CTV affiliate), `admin.`/`mo.` (placeholder) — Next.js middleware rewrite theo Host.
- Cron 4 việc qua `CRON_SECRET`: `order-check` (mỗi phút), `cleanup`, `retention`, `kb-sync` (Google Sheets → KB).
- Deploy prod: `git pull` → `docker compose build hgct-prod` → `up -d --force-recreate hgct-prod` → `restart nginx`.
- **Gotcha deploy demo:** demo build từ clone riêng `/home/hgct/hgct-demo`, KHÔNG phải `/home/hgct/hgct` — phải `rsync` `src/` + `prisma/` trước khi build, và `hgct-demo` không tự `git pull` nên dễ tụt lại / bị `git push` reject nếu commit trực tiếp trong đó mà quên sync trước.

### A.4 Cấu trúc thư mục chính

```
src/
  app/api/
    astrology/          # calculate/, report/ — chart + report APIs
    auth/                # NextAuth handlers
    chart/               # Lưu/lấy chart
    coin/                # balance, topup-order, unlock-section, unlock-bundle, reading-list, promo
    job/, jobs/          # Job status tracking
    payment/confirm/     # SePay webhook — dual-mode: report cũ (PDF) hoặc coin top-up
    pdf/                 # PDF generation endpoint
    profiles/            # CRUD profiles
    user/account|avatar|upgrade/
  app/{auth,chart,checkout,input,my-charts,processing,profile,services,success,reading}/  # Pages
  components/{astrology,auth,chart,checkout,home,layout,profile,ui}/
  lib/
    astrology/           # calculations.ts, knowledge.ts, base.ts, constants.ts, transit-stubs.ts
    logic/{career,love,relationship,vanhan,relations}/  # manager + prompt mỗi loại dịch vụ
    astrology/reportProcessor.ts  # processReport() — dùng chung report API + SePay webhook
    auth.ts, db.ts (Prisma client), email.ts, jobs.ts, jobHistory.ts, openrouter.ts
    pdf/{generator.ts,chartSvg.ts,svgIcons.ts}
    coin/                # service atomic add/deduct, unlock-job.ts (gen chạy ngầm, never-fail)
    catalog/sections.ts  # 8 dịch vụ xu + giá lẻ/bundle
    essay/                # gen + cache essay
  prompts/                # template AI theo từng loại dịch vụ
```

### A.5 Data model (Prisma — 13 model, khớp DB thật đã đo 23/10/2026)

`User` (auth, planType, isPremium, avatar, reportEmail, coin) · `Profile` (hồ sơ: tên/giới/ngày giờ nơi sinh) · `KnowledgeBase` (dữ liệu KB chiêm tinh) · `Job` (trạng thái job nền) · `Order` (đơn hàng, service, status, pdfUrl) · `CoinTransaction` (audit log atomic cộng/trừ xu) · `Reading` (nội dung luận giải đã mở, đọc lại vĩnh viễn) · `Essay` (cache bài luận AI sinh) · `SavedChart` · `Ctv` + `CtvCommission` (hệ thống affiliate) · `Config` · `PromoCode` (mã ưu đãi nạp xu).

### A.6 Luồng nghiệp vụ chính

1. **Luồng report cũ (PDF, feature-flag `NEXT_PUBLIC_ENABLE_PDF_FLOW`, mặc định OFF):** nhập hồ sơ → chọn dịch vụ → trả qua SePay → webhook xác nhận → `processReport()`: tính lá số → lấy KB → chạy logic block theo loại dịch vụ → build prompt → OpenRouter sinh luận giải → `generator.ts` dựng PDF (Puppeteer) → `email.ts` gửi mail → báo Telegram.
2. **Luồng xu (mô hình hiện tại, mặc định ON):** nạp xu qua SePay QR → mở từng mục luận giải xem online (stream chữ) thay vì lấy PDF 1 lần. `unlock-job.ts` chạy sinh essay dạng job nền (retry never-fail, % tiến độ thật qua `/api/job/[id]`), lưu vào `essays` table, đọc lại vĩnh viễn ở trang "Hồ sơ đã xem" (`/reading`). Kiểm đủ xu trước khi gen.
3. **CTV affiliate** (`daisu.` subdomain): hoa hồng giới thiệu, bảng `Ctv`/`CtvCommission`.
4. **Admin** (`dashboard.` subdomain): quản trị đơn hàng, KB, user — có bot Telegram riêng (admin bot) từng dùng để restart container qua `docker-socket-proxy`.
5. **Mã ưu đãi + bảng giá xu:** 4 gói (69k/99k/199k/399k), `promoCode` ẩn validate ở cả `/api/coin/promo` và `topup-order` — đây là logic tiền thật, sửa phải đối chiếu kỹ.

### A.7 Vấn đề đã biết / cảnh báo đang mở

- Google OAuth "Access blocked" là vấn đề cấu hình Google Console (consent/redirect URI), không phải lỗi code.
- Lịch sử fix đầy đủ: `docs/FIXES_HISTORY.md`. Lịch sử tính năng: `docs/DONE_HISTORY.md`. Mục tiêu + pending: `docs/GOAL.md`.
- `docs/univ3/` (bộ luật chung nhiều dự án) hiện nằm **chưa commit** trong working tree — SSOT thật ở repo riêng `thanhnt1021/univ3`, việc đồng bộ phụ thuộc workflow trên Macbook, không phải việc của VPS này.

---

## PHẦN B — KẾ HOẠCH CHUYỂN SANG CLOUDFLARE

### B.1 Mục tiêu & ưu tiên (đã chốt với anh Thành)

Bỏ VPS HostHatch, web `hatgiongchiemtinh.com` (+ demo) chạy trên Cloudflare. Khách vẫn đặt dịch vụ → trả tiền SePay → nhận PDF/mở luận giải như hiện tại, không đứt đoạn. Thứ tự ưu tiên:

1. **Miễn phí tối đa** — quan trọng hơn việc "100% nằm trong Cloudflare".
2. **Chấp nhận viết lại** bất kỳ phần nào cần, miễn giữ được free và đúng chức năng.
3. **Độ chính xác tính toán lá số là bất biến, không đánh đổi** — viết lại cách nào cũng phải khớp 100% bản hiện tại.
4. Không cần giữ Postgres — chuyển hẳn sang D1 nếu đúng chức năng.
5. GitHub: tạo repo mới `thanhnt1021/hgct`, giữ `hentaiikidd/hgct` làm bản gốc/dự phòng, không chuyển quyền sở hữu.

### B.2 Quy mô dữ liệu thật (đo trực tiếp trên VPS, 23/10/2026)

- DB Postgres: **12MB** tổng (bảng lớn nhất `knowledge_base` 816KB).
- PDF lưu đĩa: prod 39MB (17 file), demo 4KB. Avatar: 56KB.
- Traffic đơn hàng: 346 đơn trong ~4.5 tháng (13/03–25/07/2026), trung bình 1–2 đơn/ngày, cao nhất 4 đơn/ngày.
- → Quy mô rất nhỏ, không chạm hạn mức free tier bất kỳ dịch vụ Cloudflare nào bên dưới.

### B.3 Từng chỗ vướng khi lên Cloudflare — và cách xử

> Đã sửa theo đối chiếu mã thật của phiên oHa/Mac (thẻ oHa-23102026-06, 23/10/2026) — xem B.10.

| Thành phần | Vì sao vướng | Cách xử (đã chốt hướng) |
|---|---|---|
| `swisseph` (tính lá số) — `src/lib/astrology/calculations.ts`, `constants.ts`, `transit-stubs.ts` | Mô-đun C biên dịch sẵn cho Linux, Worker (V8 isolate) không nạp được | **Dùng bản WebAssembly chính chủ của astro.com** (`astro.com/sweph-wasm/` — nguyên bản C KHÔNG sửa đổi compile sang WASM bằng Emscripten) → giữ đúng 100% thuật toán, không đổi lib khác. Chạy WASM trong Worker bình thường, không cần Containers. **Bắt buộc đối chiếu kết quả** (vị trí hành tinh, nhà, điểm vận hạn) giữa bản cũ và bản WASM trên cùng 1 bộ ngày giờ sinh trước khi dùng thật. Dữ liệu ephemeris `.se1` **đã có sẵn trong repo** (`ephe/`, 1.9MB) — không cần tải lại từ astro.com, chỉ còn vấn đề giấy phép (xem B.4 #7). |
| Chromium + puppeteer (PDF, ảnh OG) — `src/lib/pdf/generator.ts`, `job-queue.ts`, `api/og` | Worker không chạy trình duyệt được. **Thêm:** `generator.ts:1141` còn gọi `execFileSync('gs', ...)` (Ghostscript) để nén PDF — Worker không chạy được lệnh ngoài này, tách biệt với vấn đề Chromium | Cloudflare **Browser Rendering** free: chỉ 10 phút/ngày, tối đa 3 browser cùng lúc — **hẹp**, cần đo thời gian sinh PDF thật để biết đủ hay không. Nếu không đủ: viết lại PDF bằng lib JS thuần (dự án đã có `pdf-lib` trong dependencies, chưa dùng cho luồng chính) — không ảnh hưởng số liệu tính toán, chỉ ảnh hưởng trình bày. Ghostscript: mã đã có đường lùi trả PDF không nén khi `gs` lỗi — dùng đường lùi đó làm mặc định trên Cloudflare, bỏ bước nén. |
| Ghi đĩa lúc runtime: `/var/hgct/pdfs` (+ `soon_delete`), avatar, **và đọc tĩnh**: `src/prompts/*.txt` (10 file, prompt AI), `public/chart-symbols/` (icon SVG cho PDF), `imgs/` (5.3MB, ngoài `public/`), đường dẫn `ephe/` cho swisseph | Worker không có ổ đĩa — cả ghi (PDF/avatar) và đọc tĩnh (prompt/icon/ảnh/ephemeris) đều vướng, không chỉ chỗ ghi | PDF/avatar ghi mới → **R2** (free 10GB, hiện dùng chưa tới 40MB). Prompt/icon/ảnh/ephemeris đọc tĩnh → đóng gói thẳng vào Worker bundle (nếu nhỏ) hoặc R2 (nếu gói vượt hạn ~3MB nén của Worker — `imgs/` 5.3MB chắc phải ra R2). |
| Việc nền chạy vài phút (`processReport()`, `global.__hgctJobs` + `setInterval` watchdog — `src/lib/jobs.ts`, và `unlock-job.ts` cho luồng xu) | Worker tắt khi trả lời xong, không giữ bộ nhớ, không có `setInterval` | **Cloudflare Queues** (giờ có ở free plan, 10.000 operation/ngày) hoặc Workflows. Trạng thái job đọc từ DB, watchdog chuyển thành Cron Trigger. |
| Gửi mail `nodemailer` SMTP — `src/lib/email.ts` | Worker không mở SMTP kiểu nodemailer | **Resend** (free tier, ngoài Cloudflare) — khuyên dùng vì free tuyệt đối. Giữ MX Hostinger hiện tại cho `support@` (chỉ đổi chiều gửi), thêm bản ghi SPF/DKIM của Resend vào zone + xác thực tên miền gửi cho `EMAIL_FROM`. Cloudflare Email Service có nhưng **chỉ ở Workers Paid plan**, không có bản free. |
| Postgres trong Docker | Cloudflare không chạy Postgres | **D1** (đã chốt). **Sửa:** schema **không có** cột `Array`/`Decimal` — cái vướng thật là **9 cột kiểu `Json`** trong schema (cần đối chiếu D1/SQLite xử JSON đúng không) và **Prisma hiện `^5.22.0`, phải nâng lên ≥6.2 + cài D1 driver adapter** (D1 cần Prisma 6.2+ mới hỗ trợ chính thức). Chưa có quy trình chuyển dữ liệu: xuất 13 bảng từ Postgres → đổi kiểu phù hợp SQLite → nhập D1 → đối chiếu số dòng từng bảng sau khi nhập — đây là bước còn thiếu hoàn toàn, phải viết script riêng. |
| Cron sidecar + crontab, chạy giờ **Việt Nam** (`infra/cron/start.sh: TZ=Asia/Ho_Chi_Minh`) — order-check mỗi phút, cleanup 02:00, retention 09:00, kb-sync mỗi 15 phút | Cron Triggers của Cloudflare chạy giờ **UTC** | Đổi giờ: cleanup 02:00 VN → **19:00 UTC** (hôm trước), retention 09:00 VN → **02:00 UTC**. order-check/kb-sync (lặp theo phút) không đổi. Cron Trigger phải tự gọi route kèm header `Authorization: Bearer CRON_SECRET` giống hiện tại. |
| `docker-socket-proxy` + `src/lib/docker.ts` (admin bot restart container) | Không còn Docker | Bỏ lệnh restart trong admin bot. |
| `geo-tz` (tra múi giờ theo toạ độ, đọc dữ liệu từ đĩa), `googleapis` (gói nặng) | Phình gói vượt hạn Worker (~3MB nén) | **Còn thiếu quyết định** — chưa chọn API thay `geo-tz` (cần API tra múi giờ theo lat/lng, có free tier). Nominatim (tra địa danh → toạ độ) giữ nguyên, không vướng. Sheets gọi REST thẳng bằng `fetch` thay `googleapis`. |
| Giới hạn tốc độ (rate limit) — `src/lib/ratelimit.ts` dùng bộ đếm **trong bộ nhớ** vì `UPSTASH_REDIS_REST_URL`/`TOKEN` đang để trống ở prod | Trên Cloudflare mỗi lần chạy Worker là instance riêng, không chia sẻ bộ nhớ → mất chặn hoàn toàn nếu giữ bộ đếm in-memory | Bắt buộc cấu hình **Upstash Redis** thật (dự án đã có `@upstash/ratelimit` + `@upstash/redis` trong dependencies, chỉ chưa điền env) trước khi lên Cloudflare — không phải tuỳ chọn. |
| `public/` 78MB (`vh99` 30MB, `fonts` 26MB, `chart-symbols` 21MB) | Ảnh tĩnh quá cỡ gói Worker | Static Assets / R2. |
| **CPU time mỗi request** — bcrypt cost 12 chạy JS thuần ở `src/lib/auth.ts`, `src/lib/ctv/auth.ts`, `api/user/password` (đăng nhập, đăng ký, đổi mật khẩu CTV) | **Phát hiện quan trọng (B.7 cần đọc lại):** Workers Free chỉ cho ~10ms CPU/request — 1 lần bcrypt cost 12 riêng nó đã tốn hàng trăm ms, **tự vượt hạn Free dù traffic rất thấp**. Đánh giá "free đủ dùng" ở B.7 trước đây tính theo SỐ ĐƠN/NGÀY là SAI CƠ SỞ — giới hạn thật là CPU/request, không phải lượt gọi | Cần đo CPU thật/request khi có demo, nhiều khả năng phải lên **Workers Paid** (30s CPU/request) chỉ để chạy được bcrypt, không liên quan gì đến traffic thấp. Xem lại B.7. |
| Next.js trên Worker, cần `nodejs_compat` (mã dùng `crypto` AES-GCM ở `profileCrypto.ts`, `fs`, `path`, `Buffer`) | Cần `@opennextjs/cloudflare`; 5 route có `runtime='nodejs'` + flag compat phải bật trong `wrangler.toml` | Dựng demo thử trước khi chuyển prod. |
| Subdomain `dashboard.`/`daisu.`/`admin.`/`mo.`/`demo.` (middleware rewrite theo Host, nginx hiện tại) | Mỗi subdomain cần gắn Worker Route riêng trên Cloudflare, cần quyền DNS Edit cho zone (xem B.4 #2) | Gắn Worker Routes cho đủ 5 subdomain khi có quyền; `demo.` cần thêm redirect URI riêng cho Google OAuth nếu domain demo khác prod. |

### B.4 Những thứ cần chuẩn bị (key/tài khoản) — ai setup cũng cần đủ list này

| # | Cần gì | Dùng để | Lấy ở đâu | Free? |
|---|---|---|---|---|
| 1 | Tài khoản Cloudflare (domain đã gắn sẵn) | Gốc mọi dịch vụ | dash.cloudflare.com | Free |
| 2 | **Cloudflare API Token** đủ quyền **DNS Edit + Workers Routes + Workers Scripts/D1/R2/Queues Edit** cho zone `hatgiongchiemtinh.com` | Deploy qua `wrangler`, gắn subdomain, thêm bản ghi mail | Dash → My Profile → API Tokens. **Sửa:** Mac đã có 1 token chạy được nhưng thiếu đúng quyền zone này (lỗi 10000 khi sửa DNS) — không phải "chưa có token" như bản trước ghi, mà là **token hiện tại thiếu quyền**. |
| 3 | Account ID + Zone ID | Config `wrangler.toml` | Dash → Overview — không phải bí mật, điền được ngay khi có |
| 4 | D1 database (`wrangler d1 create`) + **nâng Prisma lên ≥6.2 + D1 driver adapter** | Thay Postgres | Tự tạo bằng token #2 | Free (500MB/DB, 5GB/account) |
| 5 | R2 bucket + R2 API Token | Lưu PDF/avatar/ảnh tĩnh ghi runtime + file đọc tĩnh quá cỡ bundle (`imgs/`) | Dash → R2 → Manage API Tokens | Free (10GB) |
| 6 | **`RESEND_API_KEY`** (biến mới) + xác thực tên miền gửi + bản ghi SPF/DKIM cho zone | Thay SMTP Hostinger (giữ nguyên MX nhận mail) | resend.com | Free tier |
| 7 | Giấy phép dữ liệu ephemeris astro.com cho web thu tiền — **còn thiếu kết luận** (AGPL hay mua giấy phép thương mại), file `.se1` **đã có sẵn trong repo**, không cần tải lại | Hợp lệ hoá dùng swisseph-WASM cho web tính phí | astro.com/ftp (license) | Cần đọc kỹ, có thể không free |
| 8 | **Upstash Redis** (REST URL + token) | Rate limit thật trên nhiều instance Worker — hiện đang trống, dùng bộ đếm in-memory sẽ mất tác dụng trên Cloudflare | upstash.com | Free tier |
| 9 | API tra múi giờ theo toạ độ thay `geo-tz` — **chưa chọn** | Tính giờ sinh chính xác theo kinh độ/vĩ độ | — | Cần tìm, có free tier |
| 10 | Cập nhật webhook SePay/Telegram — **chỉ cần cho bản demo** (domain riêng); **prod giữ nguyên domain `hatgiongchiemtinh.com` nên KHÔNG cần đổi URL webhook** | — | Dashboard SePay / BotFather (chỉ demo) | — |
| 11 | (Tuỳ chọn) Browser Rendering binding — hoặc quyết viết lại PDF bằng `pdf-lib` (đã có sẵn trong dependencies, chưa dùng cho luồng chính) | Xuất PDF, bỏ luôn Ghostscript | `wrangler.toml` | Free (hẹp 10p/ngày) |

### B.5 Trạng thái đã làm (tính đến 23/10/2026)

- [x] Đồng bộ code VPS mới nhất lên `hentaiikidd/hgct` (commit `4795f2d`, sau đó nhiều commit thêm/sửa file này).
- [x] Tạo + đồng bộ `thanhnt1021/hgct` (public, khớp code mới nhất) — không cần deploy key nữa, chỉ cần bản đọc được, không cần VPS đẩy thẳng vào đó.
- [x] Đo dung lượng DB/file/traffic thật (B.2).
- [x] Xác nhận swisseph có bản WASM chính chủ astro.com (B.3).
- [x] Xác nhận Browser Rendering + Email Service free-tier hẹp/không free (B.3).
- [x] Kiểm repo `thanhnt1021/chiemtinh` (oHa) — **không phải ví dụ Cloudflare đã chuyển thành công**, chỉ có 1 Worker bot Telegram, không liên quan đến swisseph/PDF/D1 của app chính.
- [x] Đối chiếu toàn bộ tài liệu với mã thật qua phiên oHa/Mac (thẻ oHa-23102026-06) — 21 điểm sai/thiếu đã sửa vào B.3/B.4/B.7, xem B.10.

### B.6 Còn thiếu — cần anh (hoặc bên được báo) làm

1. Cloudflare API Token đủ quyền DNS Edit cho zone (B.4 #2) — chưa có thì chưa gắn được domain/subdomain.
2. Quyết kênh báo cáo Telegram cho các ticket loại này — tạm gác, chưa cần gấp.
3. `docs/univ3/` trong repo `hgct` hiện để nguyên, chưa `.gitignore` — việc đồng bộ SSOT `thanhnt1021/univ3` phụ thuộc workflow trên Macbook, không phải việc của VPS này.
4. Quyết thay thế `geo-tz` (B.4 #9), và kết luận giấy phép astro.com (B.4 #7) — 2 điểm còn treo chưa ai quyết.
5. Viết quy trình chuyển dữ liệu Postgres → D1 (xuất 13 bảng, đổi kiểu, nhập, đối chiếu số dòng) — hiện chưa có, cần làm trước khi dựng demo thật.
6. Sau khi có token #2: dựng demo trên Cloudflare (`demo.hatgiongchiemtinh.com`), đo CPU time/request thật (xem B.7), test đủ 4 dịch vụ (sự nghiệp, tình duyên, cặp đôi, vận hạn) + đối chiếu kết quả lá số demo vs prod trên cùng bộ ngày giờ sinh trước khi tính chuyển prod thật.
7. Chuyển prod CHỈ sau khi anh duyệt — tạm dừng nhận đơn → chép DB + PDF lần cuối → mở lại (không cần đổi webhook vì giữ nguyên domain, xem B.4 #10). Giữ VPS chạy thêm ít nhất 7 ngày để lùi về nếu cần.
8. **Đổi toàn bộ secret trong B.9 sau khi chuyển xong** (xem B.10 — lý do bắt buộc, không phải tuỳ chọn) — trừ `PROFILE_ENCRYPTION_KEY`/`NEXTAUTH_SECRET`/`CTV_JWT_SECRET` cần kế hoạch riêng, không đổi trực tiếp (xem B.10).

### B.7 Gói Cloudflare — **cần xem lại, chưa chắc free đủ**

Quyết định trước đó (free trước, vượt mới báo) **dựa trên cơ sở sai** — tính theo số đơn/ngày (1–4 đơn), nhưng giới hạn thật của Workers Free là **CPU time mỗi request (~10ms)**, không phải số lượt gọi. Mã đang băm mật khẩu bằng bcrypt cost 12 (đăng nhập, đăng ký, đổi mật khẩu CTV) — một lượt băm này riêng nó nhiều khả năng đã vượt 10ms, **không liên quan gì đến traffic thấp**. Phải đo CPU thật/request trên demo trước khi chốt lại — nhiều khả năng cần Workers Paid (30s CPU/request) chỉ để chạy được các route có bcrypt, bất kể traffic.

### B.8 Đối chiếu với báo cáo oHa-23102026-06 (phiên khác, phía Mac, 23/10/2026)

**⚠️ Có ít nhất 2 phiên Claude đang làm cùng việc chuyển HGCT sang Cloudflare song song** — phiên này (VPS, có quyền thật vào server/DB/file) và 1 phiên bên Mac/oHa (không vào được VPS). Để tránh đụng tay trùng hoặc lệch tay nhau: **phiên VPS này nên là nơi thực thi chính** vì là nơi duy nhất có quyền thật vào server, DB, file cũ — phiên kia chỉ nên làm phần Cloudflare-dashboard-side (tạo token, domain, Resend...) rồi giao lại key cho phiên VPS dùng.

Báo cáo bên đó nêu thiếu:
- Quyền **sửa** domain `hatgiongchiemtinh.com` trên Cloudflare (khoá hiện có chỉ xem, chưa sửa được) — cần token mới đủ quyền Edit (khớp đúng mục B.4 #2).
- Tài khoản gửi mail **Resend** — khớp đúng mục B.4 #6, chưa có.
- Bộ khoá + dữ liệu khách trên máy chủ cũ — **phiên Mac không vào được VPS, nhưng phiên VPS này vào được** (đã đo trực tiếp ở B.2) — phần này phiên VPS tự lo, không cần Mac.
- **Giấy phép dữ liệu thiên văn astro.com cho web thu tiền** — đúng điểm đã flag ở B.4 #7 ("kiểm license trước khi deploy"), giờ có 2 nguồn độc lập cùng nêu → chắc chắn phải đọc kỹ license astro.com trước khi dùng cho web tính phí, không bỏ qua được.

### B.9 Biến môi trường cần có (.env.local VPS, 23/10/2026) — CHỈ TÊN BIẾN, KHÔNG PHẢI GIÁ TRỊ THẬT

> Giá trị thật KHÔNG đưa vào file này / không commit git — SePay, SMTP, OAuth, JWT secret... là tiền + tài khoản thật, rò vào git history là không thu hồi được (khác xoá file thường). Cần giá trị thật thì lấy qua kênh ngoài git (dán trực tiếp trong chat 1 lần, hoặc scp sang máy đích) — hỏi phiên VPS này khi cần.

**Giữ nguyên (prod hiện có):**
```
ADMIN_EMAILS, ADMIN_TELEGRAM_USER_ID, APP_PORT
BANK_ACCOUNT_NAME, BANK_ACCOUNT_NUMBER, BANK_NAME
CF_TURNSTILE_SECRET_KEY, NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY
CRON_SECRET, CTV_JWT_SECRET
DATABASE_URL
EMAIL_FROM
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_SERVICE_ACCOUNT_BASE64
KB_SPREADSHEET_ID
NEXTAUTH_SECRET, NEXTAUTH_URL, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_DAISU_URL
OPENROUTER_API_KEY, OPENROUTER_MANAGEMENT_KEY
PROFILE_ENCRYPTION_KEY
SEPAY_API_KEY
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
TELEGRAM_ADMIN_BOT_TOKEN, TELEGRAM_ADMIN_WEBHOOK_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET_TOKEN
UPGRADE_CODE_HASH
UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL
```

**Bị bản trước bỏ sót (mã có đọc, cần thêm vào list thật):**
```
NEXT_PUBLIC_ENABLE_PDF_FLOW   # bật/tắt luồng PDF cũ — PHẢI set LÚC BUILD (biến NEXT_PUBLIC_), không phải lúc chạy
ENABLE_TEST_ROUTES           # bật route test, nên tắt (bỏ biến) trên prod Cloudflare
SMTP_PASSWORD, EMAIL_PASS    # tên dự phòng cho SMTP_PASS trong lib/email.ts — chỉ cần 1 trong các tên, kiểm code trước khi set
```

**Bỏ khi lên Cloudflare (không còn Docker):**
```
DOCKER_PROXY_HOST, DOCKER_PROXY_PORT
```

**Mới cần thêm:**
```
RESEND_API_KEY   # xem B.4 #6
```

### B.10 Đối chiếu W04 (oHa/Mac, thẻ oHa-23102026-06, 23/10/2026) — 21 điểm đã sửa vào bản này

Phiên oHa/Mac clone riêng (chỉ đọc, không sửa/push) `hentaiikidd/hgct` ở HEAD `e43a741`, đối chiếu từng dòng tài liệu với mã thật, tự kiểm lại bằng `grep` ngay trên VPS này — khớp. Danh sách sai/thiếu đã sửa thẳng vào B.3/B.4/B.6/B.7/B.9 ở trên, không lặp lại ở đây. Tóm 2 điểm quan trọng nhất không nằm trong bảng:

1. **B.7 (gói Cloudflare) đã đổi từ "chốt 1A free" sang "cần đo lại"** — lý do cơ bản: giới hạn Workers Free là CPU time/request (~10ms), không phải số đơn/ngày. Đừng dùng lại kết luận "free chắc đủ" ở các bản cũ.
2. **An toàn — 28 secret trong bản file trước đã bị xem là lộ**, vì file đi qua route tải xuống công khai được (ai login đúng `hentaiikidd` là tải hết) và đã được chuyển tiếp qua Telegram. Route `src/app/migration-notes/route.ts` đã bị xoá nội dung (còn route rỗng, chờ cần lại thì báo phiên VPS). **Phải đổi toàn bộ 28 giá trị sau khi chuyển Cloudflare xong** — trừ 3 cái sau cần kế hoạch riêng, **không đổi trực tiếp**:
   - `PROFILE_ENCRYPTION_KEY` — đổi thẳng làm toàn bộ hồ sơ đã mã hoá AES-256-GCM không đọc lại được. Phải giải mã bằng khoá cũ → mã hoá lại bằng khoá mới, chạy migration thật trước khi đổi khoá trong env.
   - `NEXTAUTH_SECRET`, `CTV_JWT_SECRET` — đổi thẳng đăng xuất toàn bộ khách + CTV đang đăng nhập. Nên đổi đúng lúc cutover (khách đang tạm dừng nhận đơn theo B.6 mục 7), không đổi giữa lúc web đang chạy bình thường.
   - Các khoá còn lại (SePay, SMTP, OAuth, Telegram bot token, OpenRouter, CRON_SECRET, Turnstile...) đổi được ngay, không ảnh hưởng session khách — nên làm sớm, không cần chờ cutover.
