# Telegram Bot — Đặc tả kỹ thuật

## Tổng quan hệ thống

Web app bán báo cáo chiêm tinh (Next.js 15 + TypeScript). Có 2 chức năng bot Telegram riêng biệt dùng cùng 1 bot token (`@hatgiongchiemtinhbot`):

1. **Admin Bot** — quản trị viên điều khiển qua chat
2. **Order Notification** — hệ thống tự động gửi thông báo sau mỗi đơn hàng hoàn thành

---

## 1. Admin Bot

### Kiến trúc

- **Webhook URL:** `POST /api/telegram-admin/[secret]/webhook`
  - `[secret]` là chuỗi 48 ký tự hex ngẫu nhiên trong env var `TELEGRAM_ADMIN_WEBHOOK_SECRET`
  - Nếu secret sai → trả `403`, không xử lý
- **File:** `src/app/api/telegram-admin/[secret]/webhook/route.ts`
- **Framework:** Next.js App Router (serverless function)
- **DB:** PostgreSQL qua Prisma — bảng `config`, key `service_price`

### Bảo mật

- Double-layer: URL secret + kiểm tra `from.id === 1247334831` (hardcode admin user ID)
- Mọi update từ user khác → ignore silently (không reply, không log ra cho user thấy)

### Commands (đã đăng ký qua `setMyCommands`)

| Command | Description |
|---------|-------------|
| `/start` | Mở menu chính |
| `/getprice` | Xem giá dịch vụ hiện tại |
| `/setprice` | Đặt giá (VD: /setprice 5000 = 5.000đ) |
| `/help` | Hướng dẫn sử dụng |

### Inline Keyboard Menu

Hiển thị khi gọi `/start`, `/help`, `/getprice`, hoặc sau khi set giá thành công:

```
[ 💰 Xem giá hiện tại ]
[ 3.333đ ]  [ 5.000đ ]  [ 7.000đ  ]
[ 10.000đ ] [ 15.000đ ] [ 20.000đ ]
[ ✏️ Nhập giá tùy chỉnh... ]
```

- Tap button giá preset → gọi `applySetPrice()` ngay, không cần gõ lệnh
- Tap "Nhập giá tùy chỉnh" → bot reply hướng dẫn gõ `/setprice <số>`
- Tap "Xem giá hiện tại" → query DB, reply giá + show lại menu

### Xử lý update

Webhook nhận 2 loại update:

**`callback_query`** (button tap):
- Đọc `callback_query.data`: `getprice` | `setprice_<n>` | `setprice_custom`
- Gọi `answerCallbackQuery` để dismiss loading indicator trên Telegram
- Xử lý tương ứng

**`message`** (text command):
- Parse regex `/^\/setprice\s+(\d+)$/i`
- Fallback `/getprice`, `/help`, `/start`

### `applySetPrice()` flow

1. `prisma.config.upsert({ key: 'service_price', value: String(newPrice) })`
2. `answerCallbackQuery` (nếu từ button) → toast notification trên Telegram
3. `sendMenu()` — reply message với menu keyboard
4. `restartServicesInBackground()` — fire-and-forget:
   ```
   (sleep 2 && systemctl restart hgct-demo.service
            && sleep 8 && systemctl restart hgct.service) &
   ```
   Restart demo trước (8s) rồi production (để không kill process đang reply)

### Tại sao phải restart sau khi set giá?

Giá được đọc từ DB trong `create-order` route nên không cần restart cho giá. Restart là để đảm bảo không có in-memory cache cũ nào sót lại (phòng thủ).

---

## 2. Order Notification (tự động)

### Trigger

Sau mỗi lần `processReport()` hoàn thành thành công (trong `src/lib/astrology/reportProcessor.ts`):

```typescript
sendOrderNotification({ service, name, email, amount, generationIds }).catch(...)
// Fire-and-forget — không block flow chính
```

### Destination

- Chat group: `-1003849385640`
- Topic (thread): `161`
- URL: `https://t.me/c/3849385640/161`

### Nội dung message

```
🔔 Đơn hàng mới hoàn thành!
📦 Dịch vụ: Luận giải <Tên dịch vụ>
👤 Khách: <tên>
📧 Email: <email>
💰 Số tiền: <n>đ
💸 OR Fee: $0.XXXX
🇻🇳 OR VND: <n>đ
💳 OR Balance: $XX.XX
```

### Luồng xử lý (sequential, không block main thread)

```
[report hoàn thành]
       ↓
getGenerationCost(generationIds)    ← sequential, phải xong trước
  └─ wait 15s → query OR /api/v1/generation?id=...
  └─ nếu cost = 0 → retry sau 10s → retry sau 10s nữa
  └─ max 3 attempts = tổng 35s
       ↓
Promise.all([
  getOpenRouterBalance(),           ← song song
  getUsdToVndSellRate(),            ←
])
       ↓
sendMessage → Telegram
```

**Lý do sequential (fee trước, balance sau):** OR mất ~15s để tính cost sau khi generation xong. Nếu fetch balance trước/song song thì balance vẫn chưa bị trừ → số sai.

### Lấy OR Fee

- Endpoint: `GET https://openrouter.ai/api/v1/generation?id={generationId}`
- Auth: `OPENROUTER_MANAGEMENT_KEY` (Management Key, khác API Key)
- Field: `data.total_cost` (USD)
- Gen ID: lấy từ SSE chunk body `parsed.id` trong quá trình streaming (KHÔNG phải từ response header)
- Mỗi report có thể có nhiều generation IDs (retry tự động) → cộng tổng

### Lấy OR Balance

- Endpoint: `GET https://openrouter.ai/api/v1/credits`
- Auth: `OPENROUTER_MANAGEMENT_KEY`
- Tính: `data.total_credits - data.total_usage`

### Tỷ giá USD/VND

- Primary: VCB Sell rate — `https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx?b=10`
  - Parse XML: `CurrencyCode="USD" ... Sell="26,XXX"`
  - Timeout: 5s
- Fallback: `https://open.er-api.com/v6/latest/USD` (mid-market)

---

## Env vars liên quan

| Var | Dùng cho |
|-----|---------|
| `TELEGRAM_ADMIN_BOT_TOKEN` | Cả admin bot lẫn order notification |
| `TELEGRAM_ADMIN_WEBHOOK_SECRET` | Xác thực webhook URL |
| `OPENROUTER_MANAGEMENT_KEY` | Query generation cost + balance |

---

## Điểm có thể tối ưu (ghi chú cho review)

- `restartServicesInBackground()` dùng `child_process.exec` với shell string — cần đánh giá có cần không (giá đọc từ DB real-time)
- Delay cứng 15s + retry 2×10s = tổng 35s chờ mới biết OR Fee — có cách nào nhanh hơn?
- Không có rate limiting cho admin commands (không cần thiết vì chỉ 1 admin, nhưng để ghi chú)
- `PRESET_PRICES` hardcode trong source — có thể cân nhắc đưa vào DB hoặc env
