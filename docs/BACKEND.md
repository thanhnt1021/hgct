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

2. `createJob(uuid)` → in-memory

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
95%  savePdf() → /tmp/hgct-pdfs/{uuid}.pdf
     sendReportEmail() → Nodemailer
100% job.status = 'done', job.result = { pdfUrl, pdfFilename, emailSent }
```

---

### `GET /api/job/:id` — Job Status

**File:** `src/app/api/job/[id]/route.ts`

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

- Đọc `/tmp/hgct-pdfs/{id}.pdf`
- Response với `Content-Disposition: attachment; filename=...`
- Query param `?filename=` để đặt tên file tải về

---

### `GET /api/location/search` — Geocoding

**File:** `src/app/api/location/search/route.ts`

- Query param: `?q=Hà Nội&country=vn`
- Gọi Nominatim API (OpenStreetMap) → kết quả địa điểm
- geo-tz lấy timezone từ lat/lon
- Hardcode `Asia/Ho_Chi_Minh` nếu `country=vn` (bug geo-tz với Hà Nội)

---

### `POST /api/user/upgrade` — Nâng Cấp Premium

**File:** `src/app/api/user/upgrade/route.ts`

```
Input:  { code: "<your-upgrade-code>" }
Logic:  code === process.env.UPGRADE_CODE
Output: { token: sha256(code + ':hgct-premium') }
```

Token này được lưu vào `localStorage.hatgiong_auth.premiumToken` và gửi kèm mỗi request report.

---

### `POST /api/auth/register`

**File:** `src/app/api/auth/register/route.ts`

- Nhận `{ username, name, email, password }`
- Hash password (bcrypt hoặc tương tự)
- Lưu vào `prisma.user` (PostgreSQL)
- **Chú ý:** Auth context hiện tại dùng localStorage, không gọi endpoint này. Endpoint này là backup/future.

---

### `POST /api/auth/forgot-password`

**File:** `src/app/api/auth/forgot-password/route.ts`

- Nhận `{ email }`
- Check `prisma.user.findUnique({ where: { email } })`
- **Chưa gửi email thực** — chỉ return 200. TODO.

---

### `POST /api/astrology/calculate` — Tính Chart Đơn Lẻ

**File:** `src/app/api/astrology/calculate/route.ts`

- Dùng để test / debug chart calculation
- Input: dob, tob, lat, lon, tz
- Output: ChartData object

---

## 2. Astrology Engine

### `calculations.ts` — Swiss Ephemeris Wrapper

**Công cụ:** npm `swisseph` (binding C lib)

**Hàm chính:**
```ts
calculateChart(dobStr, tobStr, lat, lon, tz): ChartData
```

**Steps nội bộ:**
1. Parse date/time → convert local → UTC → Julian Day
2. `swe.swe_calc_ut()` tính vị trí từng hành tinh (lon, lat, speed)
3. `swe.swe_houses()` tính 12 nhà (Placidus) → cusps[0..11]
4. Angles: Asc = cusps[0], MC = cusps[9]
5. Return `ChartData { jd, cusps, angles, planets, meta, info }`

**Planets tính:** Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Chiron, NNode

**Lưu ý bug đã fix:**
- `swe.siderialTime` → dùng `swe.siderealTime` (typo trong lib, thực ra là `siderialTime`)
- House cusps: 0-indexed (trả về array[0..11])

**Hàm tiện ích:**
```ts
getZodiac(lon)              → [idx, name_vn, code, degInSign]
getHouseOfPlanet(lon, cusps) → house number 1-12
checkAspect(lon1, lon2)     → AspectResult | null
getElevatedPlanets(chart)
analyzeHouseInteractions(chart, houseNum, kb)
getDominantPlanetsLogic(chart)
getDominantHousesSorted(chart)
```

---

### `knowledge.ts` — Knowledge Base từ DB

```ts
getKnowledgeFromDB(): Promise<KnowledgeBase>
```

Query tất cả rows từ `knowledge_base` table (Prisma).
Mỗi row: `{ tab_name, data (JSON), updated_at }`

Tab names ví dụ: `zodiac_meaning`, `planet_in_sign`, `planet_in_house`, `aspect_meaning`, ...

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

Mỗi service có `manager.ts` (orchestrate) + `prompt.ts` (build text prompt cho AI).

### Career (`src/lib/logic/career/`)

**manager.ts — `getCareerBlocks(chart, kb)`:**
- block1 (`blockWhoAmI`): Bản thân, tính cách, nguyên tố, phương thức
- block2 (`blockTalents`): Năng khiếu, H1/H3/H6/H9/H10/H11
- block3 (`blockPath`): Con đường sự nghiệp, H10, MC ruler
- block4 (`blockFinance`): Tài chính, H2/H8

Mỗi block trả về object với các fields text được format.

**prompt.ts — `buildCareerPrompt(blocks, profile)`:**
- Ghép tất cả blocks thành prompt text
- Kèm system instructions cho AI cách viết

### Love (`src/lib/logic/love/`)

**manager.ts — `getLoveBlocks(chart, kb)`:**
- Phân tích H5, H7, H8, Venus, Mars, Moon
- Synastry aspect giữa Venus-Mars trong bản đồ đơn

**prompt.ts — `buildLovePrompt(chart, blocks, profile)`**

### Relationship/Synastry (`src/lib/logic/relationship/`)

**manager.ts — `getRelationshipBlocks(chartA, chartB, kb)`:**
- Cross-chart aspects (planets A vs planets B)
- Overlay houses (planets A trong nhà của B và ngược lại)
- Composite chart tính toán

**prompt.ts — `buildRelationshipEssayPrompt(chartA, chartB, blocks, profileA, profileB)`**

### Vanhan/Transit (`src/lib/logic/vanhan/`)

**Không có blocks** — trực tiếp dùng `transit-stubs.ts`:
- `scanHouseTransitsInRange(chart, startDate, endDate)` — hành tinh chậm transit qua nhà
- `findExactAspectTimes(chart, startDate, endDate)` — aspect chính xác
- `getOuterPlanetCycleData(chart, planet)` — Saturn return, Uranus square, etc.

**prompt.ts — `buildVanhanEssayPrompt(chart, startDate, endDate, profile)`**

---

## 4. AI Generation

**File:** `src/lib/openrouter.ts`

**Model:** `anthropic/claude-sonnet-4-6` qua OpenRouter

**Streaming:**
```ts
generateEssayStreaming(systemPrompt, userPrompt, onProgress)
```
- SSE stream → parse `data: {...}` lines
- `onProgress(charsReceived)` callback → update job progress
- `max_tokens: 16000`, `temperature: 0.75`

**Expected output:**
- Career/Love: ~9,000 chars
- Synastry: ~22,000 chars
- Transit: ~28,000 chars

Progress mapping: `18% + (chars/expected) * 67%` → cap 85%

---

## 5. PDF Generation

**File:** `src/lib/pdf/generator.ts`

**Stack:** `@sparticuz/chromium` + `puppeteer-core` (không cần Chrome hệ thống)

**Flow:**
```ts
generatePdf(essayText, { coverTitle, sectionTitle, profile }): Buffer
```
1. `cleanForPdf(text)`:
   - Strip markdown (#, **, *, _, ```)
   - Filter "absence lines" (câu AI viết kiểu "không có dữ liệu")
   - Filter bracket notes `[...]`
   - Remove orphaned subheadings
2. Build HTML với:
   - Base64-encoded fonts từ `/public/fonts/`
   - Cover page: tên, ngày sinh, title
   - Section pages: essay text chia đoạn
3. `puppeteer.launch()` với chromium từ `@sparticuz/chromium`
4. `page.setContent(html)` → `page.pdf({ format: 'A4' })`
5. Return Buffer

PDF files lưu tại `/tmp/hgct-pdfs/{uuid}.pdf` (không persist qua reboot).

---

## 6. Email

**File:** `src/lib/email.ts`

```ts
sendReportEmail(to, name, service, pdfBuffer, nameB?): Promise<void>
```

**Config:**
```
host: smtp.hostinger.com
port: 465
secure: true (SSL)
auth: SMTP_USER / SMTP_PASS
```

Email HTML template có tên, dịch vụ, PDF đính kèm (inline attachment).
`makePdfFilename(service, nameA, nameB?)` → tên file download.

---

## 7. Job Store

**File:** `src/lib/jobs.ts`

In-memory `Map<string, Job>` lưu trên `global.__hgctJobs` (tồn tại qua module re-evaluation).

```ts
interface Job {
  id, status, progress, label, result, error, createdAt
}
createJob(id)       → Job
updateJob(id, data) → void
getJob(id)          → Job | undefined
```

Auto-cleanup: xóa jobs > 1 giờ, chạy mỗi 15 phút.

**Giới hạn:** Nếu Node.js process restart → mất tất cả jobs (không persist ra DB/Redis).

---

## 8. Prisma Client

**File:** `src/lib/db.ts`

```ts
import { PrismaClient } from '@prisma/client'
const globalForPrisma = global as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
export default prisma
```

Singleton pattern — tránh tạo quá nhiều connection trong dev hot-reload.
