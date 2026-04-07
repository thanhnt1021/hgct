# PROMPT: Hệ thống chống lỗi đơn hàng — hatgiongchiemtinh.com (v4 — Final)

## Bối cảnh & Vấn đề thực tế

Website hatgiongchiemtinh.com vừa bắt đầu có khách thật. Đang gặp **lỗi nghiêm trọng**:

1. Khách thanh toán xong, progress bar 100%, đợi mãi không nhận email. Admin phải SSH chạy lại thủ công
2. Khách chuyển khoản xong nhưng màn hình QR giữ nguyên, không chuyển trang
3. Nguyên nhân gốc: Dev deploy (commit → merge → push → service restart) gián đoạn flow khách

### Yêu cầu tuyệt đối:
**"Dev đi đường dev, khách đi đường khách."** 99% khách phải: mua → thanh toán → đợi → file tự về. Nếu lỗi → hệ thống tự fix hoặc khách bấm 1 nút resume.

---

## ⚠️ KIẾN TRÚC HIỆN TẠI — ĐỌC KỸ

### 2 Bot Telegram (2 token, 2 mục đích)

| | Bot | Username | Env var | Mục đích |
|---|---|---|---|---|
| 1 | **Admin Bot** | `@hatgiongchiemtinhbot` | `TELEGRAM_ADMIN_BOT_TOKEN` | Admin điều khiển qua private chat |
| 2 | **Notify Bot** | `@nguyclaudebot` | `TELEGRAM_BOT_TOKEN` | Gửi 1 chiều vào group |

- Admin Bot KHÔNG gửi vào group. Notify Bot KHÔNG nhận lệnh
- Inline buttons trong group (gửi bởi Notify Bot) → callback về Admin Bot webhook
- **Ngoại lệ:** Periodic order check + `/check` gửi vào group bằng Admin Bot (file `orderCheck.ts`)

### Files hiện có:

```
# Telegram
src/lib/telegram/bot.ts          # Base helpers: tgSend, tgEdit, tgAnswer (Admin Bot token)
src/lib/telegram/admin.ts         # Admin bot business logic (menu, callbacks, ForceReply)
src/lib/notify.ts                 # Notify bot: sendOrderNotification, sendOrderFailedAlert, sendUnderpaymentAlert, sendAdminAlert
src/lib/pricing.ts                # Per-service pricing (getPrice, setPrice, setAllPrices)
src/lib/orderCheck.ts             # Periodic check: runOrderCheck, getCheckInterval, setCheckInterval
src/lib/jobs.ts                   # Job system: sweepStuckJobsOnce(), markStuckIfNeeded()

# Webhook
src/app/api/telegram-admin/[secret]/webhook/route.ts
src/app/api/cron/order-check/     # Cron endpoint (auth: CRON_SECRET)

# Order flow
src/lib/astrology/reportProcessor.ts    # processReport(), createReportJob()
src/app/api/payment/create-order/       # Tạo order → orderId, transferCode
src/app/api/payment/status/             # Poll payment status
src/app/api/payment/confirm/            # SePay webhook nhận callback thanh toán
src/app/api/astrology/report/           # Report cho Premium user
src/app/api/recover/                    # Recovery API (atomic lock, max 3 retries)
src/app/api/job/[id]/                   # Job status polling

# Frontend pages
src/app/checkout/
src/app/payment/
src/app/processing/
src/app/success/

# DB + config
prisma/schema.prisma
.env.local
```

### Những gì ĐÃ IMPLEMENT (không làm lại):

**Telegram Admin Bot (đầy đủ):**
- ✅ Menu phân cấp: main → price/orders/system
- ✅ Per-service pricing với ForceReply custom input (marker `CUSTPRICE:<svc>` ẩn bằng `<tg-spoiler>`)
- ✅ `/setprice`, `/getprice`, `/pay <orderId>`
- ✅ Orders: stats, pending list, failed list, recent list
- ✅ Pending list có [✅ Paid] [🗑 Hủy] cho mỗi đơn + [🗑 Hủy tất cả pending] (confirm)
- ✅ Failed list có [🔄 Retry] [📧 Email] [🗑 Hủy] cho mỗi đơn
- ✅ `o_cancel_N` — hủy đơn pending/failed, block processing/retrying/completed
- ✅ `o_cancel_all_pending` + `o_cancel_all_confirm`
- ✅ Graceful restart (check active orders → warn → force with recovery tokens + email)
- ✅ Health check, OR Balance
- ✅ `/check` + `🔍 Check đơn ngay` → gửi kết quả vào group
- ✅ `/setcheckinterval` + ForceReply (marker `CHECKINTERVAL`)

**Telegram Notify Bot:**
- ✅ `sendOrderNotification()` — đơn hoàn thành (OR fee, balance, VCB rate)
- ✅ `sendOrderFailedAlert()` — đơn lỗi + [🔄 Retry] [📧 Email]
- ✅ `sendUnderpaymentAlert()` — thiếu tiền + [✅ Mark Paid]
- ✅ `sendAdminAlert()` — startup sweep summary

**Order system:**
- ✅ SePay webhook với dedup (`sepayTxnId`)
- ✅ Recovery: atomic lock, max 3 retries, auto-redirect lần 1, email từ lần 2+
- ✅ Startup sweep: `sweepStuckJobsOnce()` trong `jobs.ts`
- ✅ `markStuckIfNeeded()` — khi poll job, check lastActivity
- ✅ Frozen detection 90s trên /processing
- ✅ Periodic order check: cron mỗi phút → `order-check` endpoint → check interval DB

**Per-service pricing:**
- ✅ DB keys: `price_career`, `price_love`, `price_synastry`, `price_transit`
- ✅ Fallback: `price_<svc>` → `service_price` → 3333

---

## Bản đồ điểm lỗi — cái nào đã fix, cái nào CHƯA

```
GIAI ĐOẠN 1: /checkout
  [1.1] Server sập khi create-order            → THẤP   — CHƯA FIX: frontend không retry
  [1.2] Sập sau insert, trước response          → THẤP   — ĐÃ OK: order rác vô hại

GIAI ĐOẠN 2: /payment  
  [2.1] Server sập khi nhìn QR                  → T.BÌNH — CHƯA FIX: frontend polling không handle 503
  [2.2a] Tiền CK → SePay webhook → server down → retry kịp → CAO — MỘT PHẦN: sweep bắt paid/pending, nhưng frontend không biết reconnect
  [2.2b] Tiền CK → SePay miss hết (>5h)         → RẤT CAO ⭐ CHƯA FIX: không có cách khách báo đã CK
  [2.3] CK sai nội dung                         → CAO ⭐  — CHƯA FIX: webhook bỏ qua im lặng, admin không biết
  [2.4] CK thiếu tiền                           → THẤP   — ĐÃ FIX: sendUnderpaymentAlert
  [2.5] Countdown hết mà đã CK                  → CAO    — CHƯA FIX: chỉ hiện "Hết thời gian" + quay lại

GIAI ĐOẠN 3: /processing
  [3.1] Job bị kill (server restart)             → CAO    — MỘT PHẦN: sweep bắt khi restart, nhưng chưa có watchdog real-time
  [3.2] Sweep kill nhầm job đang chạy            → T.BÌNH — CẦN VERIFY: sweep dùng lastActivity, nhưng threshold bao nhiêu?
  [3.3] Sập sau PDF, trước email                 → T.BÌNH ⭐ CHƯA FIX: retry chạy lại full pipeline dù PDF đã có
  [3.4] Sập sau email, trước update completed    → THẤP   — CHƯA FIX: tương tự 3.3
  [3.5] OpenRouter timeout                       → THẤP   — ĐÃ FIX: retry 3+3
  [3.6] Puppeteer crash (OOM)                    → T.BÌNH — MỘT PHẦN: retry bắt, nhưng alert không ghi rõ nguyên nhân RAM
  [3.7] SMTP fail                                → T.BÌNH — MỘT PHẦN: job done nhưng emailSent=false, frontend /success không hiện download
  [3.8] Progress 100% kẹt                        → T.BÌNH — CHƯA FIX: không tự redirect

GIAI ĐOẠN 4: /success
  [4.1] SessionStorage mất                       → THẤP   — CHƯA FIX: trang trống

GIAI ĐOẠN 5: Recovery  
  [5.1] Race condition duplicate job              → T.BÌNH — ĐÃ FIX: atomic lock trong /api/recover
  [5.2] Recovery fail liên tiếp                   → T.BÌNH — MỘT PHẦN: watchdog chưa có, chỉ dựa vào periodic check
```

---

## Nhiệm vụ — CHỈ NHỮNG GÌ CÒN THIẾU

### PHẦN 0 — Khảo sát hiện trạng (LÀM TRƯỚC, KHÔNG CODE)

Đọc kỹ TẤT CẢ files liệt kê ở phần "Files hiện có".

Sau đó:
1. Query DB: order `status` IN (`failed`, `processing`, `retrying`) HOẶC (`paymentStatus`=`paid` AND `status`=`pending`) — 7 ngày gần nhất
2. Liệt kê: id, status, paymentStatus, retryCount, recoveryToken, email, service, createdAt, updatedAt, jobId
3. Check job tương ứng: status, progress, error, updatedAt
4. **Xuất báo cáo** phân loại + đề xuất fix từng đơn
5. **CHỜ XÁC NHẬN** trước khi fix

---

### PHẦN 1 — Smart Retry (foundation cho mọi retry)

> Cover: [3.3] [3.4] [5.1]

Tạo `src/lib/smart-retry.ts` — hàm dùng chung:

```typescript
// smartRetryOrder(orderId: string, triggeredBy: 'sweep' | 'watchdog' | 'admin' | 'customer')
//
// 0. NẾU triggeredBy === 'admin' → reset retryCount = 0 (bypass quota)
//
// 1. ATOMIC LOCK:
//    updateMany({ where: { id, status: { in: ['failed','processing'] } }, data: { status: 'retrying' } })
//    count === 0 → return { skipped: true }
//
// 2. CHECK PDF TỒN TẠI:  ⭐ FIX [3.3] [3.4]
//    /var/hgct/pdfs/${orderId}.pdf exists?
//    → CÓ: chỉ gửi email + update completed (KHÔNG chạy lại AI — tiết kiệm OR credit)
//    → KHÔNG: tiếp bước 3
//
// 3. CHECK QUOTA (non-admin):
//    retryCount >= 3 → update failed + gửi recovery email + alert → return
//
// 4. FULL RETRY:
//    increment retryCount + tạo job + processReport() fire-and-forget
//
// 5. LOG + NOTIFICATION tùy triggeredBy
```

**Refactor các điểm retry hiện có để gọi qua `smartRetryOrder()`:**
- `sweepStuckJobsOnce()` trong `jobs.ts` → gọi `smartRetryOrder(id, 'sweep')`
- `o_retry_N` handler trong `admin.ts` → gọi `smartRetryOrder(id, 'admin')`
- `o_pay_N` handler → mark paid + `smartRetryOrder(id, 'admin')`
- `/api/recover` route → gọi `smartRetryOrder(id, 'customer')`

Đọc code hiện tại của từng handler để hiểu logic rồi refactor — giữ behavior giống hệt, chỉ centralize qua 1 hàm.

---

### PHẦN 2 — Mở rộng Startup Sweep

> Cover: [2.2a] [3.1]

Đọc `sweepStuckJobsOnce()` trong `src/lib/jobs.ts`. Verify và bổ sung:

**Bổ sung 1 — Sweep order paid nhưng chưa process:**

```
Query: paymentStatus = 'paid' AND status = 'pending'
→ Với mỗi order: smartRetryOrder(id, 'sweep')
→ Cover [2.2a]: SePay nhận tiền trước restart nhưng processReport chưa trigger
```

**Bổ sung 2 — Check PDF trước khi retry:**

Đọc code sweep hiện tại — nó có check PDF tồn tại trước khi retry không? Nếu chưa → thêm check (hoặc đơn giản gọi `smartRetryOrder` đã có check ở bước 2).

**Bổ sung 3 — Timing safety [3.2]:**

Verify threshold sweep dùng `lastActivity` thay `createdAt`. Đảm bảo:
- KHÔNG sweep job đang chạy thật (progress tăng, lastActivity < 2 phút)
- CHỈ sweep job FROZEN (lastActivity > threshold phù hợp theo service type)

---

### PHẦN 3 — Job Watchdog real-time

> Cover: [3.1] [3.6] [3.7] [5.2]

Hiện tại chỉ có `markStuckIfNeeded()` (reactive — khi poll) + periodic check cron mỗi N phút. Cần thêm watchdog proactive:

Tạo `src/lib/job-watchdog.ts`. Chạy mỗi 2 phút:

```
Query: order.status = 'processing' AND job.lastActivity < NOW() - 10 phút
  (10 phút = dư cho Vận Hạn ~15 phút ETA)

Với mỗi order treo:
  1. smartRetryOrder(id, 'watchdog')
  2. [3.6] Nếu error chứa "OOM"/"ENOMEM"/"Chromium":
     → Notify Bot thêm: "⚠️ Có thể thiếu RAM"
  3. [3.7] Nếu job.status='done' NHƯNG emailSent=false VÀ updatedAt > 5 phút:
     → Thử gửi lại email only (không retry report)
     → Fail → Notify Bot: "📧 Email fail đơn #{id}. PDF: /api/pdf/{id}"
```

**Cách chạy:** `setInterval` trong `instrumentation.ts` (VPS persistent process) hoặc mở rộng cron endpoint hiện có. Đọc codebase chọn cách phù hợp. KHÔNG conflict với periodic order check đã có.

---

### PHẦN 4 — Frontend Resilience

#### 4a. /checkout — retry khi error

> Cover: [1.1]

```
POST create-order hoặc /api/astrology/report:
- Network error / 5xx → toast "Lỗi kết nối, đang thử lại..." → auto-retry 3s, max 3 lần
- Hết 3 lần → "Hệ thống bảo trì. Thử lại sau." + nút Thử lại
- Disable CTA button trong khi retry
```

#### 4b. /payment — polling resilience + bảo vệ khách đã CK

> Cover: [2.1] [2.2b] [2.5]

```
1. Polling /api/payment/status fail:
   → Đếm failCount (reset khi OK)
   → 1-3: im lặng retry
   → 4-10 (9-30s): "⏳ Đang kết nối lại..."
   → 11-20 (30-60s): "🔄 Hệ thống đang cập nhật. Giao dịch vẫn an toàn."
   → >20 (>60s): "⚠️ Mất kết nối. Đã CK thì hệ thống sẽ tự xác nhận khi khôi phục."
   → COUNTDOWN PAUSE khi mất kết nối

2. Countdown hết 15 phút:
   → Gọi 1 lần cuối status check
   → Nếu paid → chuyển trang
   → Nếu unpaid → 2 nhánh:
     a. "Chưa CK?" → [Quay lại]
     b. "Đã CK rồi?" → [Tôi đã chuyển khoản ✋]
        → Form nhỏ: số tiền + nội dung CK
        → POST /api/payment/claim-transfer (API mới — Phần 5b)
        → "Đã ghi nhận! Admin xác nhận trong 30 phút."

3. Reassurance dưới QR:
   "💡 Đã CK chưa thấy xác nhận? Đợi 1-2 phút. Quá 5 phút → bấm hỗ trợ."
   [Tôi cần hỗ trợ] → kênh liên hệ
```

#### 4c. /processing — tất cả edge cases

> Cover: [3.1] [3.8] [3.7]

```
1. Polling fail → cùng logic failCount + escalating messages (không hiện "Lỗi")

2. Job failed + hết auto-retry:
   → Recovery UI ngay tại trang:
     Mã khôi phục [ABC12345] [Copy]
     [🔄 Thử lại ngay] → POST /api/recover trực tiếp
     429 → "Liên hệ hỗ trợ"
     📧 Link khôi phục đã gửi {email}

3. Progress 100% > 5s chưa redirect:  ⭐ [3.8]
   → Force redirect /success

4. emailSent = false:  ⭐ [3.7]
   → /success hiện: "⚠️ Email chưa gửi được. [↓ Tải PDF]"
   → Nút download luôn hiện khi có PDF
```

#### 4d. /success — fallback

> Cover: [4.1]

```
Không có sessionStorage:
→ Check URL params orderId/jobId → fetch API → hiển thị
→ Không có params → "📬 Kiểm tra email hoặc vào Lịch sử đơn hàng"
```

---

### PHẦN 5 — SePay Hardening + Claim Transfer API

#### 5a. Verify + bổ sung SePay webhook

> Cover: [2.2a] [2.3]

Đọc `src/app/api/payment/confirm/route.ts` (⚠️ path thực tế là `/api/payment/confirm/`, KHÔNG PHẢI `/api/payment/sepay-webhook/`), verify:

```
1. Dedup: mọi case đều trả 200 (txnId đã có, order đã paid, order đang processing)
2. Atomic: Prisma.$transaction cho update paid + create job
3. [2.3] KHI TIỀN VÀO KHÔNG MATCH ORDER — HIỆN TẠI BỎ QUA IM LẶNG → THÊM:
   → Notify Bot → group:
     "🔍 Tiền vào không match!
      💰 {amount}đ | 📝 {content} | 🏦 {sender}
      [📦 Xem đơn pending]"
   → Button: o_pending (đã có handler)
```

**Thêm notification khi nhận thanh toán (trước report xong):**
```
→ Notify Bot → group:
  "💰 Nhận thanh toán! Đơn #{id} | {service} | {tên} | {amount}đ | ⏳ Đang tạo báo cáo..."
```

#### 5b. API mới: Claim Transfer ⭐

> Cover: [2.2b] [2.5]

Tạo `src/app/api/payment/claim-transfer/route.ts`:

```typescript
// POST /api/payment/claim-transfer
// Body: { orderId, amount?, transferContent? }
//
// 1. Tìm order, verify pending + unpaid
// 2. KHÔNG auto mark paid — chỉ ghi claim
// 3. Update order: claimedAt = now(), claimInfo = JSON
//    → Check schema: cần thêm field? Nếu Order chưa có → migration
// 4. Notify Bot → group:
//    "🖐️ Khách báo đã CK!
//     📦 Đơn #{id} | {tên} | {email}
//     💰 Báo: {amount}đ | 📝 {content}
//     [✅ Xác nhận & Tạo báo cáo]"
//    → Button: o_pay_{id} (đã có handler)
// 5. Return { success: true }
// Rate limit: orderId chỉ claim 1 lần
```

---

### PHẦN 6 — Bổ sung Notify Bot events

> Mở rộng `src/lib/notify.ts`

Đã có: `sendOrderNotification`, `sendOrderFailedAlert`, `sendUnderpaymentAlert`, `sendAdminAlert`

**Thêm mới (tất cả dùng `TELEGRAM_BOT_TOKEN` — Notify Bot):**

```typescript
// 1. PAYMENT RECEIVED — trigger từ SePay webhook khi confirm
sendPaymentReceivedNotification(order, amount)
// "💰 Nhận thanh toán! Đơn #{id} | {service} | {tên} | {amount}đ | ⏳ Đang tạo báo cáo..."

// 2. CUSTOMER CLAIM — trigger từ claim-transfer API
sendCustomerClaimAlert(order, claimInfo)
// "🖐️ Khách báo đã CK! Đơn #{id} | {tên} | {email}
//  💰 Báo: {amount}đ | 📝 {content}
//  [✅ Xác nhận & Tạo báo cáo]"
// → Button: o_pay_{id}

// 3. UNMATCHED PAYMENT — trigger từ SePay webhook khi không match
sendUnmatchedPaymentAlert(amount, content, senderName)
// "🔍 Tiền vào không match! 💰 {amount}đ | 📝 {content} | 🏦 {sender}
//  [📦 Xem đơn pending]"
// → Button: o_pending

// 4. RECOVERY SUCCESS — trigger cuối processReport khi retryCount > 0
sendRecoverySuccessNotification(order, retryCount)
// "🔄 Recovery thành công! Đơn #{id} | {service} | {tên} | Retry lần {n}"

// 5. WATCHDOG ALERT — trigger từ job-watchdog
sendWatchdogAlert(order, action, errorHint?)
// "⏰ Watchdog: đơn #{id} treo >10' | {service} | {tên}
//  🔄 Auto-retry lần {n}"
// Hoặc nếu hết retry: buttons o_retry_{id} / o_email_{id}
```

**⚠️ Buttons trong group → callback về Admin Bot webhook. Admin Bot đã có handler cho `o_pay_N`, `o_retry_N`, `o_email_N`, `o_pending` → không cần thêm handler.**

---

### PHẦN 7 — Tối ưu bổ sung (P2)

**7a. OR Fee delay:**
- Đọc `sendOrderNotification()` trong `notify.ts`
- Giảm initial delay: 15s → 8s
- Backoff: 8s → 12s → 18s (3 attempts)
- Cost=0 sau 3 attempts → gửi notification ghi "(fee chưa sẵn)" — KHÔNG block

**7b. Verify bỏ restart sau set giá:**
- Đọc admin.ts handler cho `p_<svc>_<price>` callback
- Giá đọc real-time từ DB → KHÔNG cần restart
- Nếu còn gọi `restartServicesInBackground()` → xóa
- Test: set giá → verify create-order dùng giá mới ngay

---

## Cross-check: tất cả điểm lỗi đã cover?

```
[1.1] Server sập create-order        → Phần 4a (frontend retry)                           ✅
[1.2] Sập sau insert, trước response → Đã OK (order rác vô hại)                           ✅
[2.1] Server sập khi nhìn QR         → Phần 4b (polling failCount + banner)                ✅
[2.2a] Tiền CK, SePay retry kịp     → Phần 2 (sweep paid/pending) + Phần 5a (dedup)       ✅
[2.2b] Tiền CK, SePay miss hết      → Phần 4b (nút "Tôi đã CK") + Phần 5b (claim API)    ✅
[2.3] CK sai nội dung               → Phần 5a (alert không match) + o_pending              ✅
[2.4] CK thiếu tiền                 → Đã có sendUnderpaymentAlert                          ✅
[2.5] Countdown hết, đã CK          → Phần 4b (2 nhánh + claim)                            ✅
[3.1] Job bị kill                    → Phần 2 (sweep) + Phần 3 (watchdog) + graceful restart✅
[3.2] Sweep kill nhầm               → Phần 2 (verify timing lastActivity)                  ✅
[3.3] Sập sau PDF, trước email      → Phần 1 (smartRetry check PDF)                        ✅
[3.4] Sập sau email, trước complete → Phần 1 (smartRetry check PDF → chỉ update)            ✅
[3.5] OpenRouter timeout             → Đã có retry 3+3                                     ✅
[3.6] Puppeteer crash                → Phần 3 (watchdog + RAM hint)                         ✅
[3.7] SMTP fail                      → Phần 3 (watchdog retry email) + Phần 4c (download)   ✅
[3.8] Progress 100% kẹt             → Phần 4c (force redirect 5s)                          ✅
[4.1] SessionStorage mất            → Phần 4d (fallback server query)                       ✅
[5.1] Race condition                 → Đã có atomic lock + Phần 1 centralize                ✅
[5.2] Recovery fail liên tiếp       → Phần 3 (watchdog) + o_retry_N (đã có)                 ✅
```

---

## Thứ tự thực hiện

```
P0 — Fix ngay:
  1. Phần 0: Khảo sát + fix đơn lỗi → CHỜ XÁC NHẬN
  2. Phần 1: smartRetryOrder() (foundation)
  3. Phần 2: Mở rộng Startup Sweep
  4. Phần 3: Job Watchdog
  5. Phần 4: Frontend resilience (4 trang)

P1 — Bảo vệ thanh toán:
  6. Phần 5: SePay hardening + Claim Transfer API
  7. Phần 6: Notify Bot events mới

P2 — Tối ưu:
  8. Phần 7: OR Fee delay + verify bỏ restart
```

---

## Constraints

- Stack: Next.js 15, TypeScript, Prisma, PostgreSQL — giữ nguyên
- **2 BOT — KHÔNG NHẦM TOKEN:**
  - Admin Bot (`TELEGRAM_ADMIN_BOT_TOKEN`) → private chat + callback handling + order check gửi group
  - Notify Bot (`TELEGRAM_BOT_TOKEN`) → group alerts 1 chiều (group `-1003849385640` thread `161`)
  - Buttons trong group → callback về Admin Bot webhook
- Giữ nguyên: webhook URL, admin ID `1247334831`, callback codes (`o_retry_N`, `o_pay_N`, `o_email_N`, `o_pending`, `o_cancel_N`)
- **KHÔNG break flow hiện tại** — backward-compatible
- DB schema changes → liệt kê migration TRƯỚC khi implement
  - Check: `Order` có field `claimedAt`/`claimInfo` không? Nếu chưa → thêm
- Deploy production: `sudo bash /home/hgct/hgct/deploy.sh` (tự re-register webhook)
- SePay webhook path: `/api/payment/confirm/` (KHÔNG PHẢI `/api/payment/sepay-webhook/`)
- PDF path: `/var/hgct/pdfs/{orderId}.pdf`
- Env vars: xem `docs/REQUIREMENTS_CHECK.md` — nếu thêm env mới → update file đó

---

## Cách đọc codebase

Đọc TOÀN BỘ files liệt kê trước khi code. Đặc biệt:
- `notify.ts` (Notify Bot, `TELEGRAM_BOT_TOKEN`) vs `telegram/bot.ts` + `admin.ts` (Admin Bot, `TELEGRAM_ADMIN_BOT_TOKEN`)
- `orderCheck.ts` — periodic check đã có, gửi group bằng Admin Bot (ngoại lệ)
- `jobs.ts` → `sweepStuckJobsOnce()` — startup sweep hiện tại
- `reportProcessor.ts` → `processReport()` — pipeline chính
- Nếu prompt mâu thuẫn với code → **lấy code làm chuẩn**, báo lại
