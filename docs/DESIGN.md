# DESIGN.md — AstroS Design System

> **Single source of truth** cho toàn bộ visual của site AstroS. Mọi trang bám theo file này.
> Rebrand từ "Hạt Giống Chiêm Tinh / hatgiongchiemtinh" (hệ màu tím *Celestial Sanctum* cũ) → **AstroS**.
> **Tông chủ đạo = MÀU SÁNG** (champagne / kem / vàng đồng). **Navy chỉ là phụ** (text, vài section tối, footer, viền nhấn). KHÔNG lấy navy làm nền chính.
> Nguồn màu: `astros-refs/AstroS_ColorPalette.jpeg`. Mockup đích: `astros-refs/AstroS_homepage_01.png`, `astros-refs/AstroS_examplelayout_01.jpg`.
>
> **Phạm vi rebrand = chỉ chữ hiển thị.** Giữ nguyên domain `hatgiongchiemtinh.com`, cookie domain, hạ tầng auth/email. "Hạt Giống Chiêm Tinh" hạ xuống làm **tagline**, không phải tên.

---

## 1. Brand Identity

- **Tên brand (hiển thị chính):** `AstroS` — wordmark viết hoa dạng `ASTRO S` (có khoảng cách trước S, theo logo).
- **Tagline / slogan:** `Hạt Giống Chiêm Tinh` + dòng phụ `Khai Mở Chính Mình`. Dùng dưới wordmark ở hero & footer.
- **Logo** (đã có trong `public/`):
  - `logo-yestext.png` (3539×4257, nền trong) → **wordmark đầy đủ** (S emblem + chữ ASTRO S). Navbar (thu nhỏ) + footer.
  - `logo-notext.png` (3539×3596, nền trong) → **chỉ emblem S** trong vòng hoàng đạo. Favicon, icon mobile/compact.
  - **Nền dùng logo:** tông site sáng → logo (có navy + vàng) đặt trên **nền sáng (kem/champagne)** đọc tốt. Khi đặt trên section navy phụ, dùng biến thể chữ sáng. Tránh đặt trên nền vàng bão hòa.
  - **Clear space:** chừa quanh logo ≥ ½ chiều cao chữ "S". **Min size:** navbar wordmark cao ≥ 28px; favicon ≥ 32×32.

---

## 2. Color Tokens

> Map **hex → biến CSS** (`:root` trong `src/app/globals.css`). Khi implement: **giữ TÊN biến** code đang dùng, chỉ **đổi GIÁ TRỊ**; thêm các biến mới.
>
> ⚠️ **CHỐT (2026-06-21): CHỈ DÙNG 2 MÀU CHỦ ĐẠO.**
> - **Kem `#edd5b1`** (+ shade: `#e3c89a`, `#f4e6cd`, `#faf1de`) = nền chính / surface / chữ-trên-navy.
> - **Navy `#0d1333`** (+ shade `#1a2148`) = chữ mạnh / section tối / footer / **nút CTA** / accent / viền / decor.
> - Mọi token vàng/đồng/teal cũ (`--as-gold`, `--as-copper`, `--as-cta`, `--as-teal-*`…) đã **gộp về 2 màu này** — không còn màu thứ 3. CTA = navy nền + kem chữ. Bảng chi tiết bên dưới là lịch sử thiết kế; **giá trị thực thi lấy theo 2 màu chốt ở đây**.

### 2.1. Nền & Surface — CHỦ ĐẠO (sáng)

| Hex | Token | Vai trò |
|---|---|---|
| `#F7ECD9` | `--bg-primary` | **Nền chính toàn site** — kem champagne sáng (tint sáng của #F2D6B1) |
| `#F2D6B1` | `--bg-warm` | Nền section ấm / dải xen kẽ (kem từ palette) |
| `#FBF5EC` | `--surface-card` | **Nền card / form trên nền sáng** — kem gần trắng |
| `#FFFFFF` | `--surface-raised` | Card nổi / hover trên nền sáng |
| `#EAC78D` | `--champagne` | Dải highlight, band, viền nhấn ấm |

### 2.2. Navy & Teal — PHỤ (điểm nhấn tối)

| Hex | Token | Vai trò |
|---|---|---|
| `#0B1334` | `--navy-deep` | **Màu chữ mạnh** + section tối phụ + footer (midnight) |
| `#091838` | `--navy` | Nền section navy phụ / form navy (theo mockup) |
| `#151839` | `--navy-soft` | Card navy / surface tối phụ |
| `#063755` | `--teal-deep` | Accent lạnh đậm |
| `#4B6D77` | `--teal-mid` | Xanh xám trung tính / icon phụ / border lạnh |

### 2.3. Vàng / Đồng — ACCENT chính

| Hex | Token | Vai trò |
|---|---|---|
| `#CB985E` | `--accent-gold` | **Accent vàng primary** (icon, viền, link hover) |
| `#F2D6B1` | `--gold-cream` | Highlight sáng nhất |
| `#BA7C3B` | `--accent-copper` | **Accent đồng secondary** (icon, badge) |
| `#604826` | `--copper-deep` | Nâu đồng tối / đáy gradient gold / shadow chữ |
| `#CA813D` | `--cta-base` | **Nền nút CTA** (hổ phách) |
| `#B96C34` | `--cta-hover` | Terracotta — **CTA hover / active** |

### 2.4. Text

| Hex | Token | Vai trò |
|---|---|---|
| `#0B1334` | `--text-strong` | Heading / chữ nổi bật **trên nền sáng** (navy đậm) |
| `#2E3354` | `--text-body` | Body chính trên nền sáng |
| `#7A7359` | `--text-muted` | Phụ đề, caption, placeholder, ghi chú (nâu xám) |
| `#F7ECD9` | `--text-on-dark` | Chữ trên section navy phụ / trên CTA |

### 2.5. Viền & Trạng thái

| Token | Giá trị | Vai trò |
|---|---|---|
| `--border-gold` | `rgba(186,124,59,0.30)` | Viền mảnh vàng đồng (card, input) |
| `--border-soft` | `rgba(96,72,38,0.14)` | Viền rất nhẹ / divider |
| `--focus-ring` | `0 0 0 3px rgba(203,152,94,0.22)` | Ring focus input |
| `--success` | `#3DB88A` | Thành công (giữ) |
| `--danger` | `#C45252` | Lỗi (giữ) |

---

## 3. Gradients

### 3.1. `--gradient-night` (champagne → midnight) — 90deg ngang
Dùng: dải nền hero, divider lớn, text-gradient eyebrow. Vì site sáng, dải này dùng làm **điểm nhấn** (band ngang / khối) chứ không phủ toàn trang.
```css
--gradient-night: linear-gradient(90deg,
  #EAC78D 0%, #4B6D77 28%, #063755 56%, #091838 80%, #0B1334 100%);
```

### 3.2. `--gradient-gold` (đồng → kem) — 90deg ngang
Dùng: nút CTA, viền nhấn card, **text-gradient heading** (clip).
```css
--gradient-gold: linear-gradient(90deg, #604826 0%, #CB985E 50%, #F2D6B1 100%);
```

### 3.3. `--glow-warm` (radial glow nền — dẫn xuất)
Quầng sáng ấm sau hero/điểm nhấn trên nền sáng.
```css
--glow-warm: radial-gradient(ellipse 80% 50% at 60% 30%,
  rgba(203,152,94,0.18) 0%, rgba(247,236,217,0) 70%);
```

---

## 4. Typography

### 4.1. Font

| Vai trò | Font | Nguồn |
|---|---|---|
| **CHỈ wordmark "ASTRO S"** | **Cinzel** | local `public/fonts/Cinzel-VariableFont_wght.ttf` — qua `--font-cinzel` / `font-display` |
| Big title / heading (kể cả tiếng Việt) | **Playfair Display** (giữ NGUYÊN như cũ) | next/font/google — `--font-playfair` / `font-serif` |
| Body / UI | **Be Vietnam Pro** (giữ NGUYÊN) | next/font/google — `--font-vietnam` / `font-body` |

> **Cinzel CHỈ áp cho chuỗi "ASTRO S" (thuần Latin).** Tuyệt đối **không** dùng Cinzel cho bất kỳ chữ tiếng Việt nào (Cinzel thiếu dấu → vỡ chữ). Heading tiếng Việt **giữ Playfair Display y như hệ hiện tại** — không đổi font heading/body, chỉ đổi MÀU theo mục 2.
> Cinzel hợp UPPERCASE + letter-spacing rộng (`0.2em+`) như chữ "ASTRO S" trong mockup.

### 4.2. Thang size (clamp responsive)

| Cấp | Dùng cho | Font | Size | Weight | Letter-spacing | LH |
|---|---|---|---|---|---|---|
| `wordmark` | Hero "ASTRO S" | **Cinzel** | `clamp(2.75rem, 7vw, 5.5rem)` | 600 | `0.22em` | 1.05 |
| `h1` | Big title section (VN) | Playfair | `clamp(2rem, 4.5vw, 3.25rem)` | 600 | `0.02em` | 1.15 |
| `h2` | Tiêu đề khối | Playfair | `clamp(1.5rem, 3vw, 2.25rem)` | 600 | `0.01em` | 1.2 |
| `h3` | Card / cột lõi | Playfair | `clamp(1.15rem, 2vw, 1.4rem)` | 600 | normal | 1.3 |
| `eyebrow` | Nhãn nhỏ trên title | Be Vietnam Pro | `0.8rem` | 600 | `0.25em` UPPER | 1.4 |
| `body` | Văn bản | Be Vietnam Pro | `1rem` | 400–500 | normal | 1.7 |
| `body-sm` | Mô tả card | Be Vietnam Pro | `0.875rem` | 400 | normal | 1.6 |
| `caption` | Ghi chú / copyright | Be Vietnam Pro | `0.75rem` | 400 | normal | 1.5 |

---

## 5. Background Theme (GLOBAL)

**Toàn site nền SÁNG chủ đạo.** Cấu tạo:

1. **Lớp nền màu** — `--bg-primary` (#F7ECD9 kem) + `linear-gradient(180deg, #FBF5EC 0%, #F7ECD9 50%, #F2D6B1 100%)` rất nhẹ cho chiều sâu.
2. **Hạt sao / chấm vàng** — rải thưa, tông `--accent-gold`/`--copper-deep` opacity thấp (0.12–0.3), nhấp nháy rất nhẹ. (Trên nền sáng nên tinh tế, không chói.)
3. **Glow ấm** — `--glow-warm` ở vùng hero + điểm nhấn lớn.
4. **Section navy phụ** — một số khối dùng nền `--navy`/`--navy-deep` làm điểm nhấn tương phản (vd khối "Hạt Giống Chiêm Tinh", footer, panel chứa bản đồ sao để chart nổi). Đây là **gia vị**, không phải nền chính.
5. **Vignette** rất nhẹ ấm ở rìa nếu cần.

> ⚠️ **Vòng hoàng đạo KHÔNG còn là nền toàn trang.** Hệ cũ (`ZodiacBackground.tsx`) đặt vòng hoàng đạo quay chìm `z-index:-5` trên MỌI trang → **bỏ.** Vòng hoàng đạo quay giờ là **1 element độc lập CHỈ trong S2**.

---

## 6. Effects & Motion

| Hiệu ứng | Mô tả | Phạm vi |
|---|---|---|
| Star/dot twinkle | chấm vàng nhấp nháy nhẹ trên nền sáng | nền global |
| Gold glow | quầng vàng quanh CTA/icon nhấn/emblem: `0 0 24px rgba(203,152,94,0.35)` | điểm nhấn |
| Zodiac rotation | vòng hoàng đạo quay 360° ~240s linear | **chỉ S2** |
| fadeInUp | khối vào trang trượt lên + mờ (stagger) | section entry |
| Hover button | `--cta-base` → `--cta-hover`, glow tăng, scale 1.02 | nút |
| Hover card | `--surface-card` → `--surface-raised`, viền `--border-gold` sáng | card |
| Hover nav | text → `--accent-gold`, gạch chân gradient gold | navbar |

Tôn trọng `prefers-reduced-motion`: tắt rotation + twinkle.

---

## 7. Component Primitives

### 7.1. Button
- **Primary (CTA):** nền `--cta-base` (hoặc `--gradient-gold`), chữ `--text-on-dark` uppercase Be Vietnam Pro 600, radius `--radius-pill`, padding `0.75rem 1.75rem`, glow vàng. Hover → `--cta-hover` + scale 1.02.
- **Secondary (outline):** nền trong, viền `1px var(--accent-copper)`, chữ `--copper-deep`/`--accent-copper`. Hover → nền `rgba(203,152,94,0.10)`.

### 7.2. Input field (theo mockup form)
- 2 ngữ cảnh: **trên nền sáng** → nền `--surface-card`, viền `--border-gold`, chữ `--text-body`; **trong form navy phụ** → nền `rgba(9,24,56,0.6)`, chữ `--text-on-dark`.
- Focus: viền `--accent-gold` + `--focus-ring`. Placeholder `--text-muted` italic. (Khớp style `input` sẵn trong globals.css — đổi màu theo ngữ cảnh.)

### 7.3. Card
- Nền `--surface-card`, viền `1px var(--border-soft)`, radius `--radius-lg`, shadow `--shadow-card`. Card nhấn: viền gradient gold + glow.

### 7.4. Coin pill "Số xu" (navbar)
- Pill `--radius-pill`, nền `rgba(203,152,94,0.14)`, viền `--border-gold`, icon ✦ `--accent-gold`, số xu chữ `--copper-deep` 600 (trên nền sáng), dấu `+` → nạp xu. (Tái dùng `CoinBalance.tsx`, đổi màu.)

### 7.5. Scale phụ trợ
```css
--radius-sm:.375rem; --radius-md:.5rem; --radius-lg:.875rem; --radius-pill:999px;
--space: 4px base → 4/8/12/16/24/32/48/64/96px;
--shadow-card: 0 8px 30px rgba(96,72,38,0.12);   /* shadow ấm trên nền sáng */
--shadow-glow: 0 0 24px rgba(203,152,94,0.35);
```

---

## 8. Responsive Breakpoints

| BP | Bề rộng | Layout |
|---|---|---|
| **mobile** | `< 640px` | 1 cột stack. Navbar hamburger **nhưng giữ Số xu + Đăng nhập luôn hiện**. 3 cột lõi → **stack từng cột**. Bản đồ sao + thông tin cá nhân xếp dọc. |
| **tablet** | `640–1024px` | 2 cột lưới card; hero text trên / vòng hoàng đạo dưới. |
| **desktop** | `> 1024px` | Full. **3 cột lõi = fixed 3 column**. Bản đồ sao + thông tin cá nhân cạnh nhau. Container max-width ~1152px. |

**Cứng:** 3 cột lõi (Mặt trời · Mặt trăng · Cung mọc) — desktop fixed 3 column, mobile stack dọc.

---

## Phụ lục A — Migration map (token cũ → AstroS)

| Token cũ (Celestial Sanctum) | Cũ | Đổi thành (AstroS) — **lật sáng** |
|---|---|---|
| `--void-deep` / `--bg-primary` | `#06060f` (đen) | `#F7ECD9` (kem sáng — **nền chính giờ là sáng**) |
| `--void-night` / `--bg-secondary` | `#0b0b1f` | `#F2D6B1` (kem ấm) |
| `--nebula-dark` / `--bg-card` | `#120d2e` (tím) | `#FBF5EC` (card kem) |
| nebula tím (mid/glow/rim) | `#1c1540…` | navy/teal phụ: `#091838` / `#063755` / `#4B6D77` |
| `--gold-base/warm/bright` | `#c8943f…` | `#CB985E` / `#EAC78D` / `#F2D6B1` |
| text-primary (sáng) | `#f4efe6` | `#0B1334` (chữ navy trên nền sáng) |

> An toàn: **giữ TÊN biến**, chỉ đổi GIÁ TRỊ; thêm biến mới (`--navy*`, `--teal*`, `--copper*`, `--cta*`, `--champagne`, `--gradient-*`, `--glow-warm`). Component hard-code hex cũ (vd `#06060f`, `#d9ab55`) → thay sang token. **Lưu ý:** lật nền tối→sáng nghĩa là phải rà lại tương phản chữ (chữ vốn sáng trên nền tối nay phải đổi sang navy trên nền sáng) — đây là phần đụng nhiều component nhất, làm cẩn thận theo mục 2.4.
