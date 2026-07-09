# GOAL

_Last reviewed: 2026-07-09_

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
- [ ] Milestone 4: Mở rộng tính năng người dùng — subscription management, history UI, sharing, community, **rebrand AstroS + redesign trang chủ**

## Pending / Cần Quyết Định

**⚠️ Security audit 2026-07-02 (VIRUS_DOCKER_CHECKIN.md) — top priority:**
**🔲 CÒN LẠI — chưa làm, cần chủ dự án tự tay xử lý:**
- [ ] 🔴 **Build + deploy production để 3 fix code có hiệu lực** (`kb-sync` timing-safe, escape email Telegram, bỏ hardcode fallback secret CTV — code đã sửa xong trong working tree `/home/hgct/hgct`, xem 3 dòng ✅ bên dưới). Owner chủ động **không cho build lúc audit** (2026-07-02) — tự làm sau: `commit` → `merge main` (đã đang ở main) → `cd /home/hgct && docker compose build hgct-prod && docker compose up -d --force-recreate hgct-prod`.
- [ ] 🟡 Rate-limiter (`src/lib/ratelimit.ts`) fail-open khi Upstash Redis lỗi/outage — mọi giới hạn (login/register/unlock) tự tắt hết. Cần quyết định: chấp nhận đánh đổi (ưu tiên uptime), hay đổi fail-closed cho endpoint nhạy cảm (ưu tiên an toàn, rủi ro: Upstash sập → user không login được).
- [ ] 🟡 HSTS/CSP nginx — chưa làm, để riêng vì rủi ro cao nếu làm ẩu (HSTS cache browser khó revert, CSP có thể vỡ giao diện). Khi làm: CSP bật `Report-Only` trước, HSTS `max-age` ngắn trước rồi mới tăng dần, test kỹ trên demo trước.
- [ ] 🟢 Sửa bug false-negative trong `security-check.sh` — báo "✗ NO backup cron" sai (cron backup DB có thật, chạy tốt) — không urgent.

**✅ Đã làm xong 2026-07-02 (security audit `VIRUS_DOCKER_CHECKIN.md`):**
- [x] 🟢 ~~Webhook SePay route sang `hgct-demo` thay vì prod~~ — gỡ block TEMP trong `nginx/conf.d/hgct.conf`, reload live (không downtime), verify bằng request test thật (log xác nhận vào đúng `hgct-prod`). Sync `infra/nginx/conf.d/` + `infra/docker-compose.yml` khớp live. Backup config cũ: `nginx/conf.d/hgct.conf.bak.20260702_091627`. **Chưa commit** — chờ lệnh.
- [x] 🟢 ~~`kb-sync` cron endpoint thiếu timing-safe~~ — `src/app/api/cron/kb-sync/route.ts` giờ dùng `timingSafeEqual` giống `order-check`. **Code xong, chưa deploy** (xem mục 🔴 ở trên).
- [x] 🟢 ~~2 chỗ thiếu escape email Telegram admin~~ — `src/lib/telegram/admin.ts:324,458` đã bọc `escHtml()`. **Code xong, chưa deploy.**
- [x] 🟢 ~~Hardcoded fallback secret CTV~~ — `src/lib/ctv/auth.ts` giờ throw nếu thiếu cả `CTV_JWT_SECRET` lẫn `NEXTAUTH_SECRET`. Đã xác nhận cả 2 env có giá trị thật trước khi đổi. **Code xong, chưa deploy.**
- [x] 🟢 ~~Postgres role `postgres` SUPERUSER LOGIN không mật khẩu~~ — `ALTER ROLE postgres NOLOGIN` áp dụng trực tiếp lên DB live, có hiệu lực ngay, không cần deploy.
- [x] 🟡 ~~Security headers nginx (an toàn)~~ — `X-Content-Type-Options: nosniff` + `Referrer-Policy` cho cả prod/demo, live + verified. (HSTS/CSP xem mục 🔲 ở trên.)
- [x] 🟢 ~~UFW có chặn truy cập thẳng ngoài Cloudflare không~~ — Xác nhận CÓ (`security-check.sh`: "✓ UFW allowing 22 CF ranges"). Downgrade lỗ hổng spoof `CF-Connecting-IP` từ MEDIUM xuống LOW/lý thuyết — không urgent nữa.
- [x] 🟢 ~~76 nhánh git cũ đã merge~~ — xóa sạch trên GitHub + local, chỉ còn `main`.
- [x] 🟢 ~~5 secret cũ lộ trong git history~~ — xác nhận tất cả đã rotate (hash không khớp giá trị hiện tại), thêm `.gitleaksignore`, dọn `docs/patchMD/SEPAY_SETUP_ENV.md` khỏi giá trị thật còn sót ở HEAD.
- [x] 🟢 ~~Repo GitHub có Private không~~ — Xác nhận Private (API GitHub ẩn danh trả 404).
- [x] 🟢 ~~3 SSH key trong `authorized_keys`~~ — Owner xác nhận cả 3 (`macbook-hk-hgct`, `hatgiongchiemtinh-Mac`, `hgct-iphone`) đều là thiết bị của mình. Không có key lạ.

**Ghi chú audit host (2026-07-02, KHÔNG phải bug — false positive/đã remediated):**
- rkhunter cảnh báo đổi hash `curl/perl/systemd/systemctl` — verify bằng `dpkg -V` **sạch 100%**, chỉ là baseline rkhunter cũ chưa refresh sau vá tự động (unattended-upgrades).
- `/home/hgct/evidence/{r-u.elf,syslog-helper.bin}` là bản lưu forensic từ sự cố RCE 30/5 (đã remediated, xem dòng 2026-05-30 bên dưới) — xác nhận KHÔNG tồn tại trong container `hgct-prod`/`hgct-demo` đang chạy.
- chkrootkit báo "PACKET SNIFFER" trên `eth0` do `systemd-networkd` — false positive đã biết của tool này, không phải sniffer thật.

- [x] 🟢 **AstroS rebrand + redesign (Jun16-01 → Jun30-01)** — **go-live prod 2026-06-30**. Rebrand → AstroS, theme 2 màu (kem #edd5b1 + navy #163653) toàn site, flow input → ket-qua (bản đồ sao + 3 lõi / nhà trội / gu tình yêu / synastry + an toàn / vận hạn transit) → unlock xu inline. 4 service đổi tên (Tình duyên cá nhân, Mối quan hệ cặp đôi), bỏ relations-* rác. Sheet AI: 3 lõi, gu Sao Kim, MOON an toàn, vận hạn transit-house chuẩn. Design system: `docs/DESIGN.md`.

- [x] 🟢 **Coin rework — production hardening (v3.4)** — đã thực thi A–E + nhiều fix UX + mở lại đăng ký, **go-live prod 2026-06-04**. Chi tiết `docs/UPGRADE_LOG.md`.

- [x] 🟢 **Bảng giá nạp xu preview + mã ưu đãi (2026-07-09)** — live trên `demo.hatgiongchiemtinh.com` (`COIN_TEST_PRICES=true`): Gói 1 69k/250xu, Gói 2 99k/450xu, Gói 3 199k/800xu, Gói 4 399k/2000xu (gói 4 mở, trước đó "chờ giá"). Mã ưu đãi "Thanhphuong" → 300 xu/50.000đ, validate cả ở API lộ gói ẩn (`/api/coin/promo`) lẫn lúc tạo đơn (`topup-order`). **Chỉ áp dụng cho demo** — giá thật trên `hatgiongchiemtinh.com` (prod) giữ nguyên 99k/219k/599k, gói 4 vẫn tắt, chưa quyết định giá thật. Commit `676073d`. Đồng thời phát hiện + fix: `hgct-demo` git bị tụt 18 commit so với `origin/main` (do quick-deploy chỉ rsync file, không đụng git) — đã đồng bộ lại, ghi rule chống lặp lại vào `CLAUDE.md`.
- [ ] **Off-site DB backup (Cloudflare R2)** — hiện chỉ backup local trên server → SPOF. Đã chốt: R2 + rclone crypt + retention 30 ngày + monthly snapshot 12 tháng. Plan chi tiết: `/home/hgct/TODO_OFFSITE_BACKUP.md` trên server. Cần ~20 phút: user tạo bucket + API token trong CF dashboard → Claude config rclone + sửa `backup-db.sh` + test restore.
- [ ] **Lucky wheel first-time buyer check** — hiện code KHÔNG verify user đã mua trước đó, ai vào checkout cũng quay được giảm giá. Cần query `prisma.order.count({ where: { userUid, paymentStatus: 'paid' } }) > 0` → ẩn wheel, chỉ cho referral code. Files ảnh hưởng: `src/components/checkout/DiscountModal.tsx`, `src/components/checkout/LuckyWheelModal.tsx`, cần tạo `src/app/api/user/has-previous-order/route.ts`.
- [ ] Rate limiting — chưa có; cân nhắc lại khi traffic tăng đột biến
- [ ] Xóa `src/lib/pdf/planetPaths.ts` và `src/lib/pdf/signPaths.ts` (placeholder path data cũ) sau khi SVG icons (svgIcons.ts) đã vận hành ổn định trên production
- [ ] Dashboard toggle: bật/tắt hiển thị ký hiệu nghịch hành ℞ trong PDF chart — admin chọn on/off từ dashboard, lưu vào config DB
- [ ] Fix font ℞ trong PDF: tìm font embed sẵn có glyph U+211E (℞) để Puppeteer render đúng chữ thay vì fallback "Px"

## Hiện tại đang ở đâu

**2026-06-30:** Go-live **AstroS rebrand + redesign** lên production (merge `Jun30-01` → main). Toàn site theme 2 màu kem/navy. Trang chủ: form S2 → ket-qua cá nhân (bản đồ sao + 3 lõi + 4 cục unlock); 4 nút service S1 + landing /services → modal nhập mới → ket-qua từng loại (nhà trội / gu tình yêu / synastry + cảm giác an toàn / vận hạn transit). Nội dung AI sinh + lưu Google Sheet → DB (`knowledgeBase`): cột 3 lõi, gu Sao Kim, AI MOON AN TOÀN; vận hạn dùng thuật toán transit-house chuẩn (`getVanHanBlocks` + chart overlay `getOuterPlanetCycleData`). Lá số lưu localStorage (dedupe theo người). Bỏ tab Lịch sử/Gói dịch vụ trừ Lifetime. **Route mua coin (webhook SePay) chuyển sang prod.**

**2026-06-04:** Go-live **coin hardening (v3.4)** + **mở lại đăng ký** lên production. Coin gen chạy ngầm dạng job (never-fail, % thật), essay lưu DB (nhất quán, đọc lại vĩnh viễn), trang "Hồ sơ đã xem", modal nhập liệu đồng nhất (dropdown hồ sơ, redirect same-tab), profile dedup. Đăng ký mở lại: credentials (bcrypt + rate-limit) + Google tự tạo tài khoản user mới. Webhook SePay trỏ lại prod. Giá xu để khuyến mãi 5k/10k/15k. **Production mở lại cho new user.** Chi tiết: `docs/UPGRADE_LOG.md` (v3.4).


**2026-06-01:** Go-live **coin rework** lên production (merge `feature/coin-rework-ui` → main). Đổi mô hình: trả-1-lần-lấy-PDF → **nạp xu + mở từng mục luận giải online**. Đã verify end-to-end CK thật trên demo (SePay → webhook → cộng xu, đơn `HGCT000341` real txn). Webhook tạm trỏ demo lúc test đã **revert về prod**. Luồng PDF/email cũ giữ sau flag `NEXT_PUBLIC_ENABLE_PDF_FLOW` (mặc định OFF). **⚠️ CHƯA XONG — gen nội dung khi unlock chưa chạy** (user tự fix sau). Production đang đóng với new user → giữ đóng đến khi gen nội dung xong rồi mới mở lại.


**2026-05-30:** Khép sự cố RCE container hgct-prod (botnet POST `/adfa` exploit Next.js 15.2.3 → env-dump qua `error.digest` vào docker log từ May 9, malware ELF `/app/r-u` + persistence `.profile` launcher). Response 7 phase: stop → evidence snapshot → host check PASS → DB assume-breach → rebuild + harden (Next.js→15.5.18, docker-socket-proxy thay docker.sock, Turnstile+validation cho preview endpoints, nginx /adfa block) → rotate 14 secrets + migrate 631 profiles sang PROFILE_ENCRYPTION_KEY mới (`scripts/migrate-profile-encryption.mjs`). Chi tiết: `docs/FIXES_HISTORY.md` mục "hgct-prod container RCE + Phase 4-5 incident response". Evidence: `~/evidence/` trên server.

**2026-04-17:** Migration sang server mới (185.197.30.234) hoàn tất sau sự cố server cũ bị hack. Stack full Docker (postgres + hgct-prod + hgct-demo + nginx + cron sidecar) thay cho systemd-on-host. Toàn bộ 15 secrets đã rotate, 631 profiles re-encrypt với PROFILE_ENCRYPTION_KEY mới, SSL Full Strict qua Cloudflare + Origin Cert, UFW + fail2ban + unattended-upgrades active, admin bot hardened 3 layers (URL secret + `X-Telegram-Bot-Api-Secret-Token` header + IP allowlist qua Cloudflare `CF-Connecting-IP`), middleware handle 6 subdomain (prod / demo / dashboard / daisu / admin-placeholder / mo-placeholder), Docker cron sidecar chạy order-check mỗi phút + cleanup/retention/kb-sync. End-to-end verified với real bank transfer qua `/demosepay` page (poll + auto redirect success + Telegram notify fire).

Core features và payment hoàn chỉnh (Milestone 0 + 1 xong). Đang hoàn thiện trước launch — tập trung vào chất lượng báo cáo AI và ổn định hệ thống (Milestone 2 + 3). Demo container hiện đang stopped sau Phase 4 — sẽ sync code + bring back khi cần (hoặc bỏ luôn nếu không dùng).
