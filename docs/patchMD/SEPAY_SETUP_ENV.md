# PHASE 5: Setup SePay — Điền env vars và tiếp tục triển khai

> **Context:** Các phase trước (DB migration, API routes, frontend) đang triển khai và PAUSE ở bước cần thông tin SePay. Giờ đã setup xong SePay dashboard, có đủ thông tin để điền env và tiếp tục.

---

## ĐÃ HOÀN THÀNH TRÊN SEPAY DASHBOARD

1. ✅ Liên kết tài khoản ngân hàng TPBank trên my.sepay.vn
2. ✅ Cấu hình mã thanh toán: tiền tố `HGCT`, hậu tố 6 ký tự số nguyên
3. ✅ Tạo webhook:
   - URL: `https://hatgiongchiemtinh.com/api/payment/sepay-webhook`
   - Sự kiện: Có tiền vào
   - Bỏ qua nếu không có code: Có
   - Chứng thực: API Key
   - Content Type: application/json
   - Retry: HTTP Status Code không 2xx

---

## VIỆC CẦN LÀM NGAY

### 1. Thêm env vars vào `.env.local`

Thêm các dòng sau vào cuối file `.env.local` (kiểm tra chưa có trước khi thêm, tránh duplicate):

```env
# SePay Configuration
SEPAY_API_KEY=changeme_get_from_sepay_dashboard
BANK_ACCOUNT_NUMBER=changeme
BANK_ACCOUNT_NAME=changeme
BANK_NAME=TPBank
```

**Giải thích từng biến:**
- `SEPAY_API_KEY` — Key xác thực webhook. SePay gửi header `"Authorization": "Apikey <SEPAY_API_KEY>"` mỗi lần bắn webhook. Backend cần verify header này.
- `BANK_ACCOUNT_NUMBER` — Số TK ngân hàng, dùng để gen QR code URL: `https://qr.sepay.vn/img?acc=<BANK_ACCOUNT_NUMBER>&bank=<BANK_NAME>&amount=...&des=...`
- `BANK_ACCOUNT_NAME` — Tên chủ TK, hiển thị trên trang /payment cho user biết CK đúng người.
- `BANK_NAME` — Tên ngân hàng đúng format SePay (dùng trong QR URL param `bank=TPBank`).

### 2. Tiếp tục triển khai code

Sau khi điền env xong, tiếp tục các phase còn lại mà đang pause. Đảm bảo tất cả các chỗ dùng thông tin bank/SePay đều đọc từ env vars:

- **Webhook handler** (`/api/payment/sepay-webhook`): Verify `request.headers.get('authorization') === \`Apikey ${process.env.SEPAY_API_KEY}\``
- **QR Code trên /payment**: `https://qr.sepay.vn/img?acc=${process.env.BANK_ACCOUNT_NUMBER}&bank=${process.env.BANK_NAME}&amount=${amount}&des=${transferCode}`
- **Thông tin bank trên /payment**: Đọc `BANK_ACCOUNT_NUMBER`, `BANK_ACCOUNT_NAME`, `BANK_NAME` từ env, trả về frontend qua API response (đã có trong response của `POST /api/payment/create-order`).

### 3. Rebuild & restart

Sau khi code xong + env đã điền:

```bash
cd ~/hgct
npm run build
# restart app (systemd hoặc pm2 tùy setup)
```

---

## THÔNG TIN THAM CHIẾU NHANH

| Key | Value |
|-----|-------|
| Ngân hàng | TPBank |
| Số TK | (xem `.env.local` — không ghi giá trị thật vào file MD) |
| Chủ TK | (xem `.env.local`) |
| SePay API Key | (xem `.env.local` — không ghi giá trị thật vào file MD) |
| Webhook URL | https://hatgiongchiemtinh.com/api/payment/sepay-webhook |
| QR base URL | https://qr.sepay.vn/img?acc=62941624556&bank=TPBank |
| Mã thanh toán format | HGCT + 6 số (ví dụ: HGCT000042) |
| Giá career/love | 99000 (integer) |
| Giá synastry/transit | 149000 (integer) |
