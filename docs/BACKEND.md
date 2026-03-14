# HGCT — Backend

> API Routes, Logic Engine, AI, PDF, Email, Jobs

---

## 1. API Routes

### `POST /api/astrology/report` — Tạo Báo Cáo

**File:** `src/app/api/astrology/report/route.ts`

**Request body:**
```json
{
  "service": "career|love|synastry|transit",
  "inputData": { "name", "gender", "dob", "tob", "loc" },
  "inputDataB": { ... },      // chỉ synastry
  "email": "user@example.com",
  "premiumToken": "sha256...",
  "startDate": "2025-01-01",  // chỉ transit
  "endDate": "2026-01-01"
}
```

**Logic:**
1. Validate `premiumToken`:
   ```ts
   sha256(UPGRADE_CODE + ':hgct-premium') === premiumToken
   ```
   → 403 nếu sai

2. `createJob(uuid)` → ghi DB + in-memory

3. Fire-and-forget `processReport()`, return `{ jobId }` ngay

**Background `processReport()` steps:**
```
5%   calculateChart(dob, tob, lat, lon, tz)  → ChartData
10%  getKnowledgeFromDB()                    → KB từ PostgreSQL
15%  build prompt theo service:
       career:      getCareerBlocks() → buildCareerPrompt()
       love:        getLoveBlocks()   → buildLovePrompt()
       synastry:    calculateChart(B) → getRelationshipBlocks() → buildRelationshipEssayPrompt()
       transit:     buildVanhanEssayPrompt() (không có blocks)
18-85% generateEssayStreaming() → OpenRouter SSE
90%  generatePdf() → Puppeteer → Buffer
95%  savePdf() → /var/hgct/pdfs/{uuid}.pdf
     sendReportEmail() → Nodemailer
100% job.status = 'done', job.result = { pdfUrl, pdfFilename, emailSent }
```

---

### `GET /api/job/:id` — Job Status

**File:** `src/app/api/job/[id]/route.ts`

Đọc từ in-memory cache trước, fallback về DB (`getJobFromDb`).

Response:
```json
{
  "id": "uuid",
  "status": "processing|done|error",
  "progress": 75,
  "label": "Đang hoàn thiện nội dung...",
  "result": { "pdfUrl": "/api/pdf/...", "pdfFilename": "...", "emailSent": true, "email": "..." },
  "error": "..."
}
```

---

### `GET /api/pdf/:id` — Download PDF

**File:** `src/app/api/pdf/[id]/route.ts`

- Đọc `/var/hgct/pdfs/{id}.pdf`
- Response `Content-Disposition: attachment; filename=...`
- Query param `?filename=` để đặt tên file

---

### `GET/POST/PUT/DELETE /api/profiles` — CRUD Profiles

**File:** `src/app/api/profiles/route.ts`

```
GET    → prisma.profile.findMany({ where: { userUid, isTemp: false } })  ← chỉ trả permanent profiles
POST   { name, gender, data, isTemp? } → prisma.profile.create()
         isTemp=true → tempExpiry = now + 30 ngày (tự xóa sau 30 ngày)
PUT    { id, name, gender, data } → prisma.profile.update()
DELETE ?id=... → soft-delete linked jobs + move PDF → soon_delete → prisma.profile.delete()
```

Yêu cầu session (NextAuth). `data` là JSON: `{ ho, dem, ten, note, dob, tob, loc }`.

---

### `POST /api/profiles/confirm` — Nâng Cấp Temp Profile

**File:** `src/app/api/profiles/confirm/route.ts`

```
Input:  { profileUids: string[] }
Logic:  prisma.profile.updateMany({ where: { profileUid in uids, userUid, isTemp: true }, data: { isTemp: false, tempExpiry: null } })
Output: { success: true }
```

Dùng khi user click [Lưu ngay] trong HistoryReports. Nhận array để xử lý synastry (2 temp profiles 1 lúc).

---

### `GET /api/cron/cleanup` — Dọn Dẹp Temp & PDF Hết Hạn

**File:** `src/app/api/cron/cleanup/route.ts`

Auth: `Authorization: Bearer {CRON_SECRET}` (env var).

**Phase 1 — expired temp profiles:**
- Tìm profiles WHERE `isTemp=true AND tempExpiry <= now`
- Move PDF sang `/var/hgct/pdfs/soon_delete/`
- Update linked jobs: `pdfExpiresAt = now + 7 ngày`, `pdfNote = "..."`
- Xóa profile khỏi DB

**Phase 2 — xóa PDF khỏi disk:**
- Tìm jobs WHERE `pdfExpiresAt <= now`
- Xóa file tương ứng trong `soon_delete/`

Chạy hằng ngày: `0 1 * * * curl -H "Authorization: Bearer {secret}" https://hatgiongchiemtinh.com/api/cron/cleanup`

---

### `GET/POST /api/chart` — Lưu / Lấy Natal Chart

**File:** `src/app/api/chart/route.ts`

- `GET ?id=profileId` → load profile từ DB → tính chart → trả ChartData
- `POST { inputData }` → tính chart từ input → trả ChartData

---

### `GET /api/location/search` — Geocoding

**File:** `src/app/api/location/search/route.ts`

- Query param: `?q=Hà Nội&cc=vn`
- Gọi Nominatim API → kết quả địa điểm
- geo-tz lấy timezone từ lat/lon
- Hardcode `Asia/Ho_Chi_Minh` nếu `cc=vn`

---

### `POST /api/user/upgrade` — Nâng Cấp Premium

**File:** `src/app/api/user/upgrade/route.ts`

```
Input:  { code: "<your-upgrade-code>" }
Logic:  code === process.env.UPGRADE_CODE
        → cập nhật User.planType = 'premium', User.isPremium = true (DB)
Output: { token: sha256(code + ':hgct-premium') }
```

---

### `POST /api/auth/forgot-password`

- Nhận `{ email }`
- Tìm user theo email → nếu không có: trả 200 (không leak existence)
- Generate `crypto.randomBytes(32).toString('hex')` → lưu vào `user.resetToken` + `resetTokenExpiry` (now + 1h)
- Gửi email chứa link `${APP_URL}/auth/reset-password?token=...`
- Link có hiệu lực 1 giờ

---

### `POST /api/auth/reset-password`

- Nhận `{ token, newPassword }`
- Tìm user where `resetToken = token AND resetTokenExpiry > now`
- Nếu không có: 400 "Link đã hết hạn hoặc không hợp lệ"
- Hash newPassword → update passwordHash, xóa resetToken + resetTokenExpiry

---

### `POST /api/user/password` — Đổi Mật Khẩu

- Yêu cầu session (NextAuth)
- Nhận `{ currentPassword, newPassword }` (min 6 chars)
- Verify currentPassword bằng sha256 → nếu sai: 400
- Hash newPassword → `prisma.user.update({ passwordHash })`

---

### `POST /api/auth/register`

- Nhận `{ username, name, email, password }`
- bcrypt hash password
- `prisma.user.create()` → PostgreSQL

---

### `POST /api/astrology/calculate` — Tính Chart Đơn Lẻ

- Debug/test endpoint
- Input: dob, tob, lat, lon, tz
- Output: ChartData object

---

## 2. Astrology Engine

### `calculations.ts` — Swiss Ephemeris Wrapper

**Hàm chính:**
```ts
calculateChart(dobStr, tobStr, lat, lon, tz): ChartData
```

**Steps:**
1. Parse date/time → convert local → UTC → Julian Day
2. `swe.swe_calc_ut()` tính vị trí từng hành tinh (lon, lat, speed)
3. `swe.swe_houses()` tính 12 nhà (Placidus) → cusps[0..11]
4. Angles: Asc = cusps[0], MC = cusps[9]
5. Return `ChartData { jd, cusps, angles, planets, meta, info }`

**Planets:** Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Chiron, NNode

**Bugs đã fix:**
- `swe.siderialTime` (typo trong lib, KHÔNG phải `siderealTime`)
- House cusps: 0-indexed

---

### `knowledge.ts` — Knowledge Base từ DB

```ts
getKnowledgeFromDB(): Promise<KnowledgeBase>
```
Query tất cả rows từ `knowledge_base` table.

---

### `base.ts` — KB Lookup Utilities

```ts
getZodiacMeaning(kb, zodiacCode, field?)
getPlanetInSign(kb, planet, zodiacCode)
getPlanetInHouse(kb, planet, houseNum)
getAspectMeaning(kb, planet1, aspect, planet2)
getHouseMeaning(kb, houseNum)
```

---

## 3. Logic Blocks

### Career (`src/lib/logic/career/`)
- `getCareerBlocks(chart, kb)`: block1 (tính cách), block2 (năng khiếu), block3 (sự nghiệp H10), block4 (tài chính H2/H8)
- `buildCareerPrompt(blocks, profile)` → prompt text

### Love (`src/lib/logic/love/`)
- `getLoveBlocks(chart, kb)`: H5, H7, H8, Venus, Mars, Moon
- `buildLovePrompt(chart, blocks, profile)` → prompt text

### Relationship/Synastry (`src/lib/logic/relationship/`)
- `getRelationshipBlocks(chartA, chartB, kb)`: cross aspects, overlay houses, composite
- `buildRelationshipEssayPrompt(chartA, chartB, blocks, profileA, profileB)` → prompt text

### Vanhan/Transit (`src/lib/logic/vanhan/`)
- Không có blocks — dùng `transit-stubs.ts` trực tiếp
- `buildVanhanEssayPrompt(chart, startDate, endDate, profile)` → prompt text

---

## 4. AI Generation

**File:** `src/lib/openrouter.ts`
**Model:** `anthropic/claude-sonnet-4-6` qua OpenRouter

```ts
generateEssayStreaming(systemPrompt, userPrompt, onProgress, onRetry?)
```
- SSE stream → parse `data: {...}` lines
- `max_tokens: 32000`, `temperature: 0.75`
- Expected: career/love ~9k chars, synastry ~22k, transit ~28k (~22900 tokens)
- Progress mapping: `18% + (chars/expected) * 67%` → cap 85%
- **Retry logic:** 3 lần tự động cho ECONNRESET, terminated, hoặc `StreamInterruptedError` (stream kết thúc mà không có `[DONE]` marker)
- `onRetry(attempt, reason)` callback → route.ts update label user "Kết nối bị gián đoạn — đang thử lại lần N..."

**MIN_CHARS per service** (trong route.ts) — nếu output quá ngắn sau stream thì retry toàn bộ:
```
transit:  12000 chars
synastry: 10000 chars
career:    4000 chars
love:      4000 chars
```

---

## 5. PDF Generation

**File:** `src/lib/pdf/generator.ts`
**Stack:** `@sparticuz/chromium` + `puppeteer-core`

```ts
generatePdf(essayText, { coverTitle, sectionTitle, profile }): Buffer
```
1. `cleanForPdf(text)` — strip markdown, filter absence lines, filter `[...]`
2. Build HTML với fonts base64 từ `/public/fonts/`
3. `puppeteer.launch()` → `page.setContent(html)` → `page.pdf({ format: 'A4' })`
4. Return Buffer

**PDF storage:** `/var/hgct/pdfs/{uuid}.pdf` (persistent, tạo bởi deploy.sh)

---

## 6. Email

**File:** `src/lib/email.ts`

```ts
sendReportEmail(to, name, service, pdfBuffer, nameB?): Promise<void>
```

```
host: smtp.hostinger.com
port: 465 (SSL)
auth: SMTP_USER / SMTP_PASS
```

---

## 7. Job Store

**File:** `src/lib/jobs.ts`

**Dual-layer:** DB (persist) + in-memory `Map` (fast read)

```ts
interface Job {
  id, status, progress, label, result, error, createdAt,
  profileUidA?, profileUidB?, pdfExpiresAt?, pdfNote?
}
createJob(id, meta?)   → ghi DB + cache
updateJob(id, data)    → update DB + cache
getJob(id)             → đọc cache only (sync)
getJobFromDb(id)       → cache trước, fallback DB (async) + markStuckIfNeeded
cancelJob(id)          → xóa khỏi DB, set status cancelled trong cache
isJobCancelled(id)     → check cache
```

**Auto-timeout stuck jobs:**
- `STUCK_TIMEOUT_MS = 15 phút`
- `sweepStuckJobsOnce()` chạy khi server khởi động — mark tất cả jobs processing > 15 phút thành error
- `markStuckIfNeeded(job)` chạy mỗi lần `getJobFromDb` được gọi
- In-memory cache auto-cleanup sau 1 giờ

**Hủy báo cáo:**
- Nút Hủy trên `/processing` → `DELETE /api/job/:id` → `cancelJob()` → xóa DB, set cancelled in memory
- `isJobCancelled(jobId)` được check tại các checkpoint trong `processReport()`

---

## 8. Prisma Client

**File:** `src/lib/db.ts`

Singleton pattern — tránh tạo quá nhiều connection trong dev hot-reload.
