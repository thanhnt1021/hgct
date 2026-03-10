# HGCT — TODO & Known Issues

---

## Cần Làm Ngay

- [ ] **Cấp quyền hgct** — `chown -R hgct:hgct /root/hgct/.next` + sudoers cho deploy
- [ ] **Reset password** — Implement forgot-password (token email) + đổi mật khẩu trong profile
- [ ] **Deploy** — `sudo bash /root/hgct/deploy.sh`

---

## Backend TODO

- [ ] **Forgot password thực sự** — generate token, lưu DB, gửi email Nodemailer, trang reset
- [ ] **Đổi mật khẩu trong Profile** — form mật khẩu mới + confirm trong `/profile`
- [ ] **Lưu Order vào DB** — ghi `orders` table khi confirm checkout
- [ ] **Payment** — QR code bank transfer, xác minh tự động hoặc tay
- [ ] **Nginx/SSL** — reverse proxy cho hatgiongchiemtinh.com → port 65498
- [ ] **PDF persistence** — hiện lưu `/tmp/` mất sau reboot, chuyển sang `/var/hgct/pdfs/` hoặc S3

---

## Frontend TODO

- [ ] **Đổi mật khẩu trong /profile** — section mới: nhập mật khẩu mới + confirm
- [ ] **Chart drawing** — natal wheel SVG, synastry double wheel, aspect grid (Python PIL → Canvas/SVG)
- [ ] **Fix Cinzel font** — đổi sang Lora/Cormorant Garamond cho text tiếng Việt có dấu
- [ ] **Profile sync DB** — đồng bộ localStorage profiles lên Prisma Profile table
- [ ] **Auth migrate DB** — đổi localStorage auth → Prisma User + server session

---

## Known Bugs

| Bug | File | Fix |
|---|---|---|
| `siderealTime` typo | `calculations.ts` | Đã fix: dùng `siderialTime` |
| geo-tz sai timezone Hà Nội | `/api/location/search/route.ts` | Đã fix: hardcode `Asia/Ho_Chi_Minh` cho VN |
| House cusps 0-indexed | `calculations.ts` | Đã fix: `cusps.slice(1)` khi cần |
| `.next/` owned by root | deploy.sh | Known: phải `bash deploy.sh` as root |
| Jobs mất khi restart | `jobs.ts` | By design: in-memory, thêm Redis nếu cần |
| Password hash yếu (djb2) | `AuthContext.tsx` | Future: bcrypt sau khi migrate sang DB |

---

## Bảo Mật Cần Cải Thiện

1. **Auth localStorage** — xóa browser = mất account. Migrate lên server session + DB
2. **Password hash** — djb2 không cryptographic. Dùng bcrypt khi auth thực
3. **Premium token** — sha256 cố định, không rotate. Thêm expiry nếu cần
4. **PDF path traversal** — validate uuid format trước khi đọc file
5. **Rate limiting** — `/api/astrology/report` tốn nhiều resource, cần rate limit
6. **CSRF** — form submit từ browser, nên thêm CSRF token cho các API mutation

---

## Architecture Debt

- Auth dùng localStorage mock thay vì NextAuth/Prisma (NextAuth đã install nhưng không dùng)
- Profiles không sync lên DB (Prisma Profile model có nhưng không dùng)
- Orders không ghi DB → không có lịch sử đặt hàng
- Không có logging/monitoring
- Không có test suite
