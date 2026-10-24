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

## PHẦN B — KẾ HOẠCH CHUYỂN SANG CLOUDFLARE (bản mới, 24/10/2026 — thay toàn bộ bản cũ)

> Nguồn: báo cáo chính thức từ bên vận hành hạ tầng Cloudflare ("bên mình" trong văn bản dưới = team Cloudflare, "bên anh/chị" = team mã nguồn HGCT/VPS). Giữ nguyên văn để không làm lệch ý — bản cũ (B.1-B.10 trước đây) đã lỗi thời, xem lịch sử git nếu cần so sánh.

# HGCT lên Cloudflare gói miễn phí: thay đổi hôm nay và những thứ còn xin bên anh/chị (24/10/2026)

- **Mục đích:** báo bên anh/chị các thay đổi kho mã hôm nay, và xin nốt những thứ còn thiếu để đưa hatgiongchiemtinh.com lên Cloudflare gói miễn phí.
- **Kho mã chính từ nay:** https://github.com/thanhnt1021/hgct (công khai, giấy phép AGPL-3.0, nhánh `main` ở commit `1dbe941`).
- **Xin bên anh/chị:** mã mới trên VPS (nếu có), tên các biến môi trường, 2 bảng cấu hình, và vài xác nhận về mail, Google, SePay, lịch chuyển (mục 2).

Tệp do trợ lý hệ thống bên mình soạn, đọc từ mã ở commit `4f0ff2a` (kho cũ). Kế hoạch kỹ thuật đầy đủ nằm ở phụ lục cuối tệp này.

## 1. Thay đổi hôm nay bên anh/chị cần biết

- **Kho mới `thanhnt1021/hgct` là kho chính.** Lịch sử đã được làm sạch: mật khẩu DB, khoá OpenRouter, `PROFILE_ENCRYPTION_KEY` và khoá webhook SePay đã được gỡ khỏi mọi commit cũ. Vì vậy **mọi mã commit đều đã đổi**: `4f0ff2a` cũ nay là `f209c64`, trên đó có thêm `1dbe941`.
- **Kho cũ `hentaiikidd/hgct` đã chuyển sang riêng tư.** VPS vẫn kéo/đẩy được bằng deploy key nên web vẫn chạy bình thường. Hai kho có lịch sử khác nhau nên không đẩy thẳng từ kho này sang kho kia được.
- **Commit `1dbe941`** thêm `LICENSE` (AGPL v3), `README.md`, trường `"license"` trong `package.json`, và link «Mã nguồn (AGPL)» ở `src/components/layout/Footer.tsx`. **Bên mình chưa build thử commit này**, nhờ bên anh/chị chạy `npm run build` giúp.
- **Theo AGPL (Điều 13):** từ nay, mỗi lần deploy thì `main` của kho mới phải chứa đúng mã đang chạy.
- **Chuyển máy VPS và máy dev sang kho mới.** Làm ở `/home/hgct/hgct`, `/home/hgct/hgct-demo` và mọi máy dev:
  - Kiểm trước: `git status` và `git log --oneline 4f0ff2a..HEAD` (mọi nhánh đang dùng).
  - **Không có gì mới** (sạch, log trống): `git remote set-url origin git@github.com:thanhnt1021/hgct.git && git fetch origin && git checkout -B main origin/main`
  - **Có commit mới sau `4f0ff2a`:** `git remote add moi git@github.com:thanhnt1021/hgct.git && git fetch moi && git rebase --onto moi/main 4f0ff2a main`. Sau đó đẩy lên kho mới bằng `git push moi main`, hoặc nếu chưa có quyền đẩy thì xuất patch: `git format-patch 4f0ff2a..main -o ~/hgct-patch` rồi gửi thư mục đó.
  - **Có thay đổi chưa commit:** commit trước rồi làm như trên, hoặc gửi `git diff > ~/hgct-chua-commit.diff`.
- **Những thứ bên mình đã chốt, bên anh/chị không cần chuẩn bị:**
  - Dùng R2 cho PDF và avatar.
  - Mail giữ SMTP Hostinger.
  - Giữ nguyên mọi giá trị khoá hiện có.
  - Không chép dữ liệu khách: DB mới để trống, khách tạo lại tài khoản.
  - Dùng bản miễn phí AGPL của Swiss Ephemeris.
  - DNS: zone `bcb2eba2954f8f1134129747068127de` đã nằm trong tài khoản Cloudflare `fc328bd1ba4dde51a9a2f42a72b8a4b8`, khoá Cloudflare do bên mình giữ.

## 2. Xin bên anh/chị

Mỗi mục ghi: cần gì · vì sao cần · gửi dạng gì.

1. **Mã trên VPS chưa có ở kho mới** (cả `hgct`, `hgct-demo`, và mọi nhánh) · vì kho mới dựng từ `4f0ff2a` · gửi bằng `git push` lên kho mới, hoặc thư mục patch như ở mục 1.
2. **Khoá công khai của deploy key VPS** (dòng `ssh-ed25519 …`, không phải khoá riêng) · để bên mình cấp quyền ghi trên `thanhnt1021/hgct` cho VPS · dán thẳng vào nhóm được.
3. **Danh sách TÊN biến môi trường đang chạy thật ở prod và demo** · vì giữ nguyên giá trị khi chuyển, mà `.env.example` có thể lệch với bản thật · gửi danh sách tên trong nhóm. **Giá trị gửi riêng 1–1**, không qua tệp này, không qua nhóm.
4. **Xuất bảng `config` và `promo_codes`** (`prisma/schema.prisma:232,242`), riêng bảng `config` thì bỏ dòng `order_check_last_run` · vì đây là nội dung trang chủ, giá hiển thị, `site_mode` và mã ưu đãi cần mang sang DB mới · gửi 2 tệp CSV, gửi riêng chứ không đăng vào nhóm.
5. **Hiện có CTV nào đang hoạt động không** · vì bảng `ctv` không mang sang, CTV phải đăng ký lại qua `api/ctv/register` · trả lời có/không và số người. Bên mình không cần thông tin cá nhân của CTV.
6. **Hộp mail Hostinger** (`SMTP_USER` đang chạy, `src/lib/email.ts:8-18`) · vì Worker sẽ gửi qua TCP socket cổng 465, nếu hỏng thì thử 587 · trả lời: gói mail còn hạn đến ngày nào, Hostinger có chặn gửi từ IP ngoài hoặc giới hạn số mail/ngày không.
7. **Google OAuth** (`src/lib/auth.ts:54-57`) · cần biết ai có quyền vào Google Cloud Console của client đang dùng, và đã có redirect URI cho `demo.hatgiongchiemtinh.com` chưa · trả lời, kèm ảnh chụp danh sách redirect URI (không chụp client secret).
8. **Webhook SePay** · prod giữ nguyên tên miền nên URL không đổi; bên mình cần biết webhook đang trỏ đúng `/api/payment/sepay-webhook` chưa, và demo dùng luồng `/demosepay` hay cần một webhook riêng · trả lời, kèm ảnh chụp phần cấu hình webhook (che khoá).
9. **Route `/migration-notes`** (`src/app/migration-notes/route.ts:14`) · cần xác nhận prod đã build lại bằng bản đã gỡ nội dung (route chỉ còn trả một dòng giữ chỗ) · trả lời có/chưa.
10. **Người làm và lịch chuyển** · cần biết ai sửa mã, ai deploy (nếu bên anh/chị deploy thì bên mình gửi riêng khoá Cloudflare), ngày dựng demo, khung giờ tạm dừng nhận đơn khi chuyển prod, và VPS giữ thêm bao lâu (đề nghị ít nhất 7 ngày) · trả lời trong nhóm.

## 3. Việc bên anh/chị làm trong mã

Chi tiết từng việc (tệp:dòng, đường lùi) có ở phụ lục cuối tệp.

- Băm mật khẩu: đổi bcrypt sang PBKDF2 của Web Crypto, salt riêng từng tài khoản, bỏ nhánh đọc hash cũ.
- PDF: đổi Chromium và Ghostscript sang Browser Rendering, đưa bìa, ảnh nền, trang cuối vào trang HTML để in một lần.
- Ảnh OG: chụp sẵn thành PNG trong `public/`, bỏ route `api/og`.
- Lá số: đổi `swisseph` (mô-đun C) sang bản WASM, nạp kèm `ephe/`.
- PDF và avatar: lưu vào R2 thay `/var/hgct/*`. Prompt, font, `imgs/`, `public/` đưa vào Static Assets.
- Giới hạn lượt gọi: đếm bằng một bảng D1, giữ khung 15 phút và 1 giờ.
- Mail: thay nodemailer bằng bộ gửi SMTP nhỏ chạy trên TCP socket, vẫn dùng `smtp.hostinger.com`.
- Việc nền: chuyển sang Queues. Gộp 4 lịch và watchdog thành 1 Cron Trigger chạy mỗi phút.
- Thay `geo-tz` bằng thư viện tra múi giờ chạy ngay trong mã. `googleapis` đổi sang gọi REST bằng `fetch`. Gỡ các gói không dùng nữa.
- Next.js qua OpenNext, bật `nodejs_compat`. Prisma lên ≥6.2 với adapter D1, đổi 9 cột `Json`. DB D1 để trống, chỉ nạp `config` và `promo_codes`, chạy kb-sync một lần.
- Sửa `docs/CLOUDFLARE_MIGRATION.md` theo các quyết định ở mục 1, và sửa CFM:45 (SePay nhận tiền ở `api/payment/sepay-webhook`).
- Đo trên demo rồi ghi số vào tài liệu, gồm 5 chỗ: CPU trang Next.js, thời gian in PDF, gửi mail cổng 465, lá số WASM, băm PBKDF2. Chỗ nào vượt thì làm theo đường lùi 0 đồng trong bảng của tệp kế hoạch.

## 4. Cách gửi lại

- Trả lời ngắn theo số mục (vd «2.5: không có CTV») trong nhóm.
- Tệp CSV, patch, ảnh chụp thì gửi tệp riêng.
- **Không gửi giá trị khoá hay mật khẩu nào qua nhóm chat hoặc qua tệp này**, chỉ gửi tên biến. Giá trị khoá gửi riêng 1–1 qua kênh hai bên đã thống nhất.

---

# Phụ lục — tệp kế hoạch kỹ thuật kèm theo

## Kế hoạch kỹ thuật: chuyển hatgiongchiemtinh.com (HGCT) sang Cloudflare gói miễn phí (24/10/2026)

**1. Chạy miễn phí 100% được, với điều kiện đổi 10 chỗ trong mã ở mục dưới.** Quy mô nhỏ (1–4 đơn/ngày) nên hạn mức theo ngày và theo tháng còn dư xa. Chỗ vướng thật chỉ là **10ms CPU mỗi lượt gọi**.
**2. Bên mình đã chốt hết.** Giữ mail Hostinger, dùng R2, giữ nguyên khoá, không chép dữ liệu khách, dùng 2 khoá Cloudflare có sẵn. Không còn mục nào bỏ ngỏ.
**3. Còn 5 chỗ phải đo trên demo** (CPU trang Next.js, in PDF, mail cổng 465, lá số WASM, băm mật khẩu). Mỗi chỗ đã có sẵn đường lùi 0 đồng, người làm HGCT tự xử theo bảng ở mục cuối.

Nguồn: đọc từ mã HGCT ở commit `4f0ff2a` (kho cũ), không chép giá trị khoá nào.

## Đã chốt

- **Gói:** miễn phí 100% trên Cloudflare.
- **Mail gửi khách:** Giữ SMTP Hostinger, Worker gửi qua TCP socket cổng 465. Bỏ hẳn Resend khỏi kế hoạch.
- **Bộ dữ liệu hành tinh astro.com (Swiss Ephemeris):** giữ như hiện nay, dùng bản miễn phí giống oHa.
- **28 khoá:** chuyển sang giữ nguyên mọi giá trị khoá, kể cả `PROFILE_ENCRYPTION_KEY`, `NEXTAUTH_SECRET`, `CTV_JWT_SECRET`. Không cần bước mã hoá lại hồ sơ.
- **Khách và mật khẩu:** không chép dữ liệu khách hay tài khoản. DB mới trống, chỉ mang cấu hình và nội dung.
- **Kho tệp:** dùng R2. Tài khoản `fc328bd1ba4dde51a9a2f42a72b8a4b8` đã bật R2 và đang có 5 kho (kiểm 13:25 ngày 24/10). Bỏ phương án KV.
- **Khoá Cloudflare:** bên mình giữ, không gửi qua tệp; cần deploy thì bên mình cấp quyền riêng.
  - Zone ID `bcb2eba2954f8f1134129747068127de`, Account ID `fc328bd1ba4dde51a9a2f42a72b8a4b8`.

## Phải đổi trong mã để chạy miễn phí

- **Băm mật khẩu: bỏ bcrypt cost 12, chuyển sang PBKDF2 của Web Crypto.** Chỗ cần sửa: `src/lib/auth.ts:14,19,25,139`, `src/lib/ctv/auth.ts:69,85`, `api/user/password/route.ts:13,45`, `api/auth/reset-password/route.ts:26`, `api/user/upgrade/route.ts:37`.
  - Chỉ có tài khoản mới nên bỏ nhánh đọc hash cũ (`auth.ts:22-26`), không băm lại khi đăng nhập.
  - Salt ngẫu nhiên cho từng tài khoản, không hạ số vòng lặp quá thấp chỉ để lọt 10ms.
- **In PDF: bỏ Chromium và Ghostscript, chuyển sang Browser Rendering.** Chỗ cần sửa: `src/lib/pdf/generator.ts:744` (puppeteer), `generator.ts:1141` (`gs`), `generator.ts:634-636` (pdf-lib ghép bìa, ảnh nền, trang cuối).
  - Bỏ bước nén `gs`, vì mã đã có đường lùi trả PDF không nén (`generator.ts:1152-1154`).
  - Đưa bìa, ảnh nền, trang cuối vào chính trang HTML để in một lần ra PDF trọn vẹn, không ghép bằng pdf-lib.
- **Ảnh OG:** `api/og/route.ts:45-60` đang mở Chromium để chụp một trang cố định. Chụp một lần thành PNG, bỏ vào `public/`, rồi bỏ route này.
- **Tính lá số:** `swisseph` là mô-đun C nên Worker không nạp được (`src/lib/astrology/calculations.ts:2,10-11`, `constants.ts:2`, `transit-stubs.ts:2`). Thay bằng bản WASM, nạp kèm `ephe/` (1.9MB), vẫn dùng bản miễn phí như hiện nay.
- **Lưu PDF và avatar vào R2.** Hiện mã ghi ra `/var/hgct/pdfs` và `/var/hgct/avatars` (`reportProcessor.ts:20`, `api/user/avatar/route.ts:7`, `api/pdf/[id]/route.ts:6,36`).
- **Tệp đang đọc từ ổ đĩa thì đưa vào Static Assets:** 10 tệp prompt (`src/lib/logic/*/prompt.ts`, gói thẳng vào mã), font (`generator.ts:13`), ảnh nền PDF (`generator.ts:570,634`), thư mục `imgs/` 5.3MB (`api/imgs/[filename]/route.ts:26`), `public/` 78MB.
- **Giới hạn lượt gọi:** bỏ Upstash (`src/lib/ratelimit.ts:9-14,50-55`), đếm bằng một bảng trong D1 (miễn phí 100.000 lượt ghi/ngày). Giữ nguyên khung 15 phút và 1 giờ đang dùng (`ratelimit.ts:59-75`). Không dùng Rate Limiting binding (chỉ có khung 10/60 giây).
- **Mail: thay nodemailer bằng một bộ gửi SMTP nhỏ chạy trên TCP socket của Worker.** Vẫn dùng `smtp.hostinger.com`, cổng 465, TLS ngay khi mở kết nối, đúng như cấu hình hiện tại (`src/lib/email.ts:1,8-18`). Giữ các biến `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`/`SMTP_PASSWORD`.
- **Việc nền, lịch chạy và thư viện nặng:**
  - Việc nền đang chạy trong bộ nhớ (`src/lib/jobs.ts:396,408`). Chuyển sang Queues (miễn phí 10.000 lượt/ngày).
  - Gộp 4 lịch (order-check, kb-sync, cleanup 19:00 UTC, retention 02:00 UTC) và watchdog thành **1 Cron Trigger chạy mỗi phút**. Trong mã tự rẽ nhánh theo giờ UTC. Chỉ tốn 1 trong 5 lịch miễn phí của tài khoản.
  - `geo-tz` đọc dữ liệu từ đĩa (`api/location/search/route.ts:2`). Thay bằng thư viện tra múi giờ chạy ngay trong mã, không gọi dịch vụ ngoài, không cần khoá.
  - `googleapis` (`api/cron/kb-sync`) đổi sang gọi REST bằng `fetch`.
  - Bỏ `puppeteer`, `@sparticuz/chromium`, `nodemailer`, `@upstash/*`, `bcrypt`/`bcryptjs` khỏi `package.json`.
- **Next.js chạy qua OpenNext, bật cờ `nodejs_compat`.** Cỡ gói mã không vướng (64MiB chưa nén).

## Việc người làm HGCT phải làm

(Mỗi dòng một việc, chuyển nguyên được.)

- Sửa tài liệu chuyển (`docs/CLOUDFLARE_MIGRATION.md`, CFM) theo các quyết định đã chốt:
  - Bỏ mọi câu khuyên lên gói khác ở mục B.3 (dòng CPU) và B.7. Câu «không chạm hạn mức free tier» ở CFM:100 sửa thành «vướng hạn CPU 10ms/lượt, không vướng hạn theo ngày».
  - Bỏ Resend, Upstash và `RESEND_API_KEY`. Mail giữ SMTP Hostinger.
  - Bỏ phần cảnh báo 28 khoá đã lộ (CFM:220-223), ghi là giữ nguyên mọi khoá khi chuyển.
  - Bỏ việc «chốt giấy phép astro.com» (CFM mục B.4 #7, B.6 #4). Ghi là dùng bản miễn phí như hiện nay.
  - Bỏ quy trình chép dữ liệu khách Postgres→D1, bỏ bước mã hoá lại hồ sơ, bỏ bước chép avatar.
- Điền vào tài liệu: Account ID `fc328bd1ba4dde51a9a2f42a72b8a4b8`, Zone ID `bcb2eba2954f8f1134129747068127de`.
- Deploy Worker, gắn route, tạo D1, Queues, kho R2 cho PDF và avatar bằng khoá Cloudflare bên mình cấp. Không cần Pages.
- Quyền ghi của khoá chưa kiểm được bằng lệnh chỉ đọc, sẽ biết ở lần deploy demo đầu tiên. Bị từ chối thì ghi lại lệnh và mã lỗi rồi báo về.
- Dựng DB D1 trống từ `prisma/schema.prisma`: nâng Prisma lên ≥6.2, dùng adapter D1, đổi 9 cột `Json` cho hợp SQLite.
- **Chỉ mang sang 3 bảng cấu hình/nội dung (không phải dữ liệu khách):**
  - `config`: nội dung trang chủ (`hero_subtitle`, `cta_body`, tên và mô tả 4 dịch vụ…), giá hiển thị (`display_price_*`), `site_mode`, `order_check_interval`. Bỏ `order_check_last_run` vì đó là trạng thái lúc chạy. (`dashboard/(app)/content/page.tsx:15`, `api/admin/config/route.ts:65`, `api/payment/create-order/route.ts:68`).
  - `promo_codes`: mã ưu đãi nạp xu (`api/admin/promo-codes/route.ts`, trừ lượt ở `api/payment/sepay-webhook/route.ts:167`). Chép nguyên.
  - `knowledge_base`: không cần chép. Sau khi deploy, chạy kb-sync một lần để lấy lại từ Google Sheet (`api/cron/kb-sync/route.ts:20,66-68`, cần `GOOGLE_SERVICE_ACCOUNT_BASE64`, `KB_SPREADSHEET_ID`).
- **Không mang sang** (dữ liệu khách, tài khoản, giao dịch): `users`, `profiles`, `coin_transactions`, `readings`, `essays`, `saved_charts`, `jobs`, `orders`, `ctv`, `ctv_commissions`. Không mang PDF cũ trong `/var/hgct/pdfs` và avatar trong `/var/hgct/avatars`.
  - Tài khoản admin: tạo lại bằng email có trong `ADMIN_EMAILS` (`src/lib/dashboard-auth.ts:13`).
  - CTV: đăng ký lại qua `api/ctv/register`. CHƯA RÕ hiện có CTV nào đang hoạt động không. Nếu có thì người làm HGCT báo họ đăng ký lại.
- Làm lại danh sách biến cho bản Cloudflare:
  - Bỏ: `DATABASE_URL`, `APP_PORT`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `DOCKER_PROXY_*`.
  - Giữ nguyên giá trị: mọi khoá còn lại, kể cả `SMTP_*`, `PROFILE_ENCRYPTION_KEY`, `NEXTAUTH_SECRET`, `CTV_JWT_SECRET`.
  - Thêm vào `wrangler.toml`: kết nối D1, R2, Queues, Browser Rendering, Static Assets, 1 Cron Trigger.
- Sửa phần cấu trúc thư mục ở CFM:45: chỗ nhận tiền SePay là `api/payment/sepay-webhook`, còn `payment/confirm` chỉ là chỗ giữ chỗ (`confirm/route.ts:13-17`). Liệt kê đủ `create-order`, `claim-transfer`, `status`, `demosepay/status`.
- Thêm địa chỉ chuyển hướng đăng nhập Google cho `demo.hatgiongchiemtinh.com` trong Google Console nếu chưa có.
- Chụp sẵn ảnh OG thành PNG tĩnh, bỏ route `api/og`.
- Gỡ hẳn route `/migration-notes` khi chuyển xong (ở HEAD route chỉ còn trả chuỗi trống, `src/app/migration-notes/route.ts:14`).
- Chọn thư viện tra múi giờ thay `geo-tz` (chạy trong mã, không cần khoá), rồi thử với các địa danh khách hay nhập, nhất là vùng sát biên giới.
- Đo 5 chỗ ở mục dưới trên demo, ghi số vào CFM. Chỗ nào vượt thì làm theo đường lùi đã ghi, không cần hỏi lại.

## Phải đo trên demo (kèm đường lùi 0 đồng)

| Chỗ đo | Đo gì | Đạt khi | Vượt thì làm (0 đồng) |
|---|---|---|---|
| CPU trang Next.js | CPU mỗi lượt gọi của trang chủ, trang dịch vụ, trang đơn hàng, các API chính | ≤10ms | Làm trang đó thành trang tĩnh (Static Assets không tính CPU), Worker chỉ giữ các API nhỏ. Phần động lấy bằng `fetch` sau khi tải trang. |
| In PDF qua Browser Rendering | Số giây để in 1 PDF | Tổng ≤10 phút/ngày. Ví dụ 60 giây/bản thì in được khoảng 10 bản/ngày, đủ cho 1–4 đơn | Mỗi bản chỉ mở trình duyệt một lần, giảm cỡ ảnh nền. Còn vượt thì việc in xếp vào Queues, chờ sang ngày sau (hạn reset mỗi ngày), trang đơn hàng báo «đang in». |
| Mail cổng 465 | Gửi thử 1 mail tới hộp ngoài (Gmail) qua TCP socket, cổng 465, TLS ngay khi mở kết nối | Mail tới hộp thư, không vào spam | (1) Thử cổng 587 với STARTTLS, vẫn là SMTP Hostinger. (2) Nếu cả hai cổng đều hỏng: khách tải PDF ngay trên trang đơn hàng, bot Telegram admin báo đơn mới để gửi tay từ hộp Hostinger, quên mật khẩu thì đăng nhập bằng Google. |
| Lá số WASM | Thời gian khởi động Worker khi nạp WASM và `ephe/`, CPU tính 1 lá số; đối chiếu kết quả với bản `swisseph` cũ | Khởi động ≤1 giây, CPU ≤10ms, kết quả khớp bản cũ | Không gói `ephe/` vào mã: để trong R2 hoặc Static Assets, chỉ tải tệp cần dùng lúc tính. Vẫn vượt CPU thì chạy WASM trong trình duyệt của khách (tính lá số ở máy khách), Worker chỉ nhận kết quả để lưu và in. |
| Băm mật khẩu PBKDF2 | CPU mỗi lượt đăng ký/đăng nhập | ≤10ms với số vòng lặp đủ an toàn | Không hạ số vòng lặp xuống quá thấp. Nếu không lọt thì chỉ cho đăng nhập bằng Google và link đăng nhập gửi qua mail, bỏ mật khẩu. |

## Rủi ro ghi nhận

- Bộ dữ liệu hành tinh astro.com: đang dùng bản miễn phí cho web có thu tiền, giống oHa và chiemtinh.jst4.fun. Ghi lại để biết, không có việc phải làm.

## PHỤ LỤC — Giới hạn gói Free (tra 24/10/2026)

| Thứ | Giới hạn Free | Nguồn |
|---|---|---|
| Workers: CPU mỗi lượt gọi | 10ms (chờ mạng, DB không tính) | developers.cloudflare.com/workers/platform/limits/ |
| Workers: lượt gọi mỗi ngày | 100.000 (tính chung với Pages Functions) | developers.cloudflare.com/workers/platform/limits/, developers.cloudflare.com/pages/functions/pricing/ |
| Workers: cỡ gói mã | 64MiB chưa nén, không giới hạn bản nén; khởi động tối đa 1 giây; bộ nhớ 128MB | developers.cloudflare.com/workers/platform/limits/ |
| Workers: subrequest | 50 mỗi lượt; tối đa 6 kết nối cùng lúc | developers.cloudflare.com/workers/platform/limits/ |
| Cron Triggers | 5 lịch cho cả tài khoản, 10ms CPU mỗi lượt, chạy giờ UTC | developers.cloudflare.com/workers/platform/limits/, developers.cloudflare.com/workers/configuration/cron-triggers/ |
| Static Assets | 20.000 tệp, mỗi tệp 25MiB, lượt tải không giới hạn, không mất phí | developers.cloudflare.com/workers/platform/limits/, developers.cloudflare.com/workers/static-assets/billing-and-limitations/ |
| D1 | 500MB mỗi DB, 5GB mỗi tài khoản, đọc 5 triệu dòng/ngày, ghi 100.000 dòng/ngày, 50 truy vấn mỗi lượt, mỗi dòng tối đa 2MB; vượt hạn ngày thì truy vấn bị dừng | developers.cloudflare.com/d1/platform/limits/, developers.cloudflare.com/d1/platform/pricing/ |
| R2 | 10GB-tháng, 1 triệu lượt A/tháng, 10 triệu lượt B/tháng, tải ra miễn phí; tài khoản HGCT đã bật R2 | developers.cloudflare.com/r2/pricing/ |
| Queues | 10.000 lượt/ngày, giữ tin 24 giờ | developers.cloudflare.com/queues/platform/pricing/ |
| Browser Rendering | 10 phút/ngày, 3 trình duyệt cùng lúc | developers.cloudflare.com/browser-rendering/platform/pricing/ |
| Email Service (gửi) | Chỉ gửi tới địa chỉ đã xác minh; nhận mail (Email Routing) không giới hạn | developers.cloudflare.com/email-service/platform/pricing/ |
| TCP socket | Chỉ chặn cổng 25 (cổng 465, 587 tài liệu không chặn) | developers.cloudflare.com/workers/runtime-apis/tcp-sockets/ |

---

## PHẦN C — Cập nhật 24/10/2026 (sau khi nhận "Trả lời báo cáo đợt deploy 24/10")

### C.1 Đã đẩy lên kho mới

`thanhnt1021/hgct` được cấp quyền ghi cho tài khoản `hentaiikidd` (không phải deploy key riêng — GitHub báo khoá VPS đang dùng ở repo khác nên không gắn deploy key mới được, bên Cloudflare đã cấp quyền collaborator cho cả account thay vào đó). Đã `git push thanhnt1021 main` thành công từ VPS.

**HEAD mới của `main`: `15e2665`** (trên nền `1dbe941`, cộng thêm cập nhật tài liệu migration). Repo VPS (`/home/hgct/hgct`) giờ có 2 remote: `origin` (hentaiikidd/hgct, kho cũ, vẫn còn) và `thanhnt1021` (kho chính mới, đã đẩy được).

### C.2 Mục 2.5 — 14 CTV: số liệu thật khác với "14 đang hoạt động"

Đo trực tiếp bảng `ctv` trên VPS:
- **Chỉ 6/14 có `status = 'active'`.** 8 còn lại là `pending_setup` (chưa bao giờ hoàn tất thiết lập tài khoản — chưa chắc cần chép, có thể để họ tự đăng ký lại không mất gì vì chưa dùng).
- **Bảng `ctv_commissions` có 0 dòng** — không có lịch sử hoa hồng nào cần chuyển. Việc "chép lịch sử chi trả nếu có" trong yêu cầu — không có gì để chép.
- Đã xuất CSV bảng `ctv` đầy đủ 14 dòng (`password_hash` giữ dạng đã băm, không giải mã) tại `/tmp/ctv_export.csv` trên VPS — chưa xuất `ctv_commissions` vì rỗng, không cần.
- **Cần anh Thành xác nhận lại:** chép cả 14 (gồm 8 pending_setup) hay chỉ chép 6 active, để 8 pending_setup tự đăng ký lại bình thường (không mất gì vì họ chưa từng setup xong)?

### C.3 Mục 3.1–3.4 — cần anh Thành/người giữ tài khoản tự làm, VPS không có quyền truy cập các bảng điều khiển này

- **3.1 Hostinger:** VPS chỉ có mailbox credential (`SMTP_USER`/`SMTP_PASS` để gửi mail), không có đăng nhập bảng điều khiển Hostinger (hPanel) để xem hạn gói/giới hạn gửi. Cần anh tự đăng nhập Hostinger kiểm.
- **3.2 Google Console:** VPS có `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (dùng để app chạy OAuth) nhưng không phải đăng nhập Google Cloud Console (đó là tài khoản Google cá nhân của ai tạo project, VPS không có). Cần anh tự vào Console thêm redirect URI cho `demo.` + chụp màn.
- **3.3 SePay:** VPS biết `SEPAY_API_KEY` (key app dùng để tạo đơn/verify webhook) nhưng không đăng nhập được dashboard SePay (tài khoản ngân hàng/merchant). Cần anh tự vào SePay xem cấu hình webhook + chụp màn (che khoá).
- **3.4 Người làm + lịch chuyển:** quyết định vận hành, không phải việc kỹ thuật — cần anh Thành chốt.

**Tóm cho anh:** 4 mục này VPS/Claude không tự trả lời được dù có quyền truy cập mã nguồn đầy đủ — đều cần đăng nhập dashboard ngoài (Hostinger, Google, SePay) hoặc là quyết định vận hành của anh. Không phải tao né việc, chỉ là không có đường vào.
