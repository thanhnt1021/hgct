import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

// Nội dung tĩnh (không chứa giá trị secret thật) — đồng bộ với docs/CLOUDFLARE_MIGRATION.md
const STATIC_DOC = `# HGCT — Toàn bộ dự án + Kế hoạch chuyển sang Cloudflare

> Thẻ gốc: **HGCT-23102026-01**, anh Thành giao 08:09 23/10/2026.
> File này gộp **TOÀN BỘ** thông tin dự án (không chỉ phần migration) để anh tự code hoặc đưa nguyên file này cho bên khác setup — không cần hỏi lại gì thêm. Chỉ nằm trong repo riêng tư \`hentaiikidd/hgct\` — **không** đẩy sang bản \`thanhnt1021/hgct\` (bản đó public).

---

## PHẦN A — TOÀN BỘ DỰ ÁN HIỆN TẠI

### A.1 Tổng quan

Web app chiêm tinh học thương mại — khách nhập ngày/giờ/nơi sinh → chọn dịch vụ (sự nghiệp / tình duyên / cặp đôi / vận hạn) → trả tiền qua SePay QR → hệ thống tính lá số (Swiss Ephemeris) → gọi AI (OpenRouter) sinh luận giải → xuất PDF (hoặc mở xem online theo mô hình xu) → gửi email + báo Telegram. Domain \`hatgiongchiemtinh.com\`, dự án độc lập, chỉ làm việc trong \`/home/hgct/hgct\`.

### A.2 Tech stack

- Next.js 15.5 + React 19, App Router, TypeScript, Tailwind v4
- Prisma v5 + PostgreSQL (DB \`zodiacdb\`, user \`nguydev\`)
- \`swisseph\` (npm, binding C — Swiss Ephemeris) — tính toán thiên văn
- \`@sparticuz/chromium\` + \`puppeteer-core\` — sinh PDF
- OpenRouter API (model Claude Sonnet) — AI sinh luận giải, tới 32.000 token/lần, mất vài phút
- Nodemailer — gửi email qua SMTP Hostinger
- NextAuth.js — xác thực (Google OAuth + credentials/bcrypt)
- \`geo-tz\`, \`googleapis\`/\`gspread\`-style (Google Sheets REST) — tra múi giờ + đồng bộ Knowledge Base
- APP_PORT=65498 (prod), domain \`hatgiongchiemtinh.com\`

### A.3 Kiến trúc & hạ tầng hiện tại (VPS HostHatch, Docker)

- \`infra/docker-compose.yml\`: Postgres 16, container \`hgct-prod\` (:65498), \`hgct-demo\` (:65500, clone riêng tại \`/home/hgct/hgct-demo/\`), sidecar cron \`hgct-cron\` (alpine + crond), \`docker-socket-proxy\` (admin bot dùng để restart container).
- Nginx proxy 80/443 + Cloudflare Full Strict SSL (DNS đã ở Cloudflare từ trước, đang proxy).
- Subdomain: \`dashboard.\` (admin), \`daisu.\` (CTV affiliate), \`admin.\`/\`mo.\` (placeholder) — Next.js middleware rewrite theo Host.
- Cron 4 việc qua \`CRON_SECRET\`: \`order-check\` (mỗi phút), \`cleanup\`, \`retention\`, \`kb-sync\` (Google Sheets → KB).
- Deploy prod: \`git pull\` → \`docker compose build hgct-prod\` → \`up -d --force-recreate hgct-prod\` → \`restart nginx\`.
- **Gotcha deploy demo:** demo build từ clone riêng \`/home/hgct/hgct-demo\`, KHÔNG phải \`/home/hgct/hgct\` — phải \`rsync\` \`src/\` + \`prisma/\` trước khi build, và \`hgct-demo\` không tự \`git pull\` nên dễ tụt lại / bị \`git push\` reject nếu commit trực tiếp trong đó mà quên sync trước.

### A.4 Cấu trúc thư mục chính

\`\`\`
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
\`\`\`

### A.5 Data model (Prisma — 13 model, khớp DB thật đã đo 23/10/2026)

\`User\` (auth, planType, isPremium, avatar, reportEmail, coin) · \`Profile\` (hồ sơ: tên/giới/ngày giờ nơi sinh) · \`KnowledgeBase\` (dữ liệu KB chiêm tinh) · \`Job\` (trạng thái job nền) · \`Order\` (đơn hàng, service, status, pdfUrl) · \`CoinTransaction\` (audit log atomic cộng/trừ xu) · \`Reading\` (nội dung luận giải đã mở, đọc lại vĩnh viễn) · \`Essay\` (cache bài luận AI sinh) · \`SavedChart\` · \`Ctv\` + \`CtvCommission\` (hệ thống affiliate) · \`Config\` · \`PromoCode\` (mã ưu đãi nạp xu).

### A.6 Luồng nghiệp vụ chính

1. **Luồng report cũ (PDF, feature-flag \`NEXT_PUBLIC_ENABLE_PDF_FLOW\`, mặc định OFF):** nhập hồ sơ → chọn dịch vụ → trả qua SePay → webhook xác nhận → \`processReport()\`: tính lá số → lấy KB → chạy logic block theo loại dịch vụ → build prompt → OpenRouter sinh luận giải → \`generator.ts\` dựng PDF (Puppeteer) → \`email.ts\` gửi mail → báo Telegram.
2. **Luồng xu (mô hình hiện tại, mặc định ON):** nạp xu qua SePay QR → mở từng mục luận giải xem online (stream chữ) thay vì lấy PDF 1 lần. \`unlock-job.ts\` chạy sinh essay dạng job nền (retry never-fail, % tiến độ thật qua \`/api/job/[id]\`), lưu vào \`essays\` table, đọc lại vĩnh viễn ở trang "Hồ sơ đã xem" (\`/reading\`). Kiểm đủ xu trước khi gen.
3. **CTV affiliate** (\`daisu.\` subdomain): hoa hồng giới thiệu, bảng \`Ctv\`/\`CtvCommission\`.
4. **Admin** (\`dashboard.\` subdomain): quản trị đơn hàng, KB, user — có bot Telegram riêng (admin bot) từng dùng để restart container qua \`docker-socket-proxy\`.
5. **Mã ưu đãi + bảng giá xu:** 4 gói (69k/99k/199k/399k), \`promoCode\` ẩn validate ở cả \`/api/coin/promo\` và \`topup-order\` — đây là logic tiền thật, sửa phải đối chiếu kỹ.

### A.7 Vấn đề đã biết / cảnh báo đang mở

- Google OAuth "Access blocked" là vấn đề cấu hình Google Console (consent/redirect URI), không phải lỗi code.
- Lịch sử fix đầy đủ: \`docs/FIXES_HISTORY.md\`. Lịch sử tính năng: \`docs/DONE_HISTORY.md\`. Mục tiêu + pending: \`docs/GOAL.md\`.
- \`docs/univ3/\` (bộ luật chung nhiều dự án) hiện nằm **chưa commit** trong working tree — SSOT thật ở repo riêng \`thanhnt1021/univ3\`, việc đồng bộ phụ thuộc workflow trên Macbook, không phải việc của VPS này.

---

## PHẦN B — KẾ HOẠCH CHUYỂN SANG CLOUDFLARE

### B.1 Mục tiêu & ưu tiên (đã chốt với anh Thành)

Bỏ VPS HostHatch, web \`hatgiongchiemtinh.com\` (+ demo) chạy trên Cloudflare. Khách vẫn đặt dịch vụ → trả tiền SePay → nhận PDF/mở luận giải như hiện tại, không đứt đoạn. Thứ tự ưu tiên:

1. **Miễn phí tối đa** — quan trọng hơn việc "100% nằm trong Cloudflare".
2. **Chấp nhận viết lại** bất kỳ phần nào cần, miễn giữ được free và đúng chức năng.
3. **Độ chính xác tính toán lá số là bất biến, không đánh đổi** — viết lại cách nào cũng phải khớp 100% bản hiện tại.
4. Không cần giữ Postgres — chuyển hẳn sang D1 nếu đúng chức năng.
5. GitHub: tạo repo mới \`thanhnt1021/hgct\`, giữ \`hentaiikidd/hgct\` làm bản gốc/dự phòng, không chuyển quyền sở hữu.

### B.2 Quy mô dữ liệu thật (đo trực tiếp trên VPS, 23/10/2026)

- DB Postgres: **12MB** tổng (bảng lớn nhất \`knowledge_base\` 816KB).
- PDF lưu đĩa: prod 39MB (17 file), demo 4KB. Avatar: 56KB.
- Traffic đơn hàng: 346 đơn trong ~4.5 tháng (13/03–25/07/2026), trung bình 1–2 đơn/ngày, cao nhất 4 đơn/ngày.
- → Quy mô rất nhỏ, không chạm hạn mức free tier bất kỳ dịch vụ Cloudflare nào bên dưới.

### B.3 Từng chỗ vướng khi lên Cloudflare — và cách xử

| Thành phần | Vì sao vướng | Cách xử (đã chốt hướng) |
|---|---|---|
| \`swisseph\` (tính lá số) — \`src/lib/astrology/calculations.ts\`, \`constants.ts\`, \`transit-stubs.ts\` | Mô-đun C biên dịch sẵn cho Linux, Worker (V8 isolate) không nạp được | **Dùng bản WebAssembly chính chủ của astro.com** (\`astro.com/sweph-wasm/\` — nguyên bản C KHÔNG sửa đổi compile sang WASM bằng Emscripten) → giữ đúng 100% thuật toán, không đổi lib khác. Chạy WASM trong Worker bình thường, không cần Containers. **Bắt buộc đối chiếu kết quả** (vị trí hành tinh, nhà, điểm vận hạn) giữa bản cũ và bản WASM trên cùng 1 bộ ngày giờ sinh trước khi dùng thật. |
| Chromium + puppeteer (PDF, ảnh OG) — \`src/lib/pdf/generator.ts\`, \`job-queue.ts\`, \`api/og\` | Worker không chạy trình duyệt được | Cloudflare **Browser Rendering** free: chỉ 10 phút/ngày, tối đa 3 browser cùng lúc — **hẹp**, cần đo thời gian sinh PDF thật để biết đủ hay không. Nếu không đủ: viết lại PDF bằng lib JS thuần (bỏ Chromium hẳn) — việc này **không ảnh hưởng số liệu tính toán**, chỉ ảnh hưởng trình bày PDF. |
| Ghi đĩa: \`/var/hgct/pdfs\`, avatar — \`reportProcessor.ts\`, \`api/pdf/[id]\`, \`api/user/avatar\` | Worker không có ổ đĩa | Chuyển sang **R2** (free 10GB, hiện dùng chưa tới 40MB — dư rất nhiều). |
| Việc nền chạy vài phút (\`processReport()\`, \`global.__hgctJobs\` + \`setInterval\` watchdog — \`src/lib/jobs.ts\`, và \`unlock-job.ts\` cho luồng xu) | Worker tắt khi trả lời xong, không giữ bộ nhớ, không có \`setInterval\` | **Cloudflare Queues** (giờ có ở free plan, 10.000 operation/ngày) hoặc Workflows. Trạng thái job đọc từ DB, watchdog chuyển thành Cron Trigger. |
| Gửi mail \`nodemailer\` SMTP — \`src/lib/email.ts\` | Worker không mở SMTP kiểu nodemailer | **Resend** (free tier, ngoài Cloudflare) — khuyên dùng vì free tuyệt đối. Cloudflare Email Service có nhưng **chỉ ở Workers Paid plan**, không có bản free. |
| Postgres trong Docker | Cloudflare không chạy Postgres | **D1** (đã chốt) — free 500MB/DB, 5GB/account, 5 triệu đọc + 100.000 viết/ngày. DB hiện 12MB, traffic 1–4 đơn/ngày → dư thừa hạn mức. Phải viết lại \`schema.prisma\` sang \`sqlite\` provider, rà cột kiểu \`Array\`/\`Decimal\` (SQLite không có Array, Decimal có thể lệch — cần test), test lại toàn bộ 68 route sau khi đổi dialect. |
| Cron sidecar + crontab | — | **Cron Triggers** (gọi \`order-check\` mỗi phút như cũ). |
| \`docker-socket-proxy\` + \`src/lib/docker.ts\` (admin bot restart container) | Không còn Docker | Bỏ lệnh restart trong admin bot. |
| \`geo-tz\`, \`googleapis\` (đọc file đĩa, gói nặng) | Phình gói vượt hạn Worker | Tra múi giờ qua API; Sheets gọi REST thẳng bằng \`fetch\`. |
| \`public/\` 78MB (\`vh99\` 30MB, \`fonts\` 26MB, \`chart-symbols\` 21MB) | Ảnh tĩnh quá cỡ gói Worker | Static Assets / R2. |
| Next.js trên Worker | Cần \`@opennextjs/cloudflare\`; 5 route có \`runtime='nodejs'\` phải soát lại | Dựng demo thử trước khi chuyển prod. |

### B.4 Những thứ cần chuẩn bị (key/tài khoản) — ai setup cũng cần đủ list này

| # | Cần gì | Dùng để | Lấy ở đâu | Free? |
|---|---|---|---|---|
| 1 | Tài khoản Cloudflare (domain đã gắn sẵn) | Gốc mọi dịch vụ | dash.cloudflare.com | Free |
| 2 | **Cloudflare API Token** (scope: Workers Scripts/D1/R2/Queues Edit) | Deploy qua \`wrangler\` | Dash → My Profile → API Tokens | Free |
| 3 | Account ID + Zone ID | Config \`wrangler.toml\` | Dash → Overview | Free |
| 4 | D1 database (\`wrangler d1 create\`) | Thay Postgres | Tự tạo bằng token #2 | Free (500MB/DB, 5GB/account) |
| 5 | R2 bucket + R2 API Token | Lưu PDF/avatar/ảnh tĩnh | Dash → R2 → Manage API Tokens | Free (10GB) |
| 6 | Resend API key | Thay SMTP Hostinger | resend.com | Free tier |
| 7 | File ephemeris \`.se1\` từ astro.com (kiểm license trước khi deploy) | Dữ liệu cho swisseph-WASM | astro.com/ftp | Free (có điều khoản) |
| 8 | Cập nhật URL webhook SePay sang domain mới | Giữ nguyên tài khoản, chỉ đổi URL | Dashboard SePay | — |
| 9 | Cập nhật URL webhook 2 bot Telegram sang Worker mới | Giữ nguyên token bot cũ | — | — |
| 10 | (Tuỳ chọn) Browser Rendering binding — hoặc quyết viết lại PDF bằng JS thuần | Xuất PDF | \`wrangler.toml\` | Free (hẹp 10p/ngày) |

### B.5 Trạng thái đã làm (tính đến 23/10/2026)

- [x] Đồng bộ code VPS mới nhất lên \`hentaiikidd/hgct\` (commit \`4795f2d\`, sau đó \`dbd156f\` thêm file này).
- [x] Tạo + đồng bộ \`thanhnt1021/hgct\` (public, khớp \`4795f2d\`) — không cần deploy key nữa, chỉ cần bản đọc được, không cần VPS đẩy thẳng vào đó.
- [x] Đo dung lượng DB/file/traffic thật (B.2).
- [x] Xác nhận swisseph có bản WASM chính chủ astro.com (B.3, dòng 1).
- [x] Xác nhận Browser Rendering + Email Service free-tier hẹp/không free (B.3).
- [x] Kiểm repo \`thanhnt1021/chiemtinh\` (oHa) — **không phải ví dụ Cloudflare đã chuyển thành công**, chỉ có 1 Worker bot Telegram, không liên quan đến swisseph/PDF/D1 của app chính. Không có pattern nào để tái dùng từ đó.

### B.6 Còn thiếu — cần anh (hoặc bên được báo) làm

1. Tạo Cloudflare API Token (B.4, #2) — chưa có thì chưa deploy được gì thật.
2. Quyết kênh báo cáo Telegram cho các ticket loại này — tạm gác, chưa cần gấp.
3. \`docs/univ3/\` trong repo \`hgct\` hiện để nguyên, chưa \`.gitignore\` — việc đồng bộ SSOT \`thanhnt1021/univ3\` phụ thuộc workflow trên Macbook, không phải việc của VPS này.
4. Sau khi có token #2: dựng demo trên Cloudflare (\`demo.hatgiongchiemtinh.com\`), test đủ 4 dịch vụ (sự nghiệp, tình duyên, cặp đôi, vận hạn) + đối chiếu kết quả lá số demo vs prod trên cùng bộ ngày giờ sinh trước khi tính chuyển prod thật.
5. Chuyển prod CHỈ sau khi anh duyệt — tạm dừng nhận đơn → chép DB + PDF lần cuối → đổi webhook SePay + Telegram → mở lại. Giữ VPS chạy thêm ít nhất 7 ngày để lùi về nếu cần.

### B.7 Gói Cloudflare — đã chốt: **1A, free trước**

Dùng gói **free** của Cloudflare trước (Workers Free), vượt hạn mức mới báo để quyết tiếp (nâng Paid $5/tháng). Theo B.2, traffic hiện tại (1–4 đơn/ngày) rất khó chạm hạn mức free — nhiều khả năng free là đủ dùng lâu dài.

### B.8 Đối chiếu với báo cáo oHa-23102026-06 (phiên khác, phía Mac, 23/10/2026)

**⚠️ Có ít nhất 2 phiên Claude đang làm cùng việc chuyển HGCT sang Cloudflare song song** — phiên này (VPS, có quyền thật vào server/DB/file) và 1 phiên bên Mac/oHa (không vào được VPS). Để tránh đụng tay trùng hoặc lệch tay nhau: **phiên VPS này nên là nơi thực thi chính** vì là nơi duy nhất có quyền thật vào server, DB, file cũ — phiên kia chỉ nên làm phần Cloudflare-dashboard-side (tạo token, domain, Resend...) rồi giao lại key cho phiên VPS dùng.

Báo cáo bên đó nêu thiếu:
- Quyền **sửa** domain \`hatgiongchiemtinh.com\` trên Cloudflare (khoá hiện có chỉ xem, chưa sửa được) — cần token mới đủ quyền Edit (khớp đúng mục B.4 #2).
- Tài khoản gửi mail **Resend** — khớp đúng mục B.4 #6, chưa có.
- Bộ khoá + dữ liệu khách trên máy chủ cũ — **phiên Mac không vào được VPS, nhưng phiên VPS này vào được** (đã đo trực tiếp ở B.2) — phần này phiên VPS tự lo, không cần Mac.
- **Giấy phép dữ liệu thiên văn astro.com cho web thu tiền** — đúng điểm đã flag ở B.4 #7 ("kiểm license trước khi deploy"), giờ có 2 nguồn độc lập cùng nêu → chắc chắn phải đọc kỹ license astro.com trước khi dùng cho web tính phí, không bỏ qua được.

### B.9 Biến môi trường cần có (.env.local VPS, 23/10/2026) — CHỈ TÊN BIẾN, KHÔNG PHẢI GIÁ TRỊ THẬT

> Giá trị thật KHÔNG đưa vào file này / không commit git — SePay, SMTP, OAuth, JWT secret... là tiền + tài khoản thật, rò vào git history là không thu hồi được (khác xoá file thường). Cần giá trị thật thì lấy qua kênh ngoài git (dán trực tiếp trong chat 1 lần, hoặc scp sang máy đích) — hỏi phiên VPS này khi cần.

\`\`\`
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
\`\`\`
`

// Tên biến đọc giá trị thật từ process.env lúc request — KHÔNG commit git, chỉ build vào
// response cho đúng user 'hentaiikidd' (check session + middleware.ts chặn sớm hơn nữa).
const SECRET_VAR_NAMES = [
  'ADMIN_EMAILS', 'ADMIN_TELEGRAM_USER_ID', 'APP_PORT',
  'BANK_ACCOUNT_NAME', 'BANK_ACCOUNT_NUMBER', 'BANK_NAME',
  'CF_TURNSTILE_SECRET_KEY', 'NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY',
  'CRON_SECRET', 'CTV_JWT_SECRET',
  'DATABASE_URL',
  'EMAIL_FROM',
  'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_SERVICE_ACCOUNT_BASE64',
  'KB_SPREADSHEET_ID',
  'NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_DAISU_URL',
  'OPENROUTER_API_KEY', 'OPENROUTER_MANAGEMENT_KEY',
  'PROFILE_ENCRYPTION_KEY',
  'SEPAY_API_KEY',
  'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS',
  'TELEGRAM_ADMIN_BOT_TOKEN', 'TELEGRAM_ADMIN_WEBHOOK_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET_TOKEN',
  'UPGRADE_CODE_HASH',
  'UPSTASH_REDIS_REST_TOKEN', 'UPSTASH_REDIS_REST_URL',
] as const

export async function GET() {
  const session = await getServerSession(authOptions)
  const username = (session?.user as { username?: string } | undefined)?.username
  if (username !== 'hentaiikidd') {
    return new NextResponse('Not found', { status: 404 })
  }

  const secretLines = SECRET_VAR_NAMES
    .map((name) => `${name}=${process.env[name] ?? '(chưa set)'}`)
    .join('\n')

  const body = STATIC_DOC
    + '\n\n---\n\n## Biến môi trường thật (.env.local VPS, giá trị LIVE)\n\n```\n'
    + secretLines
    + '\n```\n'

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': 'attachment; filename="HGCT-du-an-va-cloudflare.md"',
    },
  })
}
