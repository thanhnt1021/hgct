# Responsive Design Guidelines — Hạt Giống Chiêm Tinh

> Tài liệu này mô tả các pattern responsive **cụ thể của project hgct**.
> Các quy tắc universal (breakpoints, touch targets, font size, mobile-first...) xem tại `docs/universal_rules/UI_MOBILE_RULES.md`.

## Core Principles (hgct-specific)

- **Spacing**: tighter on mobile (`p-3`, `gap-2`) vs desktop (`p-6`, `gap-4`).
- **No horizontal overflow**: every container must be `max-w-full`. Test at `320px` width.
- **No hardcoded pixel values** for layout positioning — use relative/flexible units.

## Layout Shell (applies to /profile and all future dashboard-style pages)

The page uses a shared layout shell: sidebar + main content area.

- **Desktop (>=768px)**: sidebar visible (fixed ~240px), content area fills remaining space. Content is centered within its available space using `max-width` + `mx-auto` (NOT hardcoded margins/widths).
- **Mobile (<768px)**: sidebar is HIDDEN by default. A hamburger/menu toggle button (sticky or fixed) slides the sidebar in/out as an overlay with smooth transition (`transform translateX`, transition `~300ms`). When sidebar is hidden, main content uses full width (still with `max-width` + centering). Overlay backdrop (semi-transparent dark) behind sidebar when open, clicking backdrop closes sidebar.
- This layout shell is shared across ALL tabs so the fix is universal.

## Sidebar

- **Desktop**: persistent, fixed left, ~240px width
- **Mobile**: hidden by default, slides in from left as overlay, close via button or backdrop tap
- Animation: `transform translateX(-100%)` ↔ `translateX(0)` with `transition-transform duration-300`

## Cards / List Items

- **Desktop**: single-row, info left, action buttons right (inline)
- **Mobile**: stack vertically:
  - Name: full width, `font-semibold`, `text-base`, truncate if long
  - Meta (date, time, location): single line, `text-sm`, `text-muted`, truncate with ellipsis
  - Action buttons: row below meta, `flex wrap`, `gap-2`. "Bản đồ ✦" and "Dịch vụ" as small pill buttons, edit/delete as icon-only (no text). All `min-h-[44px]`.
- No cards exceeding viewport width. Use `break-words` or truncate.

## Tables

- **Desktop**: standard table
- **Mobile**: convert to card/list layout (each row = stacked card). Never horizontal-scroll table for primary content.

## Forms

- **Mobile**: all inputs `w-full`, labels above inputs, submit buttons `w-full`
- **Desktop**: inputs can be narrower, buttons auto-width

## iOS Auto-Zoom Prevention (CRITICAL)

> **BẮT BUỘC:** Mọi Next.js project có form/input đều PHẢI có `maximumScale: 1` trong viewport config. Thiếu cái này → iOS Safari tự động zoom vào text field khi user tap, gây trải nghiệm rất tệ.

**Nguyên nhân:** iOS Safari auto-zoom khi focus vào input có `font-size < 16px` (để đảm bảo readability). Cách duy nhất ngăn nó là báo browser biết trước — qua `maximum-scale=1` trong HTML initial.

**Fix — thêm `maximumScale: 1` vào viewport config (Next.js App Router):**

```ts
// src/app/layout.tsx
export const viewport: Viewport = {
  themeColor: '...',
  maximumScale: 1,  // ← BẮT BUỘC — ngăn iOS auto-zoom khi tap vào input/select/textarea
}
```

**Nếu không dùng Next.js**, thêm thẳng vào HTML:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
```

**Lưu ý quan trọng:**
- iOS 10+ (tất cả iPhone từ 2016+): Apple override `maximum-scale=1` cho user-initiated pinch-zoom → user **vẫn zoom tay được** bình thường, chỉ auto-zoom khi focus input là bị chặn
- **KHÔNG dùng JS** để set `maximum-scale` — iOS cache viewport lúc parse HTML, JS thay đổi sau không có tác dụng cho lần tap đầu tiên

## Modals

- **Mobile**: bottom-sheet style (slide up, rounded top, `max-h-[90vh]`)
- **Desktop**: centered modal with max-width

## Pagination

- **Desktop**: page numbers + prev/next
- **Mobile**: just "Trước" / "Sau" + "1/8" center, buttons `min-h-[44px]`, full-width row

## Testing Checklist

- [ ] 320px, 375px, 414px viewport widths — no overflow
- [ ] All buttons tappable (44px min)
- [ ] Readable without zoom
- [ ] Tab navigation works on mobile
- [ ] Sidebar slides smoothly
- [ ] Same data loads on mobile and desktop for same account
