# Ý tưởng Update Email Template — Round 2

> **Lưu ý quan trọng:** Đây là ý tưởng update dựa trên screenshot review sau khi đã apply round 1. Hãy check lại trong dự án thực tế (`~/hgct`) để xác nhận:
> 1. Tìm file email template (grep "Xin chào" hoặc "HẠT GIỐNG CHIÊM TINH" trong project).
> 2. Xác nhận cách template render tên khách — biến nào, có logic phân biệt Natal/Synastry/Transit/Hướng Nghiệp không?
> 3. Xác nhận template Synastry (Cặp Đôi) — tên 2 người đang render thế nào? Cùng 1 element hay tách riêng?
> 4. Xác nhận width container email hiện tại (px).
> 5. Nếu có gì không khớp với mô tả bên dưới, hỏi lại trước khi sửa.

---

## Vấn đề 1: Disclaimer text dưới © 2026 quá tối

### Hiện trạng
- Dòng "Kết quả chiêm tinh mang tính tham khảo, không thay thế lời khuyên chuyên nghiệp." có màu text quá tối, gần như lẫn vào background, khó đọc.

### Yêu cầu
- Tăng độ sáng màu text của phần disclaimer lên. Hiện tại có vẻ đang ở khoảng `rgba(255,255,255,0.3)` hoặc tương đương — tăng lên khoảng `rgba(255,255,255,0.5)` hoặc `#999` level, đủ đọc nhưng vẫn muted so với body text.
- Dòng "HẠT GIỐNG CHIÊM TINH © 2026" cũng tương tự — tăng sáng lên cùng mức hoặc hơi sáng hơn disclaimer 1 chút.

---

## Vấn đề 2: "Cần hỗ trợ?" hơi cụt + email cần nổi hơn

### Hiện trạng
- Câu "Cần hỗ trợ? support@hatgiongchiemtinh.com" đã ngắn gọn nhưng hơi cụt và thiếu thân thiện.

### Yêu cầu
- Sửa lại thân thiện hơn, vẫn chỉ 1 dòng. Gợi ý:
  - `Cần hỗ trợ? Liên hệ support@hatgiongchiemtinh.com`
  - Hoặc: `Bạn cần hỗ trợ? Liên hệ support@hatgiongchiemtinh.com`
  - Chọn câu nào fit 1 dòng trên mobile width, ưu tiên thân thiện.
- **Email address cho to hơn 1 chút** so với text xung quanh. Ví dụ nếu text thường là 14px thì email link có thể 15-16px, hoặc dùng `font-weight: 600` để nổi bật. Email là thông tin quan trọng nhất trong câu này — cần dễ thấy, dễ tap.

---

## Vấn đề 3: "Xin chào," và dòng mô tả loại báo cáo quá bé

### Hiện trạng
- Sau round 1, "Xin chào," đã tách riêng dòng — tốt. Nhưng hiện tại nó quá bé, mất đi cảm giác chào đón.
- Dòng italic mô tả bên dưới tên khách (ví dụ "Con đường sự nghiệp trong bản đồ sao của bạn", "Bản đồ tình yêu và duyên số của bạn") cũng quá bé, khó đọc.

### Yêu cầu
- **"Xin chào,"**: Tăng font-size lên đáng kể — không cần to bằng tên khách, nhưng phải dõng dạc, thân thiện. Nếu tên khách đang ~24-28px thì "Xin chào," nên ở khoảng 18-20px, regular weight. Cảm giác mong muốn: như người bạn chào đón, không phải caption bé tí.
- **Dòng mô tả loại báo cáo** (italic line dưới tên): Tăng lên khoảng 14-15px (nếu đang ~12px). Vẫn giữ italic, vẫn muted color, nhưng phải readable.
- Cả "Xin chào," phải luôn nằm trên 1 dòng — dùng `white-space: nowrap`. (Câu này ngắn nên không lo, nhưng đề phòng.)

---

## Vấn đề 4: Tên khách — cần to hơn + logic adaptive sizing

### Hiện trạng
- Tên khách đang hơi bé so với không gian có sẵn. Ví dụ "Đỗ Hoàng Quân" chỉ chiếm ~60% width, trông lạc lõng.
- Ngược lại, trong báo cáo Cặp Đôi (Synastry), "Nguyễn Phương Liên & Nguyễn Trung Thành" thì lại quá dài.

### Yêu cầu cho Natal / Transit / Hướng Nghiệp (1 tên)

- **Base concept**: Tên khách nên chiếm gần hết chiều rộng content area (~90% width của container, trừ padding 2 bên).
- **Logic sizing**:
  1. Đặt 1 `max-width` cố định cho tên = khoảng 90% container width (ví dụ nếu container content area là 480px thì max-width tên = ~430px).
  2. Font-size mặc định to (ví dụ 28-30px bold).
  3. Nếu text vượt quá max-width ở font-size mặc định → **co font-size lại** để fit 1 dòng. Cách implement tùy template engine:
     - **Nếu là raw HTML email**: Khó làm dynamic font-size. Thay vào đó, dùng approach: set font-size mặc định lớn + `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` để đảm bảo luôn 1 dòng. Tên quá dài sẽ bị cắt bằng "..." — chấp nhận được vì rất hiếm tên dài quá.
     - **Nếu template engine hỗ trợ logic** (ví dụ server-side render trước khi gửi): Tính `tên.length` rồi map sang font-size:
       - ≤ 12 chars → 30px
       - 13-18 chars → 26px
       - 19-25 chars → 22px
       - > 25 chars → 18px
     - Đây là heuristic, cần test với font thực tế. Chọn approach phù hợp với tech stack hiện tại.
  4. Luôn có `white-space: nowrap` làm safety net.

### Yêu cầu cho Synastry / Cặp Đôi (2 tên)

Hiện tại 2 tên đang nằm trên cùng 1 dòng nối bằng "&". Với tên ngắn thì OK, tên dài thì bể layout.

- **Sửa lại layout**: 2 tên nên hiển thị **song song trên 2 dòng riêng**, cách nhau bằng dấu "&" ở giữa hoặc ký hiệu tương đương. Cấu trúc mong muốn:
  ```
  Nguyễn Phương Liên
          &
  Nguyễn Trung Thành
  ```
  - Mỗi tên trên 1 dòng riêng, căn giữa (text-align: center).
  - Dấu "&" ở giữa, font-size nhỏ hơn tên, color có thể dùng accent color của report type (màu tím cho Synastry).
  - Hoặc nếu design cho phép, dùng icon/symbol thay "&" (ví dụ ✦ hoặc đơn giản là `&`).

- **Logic sizing cho Synastry**: Cả 2 tên phải có **cùng font-size** — sync với nhau. Logic:
  1. Tìm tên dài hơn trong 2 tên.
  2. Áp dụng cùng logic sizing như trên (map chars → font-size) dựa trên tên dài nhất.
  3. Cả 2 tên đều dùng font-size đó → đảm bảo visual balance.
  4. Ví dụ: Tên A = "Liên" (4 chars), Tên B = "Nguyễn Trung Thành" (18 chars) → cả 2 dùng 26px (theo tên B).
  - **Nếu không hỗ trợ dynamic sizing**: Dùng font-size cố định nhỏ hơn default (ví dụ 24px thay vì 30px) vì Synastry luôn có 2 tên → khả năng tên dài cao hơn. Kết hợp `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` cho mỗi dòng tên.

---

## Tóm tắt thứ tự ưu tiên

1. **Disclaimer text sáng lên** — quick CSS fix
2. **"Cần hỗ trợ?" thân thiện hơn + email nổi hơn** — copy + CSS fix
3. **"Xin chào," + dòng mô tả to lên** — CSS fix
4. **Tên khách to + adaptive sizing** — phức tạp hơn, cần check template engine
5. **Synastry 2 tên tách dòng + sync sizing** — cần sửa cả layout lẫn logic

---

## Lưu ý khi implement

- Test trên mobile width 320px và 375px.
- Kiểm tra cả 4 loại báo cáo: Natal (Tình Duyên), Synastry (Cặp Đôi), Transit (Vận Hạn), Career (Hướng Nghiệp).
- Accent color mỗi loại khác nhau (hồng, tím, xanh dương, vàng) — đảm bảo tên khách dùng đúng accent color tương ứng.
- Giữ nguyên mọi thứ khác không đề cập ở đây.
