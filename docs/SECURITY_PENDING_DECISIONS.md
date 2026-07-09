# Security — Pending Decisions

> Đọc file này mỗi khi `check goal` / `update goal` — 3 việc còn treo từ audit `VIRUS_DOCKER_CHECKIN.md` (2026-07-02), chưa có quyết định cuối. Không phải bug đang chờ code — là đánh đổi cần chủ dự án chốt.
>
> _Cập nhật lần cuối: 2026-07-09_

## A. Deploy 3 fix code bảo mật lên `hgct-prod`

Code đã sửa xong trong working tree `/home/hgct/hgct`, **chưa build/deploy nên chưa có tác dụng**:

| File | Sửa gì |
|---|---|
| `src/app/api/cron/kb-sync/route.ts` | So sánh `CRON_SECRET` đổi từ `!==` sang `timingSafeEqual` — chặn timing attack đoán secret |
| `src/lib/ctv/auth.ts` | Bỏ hardcode fallback `'ctv-fallback-secret'` — giờ throw lỗi nếu thiếu cả `CTV_JWT_SECRET` lẫn `NEXTAUTH_SECRET` |
| `src/lib/telegram/admin.ts` | 2 chỗ hiện email khách trong tin nhắn Telegram admin giờ có `escHtml()` |

**🔴 CONFIRMED BUG (2026-07-09) — `ctv/auth.ts` hiện KHÔNG build được, không phải chỉ là rủi ro runtime:**
Thử build thật `hgct-prod` với code này trong tree → **build fail 100% mọi lần**, bất kể `.env.local` prod có set secret hay không:
```
Build error occurred
[Error: Failed to collect page data for /api/ctv/logout]
```
Lý do: `.env.local`/`.env` bị `.dockerignore` loại khỏi build context (đúng, vì secret phải inject lúc container chạy qua `env_file`, không bake vào image). Nhưng code hiện tại throw **ngay lúc module import** (top-level, ngoài function) — mà bước `next build` chạy "collect page data" nghĩa là **import thử route module trong lúc build**, không có env nào cả → throw → build chết. Vậy nên **không phải chỉ rủi ro nếu thiếu env — nó LUÔN throw lúc build**, vì lúc build không có env nào hết, kể cả khi prod đã set đúng.

**Cách sửa đúng (chưa làm):** đừng throw ở top-level module scope. Chuyển check vào trong function (lazy, chỉ chạy lúc có request thật, lúc đó mới có runtime env) — ví dụ đổi `const SECRET = ...` (chạy lúc import) thành 1 hàm `getSecret()` gọi lúc cần ký/verify JWT, throw bên trong hàm đó thay vì ở module scope.

**Rủi ro nếu deploy (sau khi sửa lại theo hướng lazy ở trên):**
- `kb-sync`: thấp — chỉ đổi cách so sánh, không đổi giá trị secret. Nếu lệch → cron sync KB 401 liên tục, thấy ngay qua log `hgct-cron`.
- `ctv/auth.ts`: sau khi sửa lazy, cần verify `.env.local` của `hgct-prod` có `CTV_JWT_SECRET` hoặc `NEXTAUTH_SECRET` thật — nếu thiếu, chỉ throw lúc có ai gọi API CTV thật (500 lỗi cho riêng luồng đó), không sập cả site như bản top-level hiện tại.
- `telegram/admin.ts`: không rủi ro, chỉ escape HTML.

**⚠️ Bài học vận hành quan trọng hơn cả bug trên:** khi build Docker từ `/home/hgct/hgct`, image lấy **TOÀN BỘ working tree trên đĩa**, không chỉ phần đã `git commit`. Tối nay build `hgct-prod` để đẩy giá xu (chỉ định commit riêng, không đụng 3 file security) vẫn **vô tình kéo theo `ctv/auth.ts` uncommitted** vào build vì nó nằm sẵn trên đĩa → build fail. Đã fix tạm bằng `git stash` 6 file này ra trước khi build, `stash pop` lại sau khi xong — nhưng đây là rủi ro sẽ lặp lại bất cứ khi nào deploy prod trong lúc có code uncommitted khác nằm trong tree. Cân nhắc: luôn `git stash` code chưa sẵn sàng trước khi build prod, hoặc build từ 1 worktree/clone riêng chỉ chứa đúng commit muốn deploy.

**Rủi ro nếu KHÔNG deploy (giữ nguyên):**
- `kb-sync` vẫn có thể bị timing attack dò `CRON_SECRET` về lý thuyết — thực tế cần rất nhiều request chính xác, endpoint chỉ ảnh hưởng KB sync, không phải endpoint tiền.
- `ctv/auth.ts` fallback cố định public — nếu tương lai có môi trường nào thiếu cả 2 env đó, JWT ký bằng secret ai cũng biết → **forge được token CTV, xem/đổi hoa hồng affiliate người khác**. Rủi ro thật, mức độ tuỳ khả năng thiếu env xảy ra.

**Khuyến nghị:** deploy — rủi ro làm thấp hơn rủi ro không làm, đặc biệt vụ CTV secret. Chỉ cần verify env trước.

Cùng đợt còn 3 file **đã live rồi, chỉ thiếu commit cho khớp git** (không cần rebuild): `infra/nginx/conf.d/hgct.conf` (header an toàn + chặn path dò exploit), `infra/docker-compose.yml` (`COIN_TEST_PRICES`), `docs/patchMD/SEPAY_SETUP_ENV.md` (dọn secret thật khỏi doc).

## B. Rate-limiter fail-open (`src/lib/ratelimit.ts`)

6 chỗ dùng chung 1 cơ chế qua Upstash Redis: `login`, `recover` (token reset password), `claim` (xác nhận thanh toán), `ctv login`, `ctv register`, `register`. Khi Upstash lỗi/timeout (>3s)/trả lỗi → **tất cả tự động cho qua, không giới hạn gì**.

| Phương án | Rủi ro |
|---|---|
| Giữ fail-open (hiện tại) | Kẻ tấn công có thể chủ động làm Upstash quá tải để tắt hết rate-limit, rồi brute-force login, spam đăng ký, dò token `recover`, spam `claim` đoán order người khác |
| Fail-closed toàn bộ | An toàn hơn nhưng nếu Upstash sập (kể cả do lỗi thường, không phải bị tấn công) → **không ai login/đăng ký được** — outage toàn site |
| **Fail-closed chọn lọc (khuyến nghị)** | Chỉ đổi `recover` + `claim` (hậu quả nặng nếu bị lạm dụng — chiếm tài khoản / claim nhầm đơn tiền người khác, traffic thấp nên ít ảnh hưởng nếu Upstash sập). Giữ fail-open cho `login`/`register`/`ctv login`/`ctv register` (traffic cao hơn, ảnh hưởng doanh thu trực tiếp nếu outage, hậu quả brute-force nhẹ hơn nhờ bcrypt) |

**Chưa quyết — cần chủ dự án chốt hướng nào.**

## C. HSTS / CSP nginx

Domain client-side thật sự gọi tới (grep từ code, 2026-07-09) — CSP phải allow-list đủ những cái này:

| Domain | Dùng để làm gì |
|---|---|
| `challenges.cloudflare.com` | Cloudflare Turnstile (chống bot form) |
| `www.googleapis.com`, `myaccount.google.com` | Google OAuth sign-in |
| `fonts.googleapis.com` | Web font |
| `qr.sepay.vn` | QR thanh toán — **gãy chỗ này = khách không trả được tiền** |
| `lh3.googleusercontent.com` | Avatar Google |
| `nominatim.openstreetmap.org` | Geocoding chọn địa điểm sinh |

**Rủi ro CSP làm ẩu:** thiếu 1 domain → tính năng đó im lặng gãy (console error, không crash rõ ràng) — dễ bỏ sót nếu không test từng luồng kỹ. Rủi ro cao nhất trong 3 việc vì có thể chặn QR thanh toán mà không ai biết ngay.

**Rủi ro HSTS làm ẩu:** set `max-age` dài ngay từ đầu → nếu sau cần tắt HTTPS tạm (debug cert, đổi domain...) → trình duyệt đã cache HSTS tự chặn HTTP, khó revert nhanh cho user đã từng vào site.

**Rủi ro nếu KHÔNG làm:** thiếu 1 lớp phòng thủ chuẩn, nhưng site đã có Cloudflare Full Strict SSL phía trước, chưa ghi nhận XSS thật nào từ audit. Rủi ro trì hoãn thấp hơn rủi ro làm ẩu.

**Khuyến nghị trình tự khi làm:** CSP `Content-Security-Policy-Report-Only` trước (không chặn, chỉ log) → chạy vài ngày trên demo → xem report đủ domain chưa → chuyển sang chặn thật trên demo → mới lên prod. HSTS bắt đầu `max-age` ngắn (vài giờ) → tăng dần sau khi ổn định. Làm riêng 1 đợt, không gộp chung A/B.

## Việc nhỏ, không urgent
- `security-check.sh` báo sai "✗ NO backup cron" (cron backup DB có thật, chạy tốt) — bug false-negative trong script, không phải lỗ hổng thật.
