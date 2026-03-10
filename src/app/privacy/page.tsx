import Link from 'next/link'

const sections = [
  {
    num: '01',
    title: 'Thông tin chúng tôi thu thập',
    items: [
      'Email và tên hiển thị (qua Google Sign-In hoặc đăng ký thủ công)',
      'Ngày sinh, giờ sinh, nơi sinh (nếu bạn cung cấp để xem bản đồ sao / lá số)',
      'Nội dung bạn lưu trên app (lá số, ghi chú chiêm tinh cá nhân)',
      <>Chúng tôi <span style={{ color: '#e87070', fontWeight: 600 }}>KHÔNG</span> thu thập vị trí GPS, danh bạ, hay dữ liệu khác từ thiết bị</>,
    ],
  },
  {
    num: '02',
    title: 'Cách chúng tôi sử dụng thông tin',
    items: [
      'Xác thực đăng nhập và duy trì phiên làm việc',
      'Tính toán và hiển thị bản đồ sao / thông tin chiêm tinh dựa trên dữ liệu bạn cung cấp',
      'Lưu trữ lá số và ghi chú cá nhân',
      <><span style={{ color: '#e87070', fontWeight: 600 }}>KHÔNG</span> bán, chia sẻ, hay cho bên thứ ba truy cập dữ liệu cá nhân</>,
    ],
  },
  {
    num: '03',
    title: 'Bảo mật dữ liệu',
    items: [
      'Mật khẩu được mã hóa (hashed) trước khi lưu',
      'Kết nối HTTPS',
      'Token xác thực được quản lý an toàn',
    ],
  },
  {
    num: '04',
    title: 'Quyền của bạn',
    items: [
      'Xem, chỉnh sửa, hoặc xóa thông tin cá nhân bất kỳ lúc nào',
      'Xóa tài khoản và toàn bộ dữ liệu',
      'Xuất dữ liệu',
      <>Yêu cầu xóa dữ liệu qua email: <a href="mailto:support@hatgiongchiemtinh.com" style={{ color: '#d9ab55' }}>support@hatgiongchiemtinh.com</a></>,
    ],
  },
  {
    num: '05',
    title: 'Google Sign-In',
    items: [
      'Chỉ yêu cầu email và thông tin profile cơ bản',
      <><span style={{ color: '#e87070', fontWeight: 600 }}>KHÔNG</span> truy cập Gmail, Google Drive, hay dịch vụ Google nào khác</>,
      <>Thu hồi quyền tại <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: '#d9ab55' }}>https://myaccount.google.com/permissions</a></>,
    ],
  },
  {
    num: '06',
    title: 'Cookie',
    items: [
      'Chỉ cookie cần thiết cho đăng nhập (session/auth token)',
      <><span style={{ color: '#e87070', fontWeight: 600 }}>Không</span> cookie theo dõi hay quảng cáo</>,
    ],
  },
  {
    num: '07',
    title: 'Dữ liệu chiêm tinh',
    items: [
      'Ngày sinh, giờ sinh, nơi sinh chỉ dùng để tính lá số',
      'Lưu trữ bảo mật, không chia sẻ bên thứ ba',
      'Xóa bất kỳ lúc nào',
    ],
  },
  {
    num: '08',
    title: 'Thay đổi chính sách',
    items: [
      'Thông báo khi có thay đổi quan trọng',
      'Phiên bản mới nhất luôn tại trang này',
    ],
  },
  {
    num: '09',
    title: 'Liên hệ',
    items: [
      <>Email: <a href="mailto:support@hatgiongchiemtinh.com" style={{ color: '#d9ab55' }}>support@hatgiongchiemtinh.com</a></>,
      <>Website: <a href="https://hatgiongchiemtinh.com" style={{ color: '#d9ab55' }}>hatgiongchiemtinh.com</a></>,
    ],
  },
]

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#06060f' }}>
      <div className="max-w-3xl mx-auto px-4 py-16">

        {/* Back link */}
        <div className="mb-10">
          <Link
            href="/"
            style={{
              color: '#d9ab55',
              fontFamily: 'var(--font-vietnam)',
              fontSize: '0.85rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            ← Quay lại trang chủ
          </Link>
        </div>

        {/* Header */}
        <div className="mb-12 text-center">
          <h1
            style={{
              fontFamily: 'var(--font-cinzel, var(--font-vietnam))',
              fontSize: '2rem',
              fontWeight: 700,
              color: '#d9ab55',
              letterSpacing: '0.06em',
              marginBottom: '0.5rem',
            }}
          >
            Chính Sách Bảo Mật
          </h1>
          <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
            Hạt Giống Chiêm Tinh — hatgiongchiemtinh.com
          </p>
          <p style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.8rem' }}>
            Cập nhật lần cuối: 10/03/2026
          </p>
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {sections.map(section => (
            <div
              key={section.num}
              style={{
                background: 'rgba(18,13,46,0.6)',
                border: '1px solid rgba(200,148,63,0.12)',
                borderRadius: '1rem',
                padding: '1.5rem 1.75rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                <span
                  style={{
                    color: '#c8943f',
                    fontFamily: 'var(--font-vietnam)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    opacity: 0.8,
                  }}
                >
                  {section.num}
                </span>
                <h2
                  style={{
                    color: '#d9ab55',
                    fontFamily: 'var(--font-vietnam)',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                  }}
                >
                  {section.title}
                </h2>
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {section.items.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      color: '#c9c3d6',
                      fontFamily: 'var(--font-vietnam)',
                      fontSize: '0.88rem',
                      lineHeight: 1.7,
                      paddingLeft: '1.1rem',
                      position: 'relative',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '0.55em',
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: '#c8943f',
                        opacity: 0.6,
                        display: 'block',
                      }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p
          style={{
            marginTop: '3rem',
            textAlign: 'center',
            color: '#4a4560',
            fontFamily: 'var(--font-vietnam)',
            fontSize: '0.78rem',
          }}
        >
          © 2026 Hạt Giống Chiêm Tinh. All rights reserved.
        </p>
      </div>
    </div>
  )
}
