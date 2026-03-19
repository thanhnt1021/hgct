# ASK-BACK

## Cơ Chế Phản Hồi Ngược Trước Khi Thực Thi

---

Khi user mở đầu message bằng `ask back`, Claude KHÔNG thực thi ngay. Claude phân tích plan so với hệ thống hiện tại, phát hiện ambiguity/conflict/gap, rồi hỏi ngược bằng **selectable options** để user chọn nhanh.

---

## 1. KHI NÀO KÍCH HOẠT

### Trigger

Message của user BẮT ĐẦU bằng một trong các lệnh:

| Lệnh | Hành vi |
|---|---|
| `ask back` | Phân tích plan → hỏi ngược → đợi trả lời → rồi mới làm |
| `ask back then do` | Phân tích → hỏi → user trả lời → tự động thực thi luôn |
| `just do` | Bỏ qua ask-back, thực thi ngay (override) |

### Không kích hoạt khi

- Message ngắn, rõ ràng, không có ambiguity (ví dụ: "fix lỗi typo dòng 42")
- User nói `just do`
- Không có plan/prompt phức tạp đi kèm

---

## 2. QUY TRÌNH ASK-BACK

```
User gửi plan
     │
     ▼
┌─────────────────────────┐
│  PHASE 1: ĐỌC HIỂU     │  Đọc plan + đọc codebase hiện tại
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  PHASE 2: SO SÁNH       │  Plan nói gì vs code thực tế có gì
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  PHASE 3: PHÁT HIỆN     │  Tìm conflict, gap, ambiguity, risk
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  PHASE 4: HỎI NGƯỢC     │  Tạo câu hỏi với selectable options
└────────────┬────────────┘
             │
             ▼
      User chọn options
             │
             ▼
┌─────────────────────────┐
│  PHASE 5: THỰC THI      │  Làm theo plan + câu trả lời
└─────────────────────────┘
```

---

## 3. PHASE 1 — ĐỌC HIỂU

Claude đọc song song:

**Từ plan/prompt của user:**
- Mục tiêu cuối cùng là gì?
- Liệt kê các thay đổi được yêu cầu
- Các constraint/điều kiện đặc biệt
- Thứ tự ưu tiên (nếu có)

**Từ codebase hiện tại:**
- Tech stack (package.json, framework, language)
- Cấu trúc thư mục
- Database schema (nếu có)
- Các file sẽ bị ảnh hưởng bởi plan
- State hiện tại: có gì đang broken? có uncommitted changes?

---

## 4. PHASE 2 — SO SÁNH

Claude tạo bảng mapping ngầm (không show user):

```
Plan yêu cầu X  ←→  Code hiện tại đã có X' (khác một chút)
Plan yêu cầu Y  ←→  Code không có gì liên quan
Plan yêu cầu Z  ←→  Code đã có Z (trùng hoàn toàn)
Plan không nhắc W ←→  Code có W mà plan sẽ phá vỡ
```

---

## 5. PHASE 3 — PHÁT HIỆN

Claude phân loại findings vào 6 categories:

| # | Loại | Mô tả | Cần hỏi? |
|---|---|---|---|
| 🔴 | **CONFLICT** | Plan mâu thuẫn với code hiện tại | BẮT BUỘC hỏi |
| 🟡 | **AMBIGUITY** | Plan nói không rõ, có thể hiểu 2+ cách | BẮT BUỘC hỏi |
| 🟠 | **RISK** | Làm được nhưng có thể break thứ khác | Nên hỏi |
| 🔵 | **GAP** | Plan thiếu thông tin cần thiết để implement | Nên hỏi |
| ⚪ | **ASSUMPTION** | Claude sẽ giả định X nếu user không nói gì | Hỏi nếu critical |
| 🟢 | **CLEAR** | Rõ ràng, không cần hỏi | Không hỏi |

**Quy tắc:** Chỉ hỏi 🔴🟡🟠🔵⚪ — KHÔNG hỏi 🟢. Nếu mọi thứ đều 🟢 → skip ask-back, thực thi luôn.

---

## 6. PHASE 4 — HỎI NGƯỢC

### 6.1 Format câu hỏi

Mỗi câu hỏi PHẢI có **selectable options** để user chọn nhanh (không cần gõ):

```
### 🔴 CONFLICT: [Mô tả ngắn]

Plan nói: [X]
Code hiện tại: [Y]

→ Chọn:
  A) Theo plan — xóa code cũ, làm mới
  B) Giữ code cũ — bỏ qua phần này của plan
  C) Merge — giữ cũ + thêm mới [mô tả cách merge]
```

```
### 🟡 AMBIGUITY: [Mô tả ngắn]

Plan nói: "[câu mơ hồ]"
Có thể hiểu:

→ Chọn:
  A) [Cách hiểu 1 — mô tả cụ thể]
  B) [Cách hiểu 2 — mô tả cụ thể]
  C) [Cách hiểu 3 — nếu có]
```

```
### 🟠 RISK: [Mô tả ngắn]

Nếu làm [X] theo plan → có thể break [Y].

→ Chọn:
  A) Làm luôn — chấp nhận risk, fix sau nếu cần
  B) Làm nhưng thêm safeguard [mô tả]
  C) Bỏ qua phần này
```

```
### 🔵 GAP: [Mô tả ngắn]

Plan không nói rõ [Z]. Cần biết để implement.

→ Chọn:
  A) [Option mặc định hợp lý nhất]
  B) [Option thay thế]
  C) Để tao mô tả cụ thể: [user tự gõ]
```

```
### ⚪ ASSUMPTION: [Mô tả ngắn]

Plan không nhắc nhưng tao sẽ giả định: [assumption].

→ Chọn:
  A) OK, đúng rồi
  B) Không — [user giải thích]
```

### 6.2 Quy tắc format

- **Tối đa 7 câu hỏi** mỗi lần. Nếu có nhiều hơn → nhóm lại hoặc ưu tiên 🔴 > 🟡 > 🟠 > 🔵 > ⚪
- **Options ngắn gọn** — mỗi option ≤ 1 dòng. User phải scan được trong 3 giây.
- **Có default recommendation** — đánh dấu option Claude khuyến nghị bằng ` ← khuyến nghị`
- **Cho phép multi-select** nếu câu hỏi cho phép chọn nhiều
- **Option cuối luôn là thoát** nếu phù hợp: "Bỏ qua, tao không quan tâm cái này"

### 6.3 Tóm tắt trước khi hỏi

Trước danh sách câu hỏi, Claude show bản tóm tắt 3-5 dòng:

```
## Tóm tắt plan

Tao hiểu mày muốn: [1 câu mô tả mục tiêu]
Ảnh hưởng: [X files, Y components, Z endpoints]
Ước lượng: [nhỏ/vừa/lớn]
Phát hiện: [N] điểm cần xác nhận trước khi làm.
```

---

## 7. PHASE 5 — THỰC THI

Sau khi user trả lời (chọn options), Claude:

1. **Ghi nhận** tất cả lựa chọn
2. **Tạo execution plan** cuối cùng (dựa trên plan gốc + câu trả lời)
3. **Thực thi** theo thứ tự hợp lý
4. **Nếu gặp vấn đề mới** trong quá trình thực thi → dừng lại hỏi tiếp (nhưng chỉ khi critical)

---

## 8. VÍ DỤ THỰC TẾ

### User gửi:

```
ask back

Thêm tính năng dark mode cho app. Dùng CSS variables.
Toggle ở header. Lưu preference vào localStorage.
```

### Claude phân tích → phát hiện:

```
## Tóm tắt plan

Tao hiểu mày muốn: Thêm dark mode toggle, CSS vars, persist localStorage.
Ảnh hưởng: globals.css, App.jsx, Header.jsx, 8+ components có hardcoded colors
Ước lượng: vừa
Phát hiện: 4 điểm cần xác nhận.

---

### 🟡 AMBIGUITY: Scope dark mode

Plan nói "CSS variables" nhưng code hiện tại có 12 files dùng Tailwind hardcoded colors (bg-white, text-gray-900, etc.)

→ Chọn:
  A) Chỉ đổi CSS vars — component nào dùng vars thì auto-dark, còn lại giữ nguyên
  B) Refactor toàn bộ — đổi tất cả hardcoded colors sang vars luôn ← khuyến nghị
  C) Chỉ đổi top-level (body, header, footer) — nội dung giữ light

### 🟠 RISK: Existing images/icons

Có 5 SVG icons dùng fill="black". Dark mode sẽ khiến chúng biến mất trên dark bg.

→ Chọn:
  A) Đổi SVG sang currentColor — tự adapt ← khuyến nghị
  B) Giữ nguyên — chấp nhận icon khó thấy trên dark
  C) Tạo 2 bộ icon light/dark

### 🔵 GAP: Default mode

User mở app lần đầu → light hay dark hay theo system?

→ Chọn:
  A) Default light ← khuyến nghị
  B) Default theo system preference (prefers-color-scheme)
  C) Bắt user chọn lần đầu

### ⚪ ASSUMPTION: Transition

Tao sẽ thêm transition 200ms khi toggle (tránh flash). OK?

→ Chọn:
  A) OK ← khuyến nghị
  B) Không cần transition, đổi ngay
```

### User trả lời:

```
B, A, B, A
```

### Claude thực thi theo: refactor toàn bộ colors + SVG currentColor + system default + transition 200ms.

---

## 9. ADAPT CHO DỰ ÁN CỤ THỂ

File này là **generic**. Để adapt cho 1 dự án cụ thể:

### Bước 1: Thêm file này vào project

```bash
cp ASK-BACK.md /path/to/project/
```

### Bước 2: Bảo Claude CLI adapt

```
Đọc file ASK-BACK.md và CLAUDE.md (hoặc README).
Hiểu codebase này. Từ giờ khi tao nói "ask back" trước bất kỳ
prompt nào, hãy tuân theo quy trình trong ASK-BACK.md.
```

### Bước 3: Dùng

```
ask back

[paste plan/prompt dài ngoằng vào đây]
```

---

## 10. TUNING

### Điều chỉnh độ "hỏi nhiều"

Nếu Claude hỏi quá nhiều:
```
ask back --quick
```
→ Chỉ hỏi 🔴 CONFLICT và 🟡 AMBIGUITY. Bỏ qua RISK/GAP/ASSUMPTION.

Nếu muốn hỏi kỹ:
```
ask back --thorough
```
→ Hỏi tất cả 5 loại, không giới hạn 7 câu.

### Điều chỉnh format

Nếu muốn câu trả lời nhanh hơn:
```
ask back --yn
```
→ Tất cả câu hỏi chỉ Yes/No, Claude tự chọn default cho mọi thứ, user chỉ confirm hoặc reject.

---

## TÓM TẮT

```
ask back = Đọc plan → So với code → Phát hiện vấn đề → Hỏi options → Đợi user chọn → Làm

Không hỏi khi mọi thứ rõ ràng.
Hỏi ngắn gọn, có options chọn nhanh.
Ưu tiên: CONFLICT > AMBIGUITY > RISK > GAP > ASSUMPTION.
Tối đa 7 câu hỏi.
Luôn có recommendation.
```
