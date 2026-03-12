# HGCT — TODO & Known Issues

---

## Cần Làm (Priority)

- [ ] **Payment** — `/api/payment/confirm` là placeholder; cần tích hợp SePay / PayOS hoặc xác minh chuyển khoản thật
- [ ] **Lưu Order vào DB** — ghi `orders` table khi confirm checkout (hiện tại không ghi)
- [ ] **Forgot password thực sự** — hiện chỉ return 200, chưa gửi email; cần generate token, lưu DB, gửi link qua Nodemailer
- [ ] **Đổi mật khẩu trong /profile** — form đổi mật khẩu mới + confirm
- [ ] **Timezone geo-tz** — hiện đang hardcode `Asia/Ho_Chi_Minh` cho VN vì geo-tz trả sai. Liệu có cần fix để áp dụng được múi giờ cho cả các quốc gia khác không, hay bây giờ đã làm được rồi, cần check!
- [ ] **Rate limiting** — `/api/astrology/report` tốn nhiều resource, cần rate limit per user
- [ ] **PDF path traversal** — validate uuid format trước khi đọc file `/var/hgct/pdfs/{id}.pdf`

---

## Bảo Mật Cần Cải Thiện

- [ ] **CSRF** — thêm CSRF token cho các API mutation quan trọng (NextAuth đã cover auth routes, còn `/api/profiles`, `/api/user/account`...)
- [ ] **Premium token rotation** — sha256 cố định, không expire; thêm expiry nếu cần
