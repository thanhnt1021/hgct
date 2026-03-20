# ASK-BACK

> **Auto-trigger trong `feature:` workflow:** Cơ chế phân tích này (Track A) tự động chạy trong Phase 1 Analysis — không cần prefix `ask back`. Dùng standalone bằng prefix `ask back` khi muốn phân tích ngoài feature workflow.

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

Mỗi câu hỏi hiển thị theo **CLI menu format** — numbered list + description line + footer nav:

```
? [N/TOTAL] 🔴 CONFLICT — [Mô tả ngắn]

  [1-2 dòng context: plan nói gì vs code thực tế, hoặc mô tả ambiguity]

  1. [Tên option ngắn]  ★
     [1 dòng hệ quả / mô tả cụ thể]
  2. [Tên option]
     [1 dòng hệ quả / mô tả cụ thể]
  3. [Tên option]
     [1 dòng hệ quả / mô tả cụ thể]

─────────────────────────────────────────────────────────────────
Enter to select · Tab/Arrow keys to navigate · Esc to skip
```

**Quy ước cho từng loại:**

```
? [N/TOTAL] 🔴 CONFLICT — [Mô tả ngắn]
  Plan nói [X] — code hiện tại đang là [Y].

  1. Theo plan — xóa code cũ, làm mới
     [hệ quả]
  2. Giữ code cũ — bỏ qua phần này của plan
     [hệ quả]
  3. Merge — giữ cũ + thêm mới
     [mô tả cách merge]
```

```
? [N/TOTAL] 🟡 AMBIGUITY — [Mô tả ngắn]
  Plan nói "[câu mơ hồ]" — có thể hiểu theo nhiều cách.

  1. [Cách hiểu 1]
     [hệ quả cụ thể]
  2. [Cách hiểu 2]
     [hệ quả cụ thể]
  3. [Cách hiểu 3 nếu có]
     [hệ quả cụ thể]
```

```
? [N/TOTAL] 🟠 RISK — [Mô tả ngắn]
  Nếu làm [X] theo plan → có thể break [Y].

  1. Làm luôn — chấp nhận risk, fix sau nếu cần
     [hệ quả]
  2. Làm nhưng thêm safeguard  ★
     [mô tả safeguard cụ thể]
  3. Bỏ qua phần này
     [hệ quả]
```

```
? [N/TOTAL] 🔵 GAP — [Mô tả ngắn]
  Plan không nói rõ [Z] — cần biết để implement.

  1. [Option mặc định hợp lý nhất]  ★
     [hệ quả]
  2. [Option thay thế]
     [hệ quả]
  3. Để tao mô tả cụ thể hơn
     [user tự gõ]
```

```
? [N/TOTAL] ⚪ ASSUMPTION — [Mô tả ngắn]
  Plan không nhắc — tao sẽ giả định: [assumption].

  1. OK, đúng rồi  ★
  2. Không — [user giải thích]
```

### 6.2 Quy tắc format

- **Tối đa 7 câu hỏi** mỗi lần. Nếu có nhiều hơn → nhóm lại hoặc ưu tiên 🔴 > 🟡 > 🟠 > 🔵 > ⚪
- **`★` đánh dấu recommended** — chỉ 1 option mỗi câu, đặt sau tên option trên cùng dòng
- **Description line bắt buộc** cho mỗi option — 1 dòng, mô tả hệ quả cụ thể (ngoại trừ ⚪ ASSUMPTION ngắn có thể bỏ)
- **Option title ngắn** — scan được trong 2 giây; detail ở description line
- **Footer `─────` + `Enter to select...`** — in ở cuối mỗi câu hỏi, ngăn cách với câu tiếp theo
- **Progress `[N/TOTAL]`** — user biết còn bao nhiêu câu
- **Cho phép multi-select** nếu câu hỏi cho phép nhiều đáp án — ghi rõ `(chọn nhiều được)` trong header

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
Tao hiểu mày muốn: Thêm dark mode toggle, CSS vars, persist localStorage.
Ảnh hưởng: globals.css, App.jsx, Header.jsx, 8+ components có hardcoded colors
Ước lượng: vừa — Phát hiện: 4 điểm cần xác nhận.


? [1/4] 🟡 AMBIGUITY — Scope dark mode

  Plan nói "CSS variables" nhưng 12 files dùng Tailwind hardcoded colors
  (bg-white, text-gray-900, etc.) — không tự switch khi đổi CSS var.

  1. Chỉ đổi CSS vars — component nào dùng vars thì auto-dark
     Ít code nhất, nhưng phần lớn app vẫn giữ light
  2. Refactor toàn bộ — đổi tất cả hardcoded colors sang vars  ★
     Đúng intent plan nhất, sạch — nhưng nhiều file hơn
  3. Chỉ đổi top-level (body, header, footer) — nội dung giữ light
     Nhanh, ít risk, dark mode không hoàn chỉnh

─────────────────────────────────────────────────────────────────
Enter to select · Tab/Arrow keys to navigate · Esc to skip


? [2/4] 🟠 RISK — Existing icons biến mất trên dark bg

  5 SVG icons dùng fill="black" — sẽ invisible khi nền tối.

  1. Đổi SVG sang currentColor — tự adapt theo text color  ★
     1 dòng thay đổi mỗi icon, không cần maintain 2 bộ
  2. Giữ nguyên — chấp nhận icon khó thấy trên dark
     Zero effort, nhưng UX xấu
  3. Tạo 2 bộ icon light/dark
     Đẹp nhất, nhưng double asset

─────────────────────────────────────────────────────────────────
Enter to select · Tab/Arrow keys to navigate · Esc to skip


? [3/4] 🔵 GAP — Default mode khi user mở app lần đầu

  Plan không nói: mặc định light, dark, hay theo system preference?

  1. Default light  ★
     Predictable, không bất ngờ với user lần đầu
  2. Theo system preference (prefers-color-scheme)
     Respect OS setting, nhưng cần test thêm
  3. Bắt user chọn lần đầu
     Explicit nhất, nhưng thêm friction onboarding

─────────────────────────────────────────────────────────────────
Enter to select · Tab/Arrow keys to navigate · Esc to skip


? [4/4] ⚪ ASSUMPTION — Transition khi toggle

  Tao sẽ thêm transition 200ms khi toggle (tránh flash).

  1. OK, thêm vào  ★
  2. Không cần, đổi ngay lập tức

─────────────────────────────────────────────────────────────────
Enter to select · Tab/Arrow keys to navigate · Esc to skip
```

### User trả lời:

```
B, A, B, A
```

### Claude thực thi theo: refactor toàn bộ colors + SVG currentColor + system default + transition 200ms.

---

## 9. TUNING

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
