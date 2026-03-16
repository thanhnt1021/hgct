# SePay Payment Integration — Universal Guide

> **Dùng cho:** Bất kỳ dự án Next.js (App Router) nào cần tích hợp thanh toán QR chuyển khoản qua SePay.
> Đọc file này + `docs/SEPAY_INTEGRATION_BRIEF.md` trong project (nếu có) là đủ để implement và debug.

---

## 1. Cách SePay hoạt động

```
Khách quét QR / chuyển khoản → Ngân hàng → SePay detect → POST webhook → Server xử lý → Kích hoạt dịch vụ
```

**3 thứ cần nắm:**

| Thứ | Cách hoạt động |
|-----|---------------|
| **QR Code** | Nhúng `<img src="https://qr.sepay.vn/img?acc=...&bank=...&amount=...&des=...">` — không cần API call |
| **Webhook** | SePay POST JSON về server khi nhận giao dịch khớp mã. Field `code` chứa mã thanh toán đã nhận diện |
| **Xác thực** | SePay gửi header `Authorization: Apikey {key}` — server verify trước khi xử lý |

---

## 2. Setup SePay Dashboard (my.sepay.vn)

### Bước 1 — Liên kết tài khoản ngân hàng
`Tài khoản ngân hàng` → `Thêm tài khoản` → chọn ngân hàng → nhập số TK → xác thực.

### Bước 2 — Cấu hình mã thanh toán
`Công ty` → `Cấu hình chung` → `Cấu trúc mã thanh toán` → `Thêm`:
- **Tiền tố:** Prefix của project, ví dụ `HGCT`, `NCM`, `SHOP`... (3–5 ký tự chữ)
- **Hậu tố:** `6 ký tự`, loại `Số nguyên`

→ SePay nhận diện `PREFIX000042` trong nội dung CK → đặt vào field `code` của webhook.

### Bước 3 — Tạo Webhook
`WebHooks` → `+ Thêm webhooks`:

| Field | Giá trị |
|-------|---------|
| Sự kiện | `Có tiền vào` |
| Tài khoản | TK đã liên kết |
| Bỏ qua nếu không có code | **`Có`** ← bắt buộc |
| URL | `https://{domain}/api/payment/sepay-webhook` |
| Kiểu chứng thực | `API Key` |
| API Key | Chuỗi tự tạo — điền cùng giá trị vào `SEPAY_API_KEY` trong `.env` |
| Content Type | `application/json` |
| Gọi lại khi | HTTP Status Code không 2xx |

---

## 3. Env vars cần thêm

```env
SEPAY_API_KEY=          # Tự tạo bất kỳ (openssl rand -hex 20), điền khớp với SePay Dashboard
BANK_ACCOUNT_NUMBER=    # Số TK ngân hàng
BANK_ACCOUNT_NAME=      # Tên chủ TK (viết hoa)
BANK_NAME=              # Format SePay: TPBank / MBBank / Vietcombank / ACB / Techcombank...
                        # Xem full list: https://qr.sepay.vn/banks.json
```

**⚠️ Nếu có demo environment riêng:** Phải thêm vars vào file `.env` của demo, không chỉ production. Nếu deploy script restore file `.env` từ thư mục demo (khác production), vars sẽ bị ghi đè → QR trống.

---

## 4. File cần tạo (Next.js App Router)

### `POST /api/payment/create-order`

Nhận thông tin đơn hàng từ frontend → tạo record trong DB → gen mã CK → trả bank info.

```typescript
// Trả về cho frontend:
{
  orderId: number,
  transferCode: string,   // "PREFIX000042" — PHẢI khớp với cấu hình SePay dashboard
  amount: number,         // Integer VND, không dấu chấm
  bankAccount: process.env.BANK_ACCOUNT_NUMBER,
  bankName: process.env.BANK_NAME,
  bankAccountName: process.env.BANK_ACCOUNT_NAME,
}

// Gen mã: PREFIX + orderId padded
const transferCode = `${PREFIX}${order.id.toString().padStart(6, '0')}`
```

### `POST /api/payment/sepay-webhook`

```typescript
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  // 1. Verify API key
  const auth = request.headers.get('Authorization') || ''
  if (auth !== `Apikey ${process.env.SEPAY_API_KEY}`) {
    return Response.json({ success: false }, { status: 401 })
  }

  try {
    const { id: txnId, code, transferType, transferAmount } = await request.json()

    // 2. Chỉ xử lý tiền vào
    if (transferType !== 'in' || !code) return Response.json({ success: true })

    // 3. Chống duplicate
    const exists = await db.order.findFirst({ where: { sepayTxnId: txnId } })
    if (exists) return Response.json({ success: true })

    // 4. Match order
    const order = await db.order.findFirst({
      where: { transferCode: code, paymentStatus: 'unpaid' }
    })
    if (!order) return Response.json({ success: true })

    // 5. Mark paid + tạo job/trigger service
    await db.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'paid', paidAt: new Date(), sepayTxnId: txnId, status: 'processing' }
    })

    // 6. Trigger xử lý (fire-and-forget)
    triggerService(order).catch(console.error)

    return Response.json({ success: true })  // LUÔN trả 200 — kể cả khi lỗi nội bộ
  } catch (err) {
    console.error('[sepay-webhook]', err)
    return Response.json({ success: true })  // Vẫn 200 — tránh SePay retry vô hạn
  }
}
```

### `GET /api/payment/status?orderId=xxx`

Frontend dùng để poll:

```typescript
const order = await db.order.findUnique({
  where: { id: Number(orderId) },
  select: { paymentStatus: true, jobId: true, status: true }
})
return Response.json(order)
```

---

## 5. Frontend — Trang thanh toán

### Hiển thị QR

```tsx
// Bank info nhận từ URL params (truyền qua từ create-order response)
const qrUrl = `https://qr.sepay.vn/img?acc=${bankAccount}&bank=${bankName}&amount=${amount}&des=${transferCode}`

<img src={qrUrl} alt="QR thanh toán" width={200} height={200} />
```

**⚠️ KHÔNG dùng `&template=compact`** — SePay không hỗ trợ param này, làm QR fail.

### Poll thanh toán thành công

```typescript
// Poll mỗi 3 giây
const poll = async () => {
  const res = await fetch(`/api/payment/status?orderId=${orderId}`)
  const data = await res.json()
  if (data.paymentStatus === 'paid' && data.jobId) {
    // Redirect sang trang xử lý / success
    router.replace(`/processing?job=${data.jobId}`)
  }
}
useEffect(() => {
  const id = setInterval(poll, 3000)
  return () => clearInterval(id)
}, [])
```

**⚠️ Mobile UX — setInterval bị suspend khi tab background:**
Trên iOS Safari, khi user chuyển sang app ngân hàng, timer đóng băng. Khi quay lại, cần ~3–5s để poll tiếp. Thêm `visibilitychange` để poll ngay khi tab được focus lại:

```typescript
useEffect(() => {
  const onVisible = () => { if (document.visibilityState === 'visible') poll() }
  document.addEventListener('visibilitychange', onVisible)
  return () => document.removeEventListener('visibilitychange', onVisible)
}, [])
```

---

## 6. DB Schema — fields cần thêm vào Order model

```prisma
// Thêm vào model Order hiện có:
transferCode  String?   @unique @map("transfer_code")  // "PREFIX000042"
amount        Int?                                      // VND integer
paymentStatus String    @default("unpaid") @map("payment_status")
paidAt        DateTime? @map("paid_at")
sepayTxnId    Int?      @unique @map("sepay_txn_id")   // Chống duplicate webhook
jobId         String?   @map("job_id")                 // Link sang job xử lý (nếu có)
```

---

## 7. Kiểm tra sau khi setup

```bash
# Test webhook endpoint
curl -s -X POST https://{domain}/api/payment/sepay-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Apikey {SEPAY_API_KEY}" \
  -d '{
    "id": 1,
    "gateway": "TPBank",
    "transactionDate": "2026-01-01 00:00:00",
    "accountNumber": "123456789",
    "code": "{PREFIX}000001",
    "content": "{PREFIX}000001",
    "transferType": "in",
    "transferAmount": 99000,
    "accumulated": 0,
    "subAccount": null,
    "referenceCode": "TEST",
    "description": ""
  }'
# Expected: {"success":true}

# Test QR URL — dán vào browser, phải load được ảnh QR
# https://qr.sepay.vn/img?acc={BANK_ACCOUNT}&bank={BANK_NAME}&amount=99000&des={PREFIX}000001
```

---

## 8. Checklist triển khai

- [ ] Tạo `POST /api/payment/create-order` — gen transferCode, lưu DB, trả bank info
- [ ] Tạo `POST /api/payment/sepay-webhook` — verify key, dedup, match order, trigger service
- [ ] Tạo `GET /api/payment/status` — frontend poll
- [ ] Thêm fields SePay vào Order model + migrate DB
- [ ] Thêm 4 env vars vào **tất cả** environments (production + demo)
- [ ] Trang payment: QR từ URL `qr.sepay.vn`, poll 3s + `visibilitychange` listener
- [ ] Setup SePay dashboard: link bank → cấu hình mã (prefix khớp code) → tạo webhook
- [ ] Restart production sau deploy để webhook endpoint có hiệu lực
- [ ] Test curl webhook trước khi live
