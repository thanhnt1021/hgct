// VISUAL ONLY — footer restyled to Celestial Sanctum design

import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ background: '#02020a', borderTop: '1px solid rgba(200,148,63,0.09)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Top ornament */}
        <div className="flex justify-center mb-8">
          <div className="divider-ornament w-48">
            <span>✦</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-5">
              <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="11" r="2.5" fill="#d9ab55" opacity="0.9"/>
                <circle cx="3"  cy="4"  r="1.2" fill="#d9ab55" opacity="0.55"/>
                <circle cx="19" cy="5"  r="1"   fill="#d9ab55" opacity="0.45"/>
                <circle cx="4"  cy="19" r="1"   fill="#d9ab55" opacity="0.4"/>
                <circle cx="18" cy="18" r="1.3" fill="#d9ab55" opacity="0.5"/>
                <line x1="11" y1="11" x2="3"  y2="4"  stroke="#d9ab55" strokeWidth="0.6" opacity="0.3"/>
                <line x1="11" y1="11" x2="19" y2="5"  stroke="#d9ab55" strokeWidth="0.6" opacity="0.25"/>
                <line x1="11" y1="11" x2="4"  y2="19" stroke="#d9ab55" strokeWidth="0.6" opacity="0.22"/>
                <line x1="11" y1="11" x2="18" y2="18" stroke="#d9ab55" strokeWidth="0.6" opacity="0.28"/>
              </svg>
              <span
                className="font-bold"
                style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '1.15rem', letterSpacing: '0.05em' }}
              >
                Hạt Giống Chiêm Tinh
              </span>
            </div>
            <p
              className="leading-relaxed max-w-xs"
              style={{ color: '#9090a8', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem', lineHeight: 1.8 }}
            >
              Giúp bạn hiểu bản thân sâu hơn qua chiêm tinh học.
              <br />
              Mỗi bản đồ sao là một câu chuyện riêng — chúng tôi giúp bạn đọc nó.
            </p>
          </div>

          {/* Services */}
          <div>
            <h3
              className="mb-5"
              style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em' }}
            >
              Dịch vụ
            </h3>
            <ul className="space-y-3">
              {['Hướng Nghiệp', 'Tình Duyên', 'Cặp Đôi', 'Vận Hạn'].map(s => (
                <li key={s}>
                  <Link href="/services" className="footer-link">{s}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3
              className="mb-5"
              style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em' }}
            >
              Liên hệ
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="mailto:support@hatgiongchiemtinh.com" className="footer-link">
                  support@hatgiongchiemtinh.com
                </a>
              </li>
              <li>
                <a href="https://hatgiongchiemtinh.com" className="footer-link">
                  hatgiongchiemtinh.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div
          className="mt-14 pt-8 flex flex-col items-center gap-3"
          style={{ borderTop: '1px solid rgba(200,148,63,0.07)' }}
        >
          {/* Row 1: copyright + legal links */}
          <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-2">
            <p style={{ color: '#9090a8', fontSize: '0.75rem', fontFamily: 'var(--font-vietnam)' }}>
              © 2026 Hạt Giống Chiêm Tinh. All rights reserved.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem' }}>
              <Link href="/privacy" className="footer-link" rel="privacy-policy">Chính sách bảo mật</Link>
              <span style={{ color: '#4a4560', margin: '0 0.5rem' }}>·</span>
              <Link href="/terms" className="footer-link">Điều khoản sử dụng</Link>
            </div>
          </div>
          {/* Row 2: disclaimer */}
          <p style={{ color: '#8878b8', fontSize: '0.72rem', fontFamily: 'var(--font-vietnam)', textAlign: 'center' }}>
            Kết quả chiêm tinh mang tính tham khảo, không thay thế lời khuyên chuyên nghiệp.
          </p>
        </div>
      </div>
    </footer>
  )
}
