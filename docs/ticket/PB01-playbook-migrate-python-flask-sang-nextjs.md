# PB01 — Playbook: Chuyển app chiêm tinh Python/Flask → Next.js/Node

> **Đây KHÔNG phải phiếu build tính năng cho HGCT.** Đây là tài liệu playbook độc lập.
>
> **Mục đích:** Paste toàn bộ file này (hoặc từng phần) vào phiên **Claude Code CLI của dự án Python/Flask** cần convert, để phiên đó chuyển đổi mượt và tránh vấp lại các lỗi đã biết. Nội dung dưới đúc kết từ một dự án tương tự (`rundemo`) đã chuyển đổi thành công.
>
> **Bối cảnh dự án đích:** app chiêm tinh viết bằng Python/Flask, cần viết lại **hoàn toàn** sang Next.js/Node, bỏ Python/Flask.

---

## 1. Nguyên tắc số 1 — "Parity gate" (chuẩn vàng)

Giữ **app Python cũ chạy song song** làm bản đối chiếu. Mọi output của bản Node — vị trí hành tinh, chart, luận giải, đăng nhập — **phải khớp app Python cũ** thì mới coi là xong.

> "Không mất gì" **không phải lời hứa** — nó là **tiêu chí kiểm thử**: chưa khớp parity = chưa xong.

Đây là luật bao trùm toàn bộ quá trình migrate. Mọi quyết định bên dưới đều phục vụ mục tiêu này.

---

## 2. Các quyết định kỹ thuật đã được kiểm chứng

Năm quyết định dưới đây đã được kiểm chứng thực tế ở dự án tương tự. Giữ nguyên khi áp dụng.

### 2.1 Engine thiên văn → dùng `sweph` (npm)

`sweph` wrap đúng thư viện **Swiss Ephemeris (C)** mà `pyswisseph` bên Python cũng wrap → **cùng lõi C nên khớp số liệu**.

- Nhớ **copy đúng bộ file ephemeris** (thư mục `ephe/`) sang.
- **Phải verify trước:** chạy vài lá số, so vị trí sao / nhà / aspect với bản Python, **chốt ngưỡng sai lệch chấp nhận** (ví dụ `< 0.01°`).

### 2.2 Vẽ chart → render SVG thủ công (thay `matplotlib`)

SVG nhẹ, không cần server render ảnh, hiển thị web mượt và zoom nét.

### 2.3 Nội dung luận giải (hàng nghìn dòng) → port nguyên văn

Port nguyên văn sang, **chỉ đổi cách lưu/serve** (JSON/DB), **không sửa nội dung**.

### 2.4 Auth → GIỮ TƯƠNG THÍCH HASH MẬT KHẨU

- **Phải verify trước:** xác định **chính xác** thuật toán hash hiện tại (bcrypt? `werkzeug` pbkdf2:sha256? …).
- Rồi **implement lại đúng thuật toán đó** trong Node, để **user cũ đăng nhập được** sau khi bỏ Flask.
- **Tuyệt đối không reset mật khẩu toàn bộ user.**

### 2.5 `index.html` cũ

Bỏ file `index.html` cũ, nhưng **giữ hành vi redirect `/`**.

---

## 3. Hai điểm SỐNG CÒN — VERIFY TRƯỚC KHI port cả nghìn dòng

> Đây là **gate chặn**, không phải gợi ý. **Không được bỏ qua.**

1. **`sweph` (JS) có thật sự thay được `pyswisseph` không** — **test parity số liệu thật, không tin lý thuyết.**
2. **Thuật toán hash mật khẩu hiện tại là gì** — để giữ đăng nhập cho user cũ.

**Nếu 2 cái này chưa chắc → DỪNG, làm rõ.** Đừng lao vào port rồi mới phát hiện lệch → phải đập đi làm lại.

---

## 4. Cách thi công khuyến nghị

- **Port theo từng module**, mỗi module **đối chiếu parity với Python ngay** (không dồn parity đến cuối).
- Mọi **lựa chọn rời rạc** — ngưỡng sai lệch engine, cách render chart, thứ tự port… — **hỏi chủ dự án, đừng tự quyết.**

---

## 5. Phụ lục — Ví dụ thực tế tham khảo từ HGCT (Hạt Giống Chiêm Tinh)

> **Phân biệt nguồn:** Toàn bộ mục 1–4 ở trên là **hướng dẫn gốc do Chủ nhà cung cấp**. Mục 5 này là **ví dụ thật từ một dự án khác (HGCT)** đã áp dụng gần giống các quyết định trên — dùng để đối chiếu/củng cố, **không thay thế** hướng dẫn gốc. Mỗi mục ghi rõ nguồn `file:dòng`.

HGCT là một app chiêm tinh đang chạy production (`hatgiongchiemtinh.com`), stack Next.js 15 + TypeScript + PostgreSQL. Nó là bằng chứng thực tế rằng hướng đi trong playbook này khả thi:

- **Engine thiên văn:** HGCT dùng `swisseph` npm (Swiss Ephemeris), ephemeris files đặt tại `/ephe/`.
  - Nguồn: `docs/ARCHITECTURE.md:18` — *"Chiêm tinh | `swisseph` npm (Swiss Ephemeris) | Ephemeris files tại `/ephe/`"*
  - Nguồn: `docs/PROJECT_SUMMARY.md:11` — *"Swiss Ephemeris (`swisseph` npm) — tính toán thiên văn"*
  - Wrapper thực tế: `src/lib/astrology/calculations.ts` — *"Swiss Ephemeris wrapper"* (`docs/ARCHITECTURE.md:170`)
  - Luồng: `calculateChart()` chạy đồng bộ trong background job (`docs/ARCHITECTURE.md:61`, `:225`)
  - *Lưu ý phân biệt package:* playbook gốc khuyến nghị package tên `sweph`; HGCT dùng package tên `swisseph`. Cả hai cùng wrap lõi Swiss Ephemeris (C) — chủ dự án đích tự chốt package cụ thể (đây là một "lựa chọn rời rạc" theo mục 4).

- **Auth — tương thích hash mật khẩu cũ (đúng tinh thần mục 2.4):** HGCT làm **bcrypt dual-mode** để migrate trong suốt, không reset mật khẩu ai.
  - Nguồn: `docs/FIXES_HISTORY.md:7` — *"`auth.ts` — bcrypt dual-mode: `hashPassword` async bcrypt12; `verifyPassword` SHA256 fallback + silent rehash → migration transparent"*
  - Cơ chế: khi verify, nếu hash cũ là SHA256 thì fallback kiểm chứng được, rồi **silent rehash** sang bcrypt → user cũ đăng nhập bình thường, dần dần được nâng cấp hash mà không cần reset.
  - Credentials login dùng bcrypt hash: `docs/CLONE_BLUEPRINT.md:983`.

- **Stack tham khảo tổng thể** (`docs/CLONE_BLUEPRINT.md:927`–`937`, `docs/PROJECT_SUMMARY.md:9`–`13`): Next.js 15 App Router, React 19, Prisma v5 + PostgreSQL, `swisseph` cho astro engine, OpenRouter (Claude) cho luận giải, `@sparticuz/chromium` + `puppeteer-core` cho PDF.

> Các chi tiết HGCT ở trên là **ví dụ**, không phải mệnh lệnh cho dự án đích. Khi có mâu thuẫn giữa ví dụ HGCT và hướng dẫn gốc (mục 1–4) hoặc yêu cầu của chủ dự án đích → **ưu tiên hướng dẫn gốc + hỏi chủ dự án**.
