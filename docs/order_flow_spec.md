# Quy trình mua hàng — Đặc tả đầy đủ

## Tổng quan: 4 dịch vụ

| Dịch vụ | Icon | Mô tả | Cần mấy hồ sơ | ETA |
|---------|------|--------|---------------|-----|
| Hướng Nghiệp (`career`) | 🎯 | Sự nghiệp, tài năng, tài chính | 1 | 3–4 phút |
| Tình Duyên (`love`) | 💝 | Phong cách yêu, người phù hợp | 1 | 4–5 phút |
| Cặp Đôi (`synastry`) | 💑 | So sánh bản đồ sao 2 người | **2** | 6–8 phút |
| Vận Hạn (`transit`) | 🔮 | Phân tích transit theo giai đoạn | 1 + **khoảng thời gian** | 6–8 phút |

## 2 luồng thanh toán song song

```
             ┌─────────────────────────────────────────────┐
             │             Trang /services                 │
             └──────────────────┬──────────────────────────┘
                                │
                    chọn dịch vụ + hồ sơ
                                │
             ┌──────────────────▼──────────────────────────┐
             │              Trang /checkout                │
             └──────────────┬───────────┬──────────────────┘
                            │           │
              user Premium/Lifetime    user Free / chưa đăng nhập
                            │           │
              Bấm "Tạo báo cáo &       Bấm "Tiến hành thanh toán"
              Gửi Email"               │
                            │           ▼
                            │   Tạo order DB → /payment
                            │   (QR chuyển khoản + countdown 15')
                            │           │
                            │   SePay webhook nhận tiền
                            │           │
                            └─────┬─────┘
                                  │
                    Tạo Job → /processing (poll 2s)
                                  │
                    Pipeline: Chart → KB → Prompt → AI → PDF → Email
                                  │
                              /success
```

---

## BƯỚC 1 — Trang chủ → /services

- URL: `/services`
- Hiển thị 4 card dịch vụ (2 cột grid)
- Cặp Đôi có tag "Cần 2 hồ sơ"
- Bấm vào card → chuyển sang bước chọn hồ sơ ngay trong cùng trang (không chuyển trang)

## BƯỚC 2 — Chọn hồ sơ (vẫn ở /services)

### Chung cho tất cả dịch vụ

- Nếu đã đăng nhập và có hồ sơ lưu sẵn: hiện danh sách + ô tìm kiếm
- Nếu chưa có hoặc muốn nhập mới: bấm **"Nhập thông tin mới"** → modal ProfileFormModal
- Modal có checkbox **"Lưu hồ sơ này"** — nếu tick thì POST lên `/api/profiles` để lưu DB; nếu không thì chỉ dùng tạm (isTemp)

### Thông tin cần nhập trong modal

- Họ, đệm, tên (tách riêng 3 trường)
- Giới tính
- Ngày sinh (dd/mm/yyyy)
- Giờ sinh (HH:MM) — có thể để "không biết giờ" → dùng 12:00
- Nơi sinh (địa chỉ → Nominatim geocoding → lat/lon/tz, hardcode Asia/Ho_Chi_Minh)
- Ghi chú (tùy chọn)

### Riêng Cặp Đôi

- Cần chọn **2 hồ sơ riêng biệt**: Người thứ nhất + Người thứ hai
- Cả 2 bắt buộc mới cho bấm Tiếp tục

### Riêng Vận Hạn

- Thêm 2 trường **"Từ ngày" / "Đến ngày"** (date picker)
- Mặc định: hôm nay → +1 năm
- Giới hạn: tối đa 1 năm (365 ngày), phải có endDate > startDate

### Dữ liệu được lưu vào sessionStorage

```
inputData       → thông tin hồ sơ A (JSON)
inputDataB      → thông tin hồ sơ B (chỉ Cặp Đôi)
selectedService → loại dịch vụ
profileUidA     → UID hồ sơ A (nếu đã lưu)
profileUidB     → UID hồ sơ B (nếu đã lưu)
transitStartDate → ngày bắt đầu (chỉ Vận Hạn)
transitEndDate  → ngày kết thúc (chỉ Vận Hạn)
```

## BƯỚC 3 — Trang /checkout

- Đọc sessionStorage, hiển thị tóm tắt đơn hàng:
  - Dịch vụ, tên khách, giai đoạn (Vận Hạn), ETA
- **Email nhận báo cáo**: tự điền từ `reportEmail` (DB) hoặc email tài khoản, user có thể sửa
- Nút CTA thay đổi theo plan:

| Plan | Nút | Hành động |
|------|-----|-----------|
| Premium / Lifetime | "Tạo báo cáo & Gửi Email" | Gọi `/api/astrology/report` trực tiếp → `/processing` |
| Free / Guest | "Tiến hành thanh toán →" | Gọi `/api/payment/create-order` → `/payment` |

### API create-order (chỉ Free/Guest)

`POST /api/payment/create-order`

- Đọc giá từ DB (`config` table, key `service_price`) — mặc định 3.333đ nếu chưa set
- Tạo record `Order` trong DB với status `pending`, paymentStatus `unpaid`
- Tạo `transferCode = HGCT + {orderId padded 6 chữ số}` (VD: `HGCT000123`)
- Trả về: `orderId`, `transferCode`, `amount`, `bankAccount`, `bankName`, `bankAccountName`

## BƯỚC 4 — Trang /payment (chỉ Free/Guest)

### Giao diện

- QR code từ SePay: `https://qr.sepay.vn/img?acc=...&bank=...&amount=...&des={transferCode}`
- Thông tin chuyển khoản: ngân hàng, số TK, chủ TK, số tiền (đỏ, cỡ lớn), nội dung CK (nổi bật xanh + nút Copy)
- Dòng hướng dẫn: quét QR hoặc chuyển khoản thủ công với **đúng nội dung** `{transferCode}`
- Countdown **15 phút** — **tạm dừng** khi mất kết nối (failCount ≥ 4), tích lại `pausedMs`
- Thông báo: "Hệ thống sẽ **tự động xác nhận** và tạo báo cáo khi nhận tiền"
- Nút "Hủy giao dịch" → về /services

### Polling trạng thái thanh toán (mỗi 3 giây)

`GET /api/payment/status?orderId={id}`

- Nếu `paymentStatus === 'paid'` và có `jobId` → hiện "Thanh toán thành công!" → sau 1.8s redirect sang `/processing?job=...`
- Mỗi lần poll fail → `failCount++`:
  - `failCount` 1–3: silent (không hiện gì)
  - `failCount` 4–10: banner "⏳ Đang kết nối lại..." + **countdown tạm dừng**
  - `failCount` 11–20: banner "🔄 Hệ thống đang cập nhật"
  - `failCount` > 20: banner "⚠️ Mất kết nối"

### Khi countdown hết 15 phút

1. `checkOnceOnExpiry()` — gọi 1 lần nữa để check trạng thái:
   - Nếu `paid + jobId` → redirect `/processing` như bình thường
   - Nếu không paid → hiện 2 nhánh lựa chọn cho khách:

**Nhánh A — "Chưa CK":**
→ Quay lại `/services`

**Nhánh B — "Tôi đã CK":**
→ Hiện form điền: số tiền đã CK + nội dung CK (tùy chọn)
→ POST `/api/payment/claim-transfer` `{ orderId, amount?, transferContent? }`
→ Server lưu `claimedAt` + `claimInfo` vào Order, gửi `sendCustomerClaimAlert()` vào Telegram admin
→ Hiện màn xác nhận: "✅ Đã ghi nhận! Admin sẽ xác nhận trong 30 phút. Kiểm tra email sau ít phút."

## BƯỚC 5 — SePay Webhook (backend, tự động)

`POST /api/payment/sepay-webhook` — được gọi bởi SePay khi có tiền vào TK

### Logic xử lý

1. Verify `Authorization: Apikey {SEPAY_API_KEY}`
2. Bỏ qua nếu `transferType !== 'in'` (chỉ xử lý tiền vào)
3. Bỏ qua nếu không có `code` trong content chuyển khoản
4. **Dedup**: kiểm tra `sepayTxnId` đã tồn tại → bỏ qua nếu đã xử lý
5. Tìm order có `transferCode === code` và `paymentStatus === 'unpaid'`
   - Nếu **không tìm thấy order** khớp → `sendUnmatchedPaymentAlert()` (fire-and-forget) → trả 200
6. Kiểm tra số tiền: nếu thiếu → `sendUnderpaymentAlert()` + vẫn xử lý (policy: chấp nhận, xử lý thủ công sau)
7. Update order: `paymentStatus = 'paid'`, `paidAt`, `sepayTxnId`, `status = 'processing'`
8. Gọi `createReportJob(order)` — có full error recovery (atomic lock, token, sweep, email retry)
9. Update order: lưu `jobId`
10. `sendPaymentReceivedNotification()` (fire-and-forget) — thông báo vào Telegram group
11. **Luôn trả 200** — nếu trả non-200 thì SePay retry Fibonacci lên đến 7 lần trong 5 giờ

## BƯỚC 6 — Trang /processing

- Poll `/api/job/{jobId}` mỗi **2 giây**
- Hiển thị progress bar + bước hiện tại:

| Progress | Bước |
|---------|------|
| 5% | Tính toán bản đồ sao |
| 15% | Phân tích cung hoàng đạo |
| 18–85% | Vũ trụ đang biên soạn luận giải (AI streaming) |
| 90% | Tạo file PDF |
| 95% | Gửi email |
| 100% | Hoàn thành → redirect `/success?jobId=...&service=...&name=...` sau 2s |

- **"Có thể đóng trang"**: job chạy server-side, email tự gửi khi xong dù khách đóng tab
- Nút **"Đóng & về lịch sử"** → `/profile?tab=history`
- Nút **"Hủy báo cáo"** → confirm dialog → gọi `DELETE /api/job/{jobId}` → về /services
- **Frozen detection**: nếu progress không thay đổi >90s → hiện cảnh báo nhẹ "Đang kiểm tra kết nối..."

### failCount banner (kết nối không ổn định)

Mỗi lần poll fail → `failCount++`:
- `failCount` 1–3: silent
- `failCount` 4–10: `statusBanner` = "⏳ Đang kết nối lại..."
- `failCount` ≥ 11: `statusBanner` = "⚠️ Kết nối không ổn định..."

### Force redirect khi progress stuck ở 100%

Nếu `progress >= 100 && status === 'processing'` kéo dài > 5 giây → frontend tự redirect `/success?jobId=...&service=...&name=...` mà không cần chờ status chuyển thành `done`. Đây là safety net phòng trường hợp job update không kịp hoặc race condition.

## BƯỚC 7 — Pipeline tạo báo cáo (backend)

`processReport()` trong `src/lib/astrology/reportProcessor.ts`

### Các bước

```
1. calculateChart(dob, tob, lat, lon, tz)        → bản đồ natal (Swiss Ephemeris)
2. getKnowledgeFromDB()                           → load KB từ PostgreSQL
3. Build prompt (theo dịch vụ — xem chi tiết dưới)
4. generateEssayStreaming(AI)                      → Claude Sonnet 4.6 via OpenRouter
   - max_tokens: 32.000
   - Retry tối đa 3 lần nội bộ (ECONNRESET/StreamInterrupted)
   - Retry thêm 3 lần nếu output quá ngắn (MIN_CHARS)
5. generatePdf(essayText, ...)                    → puppeteer + @sparticuz/chromium
6. Lưu PDF: /var/hgct/pdfs/{id}.pdf
7. sendReportEmail(email, name, service, pdfBuffer) → Hostinger SMTP 465 SSL
8. updateJob(done, 100%)
9. Update order.status = 'completed'
10. sendOrderNotification() → Telegram (fire-and-forget, ~35s sau)
```

### Khác nhau giữa các dịch vụ

| Dịch vụ | Đặc điểm riêng |
|---------|---------------|
| Hướng Nghiệp | Prompt từ career logic blocks (4 blocks KB-driven) |
| Tình Duyên | Prompt từ love logic blocks |
| **Cặp Đôi** | Tính 2 bản đồ sao, build synastry prompt 2 người; MIN_CHARS = 10.000; PDF cover có tên cả 2 |
| **Vận Hạn** | Cần startDate + endDate; tính transit planets; MIN_CHARS = 12.000; output dài nhất ~22.000–28.000 chars |

### Ngưỡng độ dài tối thiểu (MIN_CHARS)

| Dịch vụ | MIN | EXPECTED |
|---------|-----|---------|
| career | 4.000 | 9.000 |
| love | 4.000 | 9.000 |
| synastry | 10.000 | 22.000 |
| transit | 12.000 | 28.000 |

## BƯỚC 8 — Trang /success

Kiến trúc: `Suspense` wrapper + `SuccessInner` component + `useSearchParams`.

### Fallback chain để lấy dữ liệu báo cáo

1. **sessionStorage `reportResult`** — nếu vừa hoàn thành và vẫn còn trong session
2. **URL params `?jobId=...&service=...&name=...`** — được truyền từ `/processing` khi redirect
3. **Fetch `/api/job/{jobId}`** — gọi API để lấy kết quả job từ DB
4. **Fallback cuối** — nếu không có gì: hiện "📬 Báo cáo đang được gửi. Kiểm tra email hoặc vào Lịch sử đơn hàng"

### Hiển thị

- Tên dịch vụ + xác nhận đã gửi email
- Nút **"↓ Tải PDF về máy"** (download trực tiếp từ `/api/pdf/{id}`)
- Nếu email chưa gửi xong: hiện "⏳ Đang gửi file..."
- Nếu đã gửi: hiện "📬 File đã được gửi đến hộp thư"
- Hộp hỗ trợ: sau 10 phút chưa nhận → kiểm tra Spam, hoặc liên hệ:
  - Email: support@hatgiongchiemtinh.com
  - Zalo: zalo.me/hatgiongchiemtinh
  - Messenger: m.me/hatgiongchiemtinh
  - Hỗ trợ 8:00–22:00, phản hồi trong 30 phút

## EMAIL NHẬN VỀ

### Nội dung

- From: `noreply@hatgiongchiemtinh.com` (Hostinger SMTP)
- Subject: tên dịch vụ + tên khách
- Body: HTML template với greeting, mô tả dịch vụ
- **Đính kèm**: file PDF (`{service}_{tên}_{ngàytháng}.pdf`)

### Tên file PDF (ví dụ)

- Career: `Luận_giải_Hướng_Nghiệp_-_Nguyễn_Văn_A_-_Th03_2026.pdf`
- Synastry: `Luận_giải_Cặp_Đôi_-_Nguyễn_Văn_A_&_Trần_Thị_B_-_Th03_2026.pdf`

### Lưu trữ PDF

- Server: `/var/hgct/pdfs/{id}.pdf` (persistent, không mất khi deploy)
- Truy cập qua: `/api/pdf/{id}?filename={tên}` — có thể dùng để chia sẻ hoặc tải lại

---

## XỬ LÝ LỖI

### Lỗi 1 — AI generation thất bại hoặc output quá ngắn

**Nguyên nhân thường gặp:**
- ECONNRESET / stream bị ngắt giữa chừng
- OR server trả `[DONE]` sớm
- Output thiếu nội dung (< MIN_CHARS)

**Hệ thống tự xử lý:**
1. `generateEssayStreaming` retry nội bộ 3 lần (4–8–12s delay)
2. Nếu vẫn thiếu chars: loop retry thêm 3 lần ở tầng `processReport`
3. Nếu hết 3 lần ngoài vẫn fail → throw Error → vào Recovery flow

### Lỗi 2 — PDF generation fail / Email fail

- PDF fail: job throw error → Recovery flow
- Email fail: **KHÔNG** throw error, job vẫn `done` — log error, `emailSent = false`
  - Khách thấy "⏳ Đang gửi file..." trên /success
  - PDF vẫn tải được từ nút download

### Lỗi 3 — Frozen job (không có progress >90s)

- Xảy ra khi AI đang xử lý lâu bình thường, không phải lỗi thật
- /processing hiện cảnh báo nhẹ: "Đang kiểm tra kết nối — hệ thống sẽ tự khôi phục..."
- Không làm gì thêm, chờ tiếp

---

## HỆ THỐNG RECOVERY (khi job thực sự fail)

### `smartRetryOrder()` — Centralized retry logic

**File:** `src/lib/smart-retry.ts`

```
smartRetryOrder(orderId, triggeredBy: 'watchdog' | 'admin' | 'customer'): SmartRetryResult
```

Được dùng bởi: watchdog, admin bot (`o_retry_N`), `/api/recover`.

**4 outcomes có thể xảy ra:**

| Outcome | Điều kiện | Hành động |
|---------|-----------|-----------|
| `skipped` | Order không ở trạng thái retryable (đang locked, race condition) | Không làm gì |
| `pdfResent` | PDF đã có trên disk tại `/var/hgct/pdfs/{id}.pdf` | Chỉ resend email, không re-generate |
| `quotaExceeded` | `retryCount >= 3` và `triggeredBy !== 'admin'` | Gửi email recovery cho khách, gửi admin alert |
| `retrying` | Đủ điều kiện retry | Atomic lock → `createReportJob()` full pipeline |

**Khi admin trigger:** Luôn reset `retryCount = 0` trước khi gọi → bypass quota limit.

**`resolvePdfPath(pdfUrl)`** — helper tính đường dẫn file từ URL dạng `/api/pdf/{id}?filename=...`.

### Cơ chế tự động (Recovery lần 1 — khách không biết)

1. Job fail → `processReport` catch error
2. Nếu có `orderId`: generate `recoveryToken` (8 ký tự uppercase), lưu vào `order.recoveryToken`
3. Update `order.status = 'failed'`
4. **Gửi recovery email** với token + link (chỉ từ lần retry thứ 2 trở đi — lần 1 xử lý tự động)
5. `/processing` phát hiện job error:
   - Nếu `autoRetry = true` và chưa auto-retry lần này → **silent redirect** sang `/recover?token=...&auto=1`
   - `/recover` tự submit token → `smartRetryOrder(id, 'customer')` → tạo job mới → redirect sang `/processing` mới
   - Khách vẫn đang ngồi nhìn màn hình — không thấy lỗi gì

### Cơ chế thủ công (Recovery lần 2+ — khách thấy)

Khi auto-retry cũng fail, /processing hiện màn lỗi với:

```
⚠ Có lỗi xảy ra
[thông báo lỗi]

┌──────────────────────────────────┐
│ Mã khôi phục của bạn             │
│                                  │
│      ABC12345                    │
│                                  │
│ Chúng tôi đã gửi link khôi       │
│ phục vào email. Dùng mã này      │
│ tại /recover để thử lại.         │
└──────────────────────────────────┘

[Khôi phục ngay →]   [Liên hệ hỗ trợ]
```

**Email recovery gửi đến khách chứa:**
- Token 8 ký tự (to, nổi bật)
- Link trực tiếp: `https://hatgiongchiemtinh.com/recover?token=ABC12345`
- Khách click link → auto-submit → tạo job mới → về /processing

### Trang /recover

- URL: `/recover` hoặc `/recover?token=ABC12345`
- Nếu có token trong URL → tự động submit (auto=1)
- Nếu không → hiện ô nhập 8 ký tự (uppercase, monospace, to)
- Submit → `POST /api/recover`

### API /api/recover

| Trường hợp | Phản hồi |
|-----------|---------|
| Token không tồn tại | 404 "Không tìm thấy đơn hàng" |
| Order đã completed | "Báo cáo đã hoàn thành! Kiểm tra email." |
| Order đang retrying/processing | Redirect về /processing với jobId hiện tại |
| `smartRetryOrder` → `quotaExceeded` | 429 "Vui lòng liên hệ hỗ trợ" |
| `smartRetryOrder` → `pdfResent` | Email được gửi lại → redirect /success |
| `smartRetryOrder` → `retrying` | Tạo job mới → redirect /processing |

**Atomic lock**: dùng `updateMany({ where: { status: 'failed' } })` để tránh 2 request cùng trigger 1 recovery. Nếu thua race condition → trả "đang xử lý".

**Max retries**: 3 lần. Sau đó cần **can thiệp thủ công** qua admin bot hoặc DB.

### Job Watchdog (tự động kiểm tra định kỳ)

**File:** `src/lib/job-watchdog.ts`

- Khởi động **30 giây** sau khi server boot, chạy lại **mỗi 2 phút**
- Kiểm tra in-memory jobs theo `lastActivity`:

| Dịch vụ | Ngưỡng stuck |
|---------|-------------|
| career / love | 12 phút |
| synastry / transit | 20 phút |

- Job stuck → gọi `smartRetryOrder(id, 'watchdog')`
- Kết quả watchdog: gửi `sendAdminAlert()` vào Telegram group cho các case: `quotaExceeded`, `pdfResent`, `retrying`, `emailFail`

**Bổ sung — check email chưa gửi:**
- Orders `status='completed'`, `emailSent=false`, `completedAt > 5 phút trước` → resend email → alert admin nếu fail lần nữa

### sweepPaidPendingOrders (startup sweep)

**File:** `src/lib/jobs.ts`

Chạy ngay khi server khởi động (sau `sweepStuckJobsOnce`).

- Tìm orders: `paymentStatus='paid'`, `status='pending'`, `jobId=null`
- Tự động start job cho từng order → gọi `createReportJob(order)`
- Đây là safety net: phòng trường hợp webhook nhận tiền thành công nhưng server crash trước khi tạo được job

### Claim Transfer flow (khách tự báo đã CK)

**File:** `src/app/api/payment/claim-transfer/route.ts`

1. Khách điền form trên trang `/payment` sau khi countdown hết (chọn "Tôi đã CK")
2. `POST /api/payment/claim-transfer` `{ orderId, amount?, transferContent? }`
3. Server: lưu `claimedAt = now`, `claimInfo = { amount, transferContent }` vào Order
4. `sendCustomerClaimAlert()` → Telegram group với nút "✅ Mark Paid #N"
5. Admin xem thông báo, xác minh thủ công → bấm nút → `o_pay_N` → webhook admin bot xử lý

### Khi nào cần can thiệp thủ công

1. `retryCount >= 3` (non-admin) → khách thấy "Vui lòng liên hệ hỗ trợ" → admin dùng bot bấm `🔄 Retry ngay` (reset retryCount=0, bypass quota)
2. Order kẹt ở status `retrying` lâu (sweep tự reset về `failed` sau timeout, nhưng nếu sweep chưa chạy)
3. PDF sinh ra nhưng email không gửi được liên tục → watchdog alert → admin forward thủ công
4. Underpayment: webhook gửi `sendUnderpaymentAlert()` — admin confirm thủ công
5. Claim transfer: khách báo đã CK nhưng webhook chưa nhận → admin verify + bấm Mark Paid

**Cách can thiệp thủ công qua admin bot:**
- Admin bot → Orders → Đơn lỗi → `[🔄 Retry ngay #N]` (reset retryCount=0, dùng smartRetryOrder với 'admin')
- Hoặc trực tiếp: `/pay <orderId>` để mark paid và tạo báo cáo

---

## ĐIỂM LƯU Ý VẬN HÀNH

- **Giá dịch vụ**: đọc real-time từ DB (`config` table, keys `price_career/love/synastry/transit`) → thay đổi qua Telegram bot `/setprice` không cần rebuild
- **Email spam**: hay vào Spam/Junk với Gmail — hướng dẫn khách kiểm tra ngay từ /success
- **Vận Hạn chậm nhất**: ETA thực tế 8–15 phút (AI output ~22.000–28.000 chars)
- **PDF không mất**: lưu tại `/var/hgct/pdfs/` persistent, có thể tải lại qua `/api/pdf/{id}` bất kỳ lúc nào
- **Free user timeout 15 phút**: nếu khách không chuyển khoản trong 15 phút → countdown hết → 2 nhánh (Chưa CK / Đã CK). Order vẫn còn trong DB với status `pending` — không tự xóa.
- **SePay retry**: nếu webhook nhận lỗi, SePay tự retry theo Fibonacci (tối đa 7 lần / 5 giờ). Webhook luôn trả 200 để tránh bị retry vô ích.
- **sweepPaidPendingOrders**: khi server restart, tự tìm orders `paid+pending+jobId=null` và start job — đề phòng server crash giữa chừng sau khi nhận tiền.
- **Job Watchdog**: chạy ngầm mỗi 2 phút, tự phát hiện job stuck (>12p career/love, >20p synastry/transit) và retry. Admin nhận alert qua Telegram.
- **Claim transfer**: khách có thể tự báo đã CK sau khi countdown hết → admin nhận alert + xác nhận thủ công trong 30 phút.
- **OR fee delays**: [8s/12s/18s] — front-loaded để lấy OR fee sớm hơn khi report xong nhanh.
