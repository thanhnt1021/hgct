# HGCT — Frontend

> Chi tiết pages, components, state management, auth flow, routing

---

## 1. Pages (App Router)

### 1.1 `/` — Homepage (`src/app/page.tsx`)
- **Server Component**
- Import 4 section components (đều là Server Components): HeroSection, FeaturesSection, ProcessSection, CTASection
- FloatingButtons (Client) — Zalo + Messenger floating buttons

### 1.2 `/services` — Chọn Dịch Vụ (`src/app/services/page.tsx`)
- **Client Component**
- Hiển thị 4 dịch vụ: Hướng Nghiệp, Tình Duyên, Cặp Đôi, Vận Hạn
- Dropdown chọn profile từ `localStorage.hatgiong_profiles`
- Nếu chọn profile: đổ data vào `sessionStorage.inputData`, redirect `/checkout`
- Nếu không có profile: redirect `/input`
- Dịch vụ synastry cần 2 người → chọn profile B thêm

### 1.3 `/input` — Nhập Thông Tin (`src/app/input/page.tsx`)
- **Client Component**
- Form: họ/đệm/tên, giới tính, ngày/giờ sinh, địa điểm
- LocationPicker component cho geocoding
- Submit → `sessionStorage.inputData` → redirect `/checkout`
- Synastry: form 2 lần (A + B)

### 1.4 `/checkout` — Xác Nhận (`src/app/checkout/page.tsx`)
- **Client Component**
- Đọc `sessionStorage`: selectedService, inputData, inputDataB
- **Premium gate**: nếu `user.isPremium === false` → hiện wall, không cho đặt
- Nhập email nhận báo cáo
- `handleConfirm()`:
  ```js
  POST /api/astrology/report {
    service, inputData, email, premiumToken,
    inputDataB (nếu synastry)
  }
  → { jobId }
  → redirect /processing?job=...&service=...&name=...
  ```

### 1.5 `/processing` — Tiến Trình (`src/app/processing/page.tsx`)
- **Client Component** (Suspense wrapper vì dùng useSearchParams)
- Nhận `?job=jobId&service=...&name=...` từ URL
- Poll `GET /api/job/:id` mỗi **2 giây**
- Hiển thị progress bar (0-100%) + label trạng thái
- Checklist 5 bước: Tính bản đồ → Phân tích → AI viết → Tạo PDF → Gửi email
- Khi `status === 'done'`:
  - Lưu `sessionStorage.reportResult = { pdfUrl, pdfFilename, emailSent, email }`
  - setTimeout 2s → redirect `/success`

### 1.6 `/success` — Kết Quả (`src/app/success/page.tsx`)
- **Client Component**
- Đọc `sessionStorage.reportResult`
- Nút download PDF → link `/api/pdf/:id?filename=...`
- Hiển thị email đã gửi / chưa gửi

### 1.7 `/profile` — Hồ Sơ (`src/app/profile/page.tsx`)
- **Client Component**, yêu cầu đăng nhập
- **Account card**: hiển thị loại tài khoản (Free/Premium), form upgrade code
- **Profile list**: grid cards từ `localStorage.hatgiong_profiles`
- **Add/Edit form**: họ/đệm/tên, giới tính, ngày sinh, giờ sinh, LocationPicker
- Mỗi profile card có nút "Chọn dịch vụ →" → lưu inputData + redirect `/services`
- TODO: chưa có đổi mật khẩu trong profile

### 1.8 `/auth/login`
- Form username + password
- `useAuth().login()` → localStorage check
- Thành công → redirect `/profile`

### 1.9 `/auth/register`
- Form username, họ tên, email, password
- `useAuth().register()` → lưu vào `localStorage.hatgiong_users`

### 1.10 `/auth/forgot-password`
- Hiện tại: chỉ gọi `POST /api/auth/forgot-password { email }`
- API chỉ check DB (Prisma), **chưa thực sự gửi email** (TODO)

---

## 2. Components

### 2.1 Layout

**`Navbar.tsx`** — Fixed top bar
- Logo SVG + "Hạt Giống Chiêm Tinh"
- Nav links: Trang chủ, Dịch vụ, Hồ sơ
- User avatar + dropdown (Hồ sơ, Đăng xuất) nếu logged in
- "Đặt ngay" CTA button nếu chưa login

**`Footer.tsx`** — 4 cột footer
- Logo + mô tả
- Links: Dịch vụ, Hỗ trợ
- Divider ornament ——— ✦ ———

**`ShootingStars.tsx`** — Fixed bg layer
- 3 nebula glow orbs (CSS blur)
- JS interval: spawn shooting star SVG mỗi 3.5 giây
- Starfield (17 CSS radial-gradient dots)

### 2.2 Home Sections (Server Components)
- `HeroSection.tsx` — Full-screen hero, gold gradient title, 2 CTA buttons
- `FeaturesSection.tsx` — Feature cards + 4 service cards
- `ProcessSection.tsx` — 3 bước: Nhập → AI → Nhận
- `CTASection.tsx` — Gold border CTA + trust signals

### 2.3 Profile
**`LocationPicker.tsx`** — Client Component
- Input tìm thành phố
- Gọi `GET /api/location/search?q=...&country=vn` → Nominatim API
- Dropdown kết quả: chọn → trả về `{ address, lat, lon, tz }`
- geo-tz cho timezone, hardcode `Asia/Ho_Chi_Minh` nếu country=vn (bug geo-tz Hà Nội)

---

## 3. State Management

### 3.1 AuthContext (`src/contexts/AuthContext.tsx`)
```ts
// localStorage keys:
const LS_AUTH  = 'hatgiong_auth'   // user session hiện tại
const LS_USERS = 'hatgiong_users'  // "database" users local

interface User {
  username: string
  name: string
  email: string
  isPremium: boolean
  premiumToken: string  // sha256 hash dùng để verify với server
}

// Methods:
login(username, password) → verify passwordHash (djb2 hash, không crypto)
register(username, name, email, password) → lưu vào LS_USERS
logout() → xóa LS_AUTH
upgradeToPremium(code) → POST /api/user/upgrade → lưu isPremium + token
```

**Lưu ý quan trọng:** Auth là **localStorage only**, không phải DB. Xóa localStorage = mất tài khoản. Prisma `User` table tồn tại nhưng chưa tích hợp với auth flow này.

### 3.2 SessionStorage (không persist qua tab close)
```
selectedService  — string: 'career'|'love'|'synastry'|'transit'
inputData        — ChartInput object (name, gender, dob, tob, loc)
inputDataB       — ChartInput cho người B (synastry)
reportResult     — { pdfUrl, pdfFilename, emailSent, email }
```

### 3.3 Profile Storage
```
hatgiong_profiles — Profile[] trong localStorage
  Profile {
    id: string (random)
    ho, dem, ten: string
    name: string (ghép)
    gender: 'Male'|'Female'|'Other'
    dob: { day, month, year }
    tob: { hour, minute, unknown }
    loc: { address, lat, lon, tz }
    createdAt: ISO string
  }
```

---

## 4. Routing Flow

```
/ → homepage (public)
/services → public (nhưng cần profile để đặt)
/input → public
/checkout → cần isPremium
/processing → cần jobId param
/success → cần sessionStorage.reportResult
/profile → cần login (redirect /auth/login nếu không)
/auth/* → public (redirect /profile nếu đã login)
```

---

## 5. Font System

Load trong `src/app/layout.tsx` via `next/font/google`:

| Biến CSS | Font | Tiếng Việt | Dùng cho |
|---|---|---|---|
| `--font-cinzel` | Cinzel | ❌ | Logo, ký hiệu Latin |
| `--font-display` | Cinzel Decorative | ❌ | Decorative display |
| `--font-body` | Cormorant Garamond | ✅ | Body text |
| `--font-sans` | EB Garamond | ✅ | Secondary body |
| `--font-ui` | Lora | ✅ | UI, form labels |
| `--font-vietnam` | Be Vietnam Pro | ✅ | UI chính (mới thêm) |

**⚠ Bug font:** Cinzel không có subset Vietnamese → text tiếng Việt bị font mixing.

---

## 6. Thiết Kế Màu (Tóm tắt)

```
Background:    #06060f  (--void-deep)
Card:          rgba(18,13,46,0.7) backdrop-blur(20px)
Gold chính:    #d9ab55  (--gold-warm)
Gold sáng:     #f0cc78  (--gold-bright)
Text chính:    #f4efe6  (--lunar-bright)
Text phụ:      #8a8399  (--lunar-dim)
Purple card:   rgba(26,21,53,0.6)
Border:        rgba(200,148,63,0.14-0.38)
```

Xem chi tiết đầy đủ: `layout.md` (design system reference)
