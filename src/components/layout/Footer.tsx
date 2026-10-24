// Footer — AstroS rebrand. Nền navy (section nhấn tối, theo mockup). 3 cột:
// ASTRO S / Dịch vụ / Hỗ trợ + newsletter + social + copyright. Giữ cố định (PRD §4.0).

import Link from 'next/link'

const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'ASTRO S',
    links: [
      { label: 'Về chúng tôi', href: '#' },
      { label: 'Sứ mệnh', href: '#' },
      { label: 'Đội ngũ', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Tuyển dụng', href: '#' },
    ],
  },
  {
    title: 'Dịch vụ',
    links: [
      { label: 'Sự nghiệp & Tiền bạc', href: '/services?type=career' },
      { label: 'Tình duyên cá nhân', href: '/services?type=love' },
      { label: 'Mối quan hệ cặp đôi', href: '/services?type=synastry' },
      { label: 'Vận hạn', href: '/services?type=transit' },
      { label: 'Lá số cá nhân', href: '/#lap-la-so' },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { label: 'Hướng dẫn sử dụng', href: '#' },
      { label: 'Câu hỏi thường gặp', href: '#' },
      { label: 'Chính sách bảo mật', href: '/privacy' },
      { label: 'Điều khoản sử dụng', href: '/terms' },
      { label: 'Liên hệ', href: 'mailto:support@hatgiongchiemtinh.com' },
    ],
  },
]

const SOCIALS: { label: string; href: string; icon: string }[] = [
  { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=100088832813772', icon: 'f' },
  { label: 'Instagram', href: '#', icon: '◎' },
  { label: 'TikTok', href: '#', icon: '♪' },
  { label: 'YouTube', href: '#', icon: '▶' },
]

export default function Footer() {
  return (
    <footer style={{ background: '#063755', color: 'var(--as-text-on-dark)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand + newsletter */}
          <div className="md:col-span-4">
            <div className="flex items-center gap-2.5 mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-notext.png" alt="AstroS" width={40} height={40}
                   style={{ height: 40, width: 'auto' }} />
              <span style={{ fontFamily: 'var(--font-cinzel)', color: 'var(--as-champagne)', fontSize: '1.25rem', fontWeight: 600, letterSpacing: '0.2em' }}>
                ASTRO S
              </span>
            </div>
            <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-gold-cream)', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
              Khai mở chính mình
            </p>

            {/* Newsletter */}
            <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-text-on-dark)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>
              Đăng ký nhận bản tin
            </p>
            <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-gold-cream)', fontSize: '0.78rem', lineHeight: 1.5, marginBottom: '0.7rem', opacity: 0.9 }}>
              Nhận những thông tin chiêm tinh mới nhất và ưu đãi đặc biệt từ Astro S.
            </p>
            <form className="flex gap-2 max-w-xs" action="#">
              <input
                type="email"
                placeholder="Email của bạn"
                aria-label="Email nhận bản tin"
                style={{
                  flex: 1, background: 'rgba(247,236,217,0.08)', border: '1px solid var(--as-border-gold)',
                  borderRadius: '8px', padding: '0.55rem 0.8rem', color: 'var(--as-text-on-dark)', fontSize: '0.85rem',
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'var(--as-cta)', color: 'var(--as-text-on-dark)', border: 'none',
                  borderRadius: '8px', padding: '0 1rem', fontFamily: 'var(--font-vietnam)', fontWeight: 600,
                  fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                Đăng ký
              </button>
            </form>

            {/* Social */}
            <div className="flex gap-3 mt-5">
              {SOCIALS.map(s => (
                <a key={s.label} href={s.href} title={s.label} aria-label={s.label}
                   style={{
                     width: 36, height: 36, borderRadius: '50%', display: 'inline-flex',
                     alignItems: 'center', justifyContent: 'center', border: '1px solid var(--as-border-gold)',
                     color: 'var(--as-champagne)', textDecoration: 'none', fontSize: '0.95rem',
                   }}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* 3 cột link */}
          {COLS.map(col => (
            <div key={col.title} className="md:col-span-2 lg:col-span-2 md:col-start-auto">
              <h3 style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-champagne)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '1rem' }}>
                {col.title}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map(l => (
                  <li key={l.label}>
                    <Link href={l.href} className="as-footer-link"
                          style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-gold-cream)', fontSize: '0.85rem', textDecoration: 'none' }}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-7 flex flex-col items-center gap-3"
             style={{ borderTop: '1px solid var(--as-border-soft)' }}>
          <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-2">
            <p style={{ color: 'var(--as-gold-cream)', fontSize: '0.75rem', fontFamily: 'var(--font-vietnam)' }}>
              © 2024 Astro S. All rights reserved.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem' }}>
              <Link href="/privacy" className="as-footer-link" rel="privacy-policy" style={{ color: 'var(--as-gold-cream)', textDecoration: 'none' }}>Chính sách bảo mật</Link>
              <span style={{ color: 'var(--as-text-muted)', margin: '0 0.5rem' }}>·</span>
              <Link href="/terms" className="as-footer-link" style={{ color: 'var(--as-gold-cream)', textDecoration: 'none' }}>Điều khoản sử dụng</Link>
              <span style={{ color: 'var(--as-text-muted)', margin: '0 0.5rem' }}>·</span>
              <a href="https://github.com/thanhnt1021/hgct" target="_blank" rel="noopener noreferrer" className="as-footer-link" style={{ color: 'var(--as-gold-cream)', textDecoration: 'none' }}>Mã nguồn (AGPL)</a>
            </div>
          </div>
          <p style={{ color: 'var(--as-text-muted)', fontSize: '0.72rem', fontFamily: 'var(--font-vietnam)', textAlign: 'center' }}>
            Kết quả chiêm tinh mang tính tham khảo, không thay thế lời khuyên chuyên nghiệp.
          </p>
        </div>
      </div>
    </footer>
  )
}
