# GOAL

_Last reviewed: 2026-03-23_

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

- [ ] Rate limiting — chưa có; cân nhắc lại khi traffic tăng đột biến

## Hiện tại đang ở đâu

Core features và payment hoàn chỉnh (Milestone 0 + 1 xong). Đang hoàn thiện trước launch — tập trung vào chất lượng báo cáo AI và ổn định hệ thống (Milestone 2 + 3).
