# SePay Payment Integration — Implementation Guide

> **Mục đích:** Tài liệu đầy đủ về tích hợp SePay cho dự án HGCT (và bất kỳ dự án Next.js tương tự).
> Đọc file này là đủ để hiểu toàn bộ setup hiện tại, hoặc replicate sang dự án khác từ đầu.
> **Không chứa thông tin nhạy cảm** — chỉ có cấu trúc, vị trí file, và hướng dẫn.

---

## 1. Cách SePay hoạt động (tổng quan)

SePay là middleware theo dõi biến động số dư tài khoản ngân hàng và bắn webhook về server khi có giao dịch khớp.

```
Khách CK → Ngân hàng → SePay detect → POST webhook → Server xử lý → Tạo báo cáo
```

### 1a. QR Code — nhúng bằng `<img>` tag, không cần API call

SePay cung cấp URL tạo QR động:

```
https://qr.sepay.vn/img?acc={SO_TK}&bank={TEN_NH}&amount={SO_TIEN}&des={NOI_DUNG}
```

| Param | Bắt buộc | Ghi chú |
|-------|----------|---------|
| `acc` | ✅ | Số tài khoản ngân hàng (không có dấu cách) |
| `bank` | ✅ | Tên ngân hàng đúng format SePay: `TPBank`, `MBBank`, `Vietcombank`, `ACB`, `Techcombank`, `VietinBank`, `BIDV`, `VPBank`... — xem full list: `https://qr.sepay.vn/banks.json` |
| `amount` | optional | Số tiền nguyên (integer), không dấu chấm: `99000` không phải `99.000` |
| `des` | optional | Nội dung chuyển khoản (URL encoded) |

**Ví dụ URL:** `https://qr.sepay.vn/img?acc=62941624556&bank=TPBank&amount=2222&des=HGCT000042`

**Lưu ý:** KHÔNG dùng thêm param `&template=compact` — SePay không hỗ trợ, sẽ làm QR fail.

### 1b. Webhook — SePay POST về server khi có tiền vào

**Payload mẫu:**
```json
{
  "id": 92704,
  "gateway": "TPBank",
  "transactionDate": "2026-03-16 11:00:00",
  "accountNumber": "62941624556",
  "code": "HGCT000042",
  "content": "HGCT000042 chuyen tien",
  "transferType": "in",
  "transferAmount": 2222,
  "accumulated": 1000000,
  "subAccount": null,
  "referenceCode": "FT26075123456",
  "description": ""
}
```

**Trường quan trọng nhất: `code`** — SePay tự nhận diện từ nội dung CK theo cấu trúc mã đã cấu hình.
Nếu không nhận diện được mã (nội dung CK không khớp pattern) → `code` = null → SePay bỏ qua (nếu bật "Bỏ qua nếu không có code").

### 1c. Xác thực webhook

SePay gửi header: `Authorization: Apikey {YOUR_API_KEY}`

Server phải verify header này. Nếu sai → trả 401 (SePay sẽ không retry khi nhận 401).

### 1d. Response cho SePay

```json
{ "success": true }
```
HTTP 200 hoặc 201. Nếu không trả đúng format → SePay retry theo Fibonacci (tối đa 7 lần trong ~5 giờ).
**Luôn trả 200 + `{ success: true }` kể cả khi xử lý lỗi nội bộ** — để tránh bị retry liên tục.

---

## 2. Setup SePay Dashboard (my.sepay.vn)

### Bước 1: Liên kết tài khoản ngân hàng

`my.sepay.vn` → **Tài khoản ngân hàng** → **Thêm tài khoản** → chọn ngân hàng → nhập số TK → xác thực.

### Bước 2: Cấu hình mã thanh toán

`my.sepay.vn` → **Công ty** → **Cấu hình chung** → **Cấu trúc mã thanh toán** → **Thêm**:

| Field | Giá trị cho HGCT |
|-------|-----------------|
| Tiền tố | `HGCT` |
| Hậu tố | `6 ký tự`, loại: `Số nguyên` |

→ SePay sẽ nhận diện `HGCT000042` trong nội dung CK và đặt vào field `code` của webhook.

**⚠️ Quan trọng:** Format mã phải khớp chính xác với `transferCode` được gen ra trong code:
```typescript
// src/app/api/payment/create-order/route.ts
const transferCode = `HGCT${order.id.toString().padStart(6, '0')}`
// Order #42 → "HGCT000042"
```

### Bước 3: Tạo Webhook

`my.sepay.vn` → **WebHooks** → **+ Thêm webhooks**:

| Field | Giá trị |
|-------|---------|
| Tên | `HGCT Payment` (hoặc tên tùy ý) |
| Sự kiện | `Có tiền vào` |
| Tài khoản | Chọn TK đã liên kết ở Bước 1 |
| Bỏ qua nếu không có code | `Có` ← **quan trọng**: chỉ nhận webhook khi CK có mã HGCT |
| URL | `https://{DOMAIN}/api/payment/sepay-webhook` |
| Là webhook xác thực thanh toán | `Đúng` |
| Gọi lại khi | HTTP Status Code không 2xx |
| Kiểu chứng thực | `API Key` |
| API Key | Giá trị của `SEPAY_API_KEY` trong `.env.local` |
| Content Type | `application/json` |

**Lưu ý:** `SEPAY_API_KEY` là chuỗi tự tạo bất kỳ (ví dụ: `openssl rand -hex 20`). Điền cùng giá trị vào `.env.local` và SePay dashboard.

### Bước 4 (Optional): Test với dev.sepay.vn

Đăng ký tại `my.dev.sepay.vn` (sandbox riêng), setup tương tự, webhook URL trỏ về server test.
Dùng chức năng **Giao dịch → Giả lập giao dịch** để test mà không cần chuyển tiền thật.

---

## 3. File map — Vị trí các file

### Backend API routes (Next.js App Router)

| File | Route | Chức năng |
|------|-------|-----------|
| `src/app/api/payment/create-order/route.ts` | `POST /api/payment/create-order` | Tạo Order trong DB, gen transferCode, trả bank info |
| `src/app/api/payment/sepay-webhook/route.ts` | `POST /api/payment/sepay-webhook` | Nhận webhook SePay, verify, match order, trigger tạo báo cáo |
| `src/app/api/payment/status/route.ts` | `GET /api/payment/status?orderId=xxx` | Frontend poll để biết thanh toán thành công chưa |

### Frontend pages

| File | Route | Chức năng |
|------|-------|-----------|
| `src/app/checkout/page.tsx` | `/checkout` | Nhập email, xác nhận đơn → gọi create-order → redirect /payment |
| `src/app/payment/page.tsx` | `/payment?orderId=...` | Hiển thị QR, bank info, countdown, auto-poll → redirect /processing |

### Business logic

| File | Chức năng |
|------|-----------|
| `src/lib/astrology/reportProcessor.ts` | `processReport()` — extracted từ report/route.ts, dùng chung cho cả premium flow và SePay webhook |

### Database schema

```prisma
// prisma/schema.prisma — model Order
model Order {
  id            Int       @id @default(autoincrement())
  userUid       String?   @map("user_uid")
  service       String                            // "career"|"love"|"synastry"|"transit"
  profileData   Json      @map("profile_data")   // inputData của user (người A)
  email         String
  status        String    @default("pending")    // "pending"|"processing"|"completed"
  pdfUrl        String?   @map("pdf_url")
  createdAt     DateTime  @default(now())

  // SePay fields
  transferCode  String?   @unique @map("transfer_code")  // "HGCT000042"
  amount        Int?                                       // 99000 (VND integer)
  paymentStatus String    @default("unpaid") @map("payment_status")  // "unpaid"|"paid"
  paidAt        DateTime? @map("paid_at")
  sepayTxnId    Int?      @unique @map("sepay_txn_id")    // ID từ SePay, chống duplicate
  jobId         String?   @map("job_id")                  // UUID của Job sau khi tạo report

  // Extra data cho synastry/transit
  profileDataB  Json?     @map("profile_data_b")  // inputData người B (synastry)
  profileUidA   String?   @map("profile_uid_a")
  profileUidB   String?   @map("profile_uid_b")
  startDate     String?   @map("start_date")       // transit
  endDate       String?   @map("end_date")          // transit
}
```

---

## 4. Env vars cần thiết

Thêm vào `.env.local` **và** `/root/hgct-demo/.env.local` (nếu có demo):

```env
# SePay Payment Integration
SEPAY_API_KEY=          # Chuỗi tự tạo bất kỳ — phải khớp với SePay Dashboard → Webhook → API Key
BANK_ACCOUNT_NUMBER=    # Số TK ngân hàng đã liên kết trên SePay
BANK_ACCOUNT_NAME=      # Tên chủ TK (viết hoa, đúng như ngân hàng hiển thị)
BANK_NAME=              # Format SePay: TPBank / MBBank / Vietcombank / ACB / Techcombank...
```

**⚠️ Pitfall hay gặp — Demo environment:**

Script `deploy-demo-local.sh` **restore** `/root/hgct-demo/.env.local` sau khi build, nên nếu chỉ thêm vars vào `/root/hgct/.env.local` mà không thêm vào `/root/hgct-demo/.env.local` → demo sẽ không có vars → API trả về rỗng → QR không hiển thị, bank info hiện "—".

**Fix:** Luôn thêm SePay vars vào CẢ HAI file:
```bash
# /root/hgct/.env.local       ← production
# /root/hgct-demo/.env.local  ← demo
```

**⚠️ Pitfall — Production chưa restart:**

Sau khi deploy code mới, production chỉ nhận webhook nếu đã được restart với code mới. Nếu thêm webhook endpoint mới mà không restart → SePay nhận 404 → webhook mất (dù SePay retry, nhưng trễ). Luôn restart production sau deploy:
```bash
sudo systemctl restart hgct.service
```

---

## 5. Luồng dữ liệu đầy đủ

### 5a. Flow tạo đơn hàng (checkout → payment page)

```
/checkout (free user bấm "Tiến hành thanh toán")
  │
  ├─ POST /api/payment/create-order
  │    body: { service, inputData, email, inputDataB?, profileUidA?, profileUidB?, startDate?, endDate? }
  │    → Tạo Order trong DB (paymentStatus="unpaid")
  │    → Gen transferCode = "HGCT" + orderId.padStart(6, "0")
  │    → Return: { orderId, transferCode, amount, bankAccount, bankName, bankAccountName }
  │
  └─ redirect /payment?orderId=xxx&transferCode=HGCT000042&amount=99000&bankAccount=...&bankName=...&bankAccountName=...
```

**Lưu ý:** Bank info được truyền qua URL params (từ API response). Frontend KHÔNG đọc env vars trực tiếp (NEXT_PUBLIC_ không cần). Mọi thứ đều server-side.

### 5b. Hiển thị trang /payment

```typescript
// src/app/payment/page.tsx
const qrUrl = `https://qr.sepay.vn/img?acc=${bankAccount}&bank=${bankName}&amount=${amount}&des=${transferCode}`
// Render: <img src={qrUrl} />
```

**Không cần API call để lấy QR** — chỉ build URL và nhúng `<img>`.

### 5c. Webhook xử lý thanh toán

```
SePay POST /api/payment/sepay-webhook
  │
  ├─ 1. Verify: header "Authorization: Apikey {SEPAY_API_KEY}"
  ├─ 2. Filter: chỉ xử lý transferType === "in"
  ├─ 3. Dedup: kiểm tra sepayTxnId đã tồn tại chưa
  ├─ 4. Match: tìm Order có transferCode === code AND paymentStatus === "unpaid"
  ├─ 5. Update Order: paymentStatus="paid", paidAt, sepayTxnId
  ├─ 6. createJob(jobId) → processReport() [fire-and-forget]
  ├─ 7. Update Order: jobId = jobId mới tạo
  └─ 8. Return { success: true } HTTP 200 — LUÔN LUÔN, kể cả lỗi
```

### 5d. Frontend detect thanh toán thành công

```typescript
// src/app/payment/page.tsx
// Poll GET /api/payment/status?orderId=xxx mỗi 3 giây
if (data.paymentStatus === 'paid' && data.jobId) {
  // redirect /processing?job={jobId}&service=...&name=...
}
```

**Điều kiện redirect:** Phải có ĐỦ cả `paymentStatus === 'paid'` VÀ `jobId` (vì trong webhook, 2 thứ này được set ở 2 DB call khác nhau, có thể poll rơi vào giữa).

---

## 6. Pricing — Cách thay đổi giá

Giá được định nghĩa ở 1 chỗ duy nhất:

```typescript
// src/app/api/payment/create-order/route.ts
const SERVICE_AMOUNTS: Record<string, number> = {
  career: 99000,    // VND, integer, không dấu chấm
  love: 99000,
  synastry: 149000,
  transit: 149000,
}
```

Sau khi sửa → commit → deploy lại. Các order cũ không bị ảnh hưởng (amount được lưu vào DB khi tạo order).

---

## 7. Các vấn đề đã gặp & cách xử lý

### 7a. QR không hiển thị, bank info hiện "—"

**Nguyên nhân:** Env vars rỗng trong demo. Deploy script restore demo `.env.local` (cũ) sau khi build.

**Fix:** Thêm SePay vars vào `/root/hgct-demo/.env.local` (xem mục 4).

### 7b. Khách CK xong, web không tự chuyển trang (mobile)

**Nguyên nhân:** Mobile browser (iOS Safari đặc biệt) suspend JavaScript timer khi tab ở background. Khi user chuyển sang app ngân hàng → setInterval bị đóng băng → khi quay lại browser, cần 1 chu kỳ timer mới fire (~3–5 giây), user tưởng lỗi.

**Hiện trạng:** Đây là UX delay, không phải bug backend. Webhook vẫn fire và DB vẫn update đúng. Sau ~3–5 giây khi user quay lại tab, polling sẽ detect và redirect.

**Giải pháp tốt hơn (chưa implement):** Thêm `visibilitychange` event để poll ngay khi tab được focus lại:
```typescript
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') poll()
})
```

### 7c. Webhook hit production, order tạo ở demo

**Bối cảnh:** Production và demo dùng chung DB. Webhook SePay chỉ có 1 URL (production). Order tạo ở demo hay production đều vào cùng DB.

**Kết quả:** Webhook hit production → update DB → demo frontend poll thấy → hoạt động bình thường.

**Điều kiện:** Production phải đang chạy với code có webhook handler.

### 7d. Underpayment (khách CK thiếu tiền)

**Hiện tại:** Webhook handler log cảnh báo nhưng vẫn mark `paid` và tạo report (policy: chấp nhận, xử lý thủ công sau nếu cần).

```typescript
// src/app/api/payment/sepay-webhook/route.ts
if (order.amount && transferAmount < order.amount) {
  console.warn(`Underpayment: got ${transferAmount}, expected ${order.amount}`)
  // Vẫn tiếp tục xử lý
}
```

Nếu muốn strict hơn: return `OK()` sớm khi thiếu tiền, order giữ nguyên `unpaid`.

### 7e. Duplicate webhook (SePay retry)

**Xử lý:** Dùng `sepayTxnId` (unique constraint trong DB). Webhook handler check trước:
```typescript
const existing = await prisma.order.findFirst({ where: { sepayTxnId: txnId } })
if (existing) return OK() // Đã xử lý, bỏ qua
```

---

## 8. Kiểm tra nhanh sau khi setup

```bash
# Test webhook endpoint có sống không
curl -s -X POST https://{DOMAIN}/api/payment/sepay-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Apikey {SEPAY_API_KEY}" \
  -d '{"id":1,"gateway":"TPBank","transactionDate":"2026-01-01 00:00:00","accountNumber":"xxx","code":"HGCT000001","content":"HGCT000001","transferType":"in","transferAmount":99000,"accumulated":0,"subAccount":null,"referenceCode":"TEST","description":""}'
# Expected: {"success":true}

# Kiểm tra QR URL có load được không (dán vào browser)
# https://qr.sepay.vn/img?acc={BANK_ACCOUNT}&bank={BANK_NAME}&amount=99000&des=HGCT000001

# Kiểm tra order trong DB
psql -h localhost -U nguydev -d zodiacdb \
  -c "SELECT id, transfer_code, payment_status, paid_at, job_id FROM orders ORDER BY created_at DESC LIMIT 5;"
```

---

## 9. Áp dụng cho dự án khác

Checklist khi replicate sang dự án khác:

- [ ] Copy 3 API route files: `create-order`, `sepay-webhook`, `status`
- [ ] Copy `processReport` logic (hoặc tương đương) ra lib riêng để webhook handler dùng được
- [ ] Thêm fields SePay vào Order model trong schema (xem mục 3)
- [ ] Thêm 4 env vars (SEPAY_API_KEY, BANK_ACCOUNT_NUMBER, BANK_ACCOUNT_NAME, BANK_NAME)
- [ ] Update cả `.env.local` production lẫn demo
- [ ] Điều chỉnh `transferCode` prefix (đang là `HGCT`) cho khớp dự án mới
- [ ] Điều chỉnh `SERVICE_AMOUNTS` cho đúng giá
- [ ] Setup SePay dashboard: link bank → cấu hình mã → tạo webhook (xem mục 2)
- [ ] Thêm `visibilitychange` listener trên payment page để poll ngay khi user quay lại tab (UX mobile)
- [ ] Test bằng cách gọi curl test webhook (mục 8) trước khi live
