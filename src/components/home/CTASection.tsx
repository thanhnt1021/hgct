// VISUAL ONLY — CTA section, Celestial Sanctum design (Server Component)

import Link from 'next/link'

export default function CTASection() {
  return (
    <section className="relative z-10 py-28 sm:py-36">
      <div className="max-w-4xl mx-auto px-4">

        <div className="relative overflow-hidden rounded-2xl p-px" style={{ background: 'linear-gradient(135deg, rgba(200,148,63,0.7) 0%, rgba(200,148,63,0.2) 40%, rgba(200,148,63,0.6) 100%)' }}>
          <div className="rounded-[15px] px-8 sm:px-16 py-16 text-center relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #0d0d26 0%, #080818 100%)' }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% -20%, rgba(200,148,63,0.09) 0%, transparent 65%)' }} />

            <div className="relative z-10">
              <div className="flex items-center justify-center gap-5 mb-8">
                <div style={{ height: '1px', width: '40px', background: 'linear-gradient(90deg, transparent, rgba(200,148,63,0.4))' }} />
                <span style={{ color: '#d9ab55', fontSize: '0.85rem' }}>✦</span>
                <span style={{ color: '#d9ab55', fontSize: '1.3rem' }}>✦</span>
                <span style={{ color: '#d9ab55', fontSize: '0.85rem' }}>✦</span>
                <div style={{ height: '1px', width: '40px', background: 'linear-gradient(90deg, rgba(200,148,63,0.4), transparent)' }} />
              </div>

              <h2 className="mb-8 leading-tight">
                <span className="block mb-3" style={{ color: '#c8943f', fontFamily: 'var(--font-vietnam)', fontSize: 'clamp(1.4rem, 2.8vw, 1.8rem)', letterSpacing: '0.1em', fontWeight: 600 }}>
                  Bản đồ sao của bạn
                </span>
                {/* Italic decorative — Playfair 400, keep lowercase */}
                <span
                  className="block"
                  style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', textTransform: 'uppercase', background: 'linear-gradient(135deg, #c8943f, #f0cc78, #d9ab55)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1.1 }}
                >
                  đang chờ được đọc
                </span>
              </h2>

              <div className="mx-auto mb-8" style={{ width: '60px', height: '1px', background: 'linear-gradient(90deg, transparent, #d9ab55, transparent)' }} />

              <p className="mb-10 max-w-lg mx-auto" style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '1.05rem', lineHeight: 1.9 }}>
                Hàng trăm khách hàng đã hiểu hơn về bản thân, tình yêu và con đường phía trước.
                Đến lượt bạn.
              </p>

              <Link href="/services" className="btn-cta-main">
                Bắt đầu ngay
              </Link>

              <p style={{ color: '#9090a8', fontSize: '0.85rem', marginTop: '1.25rem', fontFamily: 'var(--font-vietnam)' }}>
                Nhận báo cáo trong vài phút · Giao qua email · PDF lưu được
              </p>
            </div>
          </div>
        </div>

        {/* Trust signals */}
        <div className="grid grid-cols-3 gap-6 mt-14 text-center">
          {[
            { num: '4',        label: 'Loại báo cáo\nchuyên sâu',   latinNum: true },
            { num: '100%',     label: 'Cá nhân hóa\nriêng cho bạn', latinNum: true },
            { num: '< 5 phút', label: 'Nhận báo cáo\nqua email',    latinNum: false },
          ].map(s => (
            <div key={s.num}>
              <div className="font-bold mb-1.5" style={{ color: '#d9ab55', fontFamily: s.latinNum ? 'var(--font-cinzel)' : 'var(--font-vietnam)', fontSize: 'clamp(2rem, 5vw, 3rem)' }}>
                {s.num}
              </div>
              <div className="whitespace-pre-line" style={{ color: '#9090a8', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
