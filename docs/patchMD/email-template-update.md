# Ý tưởng Update Email Template — Báo cáo Hướng Nghiệp

> **Lưu ý quan trọng:** Đây là ý tưởng update dựa trên screenshot review. Hãy check lại trong dự án thực tế (`~/hgct`) để xác nhận:
> 1. File email template nằm ở đâu? (có thể là trong thư mục kiểu `emails/`, `templates/`, hoặc trong code Next.js API route gửi email). Tìm file chứa "HẠT GIỐNG CHIÊM TINH" hoặc "Báo cáo hướng nghiệp" hoặc "hatgiongchiemtinh.com" trong nội dung HTML email.
> 2. Email đang dùng inline CSS hay có hệ thống template riêng (React Email, MJML, raw HTML)?
> 3. Font hiện tại đang dùng là gì? Có web font nào được import trong email không? (Lưu ý: email client hỗ trợ font rất hạn chế — cần fallback stack tốt).
> 4. Biến template cho tên khách đang dùng format gì? (ví dụ `{{name}}`, `${name}`, hay JSX `{name}`?)
> 5. Template này có dùng chung cho nhiều loại báo cáo (Natal, Synastry, Transit, Hướng Nghiệp...) hay mỗi loại có template riêng?
> 6. Có responsive breakpoint hay width cố định không? Width hiện tại của email container là bao nhiêu?
>
> Sau khi xác nhận các thông tin trên, áp dụng các thay đổi bên dưới.

---

## Vấn đề 1: "HẠT GIỐNG CHIÊM TINH" bị xuống 2 dòng + font cứng

### Hiện trạng
- Tên brand "HẠT GIỐNG CHIÊM TINH" đang bị wrap thành 2 dòng trên mobile (dòng 1: "HẠT GIỐNG CHIÊM", dòng 2: "TINH").
- Font đang có vẻ là serif nặng hoặc sans-serif cứng, nhìn formal quá mức cần thiết.

### Yêu cầu
- **Ép 1 dòng**: Dùng `white-space: nowrap` cho phần tử chứa tên brand. Nếu cần, giảm `font-size` để fit trong container width trên mobile (khoảng 300-350px usable width).
- **Chọn font mềm hơn**: Check trong hệ thống hiện tại (cả trong email template lẫn web font đang dùng ở website chính) xem có font nào đang available. Yêu cầu: **KHÔNG phải kiểu script/cursive uốn lượn**, nhưng mềm mại hơn font hiện tại. Các hướng phù hợp:
  - Nếu project đang dùng Google Fonts: xem xét **Cormorant Garamond** (elegant serif nhưng mềm), **Playfair Display** (classic nhưng graceful), hoặc **Crimson Pro** (readable serif, nhẹ nhàng).
  - Fallback cho email: `Georgia, 'Times New Roman', serif` (Georgia mềm hơn Times đáng kể).
  - Lưu ý: Nhiều email client không support web fonts. Phải có fallback stack tốt. Nếu dùng web font thì wrap trong `@import` hoặc `<link>` nhưng luôn có fallback.
- **Font size**: Điều chỉnh để brand name fit 1 dòng ở width ~320px. Có thể cần giảm từ size hiện tại xuống khoảng 22-26px tùy font, hoặc dùng `letter-spacing` âm nhẹ nếu cần.

---

## Vấn đề 2: "Xin chào, **Tên khách**" bị xuống dòng xấu

### Hiện trạng
- "Xin chào," và tên khách (ví dụ "Đỗ Hoàng Quân") đang cùng 1 block nhưng tên bị đẩy xuống dòng giữa chừng, tạo layout lệch.
- Với tên dài hơn (ví dụ "Nguyễn Thị Thanh Hằng") sẽ còn tệ hơn.

### Yêu cầu
- **Tách thành 2 dòng có chủ đích**:
  - Dòng 1: `Xin chào,` (font size nhỏ hơn, regular weight)
  - Dòng 2: `{Tên khách}` (font size lớn hơn, bold/semibold, là focus chính)
- **Cơ chế only-1-line cho tên khách**: Tên khách phải luôn nằm trên 1 dòng duy nhất. Implement bằng cách:
  - `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` — đây là fallback an toàn nhất cho email.
  - Nếu template engine hỗ trợ, có thể dùng `font-size` responsive: bắt đầu từ size lớn (ví dụ 28px), nếu tên > 15 ký tự thì giảm xuống 24px, > 20 ký tự thì 20px. Nhưng cái này tuỳ thuộc template engine có hỗ trợ logic không — check trước.
  - Tối thiểu phải có `white-space: nowrap` + `text-overflow: ellipsis` để đảm bảo không bao giờ wrap.
- **Font cho tên khách**: Xem xét dùng font mềm hơn cho tên khách nếu hiện tại đang dùng font quá cứng. Tên người cần warm & readable. Gợi ý: nếu brand name dùng serif thì tên khách có thể dùng cùng font hoặc 1 sans-serif mềm (như system font stack `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`).

---

## Vấn đề 3: Câu liên hệ bị xuống dòng trước email

### Hiện trạng
- Câu hiện tại: "Nếu bạn có câu hỏi hoặc cần hỗ trợ, vui lòng liên hệ:" rồi xuống dòng mới hiện email. Chữ "hệ:" bị tách xuống dòng riêng trước link email → xấu.

### Yêu cầu
- **Viết lại ngắn gọn hơn**, fit 1 dòng trên mobile width (~300px). Gợi ý:
  - `Liên hệ hỗ trợ: support@hatgiongchiemtinh.com`
  - Hoặc: `Hỗ trợ: support@hatgiongchiemtinh.com`
  - Hoặc nếu muốn giữ tone thân thiện hơn: `Cần hỗ trợ? support@hatgiongchiemtinh.com`
- Đảm bảo email link có `mailto:` href.
- Dùng `white-space: nowrap` cho cả dòng này nếu nó đủ ngắn, hoặc ít nhất wrap label + email vào cùng 1 inline element có `nowrap`.

---

## Vấn đề 4: Dòng disclaimer dưới © 2026

### Hiện trạng
- Câu: "Kết quả chiêm tinh mang tính tham khảo, không thay thế lời khuyên chuyên nghiệp." đang bị wrap xấu trên mobile.

### Yêu cầu
- **Phương án A (ưu tiên)**: Ngắt dòng có chủ đích tại dấu phẩy:
  ```
  Kết quả chiêm tinh mang tính tham khảo,
  không thay thế lời khuyên chuyên nghiệp.
  ```
  Dùng `<br>` sau dấu phẩy để control line break, thay vì để client tự wrap.
- **Phương án B**: Nếu muốn 1 dòng — giảm font-size của disclaimer xuống nhỏ hơn (khoảng 11-12px) và dùng `white-space: nowrap`. Nhưng cần test trên mobile width ~320px.
- Font disclaimer: giữ nhỏ, màu nhạt (muted), italic nếu phù hợp với design language hiện tại.

---

## Lưu ý chung khi implement

- **Email client compatibility**: Tránh dùng CSS quá phức tạp. Inline style là an toàn nhất. Nếu project đang dùng CSS class thì check xem có bước inline CSS trước khi gửi không (nhiều email service tự làm việc này).
- **Test width**: Email trên mobile thường render ở khoảng 320-375px. Test cả 2 edge case.
- **Dark mode**: Screenshot cho thấy email đang dùng dark theme (nền tối). Đảm bảo font color vẫn readable trên cả light mode nếu email client override.
- **Không thay đổi structure/logic khác**: Chỉ fix 4 vấn đề trên. Không refactor layout tổng thể hay đổi nội dung body text.
