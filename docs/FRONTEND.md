# HGCT — Frontend

> Chi tiết pages, components, state management, auth flow, routing

---

## 1. Pages (App Router)

### 1.1 `/` — Homepage (`src/app/page.tsx`)
- **Server Component**
- Import 4 section components: HeroSection, FeaturesSection, ProcessSection, CTASection
- FloatingButtons (Client) — Zalo + Messenger floating buttons

### 1.2 `/services` — Chọn Dịch Vụ (`src/app/services/page.tsx`)
- **Client Component**
- Hiển thị 4 dịch vụ: Hướng Nghiệp, Tình Duyên, Cặp Đôi, Vận Hạn
- Dropdown chọn profile từ **DB** (`GET /api/profiles`)
- Nếu chọn profile: đổ data vào `sessionStorage.inputData`, redirect `/checkout`
- Nếu không có profile: redirect `/input`
- Dịch vụ synastry cần 2 người → profile B thêm

### 1.3 `/input` — Nhập Thông Tin (`src/app/input/page.tsx`)
- **Client Component** (Suspense wrapper vì dùng `useSearchParams`)
- **3 modes** qua query param `?for=`:
  - `for=chart` → lưu `sessionStorage.chartInputData` → redirect `/chart`
  - `for=synastry` → lưu `sessionStorage.inputDataB` → redirect `/checkout`
  - *(default)* → lưu `sessionStorage.inputData` → redirect `/checkout` hoặc `/services`
- **Form layout (compact grid, đồng bộ với ProfileFormModal):**
  - Row 1: [Họ / Đệm / Tên] + [Giới tính select] — name+gender cùng hàng (`grid 1fr auto`)
  - Row 2: [Ngày sinh: Ngày/Tháng/Năm select] | [Giờ sinh: Giờ/Phút select + "Không rõ" checkbox] — date+time cùng hàng (`grid-cols-1 sm:grid-cols-2`)
  - Row 3: `LocationPicker` — nơi sinh
  - Row 4: Biệt danh / Ghi chú (tuỳ chọn)
  - Row 5: Checkbox "Lưu hồ sơ" (chỉ hiện nếu đã đăng nhập) — POST `/api/profiles`
  - Submit button: text thay đổi theo mode
- **Dropdowns đồng bộ với ProfileFormModal:**
  - Tháng: "Tháng 1"..."Tháng 12" (không phải "1"..."12")
  - Năm: range 1911–CUR+100, option "Năm khác..." → text input (-4712 đến 5399)
  - Giờ/Phút: `<select>` 00–23 / 00–59, default placeholder "-"
  - Default values: `0` / `-1` (placeholder "-"), không pre-fill
- **Validation đầy đủ:** tên*, ngày*, tháng*, năm*, giờ/phút* (nếu không tick Không rõ)

### 1.4 `/checkout` — Xác Nhận (`src/app/checkout/page.tsx`)
- **Client Component**
- Đọc `sessionStorage`: selectedService, inputData, inputDataB
- **Premium gate**: nếu user không phải premium → hiện wall
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
- **Client Component** (Suspense wrapper)
- Poll `GET /api/job/:id` mỗi **2 giây**
- Progress bar + label + checklist 5 bước
- Khi `status === 'done'`:
  - Lưu `sessionStorage.reportResult`
  - setTimeout 2s → redirect `/success`

### 1.6 `/success` — Kết Quả (`src/app/success/page.tsx`)
- **Client Component**
- Đọc `sessionStorage.reportResult`
- Nút download PDF → `GET /api/pdf/:id?filename=...`
- Hiển thị email đã gửi / chưa gửi

### 1.7 `/profile` — Hồ Sơ (`src/app/profile/page.tsx`)
- **Client Component**, yêu cầu đăng nhập
- **Account card**: avatar, tên, loại tài khoản (Free/Premium/Lifetime), form upgrade code
- **SubscriptionPlans**: 3 tier plans
- **Profile list**: grid cards từ **DB** (`GET /api/profiles`)
- Add/Edit: dùng `ProfileFormModal` → POST/PUT `/api/profiles`
- Mỗi profile card có nút "Chọn dịch vụ →" → lưu inputData + redirect `/services`

### 1.8 `/my-charts` — Danh Sách Bản Đồ (`src/app/my-charts/page.tsx`)
- **Client Component**, yêu cầu đăng nhập
- Load profiles từ **DB** (`GET /api/profiles`)
- Mỗi profile row: Name + meta (gender, dob, tob, loc) + action buttons
- **Inline edit form** mở ngay trong row (không dùng modal):
  - Layout compact giống `/input`: name+gender cùng hàng, date+time cùng hàng
  - Year range 1911–CUR+100, có option "Năm khác..." → custom text input
  - Validation đầy đủ
  - PUT `/api/profiles` khi lưu
- **Action buttons** mỗi profile: Sửa · Xóa (confirm 2 bước) · Dịch vụ · Bản đồ ✦
- "Bản đồ ✦" → redirect `/chart?id=profileId`
- "Dịch vụ" → lưu `sessionStorage.inputData` → redirect `/services`

### 1.9 `/chart` — Natal Wheel (`src/app/chart/page.tsx`)
- **Client Component** (Suspense wrapper)
- 2 cách load:
  - `?id=profileId` → auto-submit: load profile từ DB → tính chart → hiển thị
  - *(no param)* → đọc `sessionStorage.chartInputData` → tính chart → hiển thị
- Render `NatalWheel` SVG component
- Có nút quay lại, nút "Chọn dịch vụ"

### 1.10 `/auth/login`
- NextAuth `signIn()` với credentials hoặc Google

### 1.11 `/auth/register`
- Form username, họ tên, email, password
- POST `/api/auth/register` → tạo User trong DB (bcrypt hash)

### 1.12 `/auth/forgot-password`
- Gọi `POST /api/auth/forgot-password { email }` — chưa gửi email thực (TODO)

---

## 2. Components

### 2.1 Layout

**`Navbar.tsx`** — Fixed top bar
- Logo + "Hạt Giống Chiêm Tinh"
- Nav links: Trang chủ, Dịch vụ, Hồ sơ
- User avatar + dropdown (Hồ sơ, Bản đồ sao, Đăng xuất) nếu logged in

**`Footer.tsx`** — 4 cột footer

**`ShootingStars.tsx`** — Fixed bg layer
- 3 nebula glow orbs (CSS blur)
- JS interval: spawn shooting star SVG mỗi 3.5 giây

### 2.2 Home Sections (Server Components)
- `HeroSection.tsx`, `FeaturesSection.tsx`, `ProcessSection.tsx`, `CTASection.tsx`
- `FloatingButtons.tsx` — Zalo + Messenger

### 2.3 Profile

**`LocationPicker.tsx`** — Client Component
- **Layout:** single row, `grid grid-cols-12`:
  - `col-span-3`: Country `<select>` — Việt Nam / Mỹ / Anh / Úc / Canada / Pháp / Đức / Nhật Bản / Hàn Quốc / Singapore / Thái Lan / Toàn cầu
  - `col-span-7`: Address `<input type="text">` với debounce 600ms, wrapped trong `<div class="relative">` riêng
  - `col-span-2`: Search button (Search icon + "Tìm" text, spinner khi loading)
- Gọi `GET /api/location/search?q=...&cc=vn`
- Dropdown kết quả: absolute positioned **bên trong div của Address** (`left: 0; right: 0` relative to Address input only — không rộng ra Country/Search), `zIndex: 100`, blur backdrop
- Hiển thị info địa chỉ đã chọn (lat/lon/tz) bên dưới

**`ProfileFormModal.tsx`** — Modal add/edit profile
- Modal centered, `max-w-[560px]`, `max-h-[90vh]` scrollable
- Layout compact (`form-compact` class):
  - Row 1: [Họ / Đệm / Tên] + [Giới tính select] — cùng hàng (`grid 1fr auto`)
  - Row 2: [Ngày sinh] | [Giờ sinh + checkbox] — cùng hàng (`grid-cols-1 sm:grid-cols-2`)
  - Năm: dropdown 1911–CUR+100, option "Năm khác..." → custom text input (range -4712 đến 5399)
  - Giờ: select 00–23, Phút: select 00–59, hoặc checkbox "Không rõ"
  - LocationPicker
  - Ghi chú (tuỳ chọn)
- Validation: tên*, ngày*, tháng*, năm*, giờ/phút* (nếu không tick Không rõ)
- Footer: [Lưu] [Hủy]

**`AvatarCropModal.tsx`** — Upload + crop avatar
**`ChartList.tsx`**, **`HistoryReports.tsx`**, **`ProfileInfo.tsx`**, **`SubscriptionPlans.tsx`**

### 2.4 Chart

**`NatalWheel.tsx`** — SVG natal chart
- Vẽ 12 nhà, planets, aspects
- Responsive SVG

---

## 3. State Management

### 3.1 AuthContext (`src/contexts/AuthContext.tsx`)
```ts
// Wrapper quanh NextAuth useSession()
// Session shape:
interface Session {
  user: {
    uid: string
    username: string
    name: string
    email: string
    isPremium: boolean
    planType: 'free' | 'premium' | 'lifetime'
    image?: string  // Google avatar
  }
}

// Methods dùng NextAuth:
signIn('credentials', { username, password })
signIn('google')
signOut()
```

Auth state được server-side verify qua NextAuth session. Không dùng localStorage.

### 3.2 SessionStorage (không persist qua tab close)
```
selectedService  — string: 'career'|'love'|'synastry'|'transit'
inputData        — ChartInput cho người A (từ /input hoặc profile)
inputDataB       — ChartInput cho người B (synastry)
chartInputData   — ChartInput cho /chart (mode xem bản đồ trực tiếp)
reportResult     — { pdfUrl, pdfFilename, emailSent, email }
```

### 3.3 Profile Storage (DB via API)
```
GET    /api/profiles        → danh sách profiles của user hiện tại
POST   /api/profiles        → tạo profile mới
PUT    /api/profiles        → cập nhật profile (body có id)
DELETE /api/profiles?id=... → xóa profile

Profile shape (từ DB):
{
  id: number
  name: string               -- họ đệm tên ghép
  gender: 'Male'|'Female'|'Other'
  data: {
    ho, dem, ten: string
    note?: string
    dob: { day, month, year }
    tob: { hour, minute, unknown }
    loc: { address, lat, lon, tz }
  }
  createdAt: string
}
```

---

## 4. Routing Flow

```
/ → homepage (public)
/services → public (cần profile/inputData để đặt)
/input?for=chart|synastry|'' → public
/chart?id=... hoặc từ sessionStorage → public
/checkout → cần isPremium
/processing → cần jobId param
/success → cần sessionStorage.reportResult
/profile → cần login
/my-charts → cần login
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
| `--font-ui` | Lora | ✅ | UI |
| `--font-vietnam` | Be Vietnam Pro | ✅ | UI chính (form labels, buttons) |

**⚠ Lưu ý:** Cinzel không có subset Vietnamese → text tiếng Việt trong heading dùng `--font-vietnam`.

---

## 6. Thiết Kế Màu

```
Background:    #06060f / #0a0a1a  (--void-deep)
Card:          rgba(18,13,46,0.7) backdrop-blur(20px)
Gold chính:    #d9ab55  (--gold-warm)
Gold sáng:     #f0cc78  (--gold-bright)
Gold button:   linear-gradient(135deg, #c8943f, #f0cc78, #c8943f)
Text chính:    #f4efe6  (--lunar-bright)
Text phụ:      #8a8399  (--lunar-dim)
Text muted:    #6b7280
Purple card:   rgba(26,21,53,0.6)
Border:        rgba(200,148,63,0.14–0.38)
```

## 7. CSS Utilities

**`form-compact`** — class CSS custom cho form dày đặc:
- Input height nhỏ hơn mặc định
- Spacing tight hơn
- Dùng trong `/input`, `ProfileFormModal`, inline edit trong `/my-charts`

## 8. Mobile UX

### iOS Auto-Zoom Fix (QUAN TRỌNG)

iOS Safari tự động zoom khi tap vào input có `font-size < 16px`. Đã thử nhiều cách thất bại:

| Cách | Kết quả |
|---|---|
| CSS `font-size: 16px` only | Chữ to, không dùng được |
| CSS `font-size: 16px + zoom: 0.75` | Zoom vẫn xảy ra (iOS check visual size) |
| JS `focusin` → set `maximum-scale=1` | Chỉ fix từ lần 2 trở đi |
| JS `touchstart` → set `maximum-scale=1` | Vẫn zoom lần đầu |
| Inline `<script>` trong `<head>` | Vẫn zoom lần đầu (iOS cache viewport khi parse HTML) |
| **`maximumScale: 1` trong viewport config** | ✅ **Fix hoàn toàn** |

**Fix cuối cùng — 1 dòng trong `src/app/layout.tsx`:**
```ts
export const viewport: Viewport = {
  themeColor: '#06060f',
  maximumScale: 1,  // ← ngăn iOS auto-zoom khi focus input
}
```

**Tại sao hoạt động:** `maximum-scale=1` được nhúng thẳng vào HTML initial → iOS đọc giá trị này trước mọi interaction → không zoom. Trên iOS 10+ (tất cả iPhone từ 2016), Apple override `maximum-scale` cho user-initiated pinch-zoom → user vẫn zoom tay được bình thường.

**ĐỪNG dùng JS** để thay đổi viewport meta cho mục đích này — iOS cache viewport lúc load trang, JS thay đổi sau đó không có tác dụng cho lần đầu tiên.

---

**Year dropdown** — 3 files (`/input`, `ProfileFormModal`, `/my-charts`):
- Range: `CUR_YEAR - 100` đến `CUR_YEAR` (101 năm, không hardcode)
- "Năm khác..." là option đầu tiên sau placeholder "-"
