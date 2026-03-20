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
│  PHASE 4: HỎI NGƯỢC     │  Generate + run interactive CLI prompt (Clack)
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

## 6. PHASE 4 — HỎI NGƯỢC (Interactive CLI)

Claude KHÔNG output câu hỏi dạng text. Thay vào đó: **generate + run một interactive CLI script** dùng `@clack/prompts` — user navigate bằng arrow keys, Enter để chọn.

### 6.1 Quy trình

> **Giới hạn kỹ thuật:** Claude Code CLI Bash tool không forward interactive stdin. Script phải được user chạy trực tiếp trong terminal — Claude không tự run được.

**Bước 1 — Đảm bảo deps (Claude tự chạy):**
```bash
mkdir -p /tmp/ask-back-deps && cd /tmp/ask-back-deps && npm init -y --quiet && npm install @clack/prompts --silent
```

**Bước 2 — Generate script:**
Claude write file `/tmp/ask-back-[timestamp].mjs` với tất cả questions đã phân tích ở Phase 3.

**Bước 3 — Claude nói với user:**
```
Chạy lệnh này trong terminal của mày:

  node /tmp/ask-back-[timestamp].mjs

Sau đó paste dòng ASKBACK_RESULT:... trở lại đây.
```

**Bước 4 — User chạy + paste kết quả:**
User navigate arrow keys → Enter chọn → copy dòng cuối `ASKBACK_RESULT:{...}` → paste vào chat.

**Bước 5 — Claude đọc kết quả + proceed:**
Claude parse JSON → tạo execution plan → implement.

---

### 6.2 Script template

```javascript
// /tmp/ask-back-[timestamp].mjs
import { intro, outro, select, text, note, isCancel, cancel } from '/tmp/ask-back-deps/node_modules/@clack/prompts/dist/index.mjs'
import pc from '/tmp/ask-back-deps/node_modules/@clack/prompts/node_modules/picocolors/picocolors.js'

const answers = {}

intro(pc.bgCyan(pc.black(' ASK-BACK ')))

note(
  '[1 câu mô tả mục tiêu]\nẢnh hưởng: [X files] · Phát hiện: [N] điểm cần xác nhận',
  'Tóm tắt plan'
)

// === QUESTION TEMPLATE ===
answers.q1 = await select({
  message: '[1/N] 🟡 AMBIGUITY — [Mô tả ngắn]\n  [1-2 dòng context]',
  options: [
    { value: '1', label: '[Option 1]  ★', hint: '[Hệ quả — recommended]' },
    { value: '2', label: '[Option 2]',    hint: '[Hệ quả]' },
    { value: '3', label: '[Option 3]',    hint: '[Hệ quả]' },
    { value: 'other', label: 'Other — tự mô tả', hint: 'Nhập câu trả lời riêng' },
  ],
})
if (isCancel(answers.q1)) { cancel('Cancelled'); process.exit(0) }
if (answers.q1 === 'other') {
  answers.q1_custom = await text({ message: 'Mô tả:' })
}

// ... thêm câu hỏi theo pattern trên

outro(pc.green('Đã ghi nhận tất cả.'))
process.stdout.write('\nASKBACK_RESULT:' + JSON.stringify(answers) + '\n')
```

---

### 6.3 Quy tắc generate script

- **`★` recommended** — thêm vào cuối `label`, chỉ 1 option mỗi câu
- **`hint`** — 1 dòng hệ quả/mô tả cụ thể, bắt buộc cho mọi option (trừ `Other`)
- **`Other — tự mô tả`** — option cuối **BẮT BUỘC** trong mọi câu hỏi, theo sau bằng `text()` prompt nếu được chọn
- **`isCancel()` check** — sau mỗi `select()` / `text()`; cancel → `process.exit(0)`
- **`note()` summary** — đặt sau `intro()`, trước câu hỏi đầu tiên
- **Tối đa 7 câu hỏi** — ưu tiên 🔴 > 🟡 > 🟠 > 🔵 > ⚪ nếu nhiều hơn
- **Output cuối** — `process.stdout.write('\nASKBACK_RESULT:' + JSON.stringify(answers) + '\n')` — luôn là dòng cuối cùng script, Claude dùng để parse answers

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

### Claude phân tích → generate + chạy script:

```javascript
// /tmp/ask-back-1703123456.mjs
import { intro, outro, select, text, note, isCancel, cancel } from '/tmp/ask-back-deps/node_modules/@clack/prompts/dist/index.mjs'

const answers = {}

intro(' ASK-BACK ')

note(
  'Thêm dark mode toggle, CSS vars, persist localStorage\nẢnh hưởng: globals.css, App.jsx, Header.jsx, 8+ components · Phát hiện: 4 điểm',
  'Tóm tắt plan'
)

answers.q1 = await select({
  message: '[1/4] 🟡 AMBIGUITY — Scope dark mode\n  Plan nói "CSS variables" nhưng 12 files dùng Tailwind hardcoded colors.',
  options: [
    { value: '1', label: 'Chỉ đổi CSS vars',             hint: 'Ít code — phần lớn app vẫn giữ light' },
    { value: '2', label: 'Refactor toàn bộ  ★',           hint: 'Sạch, đúng intent — nhiều file hơn' },
    { value: '3', label: 'Chỉ top-level (body/header)',   hint: 'Nhanh, ít risk — dark mode không hoàn chỉnh' },
    { value: 'other', label: 'Other — tự mô tả',         hint: 'Nhập câu trả lời riêng' },
  ],
})
if (isCancel(answers.q1)) { cancel('Cancelled'); process.exit(0) }
if (answers.q1 === 'other') { answers.q1_custom = await text({ message: 'Mô tả:' }) }

answers.q2 = await select({
  message: '[2/4] 🟠 RISK — 5 SVG icons dùng fill="black" sẽ invisible trên dark bg',
  options: [
    { value: '1', label: 'Đổi SVG sang currentColor  ★', hint: '1 dòng/icon, tự adapt — recommended' },
    { value: '2', label: 'Giữ nguyên',                   hint: 'Zero effort — icon khó thấy trên dark' },
    { value: '3', label: 'Tạo 2 bộ icon light/dark',     hint: 'Đẹp nhất — double asset' },
    { value: 'other', label: 'Other — tự mô tả' },
  ],
})
if (isCancel(answers.q2)) { cancel('Cancelled'); process.exit(0) }
if (answers.q2 === 'other') { answers.q2_custom = await text({ message: 'Mô tả:' }) }

answers.q3 = await select({
  message: '[3/4] 🔵 GAP — Default mode khi user mở app lần đầu?',
  options: [
    { value: '1', label: 'Default light  ★',               hint: 'Predictable, không bất ngờ' },
    { value: '2', label: 'Theo system preference',         hint: 'Respect OS — cần test thêm' },
    { value: '3', label: 'Bắt user chọn lần đầu',         hint: 'Explicit — thêm friction onboarding' },
    { value: 'other', label: 'Other — tự mô tả' },
  ],
})
if (isCancel(answers.q3)) { cancel('Cancelled'); process.exit(0) }
if (answers.q3 === 'other') { answers.q3_custom = await text({ message: 'Mô tả:' }) }

answers.q4 = await select({
  message: '[4/4] ⚪ ASSUMPTION — Thêm transition 200ms khi toggle để tránh flash?',
  options: [
    { value: '1', label: 'OK, thêm vào  ★' },
    { value: '2', label: 'Không cần, đổi ngay lập tức' },
    { value: 'other', label: 'Other — tự mô tả' },
  ],
})
if (isCancel(answers.q4)) { cancel('Cancelled'); process.exit(0) }
if (answers.q4 === 'other') { answers.q4_custom = await text({ message: 'Mô tả:' }) }

outro('Đã ghi nhận tất cả.')
process.stdout.write('\nASKBACK_RESULT:' + JSON.stringify(answers) + '\n')
```

### Claude chạy script:

```bash
node /tmp/ask-back-1703123456.mjs
```

→ User thấy interactive prompt trong terminal, navigate arrow keys.

### Output script → Claude đọc:

```
ASKBACK_RESULT:{"q1":"2","q2":"1","q3":"1","q4":"1"}
```

### Claude thực thi theo: refactor toàn bộ colors + SVG currentColor + default light + transition 200ms.

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
