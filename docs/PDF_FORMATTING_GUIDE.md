# PDF Formatting Guide — HGCT

> Tài liệu này mô tả **toàn bộ** quy tắc định dạng, cấu trúc, và cơ chế xử lý PDF trong dự án.
> Bất kỳ ai cần sửa hoặc thêm tính năng PDF phải đọc file này trước.

**File chính:** `src/lib/pdf/generator.ts`
**Stack:** `@sparticuz/chromium` + `puppeteer-core`
**Format:** A4 — margin top:25mm right:20mm bottom:20mm left:20mm

---

## 1. Pipeline Tổng Quan

```
essayText (raw AI output)
  ↓ cleanForPdf()           — strip markdown, filter dòng thừa, filter subheading rỗng
  ↓ classifyLine()           — phân loại từng dòng thành type
  ↓ buildHtml()              — render HTML với CSS + fonts base64
  ↓ page.setContent(html)    — Puppeteer load HTML
  ↓ page.evaluate(...)       — JS manipulations trong browser context
      • strip trailing spacers
      • heading resize (h2.section tự co font cho vừa 1 dòng)
      • orphan compression (giảm line-height toàn bộ nếu có orphan)
      • per-element orphans/widows CSS
      • XUNG ĐỘT/HÒA HỢP widow fix
      • subheading widow fix
  ↓ page.pdf()               — render PDF
  ↓ Buffer
```

---

## 2. cleanForPdf() — Tiền Xử Lý Văn Bản

**Bỏ:**
- Markdown headers `# ## ###`
- Bold/italic `**text**`, `_text_`, backtick
- HTML tags `<br>`, `<...>`
- Các dòng "absence" (AI báo không có dữ liệu) — xem `ABSENCE_PHRASES` array
- Bracket notes `[...]` (trừ `[KTLUẬN]` và `[KTTIỂU]`)
- Subheading "rỗng": subheading mà body sau nó toàn absence lines → bỏ cả subheading lẫn body

**Giữ:**
- `[KTLUẬN]...` → render thành red-box (khung kết luận đỏ)
- `[KTTIỂU]...` → render thành mini-box (khung kết luận tiểu mục đỏ nhỏ hơn)
- Tất cả text thường

---

## 3. classifyLine() — Phân Loại Dòng

| Type | Điều kiện | HTML element |
|------|-----------|-------------|
| `section_heading` | match `/^\d+\.\s+\S/` và `length < 120` | `<h2 class="section">` |
| `title_heading` | `isVnTitleHeading()` — nhiều chữ hoa, không phải câu văn | `<h2 class="section">` |
| `subheading` | kết thúc bằng `:` và `length < 90` | `<h3 class="subheading">` |
| `opener` | bắt đầu bằng `kính gửi` (case-insensitive) | `<p class="opener">` |
| `signature` | bắt đầu bằng `Trân trọng`, `Claude –`, `Chúc `, `— Claude`, `Hạt Giống Chiêm Tinh`, v.v. | `<p class="signature">` |
| `bullet` | bắt đầu bằng `* ` | `<p class="bullet">` |
| `bullet_indent` | bắt đầu với `   * ` (≥3 spaces + `* `) | `<p class="bullet-indent">` |
| `red_box` | bắt đầu bằng `[KTLUẬN]` | `<div class="red-box">` |
| `mini_box` | bắt đầu bằng `[KTTIỂU]` | `<div class="mini-box">` |
| `body` | mặc định | `<p class="body">` |

**Lưu ý `isVnTitleHeading()`:**
- Không match nếu `length > 80` hoặc kết thúc `.,:;!?`
- Không match nếu bắt đầu bằng các từ văn xuôi: `Anh `, `Chị `, `Với `, `Khi `, v.v.
- Không match nếu bắt đầu bằng signature keys
- Match nếu ≥75% từ non-conjunction là chữ hoa đầu

---

## 4. Section Grouping — Phân Nhóm Trang

Mỗi `section_heading` (dòng `1. Tiêu Đề`) tạo ra 1 **section-group** mới. CSS `.section-group.is-section` có `page-break-before: always` → mỗi section luôn bắt đầu trang mới.

- Group 0 (trước section đầu tiên): không có page-break — chứa opener/intro
- Group 1+ (`is-section`): luôn bắt đầu trang mới

**Quan trọng khi tính toán widow/orphan:** Vì `is-section` group luôn bắt đầu trang mới, tọa độ relative của element so với `groupTop` tương đương tọa độ relative so với đầu trang in.

---

## 5. CSS — Typography & Layout

### Fonts (base64 embedded)

| CSS Family | File | Dùng cho |
|-----------|------|----------|
| `Nunito` | `Nunito-Regular.ttf` | body text, signature |
| `NunitoItalic` | `Nunito-LightItalic.ttf` | opener, bullet-indent |
| `Montserrat` | `Montserrat-Regular.ttf` | (reserved) |
| `MontserratBold` | `Montserrat-SemiBoldItalic.ttf` | section heading, subheading, red-box |
| `GreatVibes` | `GreatVibes-Regular.ttf` | cover name (cursive) |
| `Faustina` | `Faustina-SemiBold.ttf` | (reserved) |

Fonts nằm tại `/public/fonts/` và được embed dưới dạng base64 vào HTML. **Không dùng CDN** (môi trường không có internet khi render).

### Element Styles

```css
body          { font-size: 14.9pt; line-height: 1.55; font-family: Nunito; color: #1f2937; }

.cover        { height: 252mm; page-break-after: always; }
.cover-title  { font: MontserratBold 32.9pt; color: #dc2626; }
.cover-name   { font: GreatVibes 50.8pt; }        /* single profile */
.cover-name-sm{ font: GreatVibes 38.9pt; }        /* synastry — 2 tên */

.section      { font: MontserratBold 19.5pt; color: #dc2626;
                border-bottom: 1pt solid #dc2626; margin: 14pt 0 6pt; }
.section-first{ margin-top: 0; }

.subheading   { font: MontserratBold 16.5pt; color: #1f2937;
                margin: 8pt 0 4pt;
                page-break-after: avoid; break-after: avoid; }  /* ← quan trọng */

.body         { text-align: justify; margin: 2pt 0 5pt; }
.opener       { font: NunitoItalic 14.9pt; margin: 4pt 0 6pt; }
.bullet       { padding-left: 12pt; text-indent: -12pt; }
.bullet-indent{ font: NunitoItalic 13.5pt; color: #dc2626;
                padding-left: 28pt; text-indent: -12pt; }
.signature    { font: NunitoItalic 11pt; color: #6b7280; orphans: 4; widows: 4; }

.red-box      { font: MontserratBold 16.5pt; border: 1.5pt solid #dc2626;
                background: #fff5f5; padding: 8pt 10pt; margin: 6pt 0 8pt;
                page-break-inside: avoid; break-inside: avoid; }
.mini-box     { font: Nunito 15.5pt; border: 1.2pt solid #dc2626;
                background: #fef9f9; padding: 7pt 10pt; margin: 5pt 0 7pt;
                page-break-inside: avoid; break-inside: avoid; }

.spacer       { height: 4pt; }
```

### Footer

Dùng Puppeteer native `displayHeaderFooter` — render trong margin bottom, không chồng content:
- Border-top đỏ nhạt `#fca5a5`
- Text "Hạt Giống Chiêm Tinh" — font Arial 10pt, màu `#9ca3af`
- Padding: `0 25mm`

---

## 6. Viewport & Print Calibration

```javascript
page.setViewport({ width: 642, height: 1123 })
```

**Lý do:** `642px = 170mm × (96dpi / 25.4)` = đúng bằng content width A4 (A4 210mm - left 20mm - right 20mm = 170mm). Điều này đảm bảo `clientWidth` trong screen mode = content width khi in, giúp các phép đo font/heading chính xác.

```javascript
const PAGE_H = 252 * (96 / 25.4)  // ≈ 952px
```

`PAGE_H` = chiều cao content A4 (297mm - top 25mm - bottom 20mm = 252mm). Dùng để simulate page boundaries trong JS.

---

## 7. JS Manipulations (page.evaluate)

Tất cả chạy sau `document.fonts.ready` trong browser context.

### 7.1 Strip Trailing Spacers

Xóa các `.spacer` div ở cuối mỗi section-group. Nếu để nguyên, chúng đẩy chiều cao group vượt page boundary → kết hợp với `page-break-before: always` của group tiếp theo → tạo trang trắng.

### 7.2 Heading Resize

Giảm font-size của **tất cả** `h2.section` đồng loạt (không riêng lẻ) cho đến khi không `h2` nào bị wrap sang dòng 2. Step: 0.5px/lần, tối đa 40 lần, floor 10px.

**Quan trọng:** Dùng trick `whiteSpace: nowrap` + `scrollWidth > clientWidth` để detect wrap, sau đó restore. Nếu resize riêng lẻ từng heading → inconsistent font sizes.

### 7.3 Global Orphan Compression

Giảm `line-height` TOÀN BỘ body text (selector: `p.body, p.opener, p.bullet, p.bullet-indent, p.signature`) cho đến khi không còn orphan nào.

**Orphan detection:** Với mỗi element, tính `relBottom % PAGE_H` (overflow so với cuối trang ảo). Nếu `overflow < lineHeight × 3.5` → orphan (≤3 dòng tràn sang trang sau).

**Range:** `lh` bắt đầu từ `1.55`, giảm `0.02` mỗi bước, tối thiểu `1.30`, tối đa 15 bước.

**Cơ chế:** Chạy lại từ đầu mỗi khi phát hiện orphan (không dừng ở orphan đó) → đảm bảo không bỏ sót bất kỳ orphan nào do cascade.

### 7.4 Per-Element Orphans/Widows

Sau khi compression xong, set `el.style.orphans` và `el.style.widows` cho từng paragraph dựa vào số dòng thực tế:

| Số dòng | widows | orphans |
|---------|--------|---------|
| 1-5 hoặc >8 | 4 | 4 |
| 6 | 3 | 3 |
| 7 | 3 | 4 |
| 8 | 4 | 4 |

Ghi trực tiếp vào `el.style` (inline) → override CSS → print engine áp dụng per-paragraph.

### 7.5 XUNG ĐỘT / HÒA HỢP Widow Fix

Chỉ áp dụng cho 2 heading cụ thể là `"XUNG ĐỘT"` và `"HÒA HỢP"` (h2.section không có số như `"3. ..."`) — đây là headings đặc biệt trong synastry nằm giữa section, không có `page-break-before: always`.

**Logic:**
1. Tìm `h3.subheading` đầu tiên ngay sau h2
2. Đánh dấu subheading đó vào `xdHandledSubheadings` (để skip ở bước 7.6)
3. Kiểm tra: nếu subheading đó là widow (`wouldBeWidow`) hoặc đã bị CSS đẩy sang trang khác (`h2Isolated`) → move **h2** (không phải subheading) sang trang mới bằng `page-break-before: always`

**Lý do move h2 chứ không phải subheading:** Nếu move subheading, h2 sẽ bị cô lập ở cuối trang. Move cả h2 kéo theo subheading.

### 7.6 Subheading Widow Fix ⚠️

**Quan trọng — đây là fix chính cho bug widow subheading.**

Duyệt tất cả `h3.subheading`, skip những cái đã được xử lý ở 7.5. Với mỗi subheading, gọi `wouldBeWidow(sh, group)`:

```javascript
function wouldBeWidow(sh, group) {
  const groupTop = group.getBoundingClientRect().top
  const shTop = sh.getBoundingClientRect().top - groupTop      // ← dùng TOP, không phải bottom
  const pageEndPx = (Math.floor(shTop / PAGE_H) + 1) * PAGE_H // ← end của trang chứa shTop
  const nextEl = findNextContent(sh)
  if (!nextEl) return false
  const nextTop = nextEl.getBoundingClientRect().top - groupTop
  return (pageEndPx - nextTop) < spaceNeededFor(nextEl)
}
```

**Tại sao dùng `shTop` không phải `shBottom`:**
Nếu dùng `shBottom`: khi subheading ở gần cuối trang, bottom có thể tràn 1-2px sang trang sau (ví dụ `shBottom = 953`, `PAGE_H = 952`). `Math.ceil(953/952) = 2` → `pageEndPx = 1904` (cuối trang 2!) → check sai, không detect widow.
Dùng `shTop`: subheading "thuộc" trang nào dựa vào nơi nó **bắt đầu**. `Math.floor(shTop/PAGE_H) + 1` luôn cho ra đúng cuối trang hiện tại.

**`spaceNeededFor(nextEl)`:**
- Nếu nextEl là `red-box` hoặc `mini-box` (`page-break-inside: avoid`): trả về `nextEl.offsetHeight` (full height)
- Nếu là paragraph: trả về `min(orphans, lineCount) × lineHeight` (số dòng orphan cần thiết)

Nếu widow → set `page-break-before: always` trên subheading đó.

---

## 8. Quy Tắc Viết Prompt AI Liên Quan Đến PDF

### 8.1 Tránh Em Dash (—)

**Tuyệt đối không dùng dấu `—` (em dash) trong prompt templates.**
AI sẽ bắt chước style prompt → output chứa `—` → PDF render thành ký tự lạ hoặc trông không đẹp.

**Files cần kiểm tra:** `love.txt`, `relationship.txt`, `vanhan.txt`, `src/lib/logic/love/prompt.ts`, `src/lib/logic/relationship/prompt.ts`

Thay thế: dùng dấu phẩy, dấu chấm phẩy, hoặc viết lại câu.

### 8.2 Marker `[KTLUẬN]` — Khung Kết Luận Đỏ

Đặt ở cuối mỗi **phần chính** (section lớn). Format:
```
[KTLUẬN] Nội dung kết luận ngắn gọn, khoảng 2-4 câu.
```
- Áp dụng cho: career, love, synastry, vanhan
- Render thành `<div class="red-box">` — border đỏ 1.5pt, nền `#fff5f5`, font bold 16.5pt
- `page-break-inside: avoid` — không bao giờ bị cắt giữa trang

### 8.3 Marker `[KTTIỂU]` — Khung Kết Luận Tiểu Mục (Vanhan)

Đặt ở cuối các **tiểu mục** của Vận Hạn (sections 2/3/4/6 — các section đa tiểu mục). Format:
```
[KTTIỂU] Nội dung kết luận tiểu mục.
```
- Render thành `<div class="mini-box">` — border đỏ 1.2pt, nền `#fef9f9`, font 15.5pt
- `page-break-inside: avoid`
- Section 1 (Tổng Quan) và Section 6 (Sức Khỏe) của Vanhan: dùng `[KTLUẬN]`, không phải `[KTTIỂU]`

### 8.4 Subheading

Dòng kết thúc bằng `:` và `length < 90` → tự động được detect là subheading → render `<h3 class="subheading">`.

Prompt nên hướng dẫn AI viết subheading theo format này (ví dụ: `Lỗi Tính Cách Của Chị Liên:`).

### 8.5 Không Dùng Markdown

AI output không được chứa `**bold**`, `# heading`, `---`, backtick. `cleanForPdf()` sẽ strip nhưng tốt hơn là không có.

---

## 9. Cấu Trúc Cover Page

```
[spacer flex]
  [cover-line đỏ]
  [cover-title] — tên loại báo cáo, font MontserratBold 32.9pt đỏ
  [cover-line đỏ]
  [cover-name] — tên nhân vật, GreatVibes 50.8pt (single)
               — hoặc [cover-name-sm] 38.9pt + "&" + [cover-name-sm] (synastry)
  [cover-sub]  — Ngày sinh: DD/MM/YYYY
  [cover-sub]  — Giờ sinh: HH:MM (optional)
[spacer flex]
[cover-footer] — "Hạt Giống Chiêm Tinh"
```

`page-break-after: always` → cover luôn là trang 1 riêng biệt.

---

## 10. PDF Storage & Download

- **Lưu tại:** `/var/hgct/pdfs/{uuid}.pdf` (persistent, tạo bởi `deploy.sh`)
- **API:** `GET /api/pdf/[id]?filename=...` — đọc file, trả về với `Content-Disposition: attachment`
- **Filename:** query param `?filename=` — dùng RFC 5987 UTF-8 encoding, hỗ trợ tiếng Việt
- **Security:** validate UUID format trước khi đọc file (chống path traversal)
- **Demo:** `/var/hgct-demo/pdfs/` — cùng cơ chế

---

## 11. Known Issues & Fixes History

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Blank page xuất hiện | Trailing `.spacer` divs đẩy group vượt page boundary → kết hợp `page-break-before: always` tạo trang trắng | Strip trailing spacers trước khi render |
| Section heading wrap 2 dòng | Heading quá dài so với content width | JS heading resize — giảm font-size đồng loạt |
| Orphan lines (≤3 dòng đầu trang) | Paragraph quá dài tràn trang | Global line-height compression + per-element orphans/widows CSS |
| Subheading widow (subheading cô lập cuối trang) | `break-after: avoid` không đủ khi content sau quá lớn; JS detection dùng `shBottom` bị `Math.ceil` round lên trang sai | Fix `wouldBeWidow()` dùng `shTop` + `Math.floor+1` |
| XUNG ĐỘT/HÒA HỢP widow | h2 heading không số, nằm giữa section, h3 subheading sau bị đẩy sang trang | Move h2 sang trang mới (không phải subheading) |
| Em dash trong output | Prompt templates có dấu `—`, AI bắt chước | Xóa `—` khỏi tất cả prompt templates |
| max_tokens 16k cắt Vận Hạn | Transit cần ~22900 tokens | Tăng `max_tokens: 32000` |
| Subheading rỗng (absent body) | AI viết subheading nhưng body toàn absent phrases | `cleanForPdf()` detect và bỏ cả subheading lẫn body |
| red-box/mini-box bị cắt giữa trang | Không có page-break-inside: avoid | Thêm CSS `page-break-inside: avoid; break-inside: avoid` |

---

## 12. Khi Thêm Element Type Mới

Checklist:
1. Thêm vào `classifyLine()` — điều kiện detect
2. Thêm vào `switch(kind)` trong `buildHtml()` — render HTML
3. Thêm CSS class với styles phù hợp
4. Nếu element có `page-break-inside: avoid`: thêm vào `spaceNeededFor()` trong JS (detect bằng className)
5. Nếu element là block lớn: cân nhắc `page-break-inside: avoid` trong CSS
6. Update `BODY_SEL` và/hoặc `OW_SEL` trong JS nếu element cần tham gia orphan/widow detection

---

## 13. Debug PDF

Log trong `page.evaluate` được forward ra console Node.js qua:
```javascript
page.on('console', msg => console.log('[PDF-JS]', msg.text()))
```

Các log có prefix:
- `[heading-wrap]` — heading nào đang bị wrap, scrollWidth vs clientWidth
- `[heading-resize]` → font đang được giảm xuống mấy px
- `[heading-final]` — kết quả cuối sau resize
- `[orphan-found]` — element nào có orphan, overflow bao nhiêu px
- `[orphan-compress]` → iter & lh hiện tại
- `[orphan-done]` — stable ở lh bao nhiêu
- `[ow]` — per-element: lineCount, widows, orphans
- `[xd-widow]` / `[xd-ok]` — XUNG ĐỘT/HÒA HỢP fix result
- `[sh-orphan]` / `[sh-ok]` — subheading widow fix result
