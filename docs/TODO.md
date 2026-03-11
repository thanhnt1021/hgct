# HGCT — TODO & Known Issues

---

## Cần Làm (Priority)

- [ ] **Payment** — `/api/payment/confirm` là placeholder; cần tích hợp SePay / PayOS hoặc xác minh chuyển khoản thật
- [ ] **Lưu Order vào DB** — ghi `orders` table khi confirm checkout (hiện tại không ghi)
- [ ] **Forgot password thực sự** — hiện chỉ return 200, chưa gửi email; cần generate token, lưu DB, gửi link qua Nodemailer
- [ ] **Đổi mật khẩu trong /profile** — form đổi mật khẩu mới + confirm

---

## Known Bugs

| Bug | File | Fix |
|---|---|---|
| `siderealTime` typo | `calculations.ts` | Đã fix: dùng `siderialTime` |
| geo-tz sai timezone Hà Nội | `/api/location/search/route.ts` | Đã fix: hardcode `Asia/Ho_Chi_Minh` cho VN |
| House cusps 0-indexed | `calculations.ts` | Đã fix: `cusps.slice(1)` khi cần |
| `.next/` owned by root | deploy.sh | Known: phải `sudo bash deploy.sh` |

---

## Bảo Mật Cần Cải Thiện

1. **Rate limiting** — `/api/astrology/report` tốn nhiều resource, cần rate limit per user
2. **PDF path traversal** — validate uuid format trước khi đọc file `/var/hgct/pdfs/{id}.pdf`
3. **CSRF** — thêm CSRF token cho các API mutation quan trọng
4. **Premium token rotation** — sha256 cố định, không expire; thêm expiry nếu cần

---

## ĐÃ HOÀN THÀNH ✓

- [x] Auth system — NextAuth.js, credentials + Google OAuth, register
- [x] Plan tiers: free / premium / lifetime
- [x] Profiles — CRUD lưu DB qua `/api/profiles`
- [x] Job system — persist DB + in-memory cache, survive restart
- [x] PDF storage — `/var/hgct/pdfs/` (persistent)
- [x] Nginx + SSL — HTTPS production + demo
- [x] Deploy scripts — production + demo
- [x] NatalWheel SVG — vẽ biểu đồ natal
- [x] `/chart` page — xem bản đồ từ profile ID hoặc sessionStorage
- [x] `/my-charts` page — danh sách profiles, inline edit CRUD
- [x] `/input` page — compact grid form, 3 modes (default/synastry/chart), save profile checkbox; đồng bộ với ProfileFormModal (tháng label, year range, select dropdowns, validation)
- [x] LocationPicker — inline 3-field row `grid-cols-12` (country/address/search), Nominatim geocoding; dropdown kết quả chỉ rộng bằng ô Address; tên quốc gia đầy đủ (Nhật Bản, Hàn Quốc, Singapore, Thái Lan)
- [x] ProfileFormModal — compact layout, year range + custom year option
- [x] Avatar upload + crop
- [x] Google avatar sync
- [x] SubscriptionPlans UI
