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
  created_at    VARCHAR DEFAULT ''
);
```

| Cột | Mô tả |
|---|---|
| `id` | Auto-increment PK |
| `username` | Tên đăng nhập (unique, lowercase) |
| `email` | Email (unique, nullable) |
| `password_hash` | Hash password (bcrypt) |
| `user_uid` | UUID dùng làm FK (thay vì id) |
| `created_at` | ISO string |

**Trạng thái hiện tại:** Bảng này tồn tại nhưng **chưa được dùng bởi auth flow** (auth dùng localStorage). Chỉ `getKnowledgeFromDB()` và future features mới dùng Prisma.

---

### `profiles` — Hồ Sơ Chiêm Tinh

```sql
CREATE TABLE profiles (
  id         SERIAL PRIMARY KEY,
  user_uid   VARCHAR NOT NULL REFERENCES users(user_uid),
  name       VARCHAR NOT NULL,
  gender     VARCHAR,
  data       JSONB,
  created_at VARCHAR DEFAULT ''
);
```

| Cột | Mô tả |
|---|---|
| `user_uid` | FK → users.user_uid |
| `name` | Tên đầy đủ |
| `gender` | 'Male'|'Female'|'Other' |
| `data` | JSON: { ho, dem, ten, dob, tob, loc, ... } |

**Trạng thái hiện tại:** Bảng tồn tại nhưng **profiles lưu trong localStorage** (`hatgiong_profiles`), không sync lên DB. Prisma Profile model chưa được gọi trong code.

---

### `knowledge_base` — Kiến Thức Chiêm Tinh

```sql
CREATE TABLE knowledge_base (
  tab_name   VARCHAR PRIMARY KEY,
  data       JSONB NOT NULL,
  updated_at VARCHAR DEFAULT ''
);
```

| Cột | Mô tả |
|---|---|
| `tab_name` | ID của bảng kiến thức (unique) |
| `data` | JSON chứa nội dung chiêm tinh |

**Đây là bảng quan trọng nhất** — được query trong mỗi lần tạo báo cáo.

**Cách dùng:**
```ts
const kb = await getKnowledgeFromDB()
// kb là Map<tabName, any> hoặc Record<string, any>
// các tab_name ví dụ:
//   planet_in_sign_{planet}_{sign}
//   planet_in_house_{planet}_{house}
//   aspect_{planet1}_{aspect}_{planet2}
//   house_meaning_{house}
//   zodiac_trait_{sign}
//   ... (tùy data migration từ ~/mo)
```

---

### `orders` — Đơn Hàng

```sql
CREATE TABLE orders (
  id           SERIAL PRIMARY KEY,
  user_uid     VARCHAR,             -- nullable, guest order
  service      VARCHAR NOT NULL,    -- career|love|synastry|transit
  profile_data JSONB NOT NULL,      -- snapshot inputData lúc đặt
  email        VARCHAR NOT NULL,
  status       VARCHAR DEFAULT 'pending',  -- pending|paid|processing|done
  pdf_url      VARCHAR,
  created_at   TIMESTAMP DEFAULT NOW()
);
```

**Trạng thái hiện tại:** Bảng tồn tại nhưng **chưa được ghi** trong report flow. Order không được lưu DB hiện tại. Payment integration cũng chưa có.

---

## 3. Prisma Models

```prisma
model User {
  id           Int       @id @default(autoincrement())
  username     String    @unique
  email        String?   @unique
  passwordHash String    @map("password_hash")
  userUid      String    @unique @map("user_uid")
  createdAt    String    @default("") @map("created_at")
  profiles     Profile[]
  @@map("users")
}

model Profile {
  id        Int    @id @default(autoincrement())
  userUid   String @map("user_uid")
  name      String
  gender    String?
  data      Json
  createdAt String @default("") @map("created_at")
  user      User   @relation(fields: [userUid], references: [userUid])
  @@map("profiles")
}

model KnowledgeBase {
  tabName   String @id @map("tab_name")
  data      Json
  updatedAt String @default("") @map("updated_at")
  @@map("knowledge_base")
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
| `prisma.user.findUnique({ where: { email } })` | `src/app/api/auth/forgot-password/route.ts` | Khi user quên mật khẩu |

---

## 5. Trạng Thái Hiện Tại vs Tương Lai

| Tính năng | Hiện tại | Nên làm |
|---|---|---|
| Auth users | localStorage only | Migrate sang DB (Prisma User) |
| Profiles | localStorage only | Sync lên Prisma Profile |
| Orders | Không lưu | Ghi Order khi confirm |
| Password reset | Chưa hoạt động | Gửi email link reset |
| Session | localStorage | Server session hoặc JWT |

---

## 6. Migrations

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
