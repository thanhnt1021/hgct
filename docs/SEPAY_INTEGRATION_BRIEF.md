# PROMPT: Tích hợp SePay thanh toán cho Hạt Giống Chiêm Tinh

> **Dán prompt này vào Claude CLI trong thư mục dự án `~/hgct`**

---

## MỤC TIÊU

Tích hợp SePay (cổng thanh toán QR chuyển khoản ngân hàng) vào hatgiongchiemtinh.com để free user có thể thanh toán per-order và nhận báo cáo tự động. Hiện tại chỉ premium user mới tạo được report — sau khi tích hợp, free user thanh toán xong → hệ thống tự tạo report + gửi email.

---

## KIẾN TRÚC HIỆN TẠI (ĐỌC KỸ TRƯỚC KHI CODE)

### Tech Stack
- Next.js 15.2.3 (App Router), React 19, TypeScript
- PostgreSQL + Prisma v5
- VPS self-hosted, domain `hatgiongchiemtinh.com`, port 65498
- nginx reverse proxy, HTTPS via Certbot

### Luồng hiện tại cho FREE user (CHƯA HOẠT ĐỘNG)
```
/services → /input → /checkout → /payment → bấm "Tôi đã chuyển khoản" → DỪNG (không tạo report)
```
- `/payment` hiển thị placeholder QR (ô dashed), thông tin bank tĩnh, mã CK random `HGCTxxxxxx`
- Nút "Tôi đã chuyển khoản" chỉ set state `confirmed = true`, không gọi API

### Luồng hiện tại cho PREMIUM user (ĐANG HOẠT ĐỘNG)
```
/services → /input → /checkout → bấm "Tạo báo cáo" → POST /api/astrology/report → /processing → /success
```
- Bypass `/payment` hoàn toàn
- `POST /api/astrology/report` — guard `isPremium === true`
- Trả `{ jobId }` → redirect `/processing?job=...` → poll `GET /api/job/{jobId}` → `/success`

### Database Schema hiện tại

**Bảng `orders`:**
```prisma
model Order {
  id          Int      @id @default(autoincrement())
  userUid     String?  @map("user_uid")
  service     String
  profileData Json     @map("profile_data")
  email       String
  status      String   @default("pending")    // "pending"|"completed"
  pdfUrl      String?  @map("pdf_url")
  createdAt   DateTime @default(now()) @map("created_at")
  @@map("orders")
}
```

**Bảng `jobs`:** (có id UUID, status, progress, label, result JSON, error, userUid, service, name, email, profileUidA, profileUidB, createdAt)

**Bảng `users`:** (có userUid, isPremium, planType "free"|"premium"|"lifetime", premiumToken)

### Giá dịch vụ
```typescript
const SERVICE_PRICES: Record<string, string> = {
  career: '99.000', love: '99.000', synastry: '149.000', transit: '149.000'
}
```

### API hiện tại
- `POST /api/astrology/report` — tạo report (chỉ premium)
- `GET /api/job/{jobId}` — poll trạng thái
- `POST /api/payment/confirm` — **PLACEHOLDER**, chỉ return `{ success: true }`, không làm gì

### Frontend data flow
- `sessionStorage` truyền data giữa các trang: `selectedService`, `inputData`, `inputDataB`, `profileUidA`, `profileUidB`, `transitStartDate`, `transitEndDate`, `paymentEmail`

---

## CÁCH SEPAY HOẠT ĐỘNG (ĐÃ RESEARCH)

### 1. QR Code — Dùng URL nhúng trực tiếp (KHÔNG cần API call)

SePay cung cấp URL tạo QR động, nhúng bằng thẻ `<img>`:

```
https://qr.sepay.vn/img?acc={SO_TAI_KHOAN}&bank={NGAN_HANG}&amount={SO_TIEN}&des={NOI_DUNG}
```

- `acc` (bắt buộc): Số tài khoản ngân hàng
- `bank` (bắt buộc): Tên ngân hàng (danh sách tại https://qr.sepay.vn/banks.json — ví dụ: `MBBank`)
- `amount` (optional): Số tiền (integer, không dấu chấm — ví dụ: `99000`)
- `des` (optional): Nội dung chuyển khoản (URL encoded)

**Ví dụ:** `https://qr.sepay.vn/img?acc=0123456789&bank=MBBank&amount=99000&des=HGCT123456`

### 2. Webhook — SePay push POST request khi có giao dịch

Khi khách CK vào TK đã liên kết trên SePay → SePay POST webhook tới URL của mình.

**Payload webhook từ SePay:**
```json
{
  "id": 92704,                            // ID giao dịch trên SePay (dùng chống trùng)
  "gateway": "MBBank",                    // Tên ngân hàng
  "transactionDate": "2023-03-25 14:02:37",
  "accountNumber": "0123456789",          // Số TK nhận
  "code": "HGCT123456",                   // Mã thanh toán (SePay tự nhận diện từ nội dung CK)
  "content": "HGCT123456 chuyen tien",    // Nội dung CK đầy đủ
  "transferType": "in",                   // "in" = tiền vào
  "transferAmount": 99000,                // Số tiền
  "accumulated": 19077000,                // Số dư
  "subAccount": null,
  "referenceCode": "MBVCB.3278907687",
  "description": ""
}
```

**Trường quan trọng nhất: `code`** — SePay tự nhận diện mã thanh toán từ nội dung CK dựa vào cấu hình "Cấu trúc mã thanh toán" trên dashboard SePay.

### 3. Xác thực webhook — API Key

SePay gửi header: `"Authorization": "Apikey {YOUR_API_KEY}"`

Website cần verify header này trước khi xử lý.

### 4. Response cho SePay (để SePay mark thành công)

```json
// HTTP Status: 200 hoặc 201
{ "success": true }
```

Nếu response không đúng format → SePay coi là thất bại → retry theo Fibonacci (tối đa 7 lần, 5 giờ).

### 5. Chống trùng lặp

Dùng trường `id` (transaction ID trên SePay) để deduplicate. Lưu lại các `id` đã xử lý.

### 6. Cấu hình mã thanh toán trên SePay Dashboard

Tại **Công ty → Cấu hình chung → Cấu trúc mã thanh toán**:
- Tiền tố: `HGCT` (4 ký tự chữ)
- Hậu tố: 6 ký tự, Số nguyên

→ SePay sẽ nhận diện `HGCT123456` trong nội dung CK và trả về trường `code`.

### 7. Sandbox/Dev

Đăng ký tài khoản dev tại `my.dev.sepay.vn` để giả lập giao dịch test webhook.

---

## LUỒNG MỤC TIÊU SAU TÍCH HỢP

### Free user thanh toán per-order:
```
/checkout (nhập email, xem tóm tắt)
  → bấm "Thanh toán"
  → POST /api/payment/create-order (tạo Order trong DB, trả orderId + transferCode)
  → redirect /payment?orderId=xxx
  → /payment hiển thị:
     - QR SePay thật (img tag nhúng URL qr.sepay.vn với amount + des=transferCode)
     - Thông tin bank thật (từ env vars)
     - Mã CK: transferCode (HGCT + 6 số = orderId padded)
     - Countdown / polling trạng thái
  → Frontend poll GET /api/payment/status?orderId=xxx mỗi 3s
  → Khi SePay webhook confirm:
     - Backend match transferCode → update Order status = "paid"
     - Backend tạo report (gọi processReport)
     - Backend tạo Job record
  → Frontend poll thấy status="paid" + jobId
     → redirect /processing?job=xxx
  → /processing poll job status
  → /success
```

### Premium/Lifetime user: GIỮ NGUYÊN flow hiện tại, không thay đổi gì.

---

## IMPLEMENTATION PLAN — THỰC HIỆN THEO THỨ TỰ

### PHASE 1: Database Migration

**Sửa `prisma/schema.prisma` — thêm fields vào Order model:**
```prisma
model Order {
  id            Int       @id @default(autoincrement())
  userUid       String?   @map("user_uid")
  service       String
  profileData   Json      @map("profile_data")
  email         String
  status        String    @default("pending")       // "pending"|"paid"|"processing"|"completed"|"expired"
  pdfUrl        String?   @map("pdf_url")
  createdAt     DateTime  @default(now()) @map("created_at")

  // === THÊM MỚI cho SePay ===
  transferCode  String?   @unique @map("transfer_code")   // "HGCT000123"
  amount        Int?                                       // 99000 (VND, integer)
  paymentStatus String    @default("unpaid") @map("payment_status")  // "unpaid"|"paid"|"expired"
  paidAt        DateTime? @map("paid_at")
  sepayTxnId    Int?      @unique @map("sepay_txn_id")    // id từ SePay webhook, chống trùng
  jobId         String?   @map("job_id")                   // link tới Job sau khi tạo report

  // === INPUT DATA cho synastry/transit ===
  profileDataB  Json?     @map("profile_data_b")
  profileUidA   String?   @map("profile_uid_a")
  profileUidB   String?   @map("profile_uid_b")
  startDate     String?   @map("start_date")
  endDate       String?   @map("end_date")

  @@map("orders")
}
```

Chạy: `npx prisma migrate dev --name add_sepay_payment_fields`

### PHASE 2: Environment Variables

Thêm vào `.env`:
```env
# SePay Configuration
SEPAY_API_KEY=xxx                    # API Key tạo trên SePay dashboard (dùng verify webhook)
BANK_ACCOUNT_NUMBER=xxx              # Số TK ngân hàng thật
BANK_ACCOUNT_NAME=HAT GIONG CHIEM TINH   # Tên chủ TK
BANK_NAME=MBBank                     # Tên ngân hàng (đúng format SePay: MBBank, Vietcombank, etc.)
```

**HỎI USER:** "Cho tao biết số TK ngân hàng, tên chủ TK, tên ngân hàng (format SePay), và API Key từ SePay dashboard để điền env vars."

### PHASE 3: Backend APIs

#### 3a. `POST /api/payment/create-order` (TẠO MỚI)

File: `src/app/api/payment/create-order/route.ts`

Logic:
1. Nhận body: `{ service, inputData, email, inputDataB?, profileUidA?, profileUidB?, startDate?, endDate? }`
2. Validate service có trong SERVICE_PRICES
3. Parse amount từ SERVICE_PRICES (remove dấu chấm, parseInt → 99000)
4. Tạo Order record trong DB với status="pending", paymentStatus="unpaid"
5. Tạo transferCode = `"HGCT" + orderId.toString().padStart(6, '0')` → ví dụ order id 123 → `HGCT000123`
6. Update order với transferCode + amount
7. Return `{ orderId, transferCode, amount, bankAccount, bankName, bankAccountName }`

**KHÔNG cần auth** — free user (guest hoặc logged-in) đều dùng được.

#### 3b. `POST /api/payment/sepay-webhook` (TẠO MỚI)

File: `src/app/api/payment/sepay-webhook/route.ts`

Logic:
1. **Verify auth:** Kiểm tra header `Authorization` === `Apikey ${process.env.SEPAY_API_KEY}`. Nếu sai → return 401.
2. **Parse body:** Lấy `{ id, code, transferType, transferAmount, content, gateway, transactionDate, referenceCode, accountNumber }`
3. **Filter:** Chỉ xử lý `transferType === "in"` (tiền vào). Nếu không → return `{ success: true }` (ignore).
4. **Chống trùng:** Kiểm tra `sepayTxnId` đã tồn tại trong DB chưa. Nếu rồi → return `{ success: true }`.
5. **Match order:** Tìm Order theo `transferCode === code` VÀ `paymentStatus === "unpaid"`.
   - Nếu không tìm thấy → log warning, return `{ success: true }` (không block SePay).
6. **Verify amount:** Kiểm tra `transferAmount >= order.amount`. Nếu thiếu → log warning nhưng vẫn xử lý (hoặc skip tùy policy).
7. **Update order:**
   ```
   order.paymentStatus = "paid"
   order.paidAt = new Date()
   order.sepayTxnId = id (từ SePay)
   order.status = "processing"
   ```
8. **Tạo report:** Gọi logic tương tự `POST /api/astrology/report` — tạo Job record, fire-and-forget `processReport()` với data từ order.
9. **Update order.jobId** = job.id
10. **Return:** `{ success: true }` (HTTP 200)

**QUAN TRỌNG:**
- Route này PHẢI export dynamic config để Next.js không cache: `export const dynamic = 'force-dynamic'`
- Parse body bằng `request.json()` (không dùng form data)
- Wrap toàn bộ trong try-catch, luôn return `{ success: true }` với HTTP 200 để tránh SePay retry vô hạn

#### 3c. `GET /api/payment/status` (TẠO MỚI)

File: `src/app/api/payment/status/route.ts`

Logic:
1. Nhận query param `orderId`
2. Tìm Order theo id
3. Return `{ paymentStatus, jobId, status }` — frontend dùng để biết đã paid chưa + có jobId chưa

#### 3d. SỬA `POST /api/astrology/report`

File: `src/app/api/astrology/report/route.ts`

**Thêm logic bypass isPremium guard:**
- Nếu request có `orderId` + order đó có `paymentStatus === "paid"` → cho phép tạo report mà KHÔNG cần isPremium
- Giữ nguyên flow cũ cho premium user (không phá gì)

**HOẶC** (đơn giản hơn): Webhook handler ở 3b tự gọi `processReport()` trực tiếp, KHÔNG đi qua API route. Cách này tốt hơn vì:
- Không cần sửa guard của report API
- Webhook handler có full control
- Tách biệt flow paid vs premium

→ **CHỌN CÁCH NÀY: webhook handler gọi processReport() trực tiếp.**

Cần: Extract function `processReport()` thành util/service riêng nếu chưa có, để cả report route và webhook handler đều gọi được.

### PHASE 4: Frontend

#### 4a. SỬA `/checkout` page

File: `src/app/checkout/page.tsx`

- Khi free user bấm nút thanh toán:
  1. POST `/api/payment/create-order` với data từ sessionStorage
  2. Nhận response `{ orderId, transferCode, amount, ... }`
  3. Lưu `orderId` vào sessionStorage
  4. Redirect → `/payment?orderId=${orderId}`

#### 4b. SỬA `/payment` page

File: `src/app/payment/page.tsx`

**Thay thế hoàn toàn nội dung hiện tại:**

1. Đọc `orderId` từ URL search params
2. GET `/api/payment/status?orderId=xxx` để lấy thông tin order
3. Hiển thị:
   - **QR Code thật:** `<img src="https://qr.sepay.vn/img?acc=${BANK_ACCOUNT}&bank=${BANK_NAME}&amount=${amount}&des=${transferCode}" />`
   - **Thông tin CK:**
     - Ngân hàng: {bankName}
     - Số TK: {bankAccount}
     - Chủ TK: {bankAccountName}
     - Số tiền: {amount formatted} VND
     - Nội dung CK: **{transferCode}** (highlight, copy button)
   - **Trạng thái:** "Đang chờ thanh toán..."
4. **Polling:** Mỗi 3 giây, GET `/api/payment/status?orderId=xxx`
   - Nếu `paymentStatus === "paid"` VÀ có `jobId`:
     - Hiển thị "Thanh toán thành công! Đang tạo báo cáo..."
     - Redirect → `/processing?job=${jobId}&service=${service}&name=${name}`
   - Nếu quá 15 phút → hiển thị "Hết thời gian, vui lòng thử lại"
5. **Giữ nút "Tôi đã chuyển khoản"** nhưng đổi thành: hiển thị message "Hệ thống sẽ tự động xác nhận khi nhận được tiền. Vui lòng chờ..." (không cần action gì)

#### 4c. Truyền bank info ra frontend

**Tạo API hoặc dùng env public:**

Option A: Trả bank info trong response của `/api/payment/create-order` (đã làm ở 3a) ✓

Option B: Dùng `NEXT_PUBLIC_` env vars cho bank info tĩnh.

→ **Chọn Option A** — bank info đi kèm order response, không expose env.

### PHASE 5: Config SePay Dashboard (USER LÀM TAY)

**Sau khi code xong, hướng dẫn user làm các bước này trên my.sepay.vn:**

#### Bước 1: Liên kết tài khoản ngân hàng
1. Đăng nhập https://my.sepay.vn
2. Menu **Tài khoản ngân hàng** → **Thêm tài khoản**
3. Chọn ngân hàng (MB Bank), nhập số TK
4. Làm theo hướng dẫn xác thực của SePay

#### Bước 2: Cấu hình mã thanh toán
1. Menu **Công ty** → **Cấu hình chung**
2. Mục **Cấu trúc mã thanh toán** → **Thêm**:
   - Tiền tố: `HGCT`
   - Hậu tố: `6 ký tự`, loại: `Số nguyên`
3. Lưu

#### Bước 3: Tạo Webhook
1. Menu **WebHooks** → **+ Thêm webhooks**
2. Điền:
   - **Tên:** `HGCT Payment`
   - **Sự kiện:** `Có tiền vào`
   - **Tài khoản:** Chọn TK đã liên kết
   - **Bỏ qua nếu không có code:** `Có` (quan trọng — chỉ nhận CK có mã HGCT)
   - **URL:** `https://hatgiongchiemtinh.com/api/payment/sepay-webhook`
   - **Là webhook xác thực thanh toán:** `Đúng`
   - **Gọi lại khi:** HTTP Status Code không 2xx
   - **Kiểu chứng thực:** `API Key`
   - **API Key:** Nhập key tự tạo (cùng giá trị với `SEPAY_API_KEY` trong .env)
   - **Content Type:** `application/json`
3. Bấm **Thêm**

#### Bước 4: Test với Sandbox (khuyến nghị)
1. Đăng ký tại https://my.dev.sepay.vn
2. Tạo webhook tương tự nhưng URL trỏ về server dev/staging
3. Menu **Giao dịch** → **Giả lập giao dịch** → test flow

---

## FILE MAP — TÓM TẮT

| Action | File |
|--------|------|
| SỬA schema | `prisma/schema.prisma` |
| TẠO migration | `npx prisma migrate dev --name add_sepay_payment_fields` |
| TẠO | `src/app/api/payment/create-order/route.ts` |
| TẠO | `src/app/api/payment/sepay-webhook/route.ts` |
| TẠO | `src/app/api/payment/status/route.ts` |
| SỬA | `src/app/payment/page.tsx` |
| SỬA | `src/app/checkout/page.tsx` |
| SỬA | `.env` (thêm SEPAY vars) |
| CÓ THỂ SỬA | `src/app/api/astrology/report/route.ts` (extract processReport nếu cần) |

---

## LƯU Ý QUAN TRỌNG

1. **KHÔNG phá flow premium hiện tại** — chỉ thêm flow mới cho free user per-order payment
2. **processReport()** — cần kiểm tra xem function này nằm ở đâu trong codebase, có thể reuse hay cần extract ra util
3. **nginx** — không cần sửa gì, webhook URL đã qua HTTPS + nginx proxy
4. **Error handling** — webhook handler LUÔN return `{ success: true }` HTTP 200 để tránh SePay retry liên tục. Log error internally.
5. **Idempotency** — dùng `sepayTxnId` unique constraint để chống duplicate processing
6. **transferCode format** — `HGCT` + 6 số = padded orderId. Ví dụ order #42 → `HGCT000042`. Đảm bảo match với cấu hình trên SePay dashboard (tiền tố HGCT, hậu tố 6 ký tự số nguyên).
7. **Amount** — lưu integer (99000, 149000), KHÔNG có dấu chấm. QR URL cũng dùng integer.

---

## BẮT ĐẦU

Đọc kỹ toàn bộ context trên. Sau đó:

1. **Khảo sát codebase** — tìm và đọc các file: `src/app/payment/page.tsx`, `src/app/checkout/page.tsx`, `src/app/api/payment/confirm/route.ts`, `src/app/api/astrology/report/route.ts`, `prisma/schema.prisma`, `.env`. Tìm function `processReport` nằm ở đâu.
2. **Hỏi tao** các thông tin cần thiết:
   - Số TK ngân hàng, tên chủ TK, tên ngân hàng (format SePay)
   - API Key cho webhook (tao tự tạo trên SePay dashboard)
   - Tao dùng SePay production hay sandbox trước?
3. **Triển khai theo thứ tự Phase 1 → 5**, mỗi phase xong thì confirm với tao trước khi qua phase tiếp.
4. Sau khi code xong, **hướng dẫn tao step-by-step** setup trên SePay dashboard (Phase 5).