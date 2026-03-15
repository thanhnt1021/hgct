# Mobile UI Form — Quy tắc thiết kế Web App giả lập Native Mobile

Tài liệu này quy định **tất cả các nguyên tắc bắt buộc** khi thiết kế giao diện cho ChiaBill — một web app được xây dựng để trông và cảm nhận giống hệt ứng dụng điện thoại native.

Áp dụng cho: mọi trang, modal, popup, overlay, toast, action bar, và bất kỳ thành phần UI nào.

---

## 1. QUY TẮC WIDTH — QUAN TRỌNG NHẤT

### 1.1. Nguyên tắc cốt lõi

**MỌI thành phần UI — không có ngoại lệ — phải nằm gọn trong cùng một chiều rộng tối đa (max-width) với trang chủ.**

Điều này có nghĩa: nếu trang chủ rộng 480px trên desktop, thì modal cũng 480px, popup cũng 480px, toast cũng nằm trong 480px, bottom bar cũng 480px. Không có gì được phép "tràn" ra ngoài khung app.

Lý do: Web app giả lập điện thoại. Trên desktop, toàn bộ app hiển thị như một "cái điện thoại" nằm giữa màn hình. Bất kỳ element nào tràn ra ngoài sẽ phá vỡ ảo giác này.

### 1.2. Bảng max-width theo breakpoint

| Breakpoint | Container max-width | Giải thích |
|------------|-------------------|-------------|
| **< 640px** (điện thoại thật) | `600px` | Full-width trên điện thoại thật. 600px chỉ là cap, trên thực tế màn hình nhỏ hơn nên content chiếm 100% width. |
| **≥ 640px** (tablet/desktop nhỏ) | `480px` | App thu hẹp thành "khung điện thoại" centered trên nền xám. |
| **≥ 768px** (desktop) | `500px` | Hơi rộng hơn một chút cho thoải mái hơn trên màn hình lớn. |

### 1.3. Danh sách TỪNG loại thành phần phải tuân theo

#### a) Page content (`.container`)
```css
/* Mặc định */
.container { max-width: 600px; padding-left: 16px; padding-right: 16px; }

/* Desktop */
@media (min-width: 640px) { .container { max-width: 480px; } }
@media (min-width: 768px) { .container { max-width: 500px; } }
```
- Mọi trang đều extends `base.html`, content nằm trong `<div class="container py-3">`
- KHÔNG BAO GIỜ dùng `.container-fluid` hoặc tự tạo wrapper không có max-width

#### b) Bottom navigation bar (`.bottom-nav`)
```css
/* Mobile: full width */
.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; width: 100%; }

/* Desktop: constrained + centered */
@media (min-width: 640px) {
    .bottom-nav {
        max-width: 480px !important;
        left: 50% !important;
        transform: translateX(-50%);
    }
}
@media (min-width: 768px) {
    .bottom-nav { max-width: 500px !important; }
}
```

#### c) Modal dialogs (`.modal-dialog`)
Có 2 loại modal:

**Centered modal** (confirmation, form nhỏ):
```css
/* Luôn nhỏ hơn container */
@media (min-width: 640px) {
    .modal-dialog { max-width: 420px; margin-left: auto; margin-right: auto; }
}
```

**Fullscreen modal** (`.modal-full-mobile` — chọn người trả, chia tiền):
```css
/* Mobile: full screen */
.modal-full-mobile .modal-dialog { margin: 0; max-width: 100%; height: 100dvh; }

/* Desktop: constrained bằng container */
@media (min-width: 640px) {
    .modal-full-mobile .modal-dialog {
        max-width: 480px !important;
        margin-left: auto !important;
        margin-right: auto !important;
        height: 100dvh;
    }
}
@media (min-width: 768px) {
    .modal-full-mobile .modal-dialog { max-width: 500px !important; }
}
```

#### d) Toast notifications (`#liveToastContainer`)
```css
#liveToastContainer {
    position: fixed;
    top: calc(12px + var(--safe-top));
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    width: 92%;
    max-width: 380px; /* Luôn nhỏ hơn container */
}
```

#### e) Overlays và fixed action bars
Dùng class có sẵn: `.mobile-contained-overlay` hoặc `.mobile-contained-fixed`
```css
@media (min-width: 640px) {
    .mobile-contained-overlay,
    .mobile-contained-fixed {
        max-width: 480px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        width: 100% !important;
    }
}
@media (min-width: 768px) {
    .mobile-contained-overlay,
    .mobile-contained-fixed {
        max-width: 500px !important;
    }
}
```

#### f) BẤT KỲ element `position: fixed` mới nào
Nếu tạo một element fixed mới (loading screen, action sheet, sticky header...), **BẮT BUỘC** thêm CSS:
```css
@media (min-width: 640px) {
    .ten-element-moi {
        max-width: 480px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        width: 100% !important;
    }
}
@media (min-width: 768px) {
    .ten-element-moi {
        max-width: 500px !important;
    }
}
```

### 1.4. Cách kiểm tra width đúng chưa

1. Mở Chrome DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. Chọn "Responsive" → kéo width ra 1200px
3. Nhìn app: tất cả UI phải nằm gọn trong "khung điện thoại" ở giữa
4. Mở modal → modal phải nằm trong khung, KHÔNG được tràn ra nền xám
5. Trigger toast → toast phải nằm trong khung
6. Kiểm tra bottom nav → phải cùng width với container, KHÔNG full-width

---

## 2. MOBILE-FIRST DESIGN

### 2.1. Thiết kế cho iPhone trước

- **Target chính**: iPhone 14/15 (390px) và iPhone SE (375px)
- **Quy trình**: Thiết kế đẹp trên 375px trước → rồi mới kiểm tra trên tablet/desktop
- **Viewport meta** (đã có trong `base.html`):
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  ```
  - `maximum-scale=1.0, user-scalable=no` — ngăn pinch-to-zoom (vì đây là app, không phải web)
  - `viewport-fit=cover` — cho phép content kéo dài đến mép màn hình (cần cho safe area)

### 2.2. Desktop = "Phone frame"

Khi xem trên desktop (≥640px):
- Body có nền xám gradient: `background: linear-gradient(180deg, #f0f2f5, #e8eaed)`
- Container có shadow tạo hiệu ứng "cái điện thoại": `box-shadow: 0 0 40px rgba(0,0,0,0.06)`
- Container chiều cao tối thiểu: `min-height: 100dvh`
- Bottom nav bo góc trên: `border-radius: 16px 16px 0 0`

### 2.3. Không dùng responsive breakpoints kiểu web truyền thống

- KHÔNG dùng grid 12 cột thay đổi layout theo breakpoint (ví dụ: 1 cột mobile → 3 cột desktop)
- App LUÔN là 1 cột dọc trên mọi kích thước, vì đang giả lập điện thoại
- Breakpoints chỉ dùng để thay đổi max-width container, KHÔNG thay đổi layout

---

## 3. TOUCH TARGETS — VÙNG CHẠM TỐI THIỂU

### 3.1. Quy tắc 44x44px (Apple Human Interface Guidelines)

Mọi phần tử người dùng có thể chạm/click phải có vùng chạm ít nhất **44x44 pixels**. Đây không phải khuyến nghị — đây là bắt buộc.

| Loại element | Kích thước tối thiểu | Cách đạt được |
|-------------|---------------------|---------------|
| Button standalone | `min-height: 44px` | CSS trực tiếp |
| Nav item | `min-width: 64px; min-height: 44px` | Padding + min size |
| List item (tappable) | `padding: 14px 16px` | Padding tạo vùng chạm |
| Form input (login/register) | `min-height: 52px` | `.form-control-lg` |
| Header back/save button | `min-width: 44px; min-height: 44px` | `.split-header a` |
| FAB (floating action button) | `min-height: 48px` | `.fab-button` |
| Split chip | `min-height: 44px` | `.split-chip` |
| Icon button nhỏ (close, delete) | `width: 36px; height: 36px` | Chấp nhận 36px cho icon buttons phụ, nhưng phải có padding xung quanh |

### 3.2. Sai lầm thường gặp

- Icon 16x16 không có padding → vùng chạm quá nhỏ → **SAI**
- Link text không có padding → khó bấm trên điện thoại → **SAI**
- Checkbox/radio mặc định browser → quá nhỏ → dùng Bootstrap `.form-check` → **ĐÚNG**

---

## 4. SAFE AREA INSETS — TRÁNH NOTCH VÀ HOME INDICATOR

### 4.1. Tại sao cần

iPhone có notch (tai thỏ) / Dynamic Island ở trên, và home indicator ở dưới. Nếu không tính safe area, content sẽ bị che.

### 4.2. CSS Variables (đã khai báo trong `:root`)
```css
--safe-top: env(safe-area-inset-top, 0px);
--safe-bottom: env(safe-area-inset-bottom, 0px);
--safe-left: env(safe-area-inset-left, 0px);
--safe-right: env(safe-area-inset-right, 0px);
```

### 4.3. Nơi cần áp dụng

| Element | Safe area | CSS |
|---------|-----------|-----|
| `body` | Top + Bottom | `padding-top: var(--safe-top); padding-bottom: calc(nav + safe-bottom + 16px)` |
| `.bottom-nav` | Bottom | `padding-bottom: calc(8px + var(--safe-bottom))` |
| `#liveToastContainer` | Top | `top: calc(12px + var(--safe-top))` |
| Sticky header | Top | `top: var(--safe-top)` |

### 4.4. Khi tạo element fixed mới

Luôn tự hỏi: "Element này ở sát cạnh trên hay dưới màn hình?" Nếu có → thêm safe area inset.

---

## 5. INTERACTION — CẢM GIÁC NATIVE APP

### 5.1. KHÔNG dùng hover effects

Web truyền thống dùng `:hover` để feedback. Mobile không có hover. Quy tắc:
```css
/* ĐÚNG — chỉ dùng :active */
.btn:hover { transform: none; }          /* Tắt hover */
.btn:active { transform: scale(0.97); }  /* Tap feedback */

/* SAI — có hover effect */
.btn:hover { background: darker-color; }  /* Không làm thế */
```

### 5.2. Scale on tap (haptic feel)

Khi người dùng chạm vào element, element co lại nhẹ rồi bật ra → tạo cảm giác "bấm nút thật":

| Element | Scale value | Transition |
|---------|------------|------------|
| Button | `scale(0.97)` | 150ms |
| Card (trong `<a>`) | `scale(0.985)` | 150ms |
| Nav item | `scale(0.92)` | 80ms |
| FAB button | `scale(0.95)` | 150ms |
| Avatar chooser | `scale(0.93)` | 300ms spring |

### 5.3. Tắt các behavior mặc định của browser

```css
/* Tắt highlight xanh khi tap trên Android/iOS */
-webkit-tap-highlight-color: transparent;

/* Ngăn double-tap zoom */
touch-action: manipulation;

/* Ngăn kéo thả text */
user-select: none; /* Chỉ cho interactive elements, KHÔNG cho text content */

/* Ngăn pull-to-refresh của browser */
overscroll-behavior-y: contain;

/* Ngăn iOS auto-zoom khi focus input có font-size < 16px */
input, select, textarea { font-size: max(16px, inherit); }
```

### 5.4. Backdrop blur cho nav bar

Bottom nav dùng frosted glass effect giống iOS:
```css
background: rgba(255, 255, 255, 0.97);
-webkit-backdrop-filter: saturate(180%) blur(20px);
backdrop-filter: saturate(180%) blur(20px);
```

---

## 6. ANIMATIONS — MƯỢT NHƯNG KHÔNG LÃNG PHÍ

### 6.1. Timing functions

| Tên | Giá trị | Dùng cho |
|-----|---------|----------|
| Fast | `150ms cubic-bezier(0.4, 0, 0.2, 1)` | Button tap, color change, border |
| Base | `250ms cubic-bezier(0.4, 0, 0.2, 1)` | Page transitions, modal open |
| Spring | `300ms cubic-bezier(0.34, 1.56, 0.64, 1)` | Bounce effects, avatar tap |

### 6.2. Page enter animation

Khi chuyển trang, children của `.container.py-3` fade-in lần lượt:
```css
.container.py-3 > * {
    animation: pageEnter 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
}
.container.py-3 > *:nth-child(1) { animation-delay: 0s; }
.container.py-3 > *:nth-child(2) { animation-delay: 0.04s; }
/* ... stagger 40ms mỗi child */
```

### 6.3. BẪY QUAN TRỌNG: transform + position:fixed

**CẢNH BÁO**: Animation dùng `transform` (kể cả `translateY(0)`) tạo stacking context mới, khiến `position: fixed` bên trong bị hỏng (modal Bootstrap sẽ không hiển thị đúng).

Giải pháp:
```css
/* Form chứa modal KHÔNG ĐƯỢC có animation transform */
.container.py-3 > form {
    animation: none !important;
    transform: none !important;
}

/* Page enter animation chỉ dùng opacity, KHÔNG transform */
@keyframes pageEnter {
    from { opacity: 0; }
    to { opacity: 1; }
}
```

---

## 7. TYPOGRAPHY VÀ SPACING

### 7.1. Font stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```
- Ưu tiên system font → load nhanh, nhìn native
- KHÔNG dùng Google Fonts hoặc custom fonts (chậm, không cần thiết)

### 7.2. Heading sizes
```
h3: 1.5rem (24px)    — page title
h4: 1.25rem (20px)   — section title
h5: 1.1rem (17.6px)  — sub-section
h6: 0.95rem (15.2px) — card title
small: 0.875rem (14px) — muted text
```

### 7.3. Spacing nhất quán

| Context | Padding | Margin |
|---------|---------|--------|
| Container | `16px` left/right, `12px` top, `16px` bottom | — |
| Card body | `16px` all sides | — |
| List item | `14px 16px` | — |
| Modal header | `20px 20px 12px` | — |
| Modal body | `16px 20px` | — |
| Modal footer | `12px 20px 20px` | — |
| Section gap | — | `mb-3` (16px) hoặc `mb-4` (24px) |
| Card gap (trong grid) | — | `.g-2` (8px) |

---

## 8. COLORS — CHỈ DÙNG CSS CUSTOM PROPERTIES

KHÔNG BAO GIỜ hardcode màu trong inline style hoặc class mới. Luôn dùng biến CSS:

```css
/* Màu chính */
--primary: #00cc99;         /* Xanh lá mint — brand color */
--primary-dark: #00b386;    /* Đậm hơn — active state */
--primary-light: #e6fff7;   /* Nhạt — background hover */

/* Trạng thái */
--danger: #ff4757;          /* Đỏ — lỗi, xóa, nợ */
--danger-light: #fff0f1;
--success: #2ecc71;         /* Xanh lá — thành công */
--warning: #f39c12;         /* Cam — cảnh báo */

/* Text */
--dark-text: #1a1a2e;       /* Text chính */
--secondary-text: #6b7280;  /* Text phụ */
--muted-text: #9ca3af;      /* Text mờ */

/* Background */
--bg-page: #f8f9fb;         /* Nền trang */
--bg-card: #ffffff;         /* Nền card */
--bg-input: #f3f4f6;        /* Nền input, hover */

/* Border */
--border-soft: #f0f0f0;     /* Đường kẻ nhạt */

/* Border radius */
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;          /* Card */
--radius-xl: 20px;          /* Modal */
--radius-full: 9999px;      /* Pill button, avatar */

/* Shadow */
--shadow-card: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
--shadow-elevated: 0 4px 12px rgba(0,0,0,0.08);
--shadow-nav: 0 -2px 12px rgba(0,0,0,0.06);
```

---

## 9. SCROLLBAR VÀ OVERFLOW

```css
/* Ẩn scrollbar nhưng vẫn scroll được */
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }

/* Smooth scrolling trên iOS */
.overflow-x-auto, .overflow-y-auto {
    -webkit-overflow-scrolling: touch;
}

/* Ngăn horizontal scroll trên body */
html, body { overflow-x: hidden; }
```

---

## 10. CHECKLIST — KIỂM TRA TRƯỚC KHI SHIP

Dùng checklist này cho **mỗi trang, modal, hoặc component mới**:

### Width & Layout
- [ ] Content nằm trong `<div class="container py-3">` (extends base.html)?
- [ ] Mọi modal có max-width khớp container ở ≥640px và ≥768px?
- [ ] Mọi `position: fixed` element có max-width + centering trên desktop?
- [ ] Mọi toast/notification nằm trong `#liveToastContainer`?
- [ ] Không có element nào tràn ra ngoài "khung app" trên desktop?

### Touch & Interaction
- [ ] Mọi button/link/input có vùng chạm ≥ 44x44px?
- [ ] Chỉ dùng `:active` cho tap feedback, không dùng `:hover`?
- [ ] Có `touch-action: manipulation` trên button?
- [ ] Có `-webkit-tap-highlight-color: transparent` trên interactive elements?

### Safe Area
- [ ] Body có padding cho safe-top và safe-bottom?
- [ ] Fixed elements ở edge có tính safe area?
- [ ] Toast ở top có tính safe-top?

### Visual
- [ ] Dùng CSS custom properties cho mọi màu sắc?
- [ ] Font size input ≥ 16px (tránh iOS auto-zoom)?
- [ ] Dùng system font stack (không custom font)?
- [ ] Border radius nhất quán (card: 16px, modal: 20px)?

### Animation
- [ ] Form chứa modal KHÔNG có transform animation?
- [ ] Page transitions chỉ dùng opacity (không transform)?
- [ ] Transition timing dùng biến CSS (fast/base/spring)?

### Test
- [ ] Test trên 375px width (iPhone SE) — có bị overflow không?
- [ ] Test trên 1200px width — modal/nav/toast có nằm trong khung không?
- [ ] Test mở modal trên desktop — modal không tràn ra nền xám?
- [ ] Test bottom nav trên desktop — cùng width với container?

---

## 11. VÍ DỤ: THÊM MỘT TRANG MỚI

### Template HTML
```html
{% extends "base.html" %}
{% block title %}Tên Trang - ChiaBill{% endblock %}
{% block content %}

<!-- Content tự động nằm trong .container.py-3 từ base.html -->
<h4 class="fw-bold mb-3">Tiêu đề trang</h4>

<div class="card mb-3">
    <div class="card-body">
        <!-- Nội dung -->
    </div>
</div>

<!-- Modal nếu cần -->
<div class="modal fade" id="myModal">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <!-- max-width đã có sẵn trong CSS cho modal-dialog -->
        </div>
    </div>
</div>

{% endblock %}
```

### Thêm fixed element mới (ví dụ: sticky save bar)
```html
<div class="save-bar mobile-contained-fixed">
    <!-- Dùng class mobile-contained-fixed → tự động constrained -->
    <button class="btn btn-primary w-100" style="min-height: 44px;">Lưu</button>
</div>
```
```css
.save-bar {
    position: fixed;
    bottom: calc(var(--nav-height) + var(--safe-bottom));
    left: 0; right: 0;
    background: white;
    padding: 12px 16px;
    box-shadow: 0 -2px 12px rgba(0,0,0,0.06);
    z-index: 1500;
}
/* mobile-contained-fixed đã handle max-width trên desktop */
```
