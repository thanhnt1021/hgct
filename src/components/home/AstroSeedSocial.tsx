// S4 — Nội dung text (seed) + 3 social. Nền navy (section nhấn tối, theo mockup).

import Link from 'next/link'

const SOCIALS = [
  { name: 'Facebook', icon: 'f', desc: 'Theo dõi các bài viết chiêm tinh hàng ngày, mẹo đọc bản đồ sao và lịch sự kiện.', cta: 'Tham gia ngay', href: 'https://www.facebook.com/profile.php?id=100088832813772' },
  { name: 'TikTok', icon: '♪', desc: 'Video ngắn về 12 cung hoàng đạo, luận giải nhanh & vận hạn theo tuần.', cta: 'Theo dõi ngay', href: '#' },
  { name: 'YouTube', icon: '▶', desc: 'Buổi học chiêm tinh chiều sâu, podcast, workshop và phân tích case thật.', cta: 'Xem ngay', href: '#' },
]

const POINTS = ['Bảo mật tuyệt đối', 'Phân tích chi tiết', 'Định hướng cuộc sống']

export default function AstroSeedSocial() {
  return (
    <section style={{ background: '#063755', color: 'var(--as-text-on-dark)' }}>
      {/* Seed text */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-champagne)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          Hạt Giống Chiêm Tinh
        </p>
        <h2 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-gold-cream)', fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', fontWeight: 600, fontStyle: 'italic', margin: '0.5rem 0 1.25rem' }}>
          Hiểu mình — Đánh thức — Phát triển
        </h2>
        <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-gold-cream)', fontSize: '0.98rem', lineHeight: 1.85, opacity: 0.92 }}>
          Một bản phân tích thực sự đi vào chiều sâu. Không phải những luận giải chung chung, mà là phân tích bản đồ sao chi tiết, cá nhân hóa giúp bạn hiểu rõ bản thân mình. Để từ đó chọn đúng nghề, yêu đúng người và sống đúng hướng. Trải nghiệm đơn giản, nhanh chóng và luôn đảm bảo bảo mật thông tin.
        </p>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6">
          {POINTS.map(p => (
            <span key={p} style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-champagne)', fontSize: '0.85rem', fontWeight: 600 }}>
              ✦ {p}
            </span>
          ))}
        </div>

        <Link href="/services" style={{
          display: 'inline-block', marginTop: '1.75rem', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem',
          fontWeight: 700, color: 'var(--as-text-on-dark)', background: 'var(--as-cta)',
          padding: '0.7rem 1.7rem', borderRadius: '999px', textDecoration: 'none',
        }}>
          Tìm hiểu thêm
        </Link>
      </div>

      {/* Social */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h3 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-gold-cream)', fontSize: 'clamp(1.3rem,2.6vw,1.8rem)', fontWeight: 600, textAlign: 'center', marginBottom: '2rem' }}>
          Kết nối và mở hội cùng AstroS
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {SOCIALS.map(s => (
            <div key={s.name} style={{
              background: '#0a4a66', border: '1px solid var(--as-border-soft)',
              borderRadius: 'var(--as-radius-lg)', padding: '1.5rem',
            }}>
              <div className="flex items-center gap-3 mb-3">
                <span style={{
                  width: 40, height: 40, borderRadius: '50%', display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center', background: 'rgba(203,152,94,0.14)',
                  border: '1px solid var(--as-border-gold)', color: 'var(--as-champagne)', fontSize: '1.05rem',
                }}>{s.icon}</span>
                <span style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-gold-cream)', fontSize: '1.15rem', fontWeight: 600 }}>{s.name}</span>
              </div>
              <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-gold-cream)', fontSize: '0.88rem', lineHeight: 1.6, opacity: 0.9, minHeight: 64 }}>
                {s.desc}
              </p>
              <a href={s.href} style={{
                display: 'inline-block', marginTop: '0.9rem', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem',
                fontWeight: 600, color: 'var(--as-champagne)', border: '1px solid var(--as-border-gold)',
                padding: '0.45rem 1.1rem', borderRadius: '999px', textDecoration: 'none',
              }}>
                {s.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
