# Telegram Bots — Đặc tả kỹ thuật

> **⚠️ QUAN TRỌNG — ĐỌC TRƯỚC KHI SỬA BẤT CỨ ĐIỀU GÌ:**
>
> Project có **2 bot Telegram khác nhau, dùng 2 token khác nhau, phục vụ 2 mục đích khác nhau.**
> Nhầm token → notifications không gửi được hoặc admin bot hỏng.
>
> | | Bot | Username | Env var | Mục đích |
> |---|---|---|---|---|
> | 1 | **Admin Bot** | `@hatgiongchiemtinhbot` | `TELEGRAM_ADMIN_BOT_TOKEN` | Admin điều khiển qua chat riêng |
> | 2 | **Notify Bot** | `@nguyclaudebot` | `TELEGRAM_BOT_TOKEN` | Tự động báo cáo đơn hàng vào group |
>
> **Admin Bot KHÔNG gửi vào group. Notify Bot KHÔNG nhận lệnh admin.**

---

## Bot 1 — Admin Bot (`@hatgiongchiemtinhbot`)

### Tổng quan

Bot nhận lệnh từ admin (1 người duy nhất, user ID `1247334831`) qua **chat riêng (private chat)**.
Dùng để quản lý giá, xem/xử lý đơn hàng, restart services, kiểm tra hệ thống.

### Env vars

```
TELEGRAM_ADMIN_BOT_TOKEN=<token>          # Token của @hatgiongchiemtinhbot
TELEGRAM_ADMIN_WEBHOOK_SECRET=<hex48>     # Random hex, VD: node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

### Files liên quan

```
src/lib/telegram/bot.ts                              # Base helpers: tgSend, tgEdit, tgAnswer
src/lib/telegram/admin.ts                            # Toàn bộ business logic
src/app/api/telegram-admin/[secret]/webhook/route.ts # Thin dispatcher (nhận update từ Telegram)
src/lib/pricing.ts                                   # Per-service pricing logic
```

### Webhook setup

- **URL:** `POST https://hatgiongchiemtinh.com/api/telegram-admin/<SECRET>/webhook`
- Bảo mật 2 lớp: (1) URL secret → `TELEGRAM_ADMIN_WEBHOOK_SECRET` (2) kiểm tra `from.id === 1247334831`
- Register webhook 1 lần sau khi deploy:
```bash
TOKEN=<TELEGRAM_ADMIN_BOT_TOKEN>
SECRET=<TELEGRAM_ADMIN_WEBHOOK_SECRET>
curl "https://api.telegram.org/bot${TOKEN}/setWebhook?url=https://hatgiongchiemtinh.com/api/telegram-admin/${SECRET}/webhook"
```

### Commands đã đăng ký (`setMyCommands`)

| Command | Mô tả |
|---------|-------|
| `/start` | Mở menu quản trị |
| `/help` | Mở menu quản trị |
| `/setprice [service] <giá>` | Đặt giá — service = career/love/synastry/transit/all (bỏ trống = all) |
| `/getprice` | Xem tất cả giá hiện tại |
| `/pay <orderId>` | Mark paid đơn hàng thủ công và tạo báo cáo |
| `/check` | Check ngay đơn failed + pending quá hạn → gửi vào nhóm |
| `/setcheckinterval <phút>` | Đặt interval định kỳ check đơn (mặc định: 15 phút) |

Update commands (chạy lại khi thêm/sửa command):
```bash
TOKEN=<TELEGRAM_ADMIN_BOT_TOKEN>
curl -s "https://api.telegram.org/bot${TOKEN}/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{"commands":[
    {"command":"start","description":"Mở menu quản trị"},
    {"command":"help","description":"Mở menu quản trị"},
    {"command":"setprice","description":"Đặt giá — /setprice [service] <giá>"},
    {"command":"getprice","description":"Xem giá hiện tại"},
    {"command":"pay","description":"Mark paid đơn — /pay <orderId>"},
    {"command":"check","description":"Check ngay đơn failed + pending quá hạn"},
    {"command":"setcheckinterval","description":"Đặt interval định kỳ — /setcheckinterval <phút>"}
  ]}'
```

### Menu structure

#### Main Menu — callback `main` / commands `/start` `/help`
```
🌟 HGCT Admin Bot
Chọn thao tác:

[ 💰 Quản lý giá                       ]
[ 📦 Đơn hàng        ] [ 🔧 Hệ thống  ]
```

#### Price Menu — callback `m_price`
```
💰 Quản lý giá dịch vụ
🎯 Hướng Nghiệp: X.XXXđ
💝 Tình Duyên:   X.XXXđ
💑 Cặp Đôi:      X.XXXđ
🔮 Vận Hạn:      X.XXXđ

[ 🎯 Hướng Nghiệp ] [ 💝 Tình Duyên ]
[ 💑 Cặp Đôi      ] [ 🔮 Vận Hạn    ]
[ 📋 Đặt tất cả cùng lúc            ]
[ ↩️ Quay lại                        ]
```

#### Price Service Menu — callback `m_price_svc_c/l/s/t/a`
```
💰 Đặt giá [Tên dịch vụ]
Hiện tại: X.XXXđ

[ 3.333đ  ] [ 5.000đ  ] [ 7.000đ  ]
[ 10.000đ ] [ 15.000đ ] [ 20.000đ ]
[ ✏️ Nhập giá khác                 ]
[ ↩️ Quay lại                      ]
```

#### Orders Menu — callback `m_orders`
```
📦 Quản lý đơn hàng

[ 📊 Thống kê hôm nay               ]
[ ⏳ Đơn pending ] [ ❌ Đơn lỗi    ]
[ 📜 5 đơn gần nhất                 ]
[ ↩️ Quay lại                       ]
```

#### System Menu — callback `m_system`
```
🔧 Hệ thống
⏱ Check đơn mỗi: X phút

[ 🔄 Restart Production ] [ 🔄 Restart Demo ]
[ 📡 Health Check        ] [ 💳 OR Balance   ]
[ 🔍 Check đơn ngay      ] [ ⏱ Set interval  ]
[ ↩️ Quay lại                                ]
```

### Bảng callback_data codes (max 64 bytes)

| Code | Hành động |
|------|-----------|
| `main` | Về main menu |
| `m_price` | Mở price menu |
| `m_price_svc_c` | Set giá career |
| `m_price_svc_l` | Set giá love |
| `m_price_svc_s` | Set giá synastry |
| `m_price_svc_t` | Set giá transit |
| `m_price_svc_a` | Set giá tất cả (all) |
| `p_c_3333` | Đặt career = 3333đ |
| `p_l_5000` | Đặt love = 5000đ |
| `p_a_10000` | Đặt tất cả = 10000đ |
| `p_<svc>_cust` | Nhập giá custom — ForceReply, gõ số trực tiếp (không cần gõ lại lệnh) |
| `m_orders` | Mở orders menu |
| `o_stats` | Thống kê đơn hôm nay |
| `o_pending` | Danh sách đơn chờ thanh toán (top 5) — mỗi đơn có [✅ Paid] [🗑 Hủy] |
| `o_failed` | Danh sách đơn lỗi (top 5) — mỗi đơn có [🔄 Retry] [📧 Email] [🗑 Hủy] |
| `o_recent` | 5 đơn gần nhất |
| `o_pay_N` | Mark paid đơn #N + tạo báo cáo |
| `o_retry_N` | Force retry đơn #N (reset retryCount=0, bypass limit 3) |
| `o_email_N` | Gửi lại email recovery cho đơn #N |
| `o_cancel_N` | Hủy đơn #N — chỉ cho hủy `pending` và `failed`; block `processing`/`retrying`/`completed` |
| `o_cancel_all_pending` | Hiện confirm screen — hủy tất cả pending unpaid |
| `o_cancel_all_confirm` | Xác nhận hủy tất cả pending |
| `m_system` | Mở system menu |
| `s_rst_prod` | Restart production (hỏi nếu có active orders) |
| `s_rst_prod_f` | Force restart (generate recovery tokens trước) |
| `s_rst_demo` | Restart demo ngay |
| `s_health` | Health check: DB + services + active orders |
| `s_balance` | Xem OpenRouter balance |
| `s_check` | Check ngay đơn failed + pending quá hạn → gửi kết quả vào nhóm |
| `s_set_interval` | Đặt interval định kỳ — ForceReply, gõ số phút |

**Quy ước naming:**
- `m_*` = menu navigation
- `p_<svc>_<price>` = price apply — svc: `c`=career `l`=love `s`=synastry `t`=transit `a`=all
- `o_<action>_<id>` = order action — action: `pay` `retry` `email` `cancel`
- `s_*` = system action

### ForceReply inputs

2 nơi dùng ForceReply (không cần gõ lệnh đầy đủ):

| Trigger | Marker trong bot message | Xử lý khi reply |
|---------|--------------------------|-----------------|
| Bấm `p_<svc>_cust` | `CUSTPRICE:<code>` (ẩn bằng `<tg-spoiler>`) | Parse số → `setPrice` / `setAllPrices` |
| Bấm `s_set_interval` | `CHECKINTERVAL` (ẩn bằng `<tg-spoiler>`) | Parse số phút → `setCheckInterval` |

Nếu nhập sai (không phải số dương) → bot báo lỗi + gửi lại ForceReply để nhập tiếp.
Nếu admin ignore ForceReply, gõ lệnh khác → xử lý bình thường, không bị kẹt.

### Periodic order check

**Cơ chế:** System cron chạy mỗi phút, gọi `GET /api/cron/order-check` (auth: `Authorization: Bearer CRON_SECRET`). Endpoint tự check interval và bỏ qua nếu chưa đến giờ.

**Config trong DB (`config` table):**
- `order_check_interval` — số phút giữa các lần check (mặc định: 15)
- `order_check_last_run` — ISO timestamp lần chạy gần nhất

**Kết quả gửi vào group** `-1003849385640` thread `161` bằng `@hatgiongchiemtinhbot`:
```
🔎 Kiểm tra đơn — 18/03/2026 01:30

❌ Đơn failed (2):
• #18 — Vận Hạn — test@test.com — 13/03 15:30 — Retry: 3/3
• #22 — Hướng Nghiệp — khach@gmail.com — 14/03 09:15 — Retry: 2/3

⏳ Đơn pending quá hạn (3):
• #27 — Cặp Đôi — khac@gmail.com — 18/03 01:10 — 3.333đ
• #24 — Hướng Nghiệp — x@x.com — 18/03 01:05 — 5.000đ

💳 OR Balance: $12.45

[ 🔄 #18 ] [ 📧 #18 ] [ 🗑 #18 ]
[ ✅ Paid #27 ] [ 🗑 Hủy #27 ]
...
```

Nếu không có lỗi:
```
✅ Kiểm tra đơn — 18/03/2026 01:30
Không có đơn lỗi hoặc pending quá hạn.
💳 OR Balance: $12.45
```

**"Pending quá hạn"** = `status='pending'` + `paymentStatus='unpaid'` + `createdAt < now - 15 phút` (hết window thanh toán).

**File:** `src/lib/orderCheck.ts` — export `runOrderCheck()`, `getCheckInterval()`, `setCheckInterval()`

**Trigger thủ công:** `/check` hoặc nút `[🔍 Check đơn ngay]` trong System Menu.

**Setup crontab** (mỗi lần setup server mới):
```bash
CRON_SECRET=<giá trị CRON_SECRET trong .env.local>
(crontab -l 2>/dev/null | grep -v 'order-check'; echo "* * * * * curl -s -H \"Authorization: Bearer ${CRON_SECRET}\" \"https://hatgiongchiemtinh.com/api/cron/order-check\" > /dev/null 2>&1") | crontab -
```

### Hệ thống giá per-service

File: `src/lib/pricing.ts`

DB keys (bảng `config`): `price_career`, `price_love`, `price_synastry`, `price_transit`

**Fallback chain khi đọc giá:**
```
price_<service>  →  service_price (key cũ, backward compat)  →  3333 (hardcode default)
```

### Graceful restart production

```
Admin tap [🔄 Restart Production]
    ↓
Đếm orders có status IN ('processing','retrying')
    ├── 0 đơn → restart ngay
    └── > 0 đơn → cảnh báo + [⚡ Force restart] [↩️ Hủy]
                      ↓
                forceRecoverActiveOrders():
                  generate recovery tokens
                  mark orders → failed
                  gửi email recovery cho khách
                      ↓
                exec('(sleep 3 && systemctl restart hgct.service) &')
                (delay 3s để webhook reply về trước khi process chết)
```

---

## Bot 2 — Notify Bot (`@nguyclaudebot`)

### Tổng quan

Bot tự động gửi thông báo vào group khi có sự kiện liên quan đến đơn hàng.
**Bot này KHÔNG có webhook, KHÔNG nhận lệnh, chỉ gửi một chiều.**

### Env vars

```
TELEGRAM_BOT_TOKEN=<token>    # Token của @nguyclaudebot — PHẢI là bot đã join group
```

> ⚠️ `TELEGRAM_BOT_TOKEN` ≠ `TELEGRAM_ADMIN_BOT_TOKEN`. Nếu nhầm → "Bad Request: chat not found"

### Destination group

- **Tên group:** "Nhật Ký Bóc Lột"
- **Chat ID:** `-1003849385640` ← hardcode trong `src/lib/notify.ts`
- **Thread ID:** `161` ← hardcode trong `src/lib/notify.ts`
- **Điều kiện:** `@nguyclaudebot` phải là member của group này

### Files liên quan

```
src/lib/notify.ts    # sendOrderNotification, sendAdminAlert, sendOrderFailedAlert, sendUnderpaymentAlert
```

### Các trigger và nội dung message

#### Đơn hàng hoàn thành — `sendOrderNotification()`

Trigger: cuối `processReport()` trong `src/lib/astrology/reportProcessor.ts`

```
🔔 Đơn hàng mới hoàn thành!
📦 Dịch vụ: Luận giải <tên>
👤 Khách: <tên>
📧 Email: <email>
💰 Số tiền: X.XXXđ
💸 OR Fee: $0.XXXX
🇻🇳 OR VND: X.XXXđ
💳 OR Balance: $XX.XX
```

#### Đơn hàng bị lỗi — `sendOrderFailedAlert()`

Trigger: khi `processReport()` throw trong `createReportJob()` — `src/lib/astrology/reportProcessor.ts`

```
❌ Đơn #N bị lỗi!
📦 <service> — <tên>
📧 <email>
💥 <error message ngắn gọn>

[ 🔄 Retry ngay ]  [ 📧 Gửi email recovery ]
```
→ Buttons callback về Admin Bot webhook: `o_retry_N` / `o_email_N`

#### Underpayment — `sendUnderpaymentAlert()`

Trigger: SePay webhook nhận số tiền < expected — `src/app/api/payment/sepay-webhook/route.ts`

```
⚠️ Underpayment — Đơn #N
Mã CK: HGCTXXXXXX
Cần: X.XXXđ
Nhận: X.XXXđ
Thiếu: Xđ

[ ✅ Mark Paid & Tạo báo cáo ]
```
→ Button callback về Admin Bot webhook: `o_pay_N`

#### Startup sweep — `sendAdminAlert()`

Trigger: khi `sweepStuckJobsOnce()` recover được ≥1 đơn bị gián đoạn — `src/lib/jobs.ts`

```
🔄 Startup sweep: recovered N đơn bị gián đoạn
Các khách hàng sẽ nhận email recovery để thử lại.
```

### Luồng `sendOrderNotification` (sequential)

```
[report hoàn thành]
       ↓
getGenerationCost(generationIds)
  ├─ wait 15s → query OR /api/v1/generation?id=...
  ├─ cost=0 → retry 10s → retry 10s (max 3 attempts)
  └─ trả về tổng cost (USD) hoặc null
       ↓
Promise.all([
  getOpenRouterBalance(),         ← song song
  getUsdToVndSellRate(),          ←
])
       ↓
sendMessage → group -1003849385640 thread 161
```

**Lý do sequential:** OR mất ~15s để tính cost; balance/tỷ giá fetch sau mới chính xác.

### OR Balance & Generation Cost

- **Balance:** `GET https://openrouter.ai/api/v1/credits` — auth: `OPENROUTER_MANAGEMENT_KEY`
  - Tính: `total_credits - total_usage`
- **Generation cost:** `GET https://openrouter.ai/api/v1/generation?id=<genId>` — auth: `OPENROUTER_MANAGEMENT_KEY`
  - Gen ID lấy từ SSE chunk body `parsed.id` trong streaming (KHÔNG phải response header)
  - Mỗi report có thể có nhiều gen IDs (do retry) → cộng tổng

### Tỷ giá USD/VND

- **Primary:** VCB Sell rate — `https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx?b=10`
- **Fallback:** `https://open.er-api.com/v6/latest/USD` (mid-market)

---

## Mối quan hệ giữa 2 bot

```
Admin (private chat)
    │ gửi lệnh /start, /setprice...
    ↓
@hatgiongchiemtinhbot ←── Telegram webhook ─── production server
    │ (TELEGRAM_ADMIN_BOT_TOKEN)               webhook/route.ts
    │                                           admin.ts
    └─ reply menu/kết quả về admin chat


Group "Nhật Ký Bóc Lột" (-1003849385640 thread 161)
    ↑
@nguyclaudebot ←── notify.ts gọi sendMessage trực tiếp (không qua webhook)
    (TELEGRAM_BOT_TOKEN)
    Trigger từ:
      - reportProcessor.ts  (đơn hoàn thành / đơn lỗi)
      - sepay-webhook/route.ts  (underpayment)
      - jobs.ts  (startup sweep)

Inline keyboard buttons trong group messages
    │ callback_query
    ↓
@hatgiongchiemtinhbot webhook  →  o_retry_N / o_pay_N / o_email_N
```

---

## Troubleshooting

### "Bad Request: chat not found"

→ `src/lib/notify.ts` đang dùng sai token. Kiểm tra dòng đầu file:
```typescript
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''  // ✅ ĐÚNG
// const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_ADMIN_BOT_TOKEN || ''  // ❌ SAI
```

### Notifications không gửi sau khi order hoàn thành

1. Check `TELEGRAM_BOT_TOKEN` trong `.env.local` — phải là token `@nguyclaudebot`
2. Check `@nguyclaudebot` còn trong group "Nhật Ký Bóc Lột" không
3. Check logs: `sudo journalctl -u hgct.service -n 100 | grep Notify`

### Admin bot không phản hồi

1. Check webhook đã set: `curl https://api.telegram.org/bot<ADMIN_TOKEN>/getWebhookInfo`
2. Check secret URL khớp với `TELEGRAM_ADMIN_WEBHOOK_SECRET`
3. Check `from.id === 1247334831`
4. Check logs: `sudo journalctl -u hgct.service -n 100 | grep TG`

### Keyboard không hiện sau /start

1. Check production đang chạy code mới: `systemctl status hgct.service`
2. Nếu service restart trong lúc `.next/` đang rebuild → code cũ có thể load
3. Fix: `sudo systemctl restart hgct.service` sau khi build xong hoàn toàn

### OR Balance/Fee hiện "N/A"

→ Kiểm tra `OPENROUTER_MANAGEMENT_KEY` trong `.env.local` — phải là Management Key (khác API Key thông thường), lấy từ openrouter.ai/settings/keys.
