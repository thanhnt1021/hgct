# UI & Mobile Rules

Áp dụng khi project có giao diện người dùng (web, mobile app, PWA).

## Mobile-First

- Thiết kế và test mobile trước, sau đó mở rộng ra desktop
- Breakpoints chuẩn: mobile < 768px, tablet 768–1024px, desktop > 1024px
- Font size tối thiểu: 14px trên mobile (tránh iOS auto-zoom khi focus input)
- Input fields: `font-size >= 16px` để tránh iOS zoom

## Touch Targets

- Kích thước tối thiểu: **44×44px** (Apple HIG) / **48×48dp** (Material)
- `minHeight: 44` cho mọi button/interactive element trên mobile
- Khoảng cách giữa các touch targets: ≥ 8px

## Layout & Scroll

- Dùng `100dvh` thay `100vh` trên mobile (tránh bị thanh địa chỉ browser che)
- Sticky elements: dùng `position: sticky` + `bottom: 0` cho bottom bar
- Horizontal scroll: `overflow-x: auto` + `scrollbar-width: none` cho filter chips
- Tránh `overflow: hidden` trên body khi có modal (gây scroll lock trên iOS)

## Share / Download (Web)

- Nút share: dùng **Web Share API** (`navigator.share`) — hỗ trợ iOS 15+, Android Chrome 75+
- Share file PDF: `navigator.canShare({ files })` trước khi share
- Fallback: share URL nếu không share được file; copy clipboard nếu không có `navigator.share`
- iOS không render PDF trong `<iframe>` / `<embed>` ổn định → dùng card UI + share button thay thế
- Android Chrome: render PDF trong iframe OK

## Forms

- Tránh `position: fixed` cho elements khi keyboard mở trên mobile (bị đẩy lên)
- Dùng `inputmode` attribute đúng loại: `numeric`, `email`, `tel`, `url`
- Autocomplete attributes: `name`, `email`, `current-password`, `new-password`

## Performance

- Lazy load images, ưu tiên `next/image` (Next.js) hoặc tương đương
- Tránh re-render không cần thiết — memo/callback khi component nặng
- Bundle size: kiểm tra khi thêm dependency lớn (> 50KB)

## Testing Checklist (trước khi deploy)

- [ ] Test trên phone thật (không chỉ DevTools)
- [ ] Kiểm tra portrait + landscape
- [ ] Kiểm tra keyboard không che content quan trọng
- [ ] Nút/link đủ lớn để tap dễ
- [ ] Share/download hoạt động trên iOS và Android
