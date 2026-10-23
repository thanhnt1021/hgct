# Chuyển Hạt Giống Chiêm Tinh (HGCT) từ VPS HostHatch sang Cloudflare

> Thẻ gốc: **HGCT-23102026-01**, anh Thành giao 08:09 23/10/2026.
> File này tổng hợp toàn bộ việc đã kiểm + đã làm + còn thiếu gì, để anh tự code hoặc báo bên khác setup theo đúng từng bước dưới đây. Chỉ nằm trong repo riêng tư `hentaiikidd/hgct` — không đẩy sang bản `thanhnt1021/hgct` (bản đó public).

## 1. Mục tiêu

Bỏ VPS HostHatch, web `hatgiongchiemtinh.com` (+ demo) chạy trên Cloudflare. Khách vẫn đặt dịch vụ → trả tiền SePay → nhận PDF qua email như hiện tại, không đứt đoạn. Ưu tiên theo đúng thứ tự anh đã chốt:

1. **Miễn phí tối đa** — quan trọng hơn việc "100% nằm trong Cloudflare".
2. **Chấp nhận viết lại** bất kỳ phần nào cần, miễn giữ được free và đúng chức năng.
3. **Độ chính xác tính toán lá số là bất biến, không đánh đổi** — dù viết lại cách nào, kết quả phải khớp 100% với bản hiện tại.
4. Không cần giữ Postgres — chuyển hẳn sang D1 nếu đúng chức năng.
5. GitHub: tạo repo mới `thanhnt1021/hgct`, giữ `hentaiikidd/hgct` làm bản gốc/dự phòng, không chuyển quyền sở hữu.

## 2. Hiện trạng thật (đọc từ code + đo trực tiếp trên VPS, 23/10/2026)

- **Code:** Next.js 15.5 + React 19, `output: 'standalone'`, chạy Docker (`infra/docker-compose.yml`): Postgres 16, `hgct-prod`, `hgct-demo`, cron sidecar, `docker-socket-proxy`. 68 route API, Prisma 13 bảng trên DB `zodiacdb`.
- **Luồng sinh báo cáo:** tính lá số → lấy KB → gọi OpenRouter (tới 32.000 token, vài phút) → dựng PDF bằng Chromium → gửi mail SMTP Hostinger → báo Telegram.
- **Cron 4 việc:** `order-check` (mỗi phút), `cleanup`, `kb-sync` (Google Sheets → KB), `retention`.
- **Quy mô dữ liệu thật (đo 23/10/2026):**
  - DB Postgres: **12MB** tổng (bảng lớn nhất `knowledge_base` 816KB).
  - PDF lưu đĩa: prod 39MB (17 file), demo 4KB.
  - Avatar: 56KB.
  - Traffic đơn hàng: 346 đơn trong ~4.5 tháng (13/03–25/07/2026), trung bình 1–2 đơn/ngày, cao nhất 4 đơn/ngày.
  - → Quy mô rất nhỏ, không chạm hạn mức free tier bất kỳ dịch vụ Cloudflare nào bên dưới.

## 3. Từng chỗ vướng khi lên Cloudflare — và cách xử

| Thành phần | Vì sao vướng | Cách xử (đã chốt hướng) |
|---|---|---|
| `swisseph` (tính lá số) — `src/lib/astrology/calculations.ts`, `constants.ts`, `transit-stubs.ts` | Mô-đun C biên dịch sẵn cho Linux, Worker (V8 isolate) không nạp được | **Dùng bản WebAssembly chính chủ của astro.com** (`astro.com/sweph-wasm/` — nguyên bản C KHÔNG sửa đổi compile sang WASM bằng Emscripten) → giữ đúng 100% thuật toán, không đổi lib khác. Chạy WASM trong Worker bình thường, không cần Containers. **Bắt buộc đối chiếu kết quả** (vị trí hành tinh, nhà, điểm vận hạn) giữa bản cũ và bản WASM trên cùng 1 bộ ngày giờ sinh trước khi dùng thật. |
| Chromium + puppeteer (PDF, ảnh OG) — `src/lib/pdf/generator.ts`, `job-queue.ts`, `api/og` | Worker không chạy trình duyệt được | Cloudflare **Browser Rendering** free: chỉ 10 phút/ngày, tối đa 3 browser cùng lúc — **hẹp**, cần đo thời gian sinh PDF thật để biết đủ hay không. Nếu không đủ: viết lại PDF bằng lib JS thuần (bỏ Chromium hẳn) — việc này **không ảnh hưởng số liệu tính toán**, chỉ ảnh hưởng trình bày PDF. |
| Ghi đĩa: `/var/hgct/pdfs`, avatar — `reportProcessor.ts`, `api/pdf/[id]`, `api/user/avatar` | Worker không có ổ đĩa | Chuyển sang **R2** (free 10GB, hiện dùng chưa tới 40MB — dư rất nhiều). |
| Việc nền chạy vài phút (`processReport()`, `global.__hgctJobs` + `setInterval` watchdog — `src/lib/jobs.ts`) | Worker tắt khi trả lời xong, không giữ bộ nhớ, không có `setInterval` | **Cloudflare Queues** (giờ có ở free plan, 10.000 operation/ngày) hoặc Workflows. Trạng thái job đọc từ DB, watchdog chuyển thành Cron Trigger. |
| Gửi mail `nodemailer` SMTP — `src/lib/email.ts` | Worker không mở SMTP kiểu nodemailer | **Resend** (free tier, ngoài Cloudflare) — khuyên dùng vì free tuyệt đối. Cloudflare Email Service có nhưng **chỉ ở Workers Paid plan**, không có bản free. |
| Postgres trong Docker | Cloudflare không chạy Postgres | **D1** (đã chốt) — free 500MB/DB, 5GB/account, 5 triệu đọc + 100.000 viết/ngày. DB hiện 12MB, traffic 1–4 đơn/ngày → dư thừa hạn mức. Phải viết lại `schema.prisma` sang `sqlite` provider, rà cột kiểu `Array`/`Decimal` (SQLite không có Array, Decimal có thể lệch — cần test), test lại toàn bộ 68 route sau khi đổi dialect. |
| Cron sidecar + crontab | — | **Cron Triggers** (gọi `order-check` mỗi phút như cũ). |
| `docker-socket-proxy` + `src/lib/docker.ts` (admin bot restart container) | Không còn Docker | Bỏ lệnh restart trong admin bot. |
| `geo-tz`, `googleapis` (đọc file đĩa, gói nặng) | Phình gói vượt hạn Worker | Tra múi giờ qua API; Sheets gọi REST thẳng bằng `fetch`. |
| `public/` 78MB (`vh99` 30MB, `fonts` 26MB, `chart-symbols` 21MB) | Ảnh tĩnh quá cỡ gói Worker | Static Assets / R2. |
| Next.js trên Worker | Cần `@opennextjs/cloudflare`; 5 route có `runtime='nodejs'` phải soát lại | Dựng demo thử trước khi chuyển prod. |

## 4. Những thứ cần chuẩn bị (key/tài khoản) — ai setup cũng cần đủ list này

| # | Cần gì | Dùng để | Lấy ở đâu | Free? |
|---|---|---|---|---|
| 1 | Tài khoản Cloudflare (domain đã gắn sẵn) | Gốc mọi dịch vụ | dash.cloudflare.com | Free |
| 2 | **Cloudflare API Token** (scope: Workers Scripts/D1/R2/Queues Edit) | Deploy qua `wrangler` | Dash → My Profile → API Tokens | Free |
| 3 | Account ID + Zone ID | Config `wrangler.toml` | Dash → Overview | Free |
| 4 | D1 database (`wrangler d1 create`) | Thay Postgres | Tự tạo bằng token #2 | Free (500MB/DB, 5GB/account) |
| 5 | R2 bucket + R2 API Token | Lưu PDF/avatar/ảnh tĩnh | Dash → R2 → Manage API Tokens | Free (10GB) |
| 6 | Resend API key | Thay SMTP Hostinger | resend.com | Free tier |
| 7 | File ephemeris `.se1` từ astro.com (kiểm license trước khi deploy) | Dữ liệu cho swisseph-WASM | astro.com/ftp | Free (có điều khoản) |
| 8 | Cập nhật URL webhook SePay sang domain mới | Giữ nguyên tài khoản, chỉ đổi URL | Dashboard SePay | — |
| 9 | Cập nhật URL webhook 2 bot Telegram sang Worker mới | Giữ nguyên token bot cũ | — | — |
| 10 | (Tuỳ chọn) Browser Rendering binding — hoặc quyết viết lại PDF bằng JS thuần | Xuất PDF | `wrangler.toml` | Free (hẹp 10p/ngày) |

## 5. Trạng thái đã làm (tính đến 23/10/2026)

- [x] Đồng bộ code VPS mới nhất lên `hentaiikidd/hgct` (commit `4795f2d`).
- [x] Tạo + đồng bộ `thanhnt1021/hgct` (public, khớp `4795f2d`) — không cần deploy key nữa, chỉ cần bản đọc được, không cần VPS đẩy thẳng vào đó.
- [x] Đo dung lượng DB/file/traffic thật (mục 2).
- [x] Xác nhận swisseph có bản WASM chính chủ astro.com (mục 3, dòng 1).
- [x] Xác nhận Browser Rendering + Email Service free-tier hẹp/không free (mục 3).
- [x] Kiểm repo `thanhnt1021/chiemtinh` (oHa) — **không phải ví dụ Cloudflare đã chuyển thành công**, chỉ có 1 Worker bot Telegram, không liên quan đến swisseph/PDF/D1 của app chính. Không có pattern nào để tái dùng từ đó.

## 6. Còn thiếu — cần anh (hoặc bên được báo) làm

1. Tạo Cloudflare API Token (mục 4, #2) — chưa có thì chưa deploy được gì thật.
2. Quyết kênh báo cáo Telegram cho các ticket loại này — tạm gác, chưa cần gấp.
3. `docs/univ3/` trong repo `hgct` hiện để nguyên, chưa `.gitignore` — việc đồng bộ SSOT `thanhnt1021/univ3` phụ thuộc workflow trên Macbook, không phải việc của VPS này.
4. Sau khi có token #2: dựng demo trên Cloudflare (`demo.hatgiongchiemtinh.com`), test đủ 4 dịch vụ (sự nghiệp, tình duyên, cặp đôi, vận hạn) + đối chiếu kết quả lá số demo vs prod trên cùng bộ ngày giờ sinh trước khi tính chuyển prod thật.
5. Chuyển prod CHỈ sau khi anh duyệt — tạm dừng nhận đơn → chép DB + PDF lần cuối → đổi webhook SePay + Telegram → mở lại. Giữ VPS chạy thêm ít nhất 7 ngày để lùi về nếu cần.
