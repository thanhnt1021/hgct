# GOAL

_Last reviewed: 2026-04-17_

## Mục tiêu cuối cùng

App chiêm tinh học HGCT vận hành thương mại ổn định — có khách trả tiền thật, hệ thống tự chạy và tự phục hồi khi lỗi, không cần giám sát liên tục.

## Thành công trông như thế nào

- Khách đặt dịch vụ, thanh toán qua SePay, nhận báo cáo PDF qua email — toàn bộ tự động
- Báo cáo AI chất lượng cao: đủ dài, đúng format, không bị cắt giữa chừng
- Hệ thống tự recover khi gặp lỗi (job watchdog, order recovery hoạt động)
- Admin quản lý được qua dashboard + Telegram bot mà không cần SSH

## KHÔNG phải mục tiêu

- Build mobile app — web-first, responsive là đủ
- Tích hợp nhiều payment gateway — chỉ cần SePay
- Multi-language / internationalization
- Public API cho bên thứ ba

## Milestones

- [x] Milestone 0: Core platform — auth, profiles, chart engine, 4 report services, PDF, email
- [x] Milestone 1: Payment + operations — SePay integration, admin dashboard, Telegram bots, job recovery
- [ ] Milestone 2: Chất lượng báo cáo AI — cải thiện prompt, output quality, thêm dịch vụ mới
- [ ] Milestone 3: Stability & monitoring — alerting, auto-recovery nâng cao, backup, uptime SLA
- [ ] Milestone 4: Mở rộng tính năng người dùng — subscription management, history UI, sharing, community

## Pending / Cần Quyết Định

- [ ] **Lucky wheel first-time buyer check** — hiện code KHÔNG verify user đã mua trước đó, ai vào checkout cũng quay được giảm giá. Cần query `prisma.order.count({ where: { userUid, paymentStatus: 'paid' } }) > 0` → ẩn wheel, chỉ cho referral code. Files ảnh hưởng: `src/components/checkout/DiscountModal.tsx`, `src/components/checkout/LuckyWheelModal.tsx`, cần tạo `src/app/api/user/has-previous-order/route.ts`.
- [ ] Rate limiting — chưa có; cân nhắc lại khi traffic tăng đột biến
- [ ] Xóa `src/lib/pdf/planetPaths.ts` và `src/lib/pdf/signPaths.ts` (placeholder path data cũ) sau khi SVG icons (svgIcons.ts) đã vận hành ổn định trên production
- [ ] Dashboard toggle: bật/tắt hiển thị ký hiệu nghịch hành ℞ trong PDF chart — admin chọn on/off từ dashboard, lưu vào config DB
- [ ] Fix font ℞ trong PDF: tìm font embed sẵn có glyph U+211E (℞) để Puppeteer render đúng chữ thay vì fallback "Px"

## Hiện tại đang ở đâu

**2026-04-17:** Migration sang server mới (185.197.30.234) hoàn tất sau sự cố server cũ bị hack. Stack full Docker (postgres + hgct-prod + hgct-demo + nginx + cron sidecar) thay cho systemd-on-host. Toàn bộ 15 secrets đã rotate (Loại 1 auto + Loại 2 manual), 631 profiles re-encrypt với PROFILE_ENCRYPTION_KEY mới, SSL Full Strict qua Cloudflare + Origin Cert, UFW + fail2ban + unattended-upgrades active, admin bot hardened 3 layers (URL secret + `X-Telegram-Bot-Api-Secret-Token` header + IP allowlist qua Cloudflare `CF-Connecting-IP`), middleware handle 6 subdomain (prod / demo / dashboard / daisu / admin-placeholder / mo-placeholder), Docker cron sidecar chạy order-check mỗi phút + cleanup/retention/kb-sync. End-to-end verified với real bank transfer qua `/demosepay` page (poll + auto redirect success + Telegram notify fire).

Core features và payment hoàn chỉnh (Milestone 0 + 1 xong). Đang hoàn thiện trước launch — tập trung vào chất lượng báo cáo AI và ổn định hệ thống (Milestone 2 + 3).
