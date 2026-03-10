# HGCT — Frontend Design System Reference
> Tài liệu này mô tả toàn bộ thiết kế frontend hiện tại của **Hạt Giống Chiêm Tinh** (hatgiongchiemtinh.com).
> Stack: **Next.js 15 App Router + Tailwind v4 + CSS custom properties + Google Fonts**.
> Paste tài liệu này cho v0 hoặc AI design assistant để cải thiện UI mà không phá vỡ cấu trúc.

---

## ⚠️ VẤN ĐỀ CẦN FIX NGAY — FONT TIẾNG VIỆT

**Vấn đề cốt lõi:** `Cinzel` và `Cinzel_Decorative` là font **Latin-only**, **không có bộ ký tự tiếng Việt** (ă, â, đ, ê, ô, ơ, ư, và tất cả dấu thanh). Khi text tiếng Việt được áp `font-family: var(--font-cinzel)`, trình duyệt fallback sang system font cho ký tự không có, gây ra **hiện tượng chữ lên xuống không đều** (font mixing).

**Nơi bị ảnh hưởng:**
- Tất cả headings, section titles → đang dùng `var(--font-cinzel)` cho text tiếng Việt
- Labels, buttons → đang dùng `var(--font-cinzel)` cho text tiếng Việt
- Navigation links

**Giải pháp đề xuất:** Cinzel chỉ nên dùng cho text **ALL-CAPS Latin thuần** (ký hiệu, số, từ viết tắt không dấu). Mọi text tiếng Việt phải dùng font có `vietnamese` subset: `Cormorant Garamond`, `EB Garamond`, hoặc `Lora`.

**Phương án thay thế font:**
- Xem xét thay `Cinzel` bằng `Playfair Display` (có `vietnamese` subset) cho heading display
- Hoặc `Libre Baskerville` / `Crimson Pro` — cả hai đều có đủ tiếng Việt

---

## 1. CSS Custom Properties (Design Tokens)

Định nghĩa trong `/src/app/globals.css`:

```css
:root {
  /* Void — nền tối */
  --void-black:   #02020a;
  --void-deep:    #06060f;   /* ← background chính của mọi trang */
  --void-night:   #0b0b1f;

  /* Nebula — card/container */
  --nebula-dark:  #120d2e;
  --nebula-mid:   #1c1540;   /* ← background card chính */
  --nebula-glow:  #261c56;
  --nebula-rim:   #38287a;

  /* Gold — accent chính */
  --gold-shadow:  #7a5420;
  --gold-deep:    #9a6f2a;
  --gold-base:    #c8943f;   /* ← gold cơ bản */
  --gold-warm:    #d9ab55;   /* ← gold chính dùng nhiều nhất */
  --gold-bright:  #f0cc78;   /* ← gold sáng, highlight */
  --gold-pale:    #fdf3d8;

  /* Lunar — text */
  --lunar-bright: #f4efe6;   /* ← text chính (primary) */
  --lunar-warm:   #e8e0d4;
  --lunar-mid:    #c9c3d6;   /* ← text phụ */
  --lunar-dim:    #8a8399;   /* ← text mờ / placeholder labels */
  --lunar-shadow: #4a4560;   /* ← text rất mờ / dividers */

  /* Semantic */
  --success:      #3db88a;
  --danger:       #c45252;

  /* Alias legacy (tương thích ngược) */
  --bg-primary:   #06060f;
  --bg-secondary: #0b0b1f;
  --bg-card:      #120d2e;
  --text-primary: #f4efe6;
  --text-secondary: #8a8399;
  --gold:         #d9ab55;
  --gold-light:   #f0cc78;
  --purple:       #261c56;
  --purple-light: #38287a;
  --accent-red:   #c45252;
}
```

---

## 2. Typography System

### Font Families (Google Fonts, loaded via `next/font/google`)

| CSS Variable | Font | Subsets | Tình trạng tiếng Việt | Dùng cho |
|---|---|---|---|---|
| `--font-cinzel` | Cinzel | latin only | ❌ KHÔNG có | Label ALL-CAPS Latin, số, ký hiệu |
| `--font-display` | Cinzel Decorative | latin only | ❌ KHÔNG có | Decorative display (tránh text VN) |
| `--font-body` | Cormorant Garamond | latin + vietnamese | ✅ Có | Body text, italic literary |
| `--font-sans` | EB Garamond | latin + vietnamese | ✅ Có | Secondary body, captions |
| `--font-ui` | Lora | latin + vietnamese | ✅ Có | UI elements, form labels |

### Hierarchy hiện tại

```
Hero display:  Cormorant Garamond italic 300, clamp(4rem → 8.5rem), gold gradient
               → ĐÚNG: font có VN

Page headings: Cinzel 700, clamp(1.5rem → 2.5rem)
               → SAI: Cinzel không có VN, vỡ font với tiếng Việt

Section eyebrow: Cinzel 700, 0.65rem, uppercase, letter-spacing 0.25em
               → SAI NHẸ: chỉ ổn nếu text là Latin thuần

Body copy:     EB Garamond, 1.05–1.2rem, line-height 1.85
               → ĐÚNG: font có VN

Buttons:       Cinzel 700, 0.72–0.82rem, uppercase, letter-spacing 0.1em
               → VẤN ĐỀ: nếu button text có dấu VN (ví dụ "Đặt báo cáo")

Form labels:   Cinzel 700, 0.6rem, uppercase, letter-spacing 0.2em
               → VẤN ĐỀ: labels như "Họ và tên", "Giới tính" có dấu
```

### Đề xuất fix typography

```
Headings tiếng Việt  → dùng Cormorant Garamond 600 hoặc Lora 700
Labels tiếng Việt    → dùng Lora 600 uppercase (có VN)
Buttons tiếng Việt   → dùng Lora 600 (có VN)
Decorative caps      → giữ Cinzel nhưng CHỈ cho text ASCII: "HGCT", "PDF", "AI", số
```

---

## 3. Color Usage Patterns

### Background layers
```
Page background:         #06060f (var(--void-deep))
Section alternate bg:    rgba(6,6,15,0.6) — ProcessSection
Card background:         rgba(18,13,46,0.7) với backdrop-filter: blur(20px)
Card elevated:           rgba(28,21,64,0.6)
Input background:        rgba(11,11,31,0.9)
Dropdown background:     rgba(11,11,31,0.98)
Footer background:       #02020a
```

### Border patterns
```
Card border default:     1px solid rgba(200,148,63,0.14)  — rất nhẹ
Card border hover:       1px solid rgba(200,148,63,0.38)  — rõ hơn
Input border default:    1px solid rgba(200,148,63,0.2)
Input border focus:      1px solid #d9ab55
Navbar border-bottom:    1px solid rgba(200,148,63,0.1)
Success notice border:   1px solid rgba(61,184,138,0.2)
Error/warning border:    1px solid rgba(196,82,82,0.25)
```

### Service accent colors (dùng cho card per-service)
```
Career  (Hướng Nghiệp): background rgba(200,148,63,0.08–0.12), border rgba(200,148,63,0.22), tag #c8943f
Love    (Tình Duyên):   background rgba(185,77,112,0.08–0.1),  border rgba(185,77,112,0.22), tag #b84d70
Synastry (Cặp Đôi):    background rgba(120,77,186,0.08–0.1),  border rgba(120,77,186,0.22), tag #7c4dba
Transit (Vận Hạn):      background rgba(64,112,184,0.08–0.1),  border rgba(64,112,184,0.22), tag #4070b8
```

---

## 4. Component Patterns

### 4.1 Cards

**Base card** (CSS class `.sanctum-card` và `.card`):
```css
background: rgba(28, 21, 64, 0.6);
border: 1px solid rgba(200, 148, 63, 0.14);
border-radius: 1.25rem;          /* 20px */
backdrop-filter: blur(20px);
transition: border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;

:hover {
  border-color: rgba(200, 148, 63, 0.38);
  transform: translateY(-3px);
  box-shadow: 0 20px 56px rgba(0,0,0,0.5), 0 0 32px rgba(200,148,63,0.07);
}
```

**Feature card** (CSS class `.feature-card`):
```css
background: rgba(18, 13, 46, 0.65);
border: 1px solid rgba(200, 148, 63, 0.12);
border-radius: 1rem;             /* 16px */
padding: 2rem;
backdrop-filter: blur(16px);
```

**Form/page card** (inline style, các trang transactional):
```css
background: rgba(18, 13, 46, 0.7);
border: 1px solid rgba(200, 148, 63, 0.16);
border-radius: 1.25rem;          /* 20px */
backdrop-filter: blur(20px);
padding: 2rem–2.5rem;
```

### 4.2 Buttons

**Primary Gold Button** (CSS class `.btn-gold`, `.btn-hero-primary`, `.btn-cta-main`):
```css
background: linear-gradient(135deg, #c8943f 0%, #f0cc78 50%, #c8943f 100%);
background-size: 200% 200%;
color: #06060f;                   /* text tối */
border-radius: 4px;               /* sharp corner, KHÔNG phải pill */
padding: 0.85rem 2.5rem;
font-family: var(--font-cinzel);  /* ⚠ đổi sang Lora nếu text có dấu VN */
font-weight: 700;
font-size: 0.72–0.82rem;
letter-spacing: 0.08–0.12em;
text-transform: uppercase;
box-shadow: 0 8px 32px rgba(200,148,63,0.35);

:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 48px rgba(200,148,63,0.55);
}
```

**Outline Button** (CSS class `.btn-outline`, `.btn-hero-secondary`):
```css
background: transparent;
color: #d9ab55;
border: 1px solid rgba(200, 148, 63, 0.3);
border-radius: 4px;
padding: 0.85rem 2.5rem;

:hover {
  border-color: rgba(200, 148, 63, 0.6);
  color: #f4efe6;
}
```

**Ghost/Text Link Button**:
```css
color: #d9ab55;
font-family: var(--font-body);
transition: color 0.2s;

:hover { color: #f0cc78; }
```

**Destructive/Back Button**:
```css
color: #4a4560;   /* muted */
:hover { color: #d9ab55; }
```

### 4.3 Form Inputs

```css
input, select, textarea {
  background: rgba(11, 11, 31, 0.9);
  border: 1px solid rgba(200, 148, 63, 0.2);
  color: #f4efe6;
  border-radius: 0.5rem;          /* 8px */
  padding: 0.75rem 1rem;
  font-family: var(--font-body);
  font-size: 1rem;
  width: 100%;
}
input:focus {
  border-color: #d9ab55;
  box-shadow: 0 0 0 3px rgba(217, 171, 85, 0.1);
}
input::placeholder { color: #4a4560; font-style: italic; }
```

**Form Label style** (hiện đang dùng Cinzel — cần đổi sang Lora):
```css
label {
  font-family: var(--font-cinzel);   /* ⚠ đổi Lora nếu có text VN */
  font-size: 0.6–0.65rem;
  font-weight: 700;
  letter-spacing: 0.18–0.2em;
  text-transform: uppercase;
  color: #8a8399;
}
```

**Gender selector** (toggle buttons):
```css
/* Active */
background: rgba(38, 28, 86, 0.9);
color: #d9ab55;
border: 1px solid rgba(200, 148, 63, 0.45);
box-shadow: 0 0 16px rgba(200, 148, 63, 0.12);
border-radius: 4px;

/* Inactive */
background: rgba(11, 11, 31, 0.8);
color: #8a8399;
border: 1px solid rgba(200, 148, 63, 0.12);
```

### 4.4 Navigation (Navbar)

```css
/* Container */
position: fixed; top: 0; left: 0; right: 0; z-index: 50;
background: rgba(6, 6, 15, 0.88);
backdrop-filter: blur(20px);
border-bottom: 1px solid rgba(200, 148, 63, 0.1);
height: 4rem (h-16);

/* Logo: SVG constellation mark + text */
color: #d9ab55;
font-family: var(--font-cinzel);
font-size: 0.875rem;
letter-spacing: 0.05em;

/* Nav links */
font-family: var(--font-cinzel);
font-size: 0.75rem;
letter-spacing: 0.12em;
text-transform: uppercase;
color: #8a8399;
:hover → color: #f4efe6;

/* CTA button in nav */
background: linear-gradient(135deg, #c8943f, #f0cc78, #c8943f);
color: #06060f;
border-radius: 3px;
font-size: 0.75rem;
letter-spacing: 0.06em;

/* Avatar circle */
background: linear-gradient(135deg, #261c56, #38287a);
color: #d9ab55;
border: 1.5px solid rgba(217,171,85,0.45);
width/height: 2rem;

/* Dropdown */
background: rgba(11,11,31,0.97);
border: 1px solid rgba(200,148,63,0.22);
box-shadow: 0 12px 48px rgba(0,0,0,0.7);
backdrop-filter: blur(20px);
border-radius: 0.75rem;
```

### 4.5 Dividers & Ornaments

```css
/* Simple gold divider */
.gold-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, #c8943f, transparent);
  opacity: 0.45;
}

/* Ornament divider  ——— ✦ ——— */
.divider-ornament {
  display: flex; align-items: center; gap: 1rem;
}
.divider-ornament::before, ::after {
  content: '';
  flex: 1; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(200,148,63,0.35));
}
.divider-ornament span { color: #c8943f; font-size: 0.75rem; }

/* Section eyebrow label */
.section-eyebrow {
  font-family: var(--font-cinzel);   /* ⚠ Latin only */
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #d9ab55;
}
```

### 4.6 Progress Bar (trang /processing)

```css
/* Track */
background: rgba(200,148,63,0.08);
height: 6px; border-radius: 9999px;

/* Fill */
background: linear-gradient(90deg, #c8943f, #f0cc78);
box-shadow: 0 0 12px rgba(200,148,63,0.5);
transition: width 700ms cubic-bezier(0.4, 0, 0.2, 1);
```

### 4.7 Status/Notice Boxes

```css
/* Success (email sent) */
background: rgba(61, 184, 138, 0.06);
border: 1px solid rgba(61, 184, 138, 0.2);
color: #3db88a;

/* Pending/warning */
background: rgba(200, 148, 63, 0.06);
border: 1px solid rgba(200, 148, 63, 0.2);
color: #d9ab55;

/* Error */
background: rgba(196, 82, 82, 0.1);
border: 1px solid rgba(196, 82, 82, 0.3);
color: #e87070;

/* Info (can close tab) */
background: rgba(61, 184, 138, 0.05);
border: 1px solid rgba(61, 184, 138, 0.15);
color: #3db88a;
```

---

## 5. Background & Atmospheric Effects

### Starfield (CSS, `.starfield` class, fixed layer)
```css
/* 17 radial-gradient dots simulating stars */
/* Mix of: gold stars (rgba(240,204,120,x)), white stars (rgba(255,255,255,x)), faint stars */
/* Sizes: 0.7px–1.5px at various % positions */
position: fixed; inset: 0; pointer-events: none; z-index: 0;
```

### Nebula glow orbs (`.glow-orb`, animated)
```css
position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none;

/* Orb 1 — top-left purple */
width: 680px; height: 680px; top: -10%; left: -12%;
background: radial-gradient(circle, rgba(56,40,122,0.55) 0%, rgba(38,28,86,0.2) 50%, transparent 70%);
animation: nebulaDrift 28s ease-in-out infinite;

/* Orb 2 — bottom-right indigo */
width: 560px; height: 560px; bottom: -8%; right: -10%;
background: radial-gradient(circle, rgba(28,21,64,0.7) 0%, rgba(56,40,122,0.25) 50%, transparent 70%);
animation: nebulaDrift 36s ease-in-out infinite reverse;

/* Orb 3 — center, gold tint, very faint */
width: 400px; height: 400px; top: 40%; left: 45%;
background: radial-gradient(circle, rgba(200,148,63,0.06) 0%, transparent 70%);
animation: nebulaDrift 42s ease-in-out infinite 8s;
```

### Shooting stars (JS interval + CSS)
```css
.shooting-star {
  width: 2px; height: 2px;
  background: linear-gradient(90deg, transparent, #f0cc78);
  border-radius: 0 2px 2px 0;
  box-shadow: 0 0 8px 2px rgba(240,204,120,0.5);
  animation: shootingTrail 1.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  /* Spawns every 3.5s at random top/left position */
}
@keyframes shootingTrail {
  0%   { transform: translateX(0) translateY(0) scaleX(1); opacity: 1; }
  60%  { opacity: 0.9; }
  100% { transform: translateX(320px) translateY(180px) scaleX(3); opacity: 0; }
}
```

### CSS Animations defined
```css
@keyframes nebulaDrift  — background orbs slowly breathe/drift, 28–42s
@keyframes twinkle      — star twinkle, opacity 0.25→0.9, scale 1→1.3
@keyframes fadeInUp     — entry: opacity 0→1, translateY 20px→0, 0.6s
@keyframes shootingTrail — shooting star with diagonal trail
@keyframes goldShimmer  — gradient text position shift
@keyframes pulseGlow    — box-shadow pulse for active elements
```

### Entry animation utility classes
```css
.animate-fade-up           { animation: fadeInUp 0.6s ease forwards; }
.animate-fade-up-delay-1   { animation: fadeInUp 0.6s ease 0.1s both; }
.animate-fade-up-delay-2   { animation: fadeInUp 0.6s ease 0.2s both; }
.animate-fade-up-delay-3   { animation: fadeInUp 0.6s ease 0.35s both; }
```

---

## 6. Page Structure

### Layout
```
Max content width: max-w-6xl (72rem) cho main pages
Form pages:        max-w-lg (32rem) hoặc max-w-2xl (42rem)
Horizontal padding: px-4 → sm:px-6 → lg:px-8
Navbar height:     h-16 (4rem), fixed
Page top padding:  pt-24–pt-28 (below fixed navbar)
```

### Page backgrounds
```
All pages:         background: #06060f (--void-deep)
Alt section:       background: rgba(6,6,15,0.6) — ProcessSection trên homepage
Footer:            background: #02020a (--void-black)
```

---

## 7. Component File Map

```
src/
├── app/
│   ├── globals.css              ← Design tokens, all CSS classes
│   ├── layout.tsx               ← Font loading (5 Google Fonts)
│   ├── page.tsx                 ← Homepage (imports home components)
│   ├── services/page.tsx        ← Service selection + profile picker
│   ├── input/page.tsx           ← Birth info form
│   ├── checkout/page.tsx        ← Email + payment + confirm
│   ├── processing/page.tsx      ← Progress bar polling page
│   ├── success/page.tsx         ← Done page, PDF download, email confirm
│   └── auth/
│       ├── login/page.tsx
│       └── register/page.tsx
└── components/
    ├── layout/
    │   ├── Navbar.tsx           ← Fixed top nav, constellation SVG logo
    │   ├── Footer.tsx           ← 4-col footer with ornament divider
    │   └── ShootingStars.tsx    ← Fixed bg: starfield + nebula orbs + shooting stars
    └── home/
        ├── HeroSection.tsx      ← Server Component — full-screen hero
        ├── FeaturesSection.tsx  ← Server Component — feature cards + service grid
        ├── ProcessSection.tsx   ← Server Component — 3 steps + testimonial
        ├── CTASection.tsx       ← Server Component — gold border CTA + trust signals
        └── FloatingButtons.tsx  ← Client Component — Zalo + Messenger floating
    └── profile/
        └── LocationPicker.tsx   ← Client Component — city search + country filter
```

---

## 8. Responsive Breakpoints

```
Mobile first. Tailwind defaults:
sm: 640px   md: 768px   lg: 1024px   xl: 1280px

Key responsive patterns:
- Grid: grid-cols-1 → md:grid-cols-2 → md:grid-cols-3
- Hero text: clamp(4rem, 12vw, 8.5rem) — fluid scaling
- CTA buttons: flex-col → sm:flex-row
- Navbar: hamburger menu on mobile, links on md+
- Cards padding: p-8 → sm:p-10
```

---

## 9. Logo

SVG constellation mark inline trong Navbar và Footer:
```svg
<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
  <!-- Center star (bright) -->
  <circle cx="11" cy="11" r="2.5" fill="#d9ab55" opacity="0.9"/>
  <!-- 4 satellite stars -->
  <circle cx="3"  cy="4"  r="1.2" fill="#d9ab55" opacity="0.6"/>
  <circle cx="19" cy="5"  r="1"   fill="#d9ab55" opacity="0.5"/>
  <circle cx="4"  cy="19" r="1"   fill="#d9ab55" opacity="0.45"/>
  <circle cx="18" cy="18" r="1.3" fill="#d9ab55" opacity="0.55"/>
  <!-- Constellation lines -->
  <line x1="11" y1="11" x2="3"  y2="4"  stroke="#d9ab55" strokeWidth="0.6" opacity="0.35"/>
  <line x1="11" y1="11" x2="19" y2="5"  stroke="#d9ab55" strokeWidth="0.6" opacity="0.30"/>
  <line x1="11" y1="11" x2="4"  y2="19" stroke="#d9ab55" strokeWidth="0.6" opacity="0.28"/>
  <line x1="11" y1="11" x2="18" y2="18" stroke="#d9ab55" strokeWidth="0.6" opacity="0.32"/>
</svg>
<!-- Text: "Hạt Giống Chiêm Tinh", Cinzel bold, #d9ab55 -->
```

---

## 10. Checklist cho v0 / Design AI

Khi redesign hoặc improve, cần đảm bảo:

- [ ] **Font tiếng Việt**: KHÔNG dùng Cinzel/Cinzel Decorative cho text có dấu. Dùng Cormorant Garamond, EB Garamond, hoặc Lora (đều đã load với `vietnamese` subset)
- [ ] **Màu nền**: Giữ `#06060f` làm base, KHÔNG dùng pure black hay grey
- [ ] **Gold gradient**: Buttons luôn dùng `linear-gradient(135deg, #c8943f, #f0cc78, #c8943f)`, KHÔNG flat color
- [ ] **Button radius**: `border-radius: 4px` — KHÔNG pill-shaped (border-radius: 9999px)
- [ ] **Glassmorphism cards**: `backdrop-filter: blur(20px)` + `rgba(18,13,46,0.7)` background
- [ ] **Server Components**: HeroSection, FeaturesSection, ProcessSection, CTASection là Server Components — KHÔNG thêm `onClick`, `onMouseEnter` inline. Dùng CSS hover classes thay thế
- [ ] **Nebula orbs**: 3 fixed blurred orbs trong ShootingStars.tsx — KHÔNG xóa, đây là nền atmospheric
- [ ] **Text hierarchy**: eyebrow (section label) → heading → subtitle → body, đủ 4 levels
- [ ] **Gold tones**: `--gold-warm: #d9ab55` là màu accent chính. Dùng `--gold-bright: #f0cc78` cho hover/highlight
- [ ] **Spacing**: Form sections cách nhau bằng `1px solid rgba(200,148,63,0.1)` divider mỏng
