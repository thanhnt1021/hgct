# HGCT — Database

> PostgreSQL `zodiacdb` · Prisma v5 · Các bảng và quan hệ

---

## 1. Kết Nối

```
Host:     localhost:5432
Database: zodiacdb
User:     nguydev
Password: (xem .env.local → DATABASE_URL)
```

Prisma schema: `prisma/schema.prisma`

---

## 2. Bảng

### `users` — Tài Khoản

```sql
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR UNIQUE NOT NULL,
  email         VARCHAR UNIQUE,
  password_hash VARCHAR NOT NULL,
  user_uid      VARCHAR UNIQUE NOT NULL,
  plan_type     VARCHAR DEFAULT 'free',
  is_premium    BOOLEAN DEFAULT false,
  report_email  VARCHAR,
  avatar        TEXT,
  main_chart_data JSONB,
  reset_token   TEXT,
  reset_token_expiry TIMESTAMP,
  created_at    VARCHAR DEFAULT ''
);
```

| Cột | Mô tả |
|---|---|
| `user_uid` | UUID dùng làm FK, cũng là NextAuth session uid |
| `plan_type` | 'free'|'premium'|'lifetime' |
| `is_premium` | true nếu plan_type != 'free' |
| `report_email` | Email nhận báo cáo (có thể khác email đăng ký) |
| `avatar` | URL hoặc base64 ảnh đại diện |
| `main_chart_data` | JSON natal chart đã tính (cache) |

**Trạng thái:** Đang dùng bởi NextAuth + `/api/profiles` + `/api/user/*`.

---

### `profiles` — Hồ Sơ Chiêm Tinh

```sql
CREATE TABLE profiles (
  id          SERIAL PRIMARY KEY,
  user_uid    VARCHAR NOT NULL REFERENCES users(user_uid),
  profile_uid VARCHAR UNIQUE NOT NULL,
  name        VARCHAR NOT NULL,
  gender      VARCHAR,
  data        JSONB,
  created_at  VARCHAR DEFAULT '',
  is_temp     BOOLEAN NOT NULL DEFAULT false,
  temp_expiry TIMESTAMP
);
```

| Cột | Mô tả |
|---|---|
| `user_uid` | FK → users.user_uid |
| `profile_uid` | UUID riêng cho profile — dùng làm tên file PDF (`{profileUid}_{service}.pdf`) |
| `name` | Tên đầy đủ (họ đệm tên ghép) |
| `gender` | 'Male'\|'Female'\|'Other' |
| `data` | JSON encrypted AES-256-GCM: `{ ho, dem, ten, note, dob, tob, loc }` — format: `{ _enc: "iv:ct:tag" }` |
| `is_temp` | true = profile tạm thời (user không tick Lưu hồ sơ khi submit /input) |
| `temp_expiry` | Thời điểm profile tự xóa (now + 30 ngày khi tạo temp) |

**Encryption:** `data` được mã hóa bằng `PROFILE_ENCRYPTION_KEY` (env var). Decrypt tự động trong `/api/profiles` GET. Backup plaintext: `/var/hgct/backups/`.

**Temp Profile flow:** User đăng nhập + submit /input mà không tick "Lưu hồ sơ" → tạo profile với `isTemp=true`, `tempExpiry=now+30d`. PDF đặt tên đầy đủ như permanent. Cron 01:00 AM dọn dẹp expired temp profiles. User có thể nâng cấp temp → permanent qua `POST /api/profiles/confirm`.

**Trạng thái:** **Đang dùng** — CRUD qua `/api/profiles` (GET/POST/PUT/DELETE). GET chỉ trả `isTemp=false`. Hiển thị trong `/profile`, `/my-charts`, `/services`.

---

### `knowledge_base` — Kiến Thức Chiêm Tinh

```sql
CREATE TABLE knowledge_base (
  tab_name   VARCHAR PRIMARY KEY,
  data       JSONB NOT NULL,
  updated_at VARCHAR DEFAULT ''
);
```

**Đây là bảng quan trọng nhất** — query trong mỗi lần tạo báo cáo.

```ts
const kb = await getKnowledgeFromDB()
// kb là Record<tabName, any>
// tab_name ví dụ:
//   planet_in_sign_{planet}_{sign}
//   planet_in_house_{planet}_{house}
//   aspect_{planet1}_{aspect}_{planet2}
//   house_meaning_{house}
//   zodiac_trait_{sign}
```

---

### `jobs` — Job Tracking

```sql
CREATE TABLE jobs (
  id         VARCHAR PRIMARY KEY,   -- UUID
  user_uid   VARCHAR,               -- nullable (guest)
  service    VARCHAR,               -- career|love|synastry|transit
  status     VARCHAR DEFAULT 'processing',  -- processing|done|error
  progress   INTEGER DEFAULT 0,
  label      VARCHAR DEFAULT '',
  result     JSONB,
  error      VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Trạng thái:** **Đang dùng** — persist jobs ra DB, survive server restart. In-memory cache để fast read.

---

### `orders` — Đơn Hàng

```sql
CREATE TABLE orders (
  id           SERIAL PRIMARY KEY,
  user_uid     VARCHAR,
  service      VARCHAR NOT NULL,
  profile_data JSONB NOT NULL,
  email        VARCHAR NOT NULL,
  status       VARCHAR DEFAULT 'pending',
  pdf_url      VARCHAR,
  created_at   TIMESTAMP DEFAULT NOW()
);
```

**Trạng thái:** Bảng tồn tại nhưng **chưa ghi** trong report flow. Cần tích hợp payment.

---

## 3. Prisma Models

```prisma
model User {
  id            Int       @id @default(autoincrement())
  username      String    @unique
  email         String?   @unique
  passwordHash  String    @map("password_hash")
  userUid       String    @unique @map("user_uid")
  planType      String    @default("free") @map("plan_type")
  isPremium     Boolean   @default(false) @map("is_premium")
  reportEmail   String?   @map("report_email")
  avatar           String?
  mainChartData    Json?     @map("main_chart_data")
  resetToken       String?   @map("reset_token")
  resetTokenExpiry DateTime? @map("reset_token_expiry")
  createdAt        String    @default("") @map("created_at")
  profiles      Profile[]
  @@map("users")
}

model Profile {
  id         Int       @id @default(autoincrement())
  userUid    String    @map("user_uid")
  profileUid String    @unique @map("profile_uid")
  name       String
  gender     String?
  data       Json
  createdAt  String    @default("") @map("created_at")
  isTemp     Boolean   @default(false) @map("is_temp")
  tempExpiry DateTime? @map("temp_expiry")
  user       User      @relation(fields: [userUid], references: [userUid])
  @@map("profiles")
}

model KnowledgeBase {
  tabName   String @id @map("tab_name")
  data      Json
  updatedAt String @default("") @map("updated_at")
  @@map("knowledge_base")
}

model Job {
  id        String   @id
  userUid   String?  @map("user_uid")
  service   String?
  status    String   @default("processing")
  progress  Int      @default(0)
  label     String   @default("")
  result    Json?
  error     String?
  createdAt DateTime @default(now()) @map("created_at")
  @@map("jobs")
}

model Order {
  id          Int      @id @default(autoincrement())
  userUid     String?  @map("user_uid")
  service     String
  profileData Json     @map("profile_data")
  email       String
  status      String   @default("pending")
  pdfUrl      String?  @map("pdf_url")
  createdAt   DateTime @default(now()) @map("created_at")
  @@map("orders")
}
```

---

## 4. Queries Đang Dùng

| Query | File | Tần suất |
|---|---|---|
| `prisma.knowledgeBase.findMany()` | `src/lib/astrology/knowledge.ts` | Mỗi lần tạo báo cáo |
| `prisma.profile.findMany({ where: { userUid } })` | `src/app/api/profiles/route.ts` | Mỗi lần load profile list |
| `prisma.profile.create/update/delete` | `src/app/api/profiles/route.ts` | CRUD profiles |
| `prisma.job.create/update/findUnique` | `src/lib/jobs.ts` | Mỗi lần tạo/update/query job |
| `prisma.user.findUnique` | `src/lib/auth.ts`, `/api/auth/*` | Auth + forgot password |

---

## 5. Migrations

```bash
# Tạo migration mới
npx prisma migrate dev --name tên_migration

# Apply migration lên production
npx prisma migrate deploy

# Generate Prisma Client sau khi thay đổi schema
npx prisma generate

# Xem DB trong browser
npx prisma studio
```

**Lưu ý:** Chạy trong `/root/hgct/` với `.env.local` có `DATABASE_URL`.
