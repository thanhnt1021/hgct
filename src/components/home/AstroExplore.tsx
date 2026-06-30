// Cuối S3 — "Khám Phá AstroS": 4 ô dạng INFO/quảng cáo (KHÔNG phải button). Tông sáng.

const ITEMS = [
  { icon: '✦', title: 'Sự nghiệp & Tài chính', desc: 'Định hướng sự nghiệp, tối ưu tài năng và thu hút tài lộc.' },
  { icon: '❤', title: 'Tình duyên cá nhân', desc: 'Bản đồ tình cảm cá nhân: bạn yêu thế nào, cần gì và bài học tình duyên của bạn.' },
  { icon: '☍', title: 'Mối quan hệ cặp đôi', desc: 'So sánh hai bản đồ sao để hiểu sự kết nối, điểm hòa hợp và khác biệt giữa hai bạn.' },
  { icon: '☾', title: 'Vận hạn', desc: 'Dự báo vận hạn, nắm bắt cơ hội và hóa giải thách thức.' },
]

export default function AstroExplore() {
  return (
    <section id="kham-pha" style={{ background: 'transparent', padding: '3.5rem 0' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-text-strong)', fontSize: 'clamp(1.5rem,3vw,2.1rem)', fontWeight: 600, textAlign: 'center', marginBottom: '2.25rem' }}>
          Khám Phá AstroS
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ITEMS.map(it => (
            <div
              key={it.title}
              style={{
                background: 'var(--as-surface)', border: '1px solid var(--as-border-soft)',
                borderRadius: 'var(--as-radius-lg)', padding: '1.5rem', textAlign: 'center',
                boxShadow: 'var(--as-shadow-card)',
              }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: '50%', margin: '0 auto 1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(203,152,94,0.12)', border: '1px solid var(--as-border-gold)',
                color: 'var(--as-cta)', fontSize: '1.5rem',
              }}>
                {it.icon}
              </div>
              <h3 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-text-strong)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                {it.title}
              </h3>
              <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-text)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                {it.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
