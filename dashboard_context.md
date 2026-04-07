# HGCT — Supplementary Context for Dashboard Planning

> File tổng hợp dùng cùng CLAUDE.md để lên kế hoạch admin dashboard.

---

## 1. Prisma Schema (đầy đủ, exact field names)

```prisma
model User {
  id           Int      @id @default(autoincrement())
  username     String   @unique
  email        String?  @unique
  passwordHash String   @map("password_hash")
  userUid      String   @unique @map("user_uid")
  createdAt    String   @default("") @map("created_at")
  isPremium    Boolean  @default(false) @map("is_premium")
  planType     String   @default("free") @map("plan_type")  // "free" | "premium" | "lifetime"
  premiumToken     String?   @map("premium_token")
  resetToken       String?   @map("reset_token")
  resetTokenExpiry DateTime? @map("reset_token_expiry")
  mainChartData    Json?     @map("main_chart_data")
  reportEmail      String?   @map("report_email")
  profiles         Profile[]
  @@map("users")
}

model Config {
  key       String   @id
  value     String
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at")
  @@map("config")
}

model Order {
  id            Int       @id @default(autoincrement())
  userUid       String?   @map("user_uid")
  service       String    // "career" | "love" | "synastry" | "transit"
  profileData   Json      @map("profile_data")
  email         String
  status        String    @default("pending")  // pending | processing | completed | failed | cancelled
  pdfUrl        String?   @map("pdf_url")
  createdAt     DateTime  @default(now()) @map("created_at")
  transferCode  String?   @unique @map("transfer_code")
  amount        Int?
  paymentStatus String    @default("unpaid") @map("payment_status")  // unpaid | paid
  paidAt        DateTime? @map("paid_at")
  jobId         String?   @map("job_id")
  retryCount    Int       @default(0) @map("retry_count")
  adminCancelledAt DateTime? @map("admin_cancelled_at")
  @@map("orders")
}

model Job {
  id       String   @id
  status   String   @default("processing")  // processing | done | error | cancelled
  progress Int      @default(0)
  label    String   @default("")
  result   Json?
  error    String?
  userUid  String?  @map("user_uid")
  service  String?
  createdAt DateTime @default(now()) @map("created_at")
  @@map("jobs")
}
```

**Config table — keys đang dùng:**
```
price_career     → giá dịch vụ Hướng Nghiệp (VND, string số)
price_love       → giá dịch vụ Tình Duyên
price_synastry   → giá dịch vụ Cặp Đôi
price_transit    → giá dịch vụ Vận Hạn
order_check_interval → interval check đơn (phút, dùng bởi cron)
```

**Pricing utility** (`src/lib/pricing.ts`):
```ts
getPrice(service: string): Promise<number>     // đọc từ Config, fallback 3333
getAllPrices(): Promise<Record<string, number>> // tất cả 4 giá
setPrice(service, value): Promise<void>
setAllPrices(prices): Promise<void>
```

---

## 2. Trang chủ — Component Structure

**File:** `src/app/page.tsx` — Server Component
```tsx
import HeroSection from '@/components/home/HeroSection'
import FeaturesSection from '@/components/home/FeaturesSection'
import ProcessSection from '@/components/home/ProcessSection'
import CTASection from '@/components/home/CTASection'
import FloatingButtons from '@/components/home/FloatingButtons'

export default function HomePage() {
  return (
    <>
      <HeroSection />       // Hero với CTA button "Khám phá dịch vụ"
      <FeaturesSection />   // Grid 4 dịch vụ, mỗi card có link/button
      <ProcessSection />    // Mô tả quy trình
      <CTASection />        // CTA cuối trang "Bắt đầu hành trình"
      <FloatingButtons />   // Zalo + Messenger floating
    </>
  )
}
```

**Nút CTA cần ẩn/thay trong maintenance mode:**
- `HeroSection.tsx`: nút "Khám phá dịch vụ" → `/services`
- `FeaturesSection.tsx`: 4 card dịch vụ, mỗi card có link → `/services`
- `CTASection.tsx`: nút "Bắt đầu hành trình" → `/services`
- `src/app/services/page.tsx`: toàn bộ page này (chọn dịch vụ)

---

## 3. Design System — Colors & Fonts

**CSS variables (trong globals.css):**
```css
--void-deep: #06060f          /* background chính */
--gold-warm: #d9ab55          /* gold chính */
--gold-bright: #f0cc78        /* gold sáng */
--lunar-bright: #f4efe6       /* text chính */
--lunar-dim: #8a8399          /* text phụ */

/* Gradient gold button: */
background: linear-gradient(135deg, #c8943f, #f0cc78, #c8943f)
```

**Font CSS vars:**
```
--font-cinzel          Cinzel (Latin only, logo)
--font-display         Cinzel Decorative (decorative)
--font-body            Cormorant Garamond (body, có tiếng Việt)
--font-sans            EB Garamond (secondary body, có tiếng Việt)
--font-ui              Lora (UI, có tiếng Việt)
--font-vietnam         Be Vietnam Pro (UI chính form/buttons, có tiếng Việt)
```

**Card style chuẩn:**
```css
background: rgba(18,13,46,0.7);
backdrop-filter: blur(20px);
border: 1px solid rgba(200,148,63,0.14–0.38);
border-radius: 12px;
```

---

## 4. Auth System — cách check planType

NextAuth session shape (từ `src/contexts/AuthContext.tsx`):
```ts
session.user = {
  uid: string
  username: string
  name: string
  email: string
  isPremium: boolean
  planType: 'free' | 'premium' | 'lifetime'
  image?: string
}
```

**Auth check ví dụ trong Server Component:**
```ts
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const session = await getServerSession(authOptions)
if (!session || session.user.planType !== 'lifetime') {
  redirect('/auth/login')  // hoặc show error page
}
```

**Auth check trong API route:**
```ts
const session = await getServerSession(authOptions)
if (!session?.user || session.user.planType !== 'lifetime') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
}
```

---

## 5. Nginx — Pattern hiện tại

**File:** `/etc/nginx/sites-enabled/hgct.conf`
```nginx
server {
    listen 80;
    server_name hatgiongchiemtinh.com www.hatgiongchiemtinh.com;
    return 301 https://$server_name$request_uri;
}
server {
    listen 443 ssl;
    server_name hatgiongchiemtinh.com www.hatgiongchiemtinh.com;
    ssl_certificate /etc/letsencrypt/live/hatgiongchiemtinh.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hatgiongchiemtinh.com/privkey.pem;
    location / {
        proxy_pass http://localhost:65498;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**File:** `/etc/nginx/sites-enabled/hgct-demo.conf` — tương tự, port 65500

**Dashboard sẽ cần thêm:** `/etc/nginx/sites-enabled/hgct-dashboard.conf` → proxy đến port mới hoặc cùng port 65498 nếu dùng route group.

---

## 6. Deploy Scripts

**`deploy-demo-local.sh`** — quick deploy (từ code hiện tại, không cần git push):
```bash
# Build từ /home/hgct/hgct (kể cả uncommitted), sync sang /home/hgct/hgct-demo, restart hgct-demo.service
sudo bash /home/hgct/hgct/deploy-demo-local.sh
```

**`deploy.sh`** — production deploy:
```bash
# npm run build + restart hgct.service (port 65498)
sudo bash /home/hgct/hgct/deploy.sh
```

**Lưu ý quan trọng:** Deploy scripts cần chạy với sudo. Nếu dashboard trigger deploy qua API:
- API endpoint gọi `child_process.exec('sudo bash /home/hgct/hgct/deploy.sh')`
- User `hgct` có `NOPASSWD: ALL` sudo → OK
- Cần stream output về client (SSE hoặc polling) để hiển thị tiến trình

---

## 7. Routing Structure hiện tại

```
src/app/
  page.tsx              /          — homepage (Server Component)
  services/page.tsx     /services  — chọn dịch vụ (Client)
  input/page.tsx        /input     — nhập thông tin (Client)
  checkout/page.tsx     /checkout  — xác nhận (Client, cần isPremium)
  processing/page.tsx   /processing
  success/page.tsx      /success
  profile/page.tsx      /profile   — cần login
  my-charts/page.tsx    /my-charts — cần login
  chart/page.tsx        /chart
  auth/login/page.tsx
  api/...
```

**Dashboard options:**
- Option A: Route group `src/app/(dashboard)/` → vẫn dùng domain chính, path `/dashboard/*`
- Option B: Separate Next.js app trong monorepo
- Option C: Route group + Nginx rewrite subdomain → `/dashboard/*`

---

## 8. SePay & Payment Flow (tóm tắt)

- `/api/payment/create-order` → tạo Order, giá lấy từ Config table (`getPrice(service)`)
- `/api/payment/sepay-webhook` → nhận callback từ SePay, mark paid, tạo job
- Free users trả per-order qua QR chuyển khoản; Premium/Lifetime không cần trả

---

## 9. Telegram Bots (tóm tắt, để dashboard không duplicate)

2 bots hiện có:
- `@nguyclaudebot` (`TELEGRAM_BOT_TOKEN`) — notify bot, gửi 1 chiều
- `@hatgiongchiemtinhbot` (`TELEGRAM_ADMIN_BOT_TOKEN`) — admin bot, nhận lệnh

Dashboard web sẽ supplement (không replace) Telegram admin bot — cùng data source (DB), UI visual hơn.
