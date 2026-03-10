# HGCT — Luồng Xử Lý End-to-End

> Mô tả chi tiết từng flow quan trọng, kết nối Frontend ↔ Backend ↔ DB

---

## Flow 1: Tạo Báo Cáo Chiêm Tinh

### Bước 1 — Chọn Dịch Vụ (`/services`)

```
User → /services
  Client đọc localStorage.hatgiong_profiles → hiển thị dropdown
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
    premiumToken: 'abc123...',  // từ localStorage
    (inputDataB: ... nếu synastry)
  }
  ← { jobId: 'uuid' }
  → redirect /processing?job=uuid&service=career&name=Nguyễn Văn A
```

### Bước 3 — Server Nhận Request (`/api/astrology/report`)

```
Server:
  1. Verify premiumToken:
     sha256(UPGRADE_CODE + ':hgct-premium') == premiumToken
     → 403 nếu sai

  2. createJob(jobId) → global.__hgctJobs.set(jobId, {status:'processing', progress:0})

  3. processReport(jobId, body) — fire-and-forget (không await)

  4. Return { jobId } → browser nhận < 50ms
```

### Bước 4 — Background Processing

```
processReport(jobId, body):

  [5%] calculateChart(dob, tob, lat, lon, tz)
       swisseph C library:
         - Julian Day từ UTC datetime
         - swe_calc_ut() cho 12 planets
         - swe_houses() Placidus → 12 cusps
       → ChartData { jd, cusps, angles, planets, meta, info }

  [10%] getKnowledgeFromDB()
        prisma.knowledgeBase.findMany()
        → KB object { [tab_name]: data }

  [15%] Build prompt:
        career:   getCareerBlocks(chart, kb) → 4 blocks
                  buildCareerPrompt(blocks, profile) → ~3000 char prompt

        love:     getLoveBlocks(chart, kb) → blocks
                  buildLovePrompt(chart, blocks, profile) → prompt

        synastry: calculateChart(B) → chartB
                  getRelationshipBlocks(chartA, chartB, kb) → blocks
                  buildRelationshipEssayPrompt(...) → ~5000 char prompt

        transit:  buildVanhanEssayPrompt(chart, startDate, endDate, profile) → prompt

  [18-85%] generateEssayStreaming(systemPrompt, prompt, onProgress):
           POST https://openrouter.ai/api/v1/chat/completions
           { model: 'anthropic/claude-sonnet-4-6', stream: true, max_tokens: 16000 }
           → SSE stream, đọc chunks
           → onProgress(charsReceived) → updateJob(progress%)
           → full essay text (9000-28000 chars)

  [90%] generatePdf(essayText, { coverTitle, sectionTitle, profile }):
        cleanForPdf(text) — strip markdown, filter absence lines
        Build HTML string với fonts base64 + CSS
        puppeteer-core + @sparticuz/chromium:
          launch() → page.setContent(html) → page.pdf({format:'A4'})
        → pdfBuffer (Buffer)

  [95%] savePdf(buffer) → /tmp/hgct-pdfs/{uuid}.pdf
        pdfUrl = '/api/pdf/{uuid}?filename=...'

  [95%] sendReportEmail(email, name, service, pdfBuffer):
        nodemailer.createTransport(smtp.hostinger.com:465)
        mail { to, subject, html, attachments: [{ content: pdfBuffer }] }
        → emailSent = true/false

  [100%] updateJob(jobId, { status: 'done', progress: 100,
           result: { pdfUrl, pdfFilename, emailSent, email } })
```

### Bước 5 — Polling (`/processing`)

```
Client setInterval 2s:
  GET /api/job/{jobId}
  ← { status, progress, label }

  Cập nhật UI:
    - Progress bar width = progress%
    - Label text
    - Checklist steps (active/done)

  Khi status === 'done':
    clearInterval
    sessionStorage.reportResult = job.result
    setTimeout(2s) → redirect /success
```

### Bước 6 — Kết Quả (`/success`)

```
Client đọc sessionStorage.reportResult {
  pdfUrl: '/api/pdf/uuid?filename=...',
  pdfFilename: 'LuanGiai_HuongNghiep_NguyenVanA.pdf',
  emailSent: true,
  email: 'user@email.com'
}

Hiển thị:
  "✓ Email đã gửi đến user@email.com"
  [Tải xuống PDF] → GET /api/pdf/uuid → file download
```

---

## Flow 2: Đăng Ký / Đăng Nhập

```
/auth/register
  User nhập: username, họ tên, email, password
  AuthContext.register():
    validate (required, password >= 6 chars, username unique)
    simpleHash(password) → djb2 hash (KHÔNG cryptographic)
    localStorage.hatgiong_users[username] = { name, email, passwordHash }
    localStorage.hatgiong_auth = { username, name, email, isPremium: false }
    setUser(userData)
  → redirect /profile

/auth/login
  User nhập: username, password
  AuthContext.login():
    getUsers() → hatgiong_users
    hash input password → compare with stored hash
    nếu khớp: localStorage.hatgiong_auth = userData, setUser()
  → redirect /profile
```

**⚠ Lưu ý bảo mật:** Hash dùng là djb2 (bitwise, không cryptographic). Không phải bcrypt/sha256. Phù hợp cho demo, không an toàn cho production thực.

---

## Flow 3: Upgrade Premium

```
/profile → click "Nâng cấp tài khoản"
  User nhập upgrade code (ví dụ: "<your-upgrade-code>")

  AuthContext.upgradeToPremium(code):
    POST /api/user/upgrade { code: "<your-upgrade-code>" }

    Server /api/user/upgrade:
      process.env.UPGRADE_CODE === "<your-upgrade-code>"
      → token = sha256("<upgrade-code>:hgct-premium")
      ← { token: "3f4a..." }

    Client nhận token:
      localStorage.hatgiong_auth.isPremium = true
      localStorage.hatgiong_auth.premiumToken = "3f4a..."
      localStorage.hatgiong_users[username].isPremium = true  ← persist sau logout
      setUser(updated)

Khi checkout:
    POST /api/astrology/report { premiumToken: "3f4a..." }
    Server verify: sha256(UPGRADE_CODE + ':hgct-premium') === "3f4a..."
    → cho phép tạo báo cáo
```

---

## Flow 4: Chọn Địa Điểm (LocationPicker)

```
User gõ tên thành phố: "Hà Nội"

LocationPicker → GET /api/location/search?q=Hà Nội&country=vn

Server:
  fetch https://nominatim.openstreetmap.org/search?q=Hà+Nội&format=json&...
  → array kết quả { display_name, lat, lon, ... }
  for each result:
    tz = geoTz.find(lat, lon)[0]
    if country === 'vn': tz = 'Asia/Ho_Chi_Minh'  ← hardcode fix
  ← [{ address, lat, lon, tz }, ...]

Client hiển thị dropdown → user click → setForm.loc = { address, lat, lon, tz }
```

---

## Flow 5: Download PDF

```
/success → user click "Tải xuống PDF"
  → GET /api/pdf/{uuid}?filename=LuanGiai_HuongNghiep_NguyenVanA.pdf

Server /api/pdf/[id]:
  fs.readFileSync('/tmp/hgct-pdfs/{uuid}.pdf')
  Response headers:
    Content-Type: application/pdf
    Content-Disposition: attachment; filename="LuanGiai_..."
  ← binary PDF data
```

---

## Flow 6: Quên Mật Khẩu (Hiện Tại — Chưa Hoàn Chỉnh)

```
/auth/forgot-password
  User nhập email

  POST /api/auth/forgot-password { email }
  Server:
    prisma.user.findUnique({ where: { email } })
    nếu không tìm thấy: return 200 (không tiết lộ email có tồn tại không)
    nếu tìm thấy: TODO — chưa gửi email
  ← 200

UI:
  Hiển thị "Nếu email tồn tại, chúng tôi đã gửi link..."
  (Thực tế không gửi gì)
```

**TODO:** Implement thực sự:
1. Generate reset token, lưu DB
2. Gửi email qua Nodemailer với link `/auth/reset-password?token=...`
3. Trang `/auth/reset-password` → validate token → cho đặt mật khẩu mới

---

## Sơ Đồ Data Flow Tóm Tắt

```
Browser localStorage
  hatgiong_users      ←→  AuthContext (register/login)
  hatgiong_auth       ←→  AuthContext (session)
  hatgiong_profiles   ←→  Profile page (CRUD)

Browser sessionStorage
  selectedService ──────→ /checkout đọc
  inputData       ──────→ /checkout → POST report
  inputDataB      ──────→ /checkout (synastry)
  reportResult    ←────── /processing lưu khi job done

HTTP API (/api/*)
  POST /astrology/report ←── checkout, kèm premiumToken
    ↓ verifies token
    ↓ createJob (in-memory)
    ↓ background: swisseph → Prisma KB → logic → OpenRouter → Puppeteer → Nodemailer
  GET /job/:id ←── processing polling mỗi 2s
  GET /pdf/:id ←── success download

PostgreSQL (zodiacdb)
  knowledge_base ←── read-only, mỗi báo cáo
  users          ←── chưa dùng (auth dùng localStorage)
  profiles       ←── chưa dùng (profiles dùng localStorage)
  orders         ←── chưa dùng
```
