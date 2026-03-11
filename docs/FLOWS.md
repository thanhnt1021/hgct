# HGCT — Luồng Xử Lý End-to-End

> Mô tả chi tiết từng flow quan trọng, kết nối Frontend ↔ Backend ↔ DB

---

## Flow 1: Tạo Báo Cáo Chiêm Tinh

### Bước 1 — Chọn Dịch Vụ (`/services`)

```
User → /services
  GET /api/profiles → load danh sách profiles từ DB
  User chọn profile → sessionStorage.inputData = profile data
  User chọn dịch vụ → sessionStorage.selectedService = 'career'|...
  → redirect /checkout
```

### Bước 2 — Xác Nhận (`/checkout`)

```
Client đọc sessionStorage.selectedService + inputData
Check user.isPremium:
  false → hiển thị premium wall, dừng
  true  → hiển thị form
User nhập email → click "Xác nhận"

handleConfirm():
  POST /api/astrology/report {
    service: 'career',
    inputData: { name, gender, dob, tob, loc },
    email: 'user@email.com',
    premiumToken: 'abc123...',  // từ session
    (inputDataB: ... nếu synastry)
  }
  ← { jobId: 'uuid' }
  → redirect /processing?job=uuid&service=career&name=Nguyễn Văn A
```

### Bước 3 — Server Nhận Request

```
Server /api/astrology/report:
  1. Verify premiumToken:
     sha256(UPGRADE_CODE + ':hgct-premium') == premiumToken
     → 403 nếu sai

  2. createJob(jobId) → ghi jobs DB table + in-memory cache

  3. processReport(jobId, body) — fire-and-forget

  4. Return { jobId } → browser nhận < 50ms
```

### Bước 4 — Background Processing

```
[5%]   calculateChart(dob, tob, lat, lon, tz)
       → ChartData { jd, cusps, angles, planets }

[10%]  getKnowledgeFromDB()
       → KB object { [tab_name]: data }

[15%]  Build prompt:
       career:   getCareerBlocks() → buildCareerPrompt()
       love:     getLoveBlocks() → buildLovePrompt()
       synastry: calculateChart(B) → getRelationshipBlocks() → buildRelationshipEssayPrompt()
       transit:  buildVanhanEssayPrompt()

[18-85%] generateEssayStreaming():
         POST openrouter.ai → SSE stream
         → full essay text (9k–28k chars)

[90%]  generatePdf(essayText)
       → cleanForPdf → build HTML → puppeteer → pdfBuffer

[95%]  savePdf → /var/hgct/pdfs/{uuid}.pdf
       sendReportEmail → smtp.hostinger.com:465

[100%] updateJob({ status: 'done', result: { pdfUrl, pdfFilename, emailSent } })
```

### Bước 5 — Polling (`/processing`)

```
Client setInterval 2s:
  GET /api/job/{jobId} → { status, progress, label }
  Cập nhật UI: progress bar, label, checklist

  Khi status === 'done':
    clearInterval
    sessionStorage.reportResult = job.result
    setTimeout 2s → redirect /success
```

### Bước 6 — Kết Quả (`/success`)

```
Client đọc sessionStorage.reportResult
  → "✓ Email đã gửi đến user@email.com"
  → [Tải xuống PDF] → GET /api/pdf/uuid → file download
```

---

## Flow 2: Xem Bản Đồ Sao Trực Tiếp

```
Option A — Từ profile:
  /my-charts → click "Bản đồ ✦" (button)
  → /chart?id=profileId
  → GET /api/chart?id=profileId → load profile từ DB → tính chart
  → render NatalWheel SVG

Option B — Nhập tay:
  /input?for=chart → nhập thông tin
  → sessionStorage.chartInputData = data
  → /chart
  → đọc chartInputData → tính chart client-side hoặc qua API
  → render NatalWheel SVG
```

---

## Flow 3: Đăng Ký / Đăng Nhập (NextAuth.js)

```
/auth/register
  User nhập: username, họ tên, email, password
  POST /api/auth/register → bcrypt hash → prisma.user.create()
  → redirect /auth/login

/auth/login (credentials)
  signIn('credentials', { username, password })
  NextAuth: verify password hash từ DB
  → tạo server session { uid, username, name, email, isPremium, planType }
  → redirect /profile

/auth/login (Google)
  signIn('google') → Google OAuth consent
  → NextAuth Google callback → upsert User trong DB
  → tạo session → redirect /profile
```

---

## Flow 4: Upgrade Premium

```
/profile → nhập upgrade code → click "Nâng cấp"

  POST /api/user/upgrade { code }
  Server:
    process.env.UPGRADE_CODE === code
    → prisma.user.update({ planType: 'premium', isPremium: true })
    → token = sha256(code + ':hgct-premium')
    ← { token }

  Client (NextAuth session update):
    session.user.isPremium = true
    session.user.planType = 'premium'
    lưu premiumToken cho checkout

Khi checkout:
    POST /api/astrology/report { premiumToken: "3f4a..." }
    Server verify: sha256(UPGRADE_CODE + ':hgct-premium') === "3f4a..."
    → cho phép tạo báo cáo
```

---

## Flow 5: CRUD Profiles

```
/profile hoặc /my-charts

Tạo mới:
  click "+ Thêm" → mở ProfileFormModal
  điền form → click "Lưu"
  POST /api/profiles { name, gender, data }
  → prisma.profile.create()
  → refresh list

Sửa:
  /profile: click "Sửa" → mở ProfileFormModal với initialData
  /my-charts: click "Sửa" → mở inline edit form
  điền form → click "Cập nhật"
  PUT /api/profiles { id, name, gender, data }
  → prisma.profile.update()

Xóa:
  click "Xóa" → hiện confirm ("Xác nhận xóa" / "Hủy")
  confirm → DELETE /api/profiles?id=...
  → prisma.profile.delete()
  → remove khỏi local state

Dùng cho báo cáo:
  click "Dịch vụ" → sessionStorage.inputData = profile data → /services
  click "Bản đồ ✦" → /chart?id=profileId
```

---

## Flow 6: Chọn Địa Điểm (LocationPicker)

```
User nhìn thấy: [Việt Nam ▼] [Nhập tên thành phố...] [🔍 Tìm]

Gõ "Hà Nội":
  debounce 600ms → GET /api/location/search?q=Hà Nội&cc=vn

Server:
  fetch Nominatim API → kết quả địa điểm
  for each: tz = geoTz(lat, lon) || 'Asia/Ho_Chi_Minh' (nếu cc=vn)
  ← [{ short_name, display_name, lat, lon, tz, country_code }, ...]

Client:
  hiển thị dropdown kết quả
  user click → setForm.loc = { address, lat, lon, tz }
  hiển thị: "✦ Hà Nội · 21.0245, 105.8412 · Asia/Ho_Chi_Minh"
```

---

## Flow 7: Download PDF

```
/success → click "Tải xuống PDF"
  → GET /api/pdf/{uuid}?filename=LuanGiai_HuongNghiep_NguyenVanA.pdf

Server:
  fs.readFileSync('/var/hgct/pdfs/{uuid}.pdf')
  ← binary PDF, Content-Disposition: attachment
```

---

## Sơ Đồ Data Flow Tóm Tắt

```
Browser sessionStorage
  selectedService ──────→ /checkout đọc
  inputData       ──────→ /checkout → POST report
  inputDataB      ──────→ /checkout (synastry)
  chartInputData  ──────→ /chart đọc
  reportResult    ←────── /processing lưu khi job done

HTTP API (/api/*)
  POST /astrology/report ←── checkout, kèm premiumToken
    ↓ verifies token
    ↓ createJob → DB + cache
    ↓ background: swisseph → Prisma KB → logic → OpenRouter → Puppeteer → Nodemailer
  GET /job/:id ←── processing polling mỗi 2s (cache → DB fallback)
  GET /pdf/:id ←── success download
  CRUD /profiles ←── profile page + my-charts
  GET /chart ←── chart page (by profile ID)

PostgreSQL (zodiacdb)
  knowledge_base ←── read-only, mỗi báo cáo
  users          ←── NextAuth, upgrade, account info
  profiles       ←── CRUD qua /api/profiles
  jobs           ←── persist job state
  orders         ←── chưa dùng (payment TODO)
```
