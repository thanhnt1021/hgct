# HGCT — TODO & Known Issues

---

## Cần Làm

- [ ] **Payment** — `/api/payment/confirm` là placeholder; cần tích hợp SePay / PayOS hoặc xác minh chuyển khoản thật
- [ ] **Timezone geo-tz** — test `geo-tz` với ~5 nước (US, JP, FR, AU...); thêm override cho các nước trả sai; hiện VN đã hardcode đúng
- [ ] **CSRF** — check `Origin` header trên các mutation routes: `/api/profiles`, `/api/user/account`, `/api/user/password`, `/api/user/upgrade`
- [ ] **Bảo mật hồ sơ** — mã hóa `profile.data` (AES-256-GCM) trong DB; backup trước, migrate, verify spot-check
- [ ] **Profile UUID cho PDF** — thêm `profileUid` vào `profiles` table; PDF naming = `{profileUid}_{service}.pdf` (overwrite thay vì random); xóa PDF khi xóa profile

---

## Thấp Ưu Tiên

- [ ] **Rate limiting** — `/api/astrology/report` tốn resource; tạm thời không cần vì app internal + payment gate sẽ tự giới hạn; lo nếu traffic tăng đột biến

---

## Không Làm Vì

- **Premium token rotation** — không có ý định cho subscription expire; sha256 cố định là đủ cho model hiện tại
