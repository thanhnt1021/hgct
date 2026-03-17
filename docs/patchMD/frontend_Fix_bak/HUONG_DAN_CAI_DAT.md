# Hướng dẫn tích hợp giao diện Trang chủ Hạt Giống Chiêm Tinh

Để mang trọn vẹn 100% giao diện trang chủ hiện tại sang một dự án Next.js khác, bạn cần làm theo các bước sau:

## 1. Cài đặt thư viện bắt buộc
Dự án này sử dụng thư viện icon **Lucide React**. Mở terminal ở dự án mới của bạn và chạy lệnh sau:
```bash
npm install lucide-react
```

## 2. Copy các file vào dự án mới
Bạn hãy giải nén file ZIP này, copy các file bên trong và dán đè/thêm vào dự án Next.js (sử dụng App Router) mới của bạn theo đúng cấu trúc thư mục:

### Thư mục `app/`
*   `app/page.tsx`: Chứa nội dung chữ, bố cục chính của trang chủ.
*   `app/globals.css`: Chứa toàn bộ mã màu tùy chỉnh, các class CSS tự viết cho nút bấm, thẻ dịch vụ, và các hiệu ứng phát sáng.
*   `app/layout.tsx`: Chứa cấu hình 3 Font chữ (Be Vietnam Pro, Playfair Display, Cinzel) và ghép nối nền sao, thanh điều hướng, chân trang.

### Thư mục `components/`
*   `components/StarField.tsx`: Code vẽ bầu trời sao lấp lánh và các quầng sáng (nebula) chuyển động ở background.
*   `components/Navbar.tsx`: Thanh điều hướng trên cùng (hiện tại chỉ có Logo).
*   `components/Footer.tsx`: Phần chân trang.
*   `components/FloatingButtons.tsx`: 2 nút chat Zalo và Messenger trôi nổi ở góc phải màn hình.

## 3. Lưu ý thêm
*   Đảm bảo dự án Next.js mới của bạn đã được cài đặt và cấu hình **Tailwind CSS**.
*   Các file này sử dụng alias `@/components/...` để import. Hãy chắc chắn file `tsconfig.json` trong dự án mới của bạn có cấu hình alias `@/*` trỏ về thư mục gốc (mặc định khi tạo Next.js app mới đều có sẵn).
