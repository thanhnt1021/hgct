# CLONE BLUEPRINT — Hạt Giống Chiêm Tinh

> **Mục đích file này:** Mô tả đầy đủ toàn bộ dự án để có thể dùng v0 (hoặc AI khác) tái tạo lại
> giao diện gần 100%. Mọi **nội dung text phải copy-paste đúng nguyên văn** — không được tự sáng tạo.
> Người đọc file này không cần xem code gốc vẫn có thể dựng lại toàn bộ UI/UX.

---

## MỤC LỤC

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Design System](#2-design-system)
3. [Layout chung (Navbar + Footer)](#3-layout-chung)
4. [Trang chủ `/`](#4-trang-chủ)
5. [Trang Dịch vụ `/services`](#5-trang-dịch-vụ)
6. [Trang Nhập liệu `/input`](#6-trang-nhập-liệu)
7. [Trang Thanh toán `/checkout`](#7-trang-thanh-toán)
8. [Trang Xử lý `/processing`](#8-trang-xử-lý)
9. [Trang Thành công `/success`](#9-trang-thành-công)
10. [Trang Bản đồ sao `/chart`](#10-trang-bản-đồ-sao)
11. [Trang Hồ sơ `/profile`](#11-trang-hồ-sơ)
12. [Trang Danh sách bản đồ sao `/my-charts`](#12-trang-danh-sách-bản-đồ-sao)
13. [Trang Đăng nhập `/auth/login`](#13-trang-đăng-nhập)
14. [Trang Đăng ký `/auth/register`](#14-trang-đăng-ký)
15. [Backend — Tech Stack & Logic](#15-backend)
16. [Database Schema](#16-database-schema)
17. [API Endpoints](#17-api-endpoints)

---

## 1. TỔNG QUAN DỰ ÁN

**Tên:** Hạt Giống Chiêm Tinh
**Domain:** hatgiongchiemtinh.com
**Mô tả:** Web app chiêm tinh học — người dùng nhập ngày/giờ/nơi sinh, chọn loại báo cáo, AI viết luận giải chi tiết, xuất PDF gửi email.
**Ngôn ngữ:** Tiếng Việt hoàn toàn
**Framework:** Next.js 15 (App Router) + TypeScript + Tailwind v4

**4 dịch vụ chính:**
| Dịch vụ | Icon | Màu accent |
|---|---|---|
| Hướng Nghiệp (career) | 🎯 | Gold `#c8943f` |
| Tình Duyên (love) | 💝 | Pink `#b84d70` |
| Cặp Đôi / Synastry | 💑 | Purple `#7c4dba` |
| Vận Hạn (transit) | 🔮 | Blue `#4070b8` |

---

## 2. DESIGN SYSTEM

### 2.1 Phong cách tổng thể

**Tên theme:** "Celestial Sanctum" — không gian thiên văn huyền bí, sang trọng.
**Cảm giác:** Deep space, vũ trụ tối, ánh sao vàng, sương mù thiên hà.
**Background:** Canvas animated starfield (twinkle + nebula glow orbs) + nền tĩnh `#06060f` (void-deep).

### 2.2 Bảng màu đầy đủ

```css
/* Void — depths of space */
--void-black:    #02020a;
--void-deep:     #06060f;   /* ← background chính của body */
--void-night:    #0b0b1f;

/* Nebula — interstellar clouds */
--nebula-dark:   #120d2e;   /* ← background card */
--nebula-mid:    #1c1540;
--nebula-glow:   #261c56;
--nebula-rim:    #38287a;

/* Gold — ancient starlight */
--gold-shadow:   #7a5420;
--gold-deep:     #9a6f2a;
--gold-base:     #c8943f;   /* ← primary accent */
--gold-warm:     #d9ab55;   /* ← text accent, icon */
--gold-bright:   #f0cc78;   /* ← highlight */
--gold-pale:     #fdf3d8;

/* Lunar — moonlight spectrum */
--lunar-bright:  #f4efe6;   /* ← primary text */
--lunar-warm:    #e8e0d4;
--lunar-mid:     #c9c3d6;   /* ← secondary text */
--lunar-dim:     #8a8399;   /* ← muted text */
--lunar-shadow:  #4a4560;   /* ← very muted text */

/* Semantic */
--success:       #3db88a;
--danger:        #c45252;
```

### 2.3 Fonts

| Biến CSS | Font | Dùng cho | Weights |
|---|---|---|---|
| `--font-cinzel` | Cinzel | Step numbers, logo fallback | 400, 700 |
| `--font-playfair` | Playfair Display | Headings italic lớn, testimonials | 400 (normal+italic) |
| `--font-vietnam` | Be Vietnam Pro | Toàn bộ UI text, labels, body | 400, 500, 600, 700 |

**Quy tắc font:**
- Tất cả text tiếng Việt: **Be Vietnam Pro**
- Heading trang chủ italic uppercase lớn: **Playfair Display italic**
- Số bước, ký hiệu chiêm tinh, logo: **Cinzel**
- Body `font-size: 16px`, `line-height: 1.7`

### 2.4 Card style chuẩn

```css
/* Sanctum Card */
background: rgba(28, 21, 64, 0.6);
border: 1px solid rgba(200, 148, 63, 0.14);
border-radius: 1.25rem;   /* 20px */
backdrop-filter: blur(20px);

/* Hover */
border-color: rgba(200, 148, 63, 0.38);
transform: translateY(-3px);
box-shadow: 0 20px 56px rgba(0,0,0,0.5), 0 0 32px rgba(200,148,63,0.07);
```

### 2.5 Button styles

**btn-gold (primary):**
```css
background: linear-gradient(135deg, #c8943f 0%, #f0cc78 50%, #c8943f 100%);
background-size: 200% 200%;
color: #06060f;
font-weight: 600;
border-radius: 4px;
padding: 0.7rem 1.8rem;
box-shadow: 0 4px 20px rgba(200,148,63,0.25);
```

**btn-outline (secondary):**
```css
background: transparent;
color: #d9ab55;
border: 1px solid rgba(217,171,85,0.4);
border-radius: 4px;
```

**btn-hero-secondary:**
```css
background: transparent;
color: #c9c3d6;
border: 1px solid rgba(200,148,63,0.3);
border-radius: 4px;
padding: 0.85rem 2.5rem;
```

### 2.6 Form inputs

```css
background: rgba(11,11,31,0.9);
border: 1px solid rgba(200,148,63,0.2);
color: #f4efe6;
border-radius: 0.5rem;
padding: 0.75rem 1rem;

/* Focus */
border-color: #d9ab55;
box-shadow: 0 0 0 3px rgba(217,171,85,0.1);

/* Placeholder */
color: #4a4560;
font-style: italic;
```

### 2.7 Dividers & ornaments

- **Gold divider:** `height: 1px; background: linear-gradient(90deg, transparent, #c8943f, transparent); opacity: 0.45`
- **Ornament:** `——— ✦ ———` (divider-ornament class, dòng kẻ hai bên + dấu ✦ ở giữa)
- **Star ornament:** `✦ ✦ ✦` với dấu to ở giữa, nhỏ hai bên, animate-pulse cho dấu nhỏ

### 2.8 Scrollbar tùy chỉnh

```css
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: #0b0b1f; }
::-webkit-scrollbar-thumb { background: #38287a; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #c8943f; }
```

### 2.9 Animations

- `twinkle`: sao nhấp nháy (opacity 0.25→0.9, scale 1→1.3)
- `nebulaDrift`: background orb trôi nhẹ (28–42s, scale ~1.08)
- `fadeInUp`: phần tử hiện từ dưới lên (0.6s)
- `pulseGlow`: glow vàng nhấp nháy
- `goldShimmer`: gradient vàng di chuyển
- `shootingTrail`: sao băng (1.6s)

### 2.10 Starfield animated background

Canvas full-screen fixed z-index -10. ~28% sao màu vàng `rgba(240,204,120,...)`, ~72% trắng `rgba(244,239,230,...)`. Sao nhấp nháy liên tục (sine wave). Trên canvas có 3 glow orbs CSS:
- Top-left: purple nebula `rgba(56,40,122,0.5)` — 680×680px, drift 28s
- Bottom-right: indigo nebula `rgba(28,21,64,0.65)` — 560×560px, drift 36s reverse
- Center: gold tint `rgba(200,148,63,0.05)` — 400×400px, drift 42s

---

## 3. LAYOUT CHUNG

### 3.1 Navbar

**Vị trí:** Fixed top, full width, `z-index: 50`
**Background:** `rgba(6,6,15,0.88)` blur(20px) — kính mờ
**Border bottom:** `1px solid rgba(200,148,63,0.1)`
**Height:** 64px (h-16)
**Max-width container:** 1152px (max-w-6xl)

**Logo (trái):**
- SVG inline — hình chòm sao: 1 điểm trung tâm lớn, 4 điểm nhỏ xung quanh, 4 đường nối — toàn bộ màu `#d9ab55`
- Text: **"Hạt Giống Chiêm Tinh"** — Be Vietnam Pro, 14px, gold `#d9ab55`, bold, letter-spacing 0.05em

**Desktop nav links (giữa/phải):**
- Dịch vụ → `/#features`
- Bản đồ sao → `/chart`
- Đặt báo cáo → `/services`
- Màu link: `#8a8399`, hover `#f4efe6`, font-size 0.82rem

**Desktop — khi chưa đăng nhập:**
- Link "Đăng nhập" → `/auth/login`
- Nút "Bắt đầu" → `/auth/register` — nền vàng gradient, text đen, border-radius 3px, font 0.75rem, font-weight bold, letter-spacing 0.06em

**Desktop — khi đã đăng nhập:**
- Avatar tròn 32px, border gold 1.5px, click mở dropdown
- Dropdown (w-52): background `rgba(11,11,31,0.97)`, border gold, blur 20px
  - Header: tên + email
  - Links: "Hồ sơ của tôi", "Đăng xuất" (đăng xuất hover sang đỏ `#c45252`)

**Mobile:**
- Hamburger button phải (icon 3 gạch/X)
- Click mở slide-down menu với các links + nút "Bắt đầu ngay" nền vàng
- Top bar layout: logo trái, hamburger phải

**Micro bar trên Navbar** (cực nhỏ, ít người chú ý):
- Background `#06060f`, border-bottom gold rất mờ
- Text: "Chính sách bảo mật · Điều khoản sử dụng" (links, màu `#6b6585`, font-size 0.68rem)

### 3.2 Footer

**Background:** `#02020a` (void-black)
**Border top:** `1px solid rgba(200,148,63,0.09)`
**Padding:** 40px top/bottom

**Top ornament:** divider-ornament `——— ✦ ———` căn giữa

**Grid 4 cột (md), 1 cột (mobile):**

**Cột 1–2 (brand, md:col-span-2):**
- Logo SVG + text "Hạt Giống Chiêm Tinh" (màu vàng, 1.15rem)
- Mô tả: `"Giúp bạn hiểu bản thân sâu hơn qua chiêm tinh học.\nMỗi bản đồ sao là một câu chuyện riêng — chúng tôi giúp bạn đọc nó."` (màu `#9090a8`, 0.9rem)

**Cột 3 (Dịch vụ):**
- Heading: "Dịch vụ" (0.72rem, bold, uppercase)
- Links: Hướng Nghiệp · Tình Duyên · Cặp Đôi · Vận Hạn (đều link → `/services`)

**Cột 4 (Liên hệ):**
- Heading: "Liên hệ"
- Email: `support@hatgiongchiemtinh.com`
- Website: `hatgiongchiemtinh.com`

**Bottom row:**
- Copyright: `"© 2026 Hạt Giống Chiêm Tinh. All rights reserved."` (0.75rem, `#9090a8`)
- Links: "Chính sách bảo mật · Điều khoản sử dụng"
- Disclaimer: `"Kết quả chiêm tinh mang tính tham khảo, không thay thế lời khuyên chuyên nghiệp."` (0.72rem, `#8878b8`, căn giữa)

### 3.3 Floating Buttons (góc dưới phải)

2 nút tròn 48px (3rem), xếp dọc, góc dưới phải cố định `bottom-6 right-6 z-50`:
- **Facebook Messenger:** icon SVG vàng, link `https://m.me/hatgiongchiemtinh`
- **Zalo:** text "Zalo" bold vàng, link `https://zalo.me/hatgiongchiemtinh`

Style nút: `background: rgba(11,11,31,0.9)`, border gold `0.25 opacity`, blur 12px, hover scale 1.1.

---

## 4. TRANG CHỦ

**URL:** `/`
**Components:** StarField + Navbar + HeroSection + FeaturesSection + ProcessSection + CTASection + Footer + FloatingButtons

---

### 4.1 HeroSection

**Layout:** `min-h-screen`, flex center, padding-top 64px (tránh navbar)
**Background decorative:** 3 radial-gradient orbs (gold trung tâm mờ, purple trái, indigo phải)

**Ornament đầu tiên:**
3 dấu ✦ xếp ngang, 2 đường kẻ ngang vàng hai bên (56px mỗi bên).
Dấu nhỏ 0.75rem pulse 3s, dấu to 1.1rem, dấu nhỏ 0.75rem pulse delay 1s.

**Heading chính (h1) — 3 dòng:**
```
Dòng 1: "Bầu trời lúc bạn"
  → Be Vietnam Pro, clamp(2rem, 3.5vw, 2.6rem), màu #e8b96a, letter-spacing 0.12em, font-weight 600

Dòng 2: "chào đời"
  → Playfair Display italic, clamp(3.8rem, 14vw, 8.5rem), UPPERCASE
  → Gold gradient: linear-gradient(135deg, #c8943f 0%, #f0cc78 45%, #d9ab55 70%, #c8943f 100%)
  → text-transparent background-clip, line-height 0.95

Dòng 3: "nói gì về bạn?"
  → Playfair Display italic, clamp(2.2rem, 5vw, 3.2rem), UPPERCASE
  → Màu #c9c3d6 (lunar-mid)
```

**Gold divider:** 80px wide, sau heading

**Subtitle text:**
```
"Bản đồ sao của bạn là dấu ấn riêng — ẩn chứa chìa khóa về
tính cách, sứ mệnh, tình duyên và những giai đoạn quan trọng trong cuộc đời."
```
Màu `#8a8399`, Be Vietnam Pro, clamp(1.05rem, 2vw, 1.25rem), line-height 1.9, max-width xl

**CTA Buttons (2 nút nằm ngang, mobile dọc):**
- Nút 1 (primary): **"Khám phá ngay"** → `/services` — nền vàng gradient, border-radius 4px, padding 0.85rem 2.5rem, shadow gold
- Nút 2 (secondary): **"Tạo tài khoản miễn phí"** → `/auth/register` — transparent, border gold mờ

**Tags (4 pills nằm ngang):**
Mỗi tag có dấu `✧` nhỏ vàng trước text. Nền `rgba(28,21,64,0.55)`, border gold mờ, text `#8a8399`, border-radius 2px.
```
✧ Sự nghiệp & Tài chính
✧ Tình duyên & Hôn nhân
✧ Hợp nhau đến đâu?
✧ Vận hạn sắp tới
```

---

### 4.2 FeaturesSection

**ID:** `features` (anchor link từ navbar)
**Padding:** `py-28 sm:py-36`
**Max-width:** 1152px (max-w-6xl)

**Section header:**
```
Eyebrow: "Tại sao chọn chúng tôi"
  → section-eyebrow class: Be Vietnam Pro, 0.92rem, gold #d9ab55, letter-spacing 0.08em, font-weight 600

H2 dòng 1: "Chiêm tinh đúng nghĩa —"
  → Be Vietnam Pro, clamp(2rem, 5vw, 3.4rem), font-weight 700, UPPERCASE, letter-spacing 0.04em, màu #f4efe6

H2 dòng 2: "không phải đọc cung hàng ngày"
  → Playfair Display italic, clamp(1.5rem, 4vw, 2.5rem), UPPERCASE, màu #d9ab55

Divider ornament: ——— ✦ ———

Description: "Một bản phân tích thực sự đi vào chiều sâu, giúp bạn hiểu mình hơn và đưa ra quyết định tốt hơn."
  → màu #8a8399, 1.05rem, line-height 1.9, max-width 38rem
```

**3 Feature Cards (grid 3 cột):**

Mỗi card: `feature-card` style (background rgba(18,13,46,0.65), border gold mờ, border-radius 1rem, padding 2rem)

Icon container: tròn 48px, background `rgba(200,148,63,0.1)`, border gold mờ
Icon: Lucide icon, size 22, màu `#d9ab55`, strokeWidth 1.5

| # | Icon | Title | Description |
|---|---|---|---|
| 1 | Fingerprint | **Luận giải riêng cho bạn** | Không có hai bản đồ sao nào giống nhau. Mỗi báo cáo được viết riêng dựa trên ngày, giờ và nơi sinh — không phải nhận xét chung chung theo cung hoàng đạo. |
| 2 | Mail | **Nhận qua email, đọc mọi lúc** | Báo cáo PDF được gửi thẳng vào hộp thư trong vài phút. Dài, chi tiết, dễ đọc — lưu lại để đọc đi đọc lại bất cứ lúc nào. |
| 3 | Lock | **Riêng tư & bảo mật** | Thông tin của bạn chỉ dùng để tính toán và viết báo cáo. Chúng tôi không chia sẻ dữ liệu với bên thứ ba, không hiển thị công khai. |

Title style: `#f4efe6`, 1.1rem, semi-bold
Description style: `#8a8399`, 1rem, line-height 1.85

**Sub-section: "Bốn góc nhìn chiêm tinh"**

```
Eyebrow: "Bốn góc nhìn chiêm tinh"
H2: "Bạn muốn biết điều gì?"
  → Be Vietnam Pro, 700, clamp(1.5rem, 4vw, 2.4rem), UPPERCASE, màu #f4efe6
Sub: "Chọn một trong bốn góc nhìn chiêm tinh chuyên sâu dưới đây"
  → màu #8a8399, 1rem
```

**4 Service Cards (grid 2×2):**

| Service | Icon (Lucide) | Tag | Title | Description | Accent |
|---|---|---|---|---|---|
| career | Briefcase | Hướng nghiệp | **Sự nghiệp & hướng nghiệp** | Bạn sinh ra để làm gì? Điểm mạnh nào nên phát huy, nghề nào phù hợp, thời điểm nào thuận lợi để bứt phá. | Gold `#c8943f` |
| love | Heart | Tình duyên | **Tình duyên & hôn nhân** | Bạn yêu như thế nào, cần gì trong mối quan hệ, người phù hợp là kiểu người nào và cách để tình yêu bền vững. | Pink `#e87da0` |
| synastry | Users | Cặp đôi | **Hai người hợp nhau đến đâu?** | So sánh bản đồ sao của hai người — điểm ăn ý, điểm ma sát, cách vượt qua bất đồng và xây dựng hạnh phúc. | Purple `#b08ce8` |
| transit | TrendingUp | Vận hạn | **Vận hạn sắp tới** | Trong 12 tháng tới, lĩnh vực nào được hỗ trợ, lĩnh vực nào cần thận trọng? Biết trước để chuẩn bị tốt hơn. | Blue `#78a8f0` |

Layout mỗi card: icon container tròn 44px bên trái, nội dung bên phải (tag + title + desc).
Tag: 0.78rem, bold, letter-spacing 0.08em, màu accent
Title: `#f4efe6`, 1.25rem, semi-bold
Desc: `#8a8399`, 0.88rem, line-height 1.85
Card hover: `translateY(-3px)`, box-shadow

---

### 4.3 ProcessSection

**Background:** `rgba(6,6,15,0.6)` — tối hơn để tạo contrast với section trước
**Padding:** `py-28 sm:py-36`

**Header:**
```
Eyebrow: "Cách hoạt động"
H2: "Chỉ 3 bước đơn giản"
  → Be Vietnam Pro, 700, clamp(1.5rem, 4vw, 2.6rem), UPPERCASE, màu #f4efe6
Sub: "Không phức tạp. Không mất nhiều thời gian."
  → màu #8a8399, 1.05rem
```

**3 bước (grid 3 cột, có đường kẻ ngang kết nối ở desktop):**

Mỗi bước: căn giữa, vòng tròn 7rem × 7rem background `rgba(18,13,46,0.9)`, border gold `0.25`, glow nhẹ.

| Số | Title | Description |
|---|---|---|
| **01** | Nhập ngày giờ sinh | Cho chúng tôi biết bạn sinh ngày nào, mấy giờ, ở đâu. Chỉ vậy thôi — không cần gì thêm. |
| **02** | Chọn điều muốn khám phá | Sự nghiệp, tình duyên, so sánh cặp đôi hay vận hạn sắp tới — bạn muốn hiểu điều gì nhất? |
| **03** | Nhận báo cáo trong email | Trong vài phút, một bản phân tích chi tiết — viết riêng cho bạn — sẽ có trong hộp thư. |

Số bước: Cinzel, 1.9rem, font-weight 700, màu `#d9ab55`
Title: Be Vietnam Pro, 1.15rem, semi-bold, `#f4efe6`
Description: Be Vietnam Pro, 1rem, line-height 1.85, `#8a8399`
Đường kẻ ngang: `top: 2.5rem`, gradient gold, chỉ hiện ở desktop (hidden md:block)

**Testimonial card:**

Card: `background: rgba(18,13,46,0.6)`, border gold mờ, blur 20px, padding 2.5rem, border-radius 1rem
Quote mark lớn `"` (font Playfair, 5rem, màu gold 15% opacity)

```
Quote text (Playfair italic, 1.15rem, line-height 1.9, màu #c9c3d6):
"Mình không tin tưởng chiêm tinh lắm cho đến khi đọc bản phân tích về sự nghiệp — nó mô tả đúng đến mức mình phải đọc lại hai lần. Giờ mình hiểu tại sao mình luôn bị thu hút bởi những ngành sáng tạo dù học kỹ thuật."

Author: Avatar tròn gradient vàng, chữ "T"
Tên: Thanh N. (Be Vietnam Pro, 600, #f4efe6, 0.95rem)
Sub: "Hà Nội · Báo cáo hướng nghiệp" (italic, #9090a8, 0.85rem)
```

---

### 4.4 CTASection

**Layout:** `py-28 sm:py-36`, max-width 896px (max-w-4xl)

**Box chính:** Gradient border 1px (gold 70% → gold 20% → gold 60%), bên trong `background: linear-gradient(160deg, #0d0d26 0%, #080818 100%)`, border-radius 15px, padding 4rem.

**Nội dung trong box (căn giữa):**

Ornament 3 dấu ✦ + đường kẻ vàng hai bên

```
Eyebrow text: "Bản đồ sao của bạn"
  → Be Vietnam Pro, 600, clamp(1.4rem, 2.8vw, 1.8rem), màu #c8943f, letter-spacing 0.1em

Headline: "đang chờ được đọc"
  → Playfair Display italic, clamp(2.5rem, 7vw, 4.5rem), UPPERCASE
  → Gold gradient text (transparent fill)

Gold divider: 60px

Description: "Hàng trăm khách hàng đã hiểu hơn về bản thân, tình yêu và con đường phía trước. Đến lượt bạn."
  → màu #8a8399, 1.05rem, line-height 1.9, max-w-lg

CTA Button: "Bắt đầu ngay" → /services
  → nền vàng gradient, màu #06060f, border-radius 4px, padding 0.95rem 3rem

Subtext: "Nhận báo cáo trong vài phút · Giao qua email · PDF lưu được"
  → màu #9090a8, 0.85rem
```

**Trust signals (3 cột bên dưới box):**

| Số | Label |
|---|---|
| **4** | Loại báo cáo\nchuyên sâu |
| **100%** | Cá nhân hóa\nriêng cho bạn |
| **< 5 phút** | Nhận báo cáo\nqua email |

Số: Cinzel (cho 4 và 100%), Be Vietnam Pro (cho < 5 phút), font-size clamp(2rem, 5vw, 3rem), màu `#d9ab55`
Label: Be Vietnam Pro, 0.85rem, `#9090a8`, white-space pre-line

---

## 5. TRANG DỊCH VỤ

**URL:** `/services`
**Background:** `#06060f`
**Max-width:** 1024px (max-w-5xl)
**Padding top:** 112px (pt-28)

### 5.1 Bước 1: Chọn dịch vụ

**Header:**
```
Eyebrow: "Chiêm tinh chuyên sâu"
H1: "Chọn dịch vụ"
  → Be Vietnam Pro, 700, clamp(1.5rem, 4vw, 2.2rem), màu #f4efe6, letter-spacing 0.03em
Sub: "Mỗi báo cáo được AI biên soạn chi tiết và gửi qua email dưới dạng PDF"
  → màu #8a8399, 0.95rem
```

**Grid 4 service cards (2×2):**

| Service | Icon | Name | Description |
|---|---|---|---|
| career | 🎯 | **Hướng Nghiệp** | Phân tích sự nghiệp, tài năng nổi bật, con đường nghề nghiệp và tài chính phù hợp nhất. |
| love | 💝 | **Tình Duyên** | Phân tích phong cách yêu, nhu cầu tình cảm, người bạn đời phù hợp và bài học tình duyên. |
| synastry | 💑 | **Cặp Đôi** | So sánh bản đồ sao 2 người — phân tích hòa hợp, xung đột, bài học và chìa khóa hạnh phúc. |
| transit | 🔮 | **Vận Hạn** | Phân tích transit hiện tại — sự nghiệp, tài chính, tình cảm, sức khỏe trong giai đoạn tới. |

Card hover: `translateY(-3px)`, shadow.
Synastry có badge nhỏ "Cần 2 hồ sơ" (purple mờ, 0.6rem).

### 5.2 Bước 2: Chọn hồ sơ

Sau khi click service, hiện panel chọn hồ sơ (max-w-lg, căn giữa):

- Nút **"← Quay lại"** — hover sang vàng
- Card `rounded-2xl p-8`, background `rgba(18,13,46,0.75)`, border gold
- Header: icon dịch vụ + tên + optional "Cần 2 hồ sơ để so sánh"
- Gold divider

**ProfilePicker:**
- Label (0.65rem, letter-spacing 0.06em, `#8a8399`): "CHỌN HỒ SƠ" hoặc "NGƯỜI THỨ NHẤT" / "NGƯỜI THỨ HAI"
- Nút **"+ Nhập thông tin mới"** (transparent, border gold, text vàng, hover bg vàng mờ)
- Search box (icon kính lúp, input clear button)
- Danh sách profile scroll (max-height 180px), mỗi row: tên bold + note italic
- Row selected: bg `rgba(200,148,63,0.12)`, border gold, text `#f0cc78`

**Vận Hạn thêm date range:**
- Label "TỪ NGÀY" + "ĐẾN NGÀY" (grid 2 cột)
- Input type=date, colorScheme: dark
- Warning nếu > 365 ngày

**Nút "Tiếp tục →":** Gold gradient, disabled khi chưa chọn đủ (opacity 0.35)

**Modal nhập thông tin mới:**
- Overlay mờ, dialog centered
- Form (Họ/Đệm/Tên + Giới tính + Ngày sinh + Giờ sinh + Nơi sinh + Ghi chú)
- Checkbox "Lưu vào danh sách hồ sơ"
- Nút submit: "Xác nhận" / "Tiếp tục →" / "Chọn người tiếp theo →"

---

## 6. TRANG NHẬP LIỆU

**URL:** `/input` (có params `?for=synastry` hoặc `?for=chart`)
**Background:** `#06060f`
**Max-width:** 672px (max-w-2xl)
**Padding top:** 96px (pt-24)

**Header:**
```
Eyebrow: "Bản đồ sao" (hoặc "Người thứ hai" nếu for=synastry)
H1: "Nhập thông tin" (hoặc "Thông tin người thứ hai")
Sub: "Điền đầy đủ để tạo bản đồ sao chính xác nhất"
  (hoặc "Nhập thông tin của người bạn muốn so sánh bản đồ sao")
  (hoặc "Điền thông tin để xem bản đồ sao ngay" cho for=chart)
```

**Form card:** `rounded-2xl p-5 sm:p-6`, background `rgba(18,13,46,0.7)`, border gold, blur

**Các trường (theo thứ tự, compact mode — height 2rem):**

1. **Họ và tên** (grid 3 cột: Họ / Đệm / Tên*) + **Giới tính** (select: Nữ/Nam/Khác) — cùng hàng
2. Gold divider
3. **Ngày sinh** (3 select: Ngày/Tháng/Năm — năm có option "Năm khác..." chuyển sang input text) + **Giờ sinh** (2 select: Giờ/Phút + checkbox "Không rõ") — 2 cột trên desktop
4. Gold divider
5. **Nơi sinh** — LocationPicker (search Nominatim geocoding)
6. Gold divider
7. **Biệt danh / Ghi chú** *(tuỳ chọn)*
8. Checkbox "Lưu hồ sơ" (nếu đăng nhập) / link "Đăng nhập để lưu hồ sơ"

**Submit button:** Gold gradient, full width, height 36px
- Default: "Tiếp tục →"
- for=chart: "Xem bản đồ sao ✦"
- for=synastry: "Tiếp tục thanh toán →"

---

## 7. TRANG THANH TOÁN

**URL:** `/checkout`
**Max-width:** 512px (max-w-lg), căn giữa
**Padding top:** 112px (pt-28)

**Loading states:**
- Auth loading: spinner vàng full-screen
- Submitting: spinner + text "ĐANG KẾT NỐI" (0.65rem, letter-spacing)

**Main card:** `rounded-2xl p-8 sm:p-10`, background `rgba(18,13,46,0.7)`, border gold, blur

**Header:**
- Service icon (emoji, 5xl)
- Eyebrow: "Xác nhận đặt báo cáo"
- H1: "Luận giải {ServiceName}" (1.4rem, bold, `#f4efe6`)
- Sub: tên người dùng/cặp (màu `#8a8399`)

**Gold divider**

**Order summary:**
Mỗi dòng: label trái (0.65rem, `#4a4560`) + giá trị phải (0.9rem, `#f4efe6` hoặc `#d9ab55`)
- Dịch vụ: "Luận giải {Name}"
- Khách hàng: tên
- Giai đoạn: (chỉ transit) ngày bắt đầu → ngày kết thúc
- Thời gian tạo: "~ {3–4 / 4–5 / 6–8} phút" (màu vàng)

**Email field:** Label "Email nhận báo cáo PDF", input type email

**Payment info box** (`rgba(6,6,15,0.6)`, border gold 0.1):
```
Ngân hàng: MB Bank
Số TK: xxxx xxxx xxxx
Chủ TK: HAT GIONG CHIEM TINH
```

**CTA:**
- Premium/Lifetime: "Tạo báo cáo & Gửi Email" (vàng gradient, tạo báo cáo trực tiếp)
- Free/Guest: "Sẵn sàng THANH TOÁN →" (vàng gradient, chuyển sang `/payment`)

**Subtext:** "Báo cáo PDF sẽ được gửi đến email trong {eta} phút"

---

## 8. TRANG XỬ LÝ

**URL:** `/processing?job={id}&service={type}&name={name}`
**Background:** `#06060f`, full-screen center

### State xử lý:

**Ornament:** 3 dấu ✦ pulse + non-pulse

**Heading:** `"Cảm ơn bạn đã tin tưởng!"` (1.3rem, bold, `#f4efe6`)

**Description:** `"🎯 AI đang biên soạn luận giải {ServiceName} riêng cho {Name}"`
serviceName vàng, name trắng

**Progress card** (max-w-md, `rgba(18,13,46,0.75)`, border gold):
- Row: label progress (0.65rem, vàng) + percent (0.85rem, bold, vàng)
- Progress bar: `h-1.5`, background gold 8%, fill gradient gold→yellow, glow shadow, transition 700ms
- Step checklist (5 bước):
  - `5%` — Tính toán bản đồ sao
  - `15%` — Phân tích cung hoàng đạo
  - `18%` — AI biên soạn luận giải
  - `90%` — Tạo file PDF
  - `95%` — Gửi email

  Trạng thái mỗi bước: ✓ xanh (done) / ◆ vàng pulse (active) / ◆ tím mờ (pending)

**Can-close notice** (xanh lá):
```
"Bạn có thể đóng trang này — báo cáo sẽ tự động gửi vào email khi hoàn thành"
Nút: "Đóng & về lịch sử →"
```

**ETA text:** `"Dự kiến hoàn thành trong khoảng {eta} phút"`

**Nút "Hủy báo cáo":** Đỏ mờ, hover confirm modal

### State error:

Card border đỏ, icon ⚠, heading đỏ "Có lỗi xảy ra", message, 2 nút: "Thử lại" + "Liên hệ hỗ trợ"

---

## 9. TRANG THÀNH CÔNG

**URL:** `/success`
**Background:** `#06060f`
**Max-width:** 512px, căn giữa, pt-28

**Main card:**
- Ornament ✦✦✦ + đường kẻ vàng
- H1: `"Cảm ơn bạn đã tin tưởng!"` (clamp 1.2rem→1.6rem, bold)
- Text: `"Luận giải {serviceName} của bạn đã được tạo xong và đang trên đường đến hộp thư."` (màu `#8a8399`)

**Email delivery notice:**
- Icon 📬 (đã gửi, nền xanh lá mờ) hoặc ⏳ (đang gửi, nền vàng mờ)
- Text: "File đã được gửi đến hộp thư" / "Đang gửi file, xin chờ một chút..."
- Email address: `#f4efe6`
- Sub: "Kiểm tra mục Spam nếu không thấy trong hộp thư chính" (italic, mờ)

**PDF download button:** `↓ Tải PDF về máy` — background gold 10%, border gold, text vàng, hover gold 18%

**CTA buttons (2 nút ngang):**
- "Tạo báo cáo khác" → `/services` (vàng gradient)
- "Về trang chủ" → `/` (transparent, border gold mờ)

**Support card** (bên dưới main card, `rgba(11,11,31,0.6)`):
```
Label: "Sau 10 phút chưa nhận được?"

"Trước tiên hãy kiểm tra thư mục Spam / Junk — đôi khi email tự động bị lọc vào đó."
"Nếu vẫn chưa có, liên hệ hỗ trợ qua:"

✦ support@hatgiongchiemtinh.com
✦ Chat Zalo
✦ Facebook Messenger

"Hỗ trợ 8:00–22:00 hàng ngày · Phản hồi trong vòng 30 phút" (italic)
```

---

## 10. TRANG BẢN ĐỒ SAO

**URL:** `/chart`
**Background:** `#06060f`

### State 1: Chọn hồ sơ

**Header:**
```
Eyebrow: "Chiêm tinh học"
H1: "Bản Đồ Sao" — Playfair Display italic, clamp(2rem, 6vw, 3.2rem), UPPERCASE
Gold divider 60px
Sub: "Chọn hồ sơ để xem bản đồ sao đầy đủ với vị trí hành tinh, nhà, góc hợp và phân tích nguyên tố."
```

Card chọn hồ sơ: nút "+ Nhập thông tin mới" + search + danh sách + nút "Xem bản đồ sao ✦"

### State 2: Kết quả

**Layout:** max-w-6xl, grid 2 cột (desktop)

**Page header:**
```
Eyebrow: "Bản đồ sao bản mệnh"
H1: {Tên} — Playfair Display italic, UPPERCASE
Sub info: 🕐 {giờ local} · 📍 {lat/lon} · 🏠 {house system}
Nút "← Chọn hồ sơ khác" (outline, border gold mờ)
```

**6 sections, mỗi section có SectionHeader (đường kẻ vàng + text uppercase):**

1. **BÁNH XE BẢN ĐỒ SAO** — SVG/Canvas vẽ natal wheel + legend màu góc hợp
2. **VỊ TRÍ HÀNH TINH** — bảng: Hành tinh | Cung | Độ | Nhà
3. **ĐỘ ĐỈNH CỦA 12 NHÀ** — bảng: Nhà | Cung | Độ | Chủ tinh
4. **BẢNG NGUYÊN TỐ & TÍNH CHẤT** — ma trận + progress bars (Lửa🔥/Đất🌱/Khí💨/Nước💧 × Tiên Phong/Kiên Định/Linh Hoạt)
5. **BẢNG GÓC HỢP** — ma trận 15×15 lower-triangle, màu theo type (Hard=đỏ/Soft=xanh/Minor=xanh lá)
6. **HÀNH TINH TẠO NHIỀU GÓC NHẤT** — grid 2 cột, mỗi planet card
7. **GÓC CHẶT NHẤT** — danh sách highlight theo màu aspect type

---

## 11. TRANG HỒ SƠ

**URL:** `/profile?tab={info|charts|history|plans}`
**Background:** `#0a0a1a`
**Yêu cầu đăng nhập** (redirect sang `/auth/login` nếu chưa)

### Layout (2 cột):
- **Sidebar trái** (width: 248px, fixed trên mobile / sticky trên desktop)
- **Main content phải** (flex-1)

### Sidebar

**Background:** `#06060f`, border-right gold 0.08 opacity, `overflow-y: auto`

**User badge** (top sidebar):
- Avatar tròn 36px (border vàng — đậm hơn nếu lifetime, mờ nếu premium, rất mờ nếu free)
- Tên (Tên từ chart data hoặc username)
- Plan label: "Lifetime ★" / "Cao cấp ✦" / "Tiêu chuẩn ✦" / "Miễn phí"

**Nav tabs (4 tabs):**

| Icon (Lucide) | Label | Tab ID |
|---|---|---|
| User | Thông tin cá nhân | info |
| Star | Bản đồ sao | charts |
| FileText | Lịch sử & Báo cáo | history |
| Crown | Gói dịch vụ | plans |

Tab active: background `rgba(201,168,76,0.07)`, text vàng, border-left 2px `#c9a84c`
Tab inactive: text `#6b7280`, no background

**Mobile:**
- Không có sidebar cố định
- Strip 44px cố định ở top (dưới navbar): hamburger icon + tên tab hiện tại (vàng)
- Click hamburger → overlay mờ + slide-in drawer từ trái
- Drawer có nút X đóng

### Tab: Thông tin cá nhân (`info`)

Component `ProfileInfo` — form cập nhật thông tin cá nhân:
- Họ tên, email, reportEmail (email nhận PDF riêng)
- Upload avatar (crop modal)
- Đổi mật khẩu
- Bản đồ sao chính (main chart data: họ/đệm/tên, ngày/giờ/nơi sinh)

### Tab: Bản đồ sao (`charts`)

Component `ChartList` — danh sách profiles + link xem chart + link đặt dịch vụ

### Tab: Lịch sử & Báo cáo (`history`)

Component `HistoryReports` — danh sách jobs đã tạo, nút Tải PDF + nút Chia sẻ (Web Share API)

### Tab: Gói dịch vụ (`plans`)

Component `SubscriptionPlans`:

**Billing toggle:** nút tròn "Tháng / Năm" (badge "−26%" xanh lá)

**3 Plan cards (grid 3 cột):**

| Plan | Price (monthly) | Price (yearly) |
|---|---|---|
| **Miễn phí** | 0đ /mãi mãi | — |
| **Tiêu chuẩn** *(Phổ biến nhất)* | 79.000đ /tháng | 699.000đ /năm (~58.000đ/tháng, tiết kiệm 26%) |
| **Cao cấp** | 149.000đ /tháng | 1.290.000đ /năm (~108.000đ/tháng, tiết kiệm 28%) |

**Miễn phí — Features:**
- ✓ Xem bản đồ sao tương tác
- ✓ Lưu tối đa 5 bản đồ sao
- ✓ Tổng quan cung & hành tinh
- ✗ Báo cáo chiêm tinh chi tiết (PDF)
- ✗ Báo cáo Synastry & Vận hạn
- ✗ Hỗ trợ khách hàng

**Tiêu chuẩn — Features:**
- ✓ Tất cả tính năng Miễn phí
- ✓ Lưu không giới hạn bản đồ sao
- ✓ Báo cáo Sự nghiệp chi tiết (PDF)
- ✓ Báo cáo Tình yêu chi tiết (PDF)
- ✓ Hỗ trợ qua email
- ✗ Báo cáo Synastry (so sánh cặp đôi)
- ✗ Báo cáo Transit & Vận hạn

**Cao cấp — Features:**
- ✓ Tất cả tính năng Tiêu chuẩn
- ✓ Báo cáo Synastry (so sánh cặp đôi)
- ✓ Báo cáo Transit & Vận hạn
- ✓ Ưu tiên nhận tính năng mới
- ✓ Hỗ trợ ưu tiên

CTA buttons: "Nâng cấp ngay →" (Tiêu chuẩn, vàng gradient) / "Chọn gói này →" (Cao cấp, purple)
Note: `"Gói Năm: 365 ngày từ ngày thanh toán · Hủy bất cứ lúc nào"`

**Activation code box:**
```
"Có mã kích hoạt đặc biệt?"
"Nhập mã để kích hoạt gói dịch vụ ngay lập tức."
Input + nút "Kích hoạt"
```

**Toast:** Fixed bottom center, `"Tính năng thanh toán sẽ sớm ra mắt. Liên hệ hỗ trợ để được tư vấn nâng cấp."`

---

## 12. TRANG DANH SÁCH BẢN ĐỒ SAO

**URL:** `/my-charts` (được access từ profile tab charts)
**Background:** `#0a0a1a`

**Header:** `"← Hồ sơ"` link + H1 "Danh sách Bản đồ sao" + sub "{n} hồ sơ đã lưu"

**Mỗi profile row:**
- Background `rgba(26,21,53,0.6)`, border gold
- Tên profile (bold) + info (giới tính ♀/♂/⊕ · ngày/giờ/nơi)
- Buttons: Sửa · Xóa (confirm) · Dịch vụ · Bản đồ ✦

**Inline edit form** (expand dưới row khi click Sửa):
Giống form nhập liệu nhưng compact inline

**Empty state:** Text "Chưa có hồ sơ nào." + nút "+ Thêm bản đồ sao"

---

## 13. TRANG ĐĂNG NHẬP

**URL:** `/auth/login`
**Background:** `#06060f`, full-screen center, max-width 448px

**Logo đầu trang:** SVG chòm sao + "Hạt Giống Chiêm Tinh" (căn giữa, vàng)

**Card:** `rounded-2xl p-8 sm:p-10`, background `rgba(18,13,46,0.7)`, border gold, blur

**H2:** `"Đăng nhập"` (1.1rem, bold, căn giữa, `#f4efe6`, letter-spacing 0.06em)

**Error box** (nếu có): background đỏ 10%, border đỏ 30%, text `#e87070`

**Form fields:**
- Label: "Tên đăng nhập hoặc Email" (0.6rem, bold, letter-spacing 0.06em, màu `#8a8399`)
  - Input placeholder: "username hoặc email@example.com"
- Label: "Mật khẩu"
  - Input type password, placeholder "••••••••"

**Link "Quên mật khẩu?"** — right-align, màu `#8a8399`, hover vàng → `/auth/forgot-password`

**Submit button:** "Đăng nhập" / "Đang đăng nhập..." — gold gradient, full width, py-3.5

**Google Sign In button** (GoogleSignInButton component, dưới form)

**Link đăng ký:** `"Chưa có tài khoản? Đăng ký ngay"` (link vàng → `/auth/register`)

**Footer links:** Chính sách bảo mật · Điều khoản sử dụng (0.72rem, `#4a4560`)

---

## 14. TRANG ĐĂNG KÝ

**URL:** `/auth/register`
**Structure giống Login nhưng:**

**H2:** `"Tạo tài khoản"`

**Form 5 fields:**
- Tên đăng nhập (placeholder: "username")
- Họ và tên (placeholder: "Nguyễn Văn A")
- Email (placeholder: "email@example.com")
- Mật khẩu (placeholder: "Ít nhất 6 ký tự")
- Nhập lại mật khẩu (placeholder: "••••••••")

**Submit:** "Đăng ký" / "Đang tạo tài khoản..."

**Link đăng nhập:** `"Đã có tài khoản? Đăng nhập"`

---

## 15. BACKEND

### 15.1 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.2.3 App Router |
| Language | TypeScript 5 |
| Database ORM | Prisma v5 + PostgreSQL |
| Auth | NextAuth.js v4 (credentials + Google OAuth) |
| AI | OpenRouter API — Claude Sonnet 4.6 (`max_tokens: 32000`) |
| Astro Engine | `swisseph` npm (Swiss Ephemeris) |
| PDF | `@sparticuz/chromium` + `puppeteer-core` |
| Email | Nodemailer, Hostinger SMTP port 465 SSL |
| UI Icons | Lucide React |
| Animation | Framer Motion + CSS keyframes |
| Styling | Tailwind CSS v4 |

### 15.2 Report Flow

```
1. User submit form (inputData + service + email)
2. POST /api/astrology/report
3. Create Job record (DB) → return jobId
4. Background async:
   a. Swiss Ephemeris tính toán chart (planets, houses, aspects)
   b. Query KnowledgeBase từ DB
   c. Run logic blocks (career block1-4 / love / synastry / transit)
   d. Build AI prompt
   e. Stream từ OpenRouter (retry 3 lần nếu ECONNRESET)
   f. Validate min chars (transit: 12000, synastry: 10000, career/love: 4000)
   g. Generate PDF (Puppeteer → Chromium)
   h. Save PDF → /var/hgct/pdfs/{jobId}.pdf
   i. Send email (Nodemailer, attach PDF)
   j. Update Job: status=done, result={pdfUrl, email, emailSent}
5. Client polls /api/job/{jobId} mỗi 2s
6. Khi done → redirect /success
```

### 15.3 Job system

- Job record tồn tại trong PostgreSQL + in-memory cache
- Polling endpoint: `GET /api/job/{jobId}` → `{status, progress, label, result, error}`
- Cancel: `DELETE /api/job/{jobId}`
- Auto-timeout jobs bị stuck sau 15 phút
- Progress labels: "Tính toán bản đồ sao" / "Phân tích cung hoàng đạo" / "AI biên soạn luận giải" / "Tạo file PDF" / "Gửi email"

### 15.4 Plan tiers

| planType | isPremium | Quyền |
|---|---|---|
| free | false | Xem chart, lưu ≤5 profiles |
| premium / standard | true | Tạo báo cáo career + love |
| cao_cap | true | Tất cả (bao gồm synastry + transit) |
| lifetime | true | Tất cả, vĩnh viễn |

### 15.5 Auth

- Credentials: username + password (bcrypt hash)
- Google OAuth
- Session chứa: `uid, username, isPremium, planType, premiumToken, email, name, image`
- Forgot password: token DB + email link + `/auth/reset-password`

### 15.6 Profiles

- Mỗi user có nhiều profiles (hồ sơ chiêm tinh)
- Profile data (JSON): `{ho, dem, ten, gender, dob: {day, month, year}, tob: {hour, minute, unknown}, loc: {address, lat, lon, tz}, note}`
- `isTemp: true` = hồ sơ tạm (không đăng nhập hoặc không lưu)
- `mainChartData` lưu trong User table — dùng cho display name trên navbar

---

## 16. DATABASE SCHEMA

```prisma
model User {
  id           Int      -- PK autoincrement
  username     String   -- unique
  email        String?  -- unique
  passwordHash String
  userUid      String   -- unique UUID
  isPremium    Boolean  default false
  planType     String   default "free"
  premiumToken String?
  resetToken   String?
  resetTokenExpiry DateTime?
  mainChartData Json?   -- {ho, dem, ten, dob, tob, loc}
  reportEmail  String?  -- email riêng nhận PDF
  profiles     Profile[]
}

model Profile {
  id         Int     -- PK autoincrement
  userUid    String  -- FK → User.userUid
  profileUid String  -- unique UUID
  name       String
  gender     String?
  data       Json    -- {ho, dem, ten, dob, tob, loc, note}
  isTemp     Boolean default false
  tempExpiry DateTime?
}

model KnowledgeBase {
  tabName   String  -- PK (e.g. "career_sun_aries")
  data      Json
  updatedAt String
}

model Job {
  id          String   -- PK (UUID)
  status      String   -- "processing" | "done" | "error"
  progress    Int      -- 0–100
  label       String
  result      Json?    -- {pdfUrl, email, emailSent, pdfFilename}
  error       String?
  userUid     String?
  service     String?  -- "career"|"love"|"synastry"|"transit"
  name        String?
  email       String?
  profileUidA String?
  profileUidB String?
  pdfExpiresAt DateTime?
  createdAt   DateTime default now()
}

model Order {
  id          Int      -- PK
  userUid     String?
  service     String
  profileData Json
  email       String
  status      String   default "pending"
  pdfUrl      String?
  createdAt   DateTime default now()
}
```

---

## 17. API ENDPOINTS

| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/astrology/report` | Tạo báo cáo (tất cả 4 dịch vụ) |
| POST | `/api/astrology/calculate` | Tính toán chart (không lưu) |
| GET/POST | `/api/chart` | Lấy/lưu natal chart |
| GET/POST/PUT/DELETE | `/api/profiles` | CRUD hồ sơ |
| GET/DELETE | `/api/job/[id]` | Job status + cancel |
| GET | `/api/jobs` | Danh sách jobs của user |
| POST | `/api/auth/[...nextauth]` | NextAuth |
| POST | `/api/auth/register` | Đăng ký tài khoản |
| GET/POST | `/api/user/account` | Thông tin tài khoản |
| POST | `/api/user/upgrade` | Kích hoạt gói bằng code |
| POST | `/api/user/password` | Đổi mật khẩu |
| GET | `/api/user/avatar` | Lấy avatar |
| GET | `/api/location/search` | Geocoding (Nominatim) |
| GET | `/api/pdf/[id]` | Download PDF |
| POST | `/api/payment/confirm` | Placeholder thanh toán |

---

## LƯU Ý KHI DÙNG V0

1. **Luôn dùng `Be Vietnam Pro`** cho mọi text tiếng Việt — đây là font chính
2. **Background body = `#06060f`**, không phải đen tuyệt đối
3. **Card background = `rgba(18,13,46,0.7)` + blur** — không phải solid
4. **Tất cả nút vàng = gradient** `linear-gradient(135deg, #c8943f, #f0cc78, #c8943f)`, text đen `#06060f`
5. **Border mặc định** của card = `rgba(200,148,63,0.16)` (gold, opacity thấp)
6. **Logo SVG** là hình chòm sao tự vẽ, không phải text hay emoji
7. **Starfield** là canvas animation — có thể simplify thành CSS radial-gradient tĩnh cho v0
8. **Ornament ✦** xuất hiện ở nhiều nơi — đặc trưng của design này
9. **Section eyebrow** (text nhỏ phía trên heading): Be Vietnam Pro, 0.92rem, `#d9ab55`, letter-spacing 0.08em, font-weight 600
10. **Tất cả text = tiếng Việt** — dùng đúng nội dung như đã ghi trong file này

---

*Cuối file — Tạo ngày: 2026-03-16*
