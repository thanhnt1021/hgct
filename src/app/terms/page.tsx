import Link from 'next/link'

const sections = [
  {
    num: '01',
    title: 'Chấp nhận điều khoản',
    items: [
      'Sử dụng website đồng nghĩa với việc bạn đồng ý với các điều khoản này',
      'Nếu không đồng ý, vui lòng ngừng sử dụng dịch vụ',
    ],
  },
  {
    num: '02',
    title: 'Mô tả dịch vụ',
    items: [
      'AstroS là nền tảng chiêm tinh trực tuyến',
      'Cung cấp công cụ tính toán bản đồ sao, lá số và thông tin chiêm tinh',
      'Dịch vụ được cung cấp theo hình thức "as is" (nguyên trạng)',
    ],
  },
  {
    num: '03',
    title: 'Tài khoản',
    items: [
      'Bạn chịu trách nhiệm bảo mật thông tin đăng nhập của mình',
      'Mỗi tài khoản chỉ dành cho một người sử dụng',
      'Thông tin đăng ký phải chính xác và cập nhật',
    ],
  },
  {
    num: '04',
    title: 'Nội dung của bạn',
    items: [
      'Bạn sở hữu toàn bộ dữ liệu và ghi chú cá nhân trên tài khoản của mình',
      'Chúng tôi không đọc, phân tích, hay sử dụng nội dung cá nhân cho mục đích khác',
      'Không sử dụng website cho các mục đích bất hợp pháp hoặc vi phạm pháp luật',
    ],
  },
  {
    num: '05',
    title: 'Tuyên bố miễn trừ về chiêm tinh',
    items: [
      'Thông tin chiêm tinh chỉ mang tính tham khảo và giải trí',
      'Không thay thế tư vấn y tế, tài chính, hay pháp lý từ chuyên gia',
      'Chúng tôi không chịu trách nhiệm cho các quyết định được đưa ra dựa trên thông tin chiêm tinh',
    ],
  },
  {
    num: '06',
    title: 'Giới hạn trách nhiệm',
    items: [
      'Chúng tôi cố gắng duy trì dịch vụ ổn định nhưng không đảm bảo 100% uptime',
      'Không chịu trách nhiệm cho việc mất dữ liệu do sự cố nằm ngoài tầm kiểm soát',
      'Khuyến khích người dùng tự backup dữ liệu quan trọng',
    ],
  },
  {
    num: '07',
    title: 'Sở hữu trí tuệ',
    items: [
      'Toàn bộ nội dung, thiết kế và mã nguồn thuộc quyền sở hữu của AstroS',
      'Không sao chép, phân phối hay tái sử dụng khi chưa có sự đồng ý bằng văn bản',
    ],
  },
  {
    num: '08',
    title: 'Thay đổi điều khoản',
    items: [
      'Chúng tôi có thể cập nhật điều khoản và sẽ thông báo qua website',
      'Tiếp tục sử dụng dịch vụ sau khi có thay đổi đồng nghĩa với việc chấp nhận điều khoản mới',
    ],
  },
  {
    num: '09',
    title: 'Chấm dứt',
    items: [
      'Bạn có thể ngừng sử dụng và xóa tài khoản bất kỳ lúc nào',
      'Chúng tôi có thể đình chỉ hoặc xóa tài khoản vi phạm điều khoản sử dụng',
    ],
  },
  {
    num: '10',
    title: 'Liên hệ',
    items: [
      <>Email: <a href="mailto:support@hatgiongchiemtinh.com" style={{ color: 'var(--as-cta)' }}>support@hatgiongchiemtinh.com</a></>,
      <>Website: <a href="https://hatgiongchiemtinh.com" style={{ color: 'var(--as-cta)' }}>hatgiongchiemtinh.com</a></>,
    ],
  },
]

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #edd5b1 0%, #e3c89a 100%)' }}>
      <div className="max-w-3xl mx-auto px-4 py-16">

        {/* Back link */}
        <div className="mb-10">
          <Link
            href="/"
            style={{
              color: 'var(--as-cta)',
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
              fontFamily: 'var(--font-playfair)',
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--as-text-strong)',
              letterSpacing: '0.06em',
              marginBottom: '0.5rem',
            }}
          >
            Điều Khoản Sử Dụng
          </h1>
          <p style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
            AstroS — hatgiongchiemtinh.com
          </p>
          <p style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', fontSize: '0.8rem' }}>
            Cập nhật lần cuối: 10/03/2026
          </p>
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {sections.map(section => (
            <div
              key={section.num}
              style={{
                background: 'var(--as-surface)',
                border: '1px solid var(--as-border-soft)',
                borderRadius: '1rem',
                padding: '1.5rem 1.75rem',
                boxShadow: 'var(--as-shadow-card)',
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
                    color: 'var(--as-text-muted)',
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
                    color: 'var(--as-text-strong)',
                    fontFamily: 'var(--font-playfair)',
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
                      color: 'var(--as-text)',
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
                        background: 'var(--as-cta)',
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
            color: 'var(--as-text-muted)',
            fontFamily: 'var(--font-vietnam)',
            fontSize: '0.78rem',
          }}
        >
          © 2026 AstroS. All rights reserved.
        </p>
      </div>
    </div>
  )
}
