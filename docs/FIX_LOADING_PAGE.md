# FIX LOADING PAGE: BỎ LIST 5 CÂU, HIỆN ĐẦY ĐỦ TRÊN THANH PROGRESS

---

## CONTEXT

Đây là trang loading sau khi khách hàng thanh toán xong, đang chờ hệ thống generate báo cáo PDF.

Trang hiện tại có:
- Tiêu đề "Cảm ơn bạn đã tin tưởng!"
- Thanh progress bar vàng gold với text ngắn phía trên (vd: "Vũ trụ đang kết nối...", "Đang giải mã các chòm sao...")
- Phần trăm % bên phải
- **5 câu motivational list bên dưới progress bar**, mỗi câu sáng lên khi progress đạt đến % tương ứng (có icon checkmark/diamond)
- Nút "Đóng & về lịch sử"
- Nút "Hủy báo cáo"

---

## YÊU CẦU THAY ĐỔI

### Bỏ
- Bỏ hoàn toàn phần **list 5 câu** bên dưới thanh progress bar
- Bỏ các icon checkmark, diamond bên cạnh mỗi câu
- Bỏ hiệu ứng fade-in/sáng dần theo % cho từng câu

### Thay đổi
- Text phía trên thanh progress bar (hiện đang ngắn gọn như "Vũ trụ đang kết nối...", "Đang giải mã các chòm sao...") sẽ được **thay bằng câu đầy đủ** từ danh sách 5 câu
- Mỗi khi progress đạt đến ngưỡng % tiếp theo, text trên bar **chuyển sang câu tiếp theo** (fade transition nhẹ)
- Chỉ hiển thị **1 câu tại 1 thời điểm**, không list

### Giữ nguyên
- Thanh progress bar vàng gold + phần trăm %
- Tiêu đề, emoji, tên khách hàng
- Nút "Đóng & về lịch sử" và thông báo gửi email
- Nút "Hủy báo cáo"
- Thời gian dự kiến "4-5 phút"

---

## HÀNH VI MỚI

```
0-20%   → Câu 1 (đầy đủ) hiện trên thanh bar
20-40%  → Câu 2 (đầy đủ) thay thế câu 1, fade transition
40-60%  → Câu 3
60-80%  → Câu 4
80-100% → Câu 5
```

Transition giữa các câu: fade-out câu cũ (300ms), fade-in câu mới (300ms). Không cần phức tạp hơn.

---

## GỢI Ý TÌM CODE

```bash
# [ASK] Tìm file chứa trang loading này:
grep -rn "Vũ trụ đang kết nối\|Đang giải mã\|tin tưởng\|Cảm ơn bạn" src/ --include="*.tsx" --include="*.ts"

# [ASK] Tìm danh sách 5 câu motivational:
grep -rn "mảnh ghép\|ngẫu nhiên\|can đảm\|chòm sao" src/ --include="*.tsx" --include="*.ts"

# [ASK] Tìm logic chuyển câu theo %:
grep -rn "progress\|percent\|phase\|step" src/ --include="*.tsx" --include="*.ts" | grep -i "loading\|wait\|generat"
```

---

## LAYOUT SAU KHI SỬA

```
┌─────────────────────────────────────────────┐
│  Cảm ơn bạn đã tin tưởng!                  │
│  💝 Vũ trụ đang biên soạn luận giải ...    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │  "Có lẽ bạn đã đi qua nhiều       │    │
│  │   điều... và hôm nay, bạn chọn     │    │
│  │   dừng lại để hiểu chính mình      │    │
│  │   hơn một chút."            42%    │    │
│  │  ████████████░░░░░░░░░░░░░░░░░     │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Bạn có thể đóng trang này - báo cáo sẽ   │
│  tự động gửi vào email khi hoàn thành       │
│        [ Đóng & về lịch sử → ]              │
│                                             │
│  Dự kiến hoàn thành trong khoảng 4-5 phút  │
│           [ Hủy báo cáo ]                   │
└─────────────────────────────────────────────┘
```

Gọn hơn, không có list dài bên dưới. Câu motivational vẫn hiện nhưng tích hợp ngay trên thanh bar.

---

## STYLE CHO TEXT TRÊN BAR

- Font size: giữ tương tự text hiện tại hoặc lớn hơn chút (vì câu dài hơn)
- Màu: gold/vàng đồng (cùng tông với thanh bar, ~#c9a84c)
- Có thể dùng italic cho câu motivational để phân biệt với text thông thường
- Nếu câu dài quá 2 dòng, giảm font-size nhẹ hoặc cho phép wrap 2 dòng
