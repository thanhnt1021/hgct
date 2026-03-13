# HGCT — TODO & Known Issues

---

## Cần Làm

- [ ] **Payment** — `/api/payment/confirm` là placeholder; cần tích hợp SePay / PayOS hoặc xác minh chuyển khoản thật
- [ ] **Timezone geo-tz** — test `geo-tz` với ~5 nước (US, JP, FR, AU...); thêm override cho các nước trả sai; hiện VN đã hardcode đúng

---

## Thấp Ưu Tiên

- [ ] **Rate limiting** — `/api/astrology/report` tốn resource; tạm thời không cần vì app internal + payment gate sẽ tự giới hạn; lo nếu traffic tăng đột biến

---

## Không Làm Vì

- **Premium token rotation** — không có ý định cho subscription expire; sha256 cố định là đủ cho model hiện tại
