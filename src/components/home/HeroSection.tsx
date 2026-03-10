// VISUAL ONLY — hero section, Celestial Sanctum design (Server Component)

import Link from 'next/link'

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute" style={{ top: '15%', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '600px', background: 'radial-gradient(ellipse, rgba(200,148,63,0.07) 0%, rgba(200,148,63,0.02) 40%, transparent 70%)', borderRadius: '50%' }} />
        <div className="absolute" style={{ top: '30%', left: '-5%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(56,40,122,0.2) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div className="absolute" style={{ top: '55%', right: '-8%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(38,28,86,0.25) 0%, transparent 70%)', borderRadius: '50%' }} />
      </div>

      <div className="relative z-10 text-center max-w-5xl mx-auto px-4">

        {/* Ornament */}
        <div className="flex items-center justify-center gap-5 mb-12">
          <div style={{ height: '1px', width: '56px', background: 'linear-gradient(90deg, transparent, rgba(200,148,63,0.55))' }} />
          <span className="animate-pulse" style={{ color: '#d9ab55', fontSize: '0.75rem', animationDuration: '3s' }}>✦</span>
          <span style={{ color: '#d9ab55', fontSize: '1.1rem' }}>✦</span>
          <span className="animate-pulse" style={{ color: '#d9ab55', fontSize: '0.75rem', animationDuration: '3s', animationDelay: '1s' }}>✦</span>
          <div style={{ height: '1px', width: '56px', background: 'linear-gradient(90deg, rgba(200,148,63,0.55), transparent)' }} />
        </div>

        <h1 className="leading-none mb-12 animate-fade-up">
          {/* Eyebrow — Be Vietnam Pro, 20–26px, gold */}
          <span
            className="block mb-2"
            style={{
              color: '#e8b96a',
              fontFamily: 'var(--font-vietnam)',
              fontSize: 'clamp(2rem, 3.5vw, 2.6rem)',
              letterSpacing: '0.12em',
              fontWeight: 600,
            }}
          >
            Bầu trời lúc bạn
          </span>

          {/* Main headline — Playfair italic, uppercase */}
          <span
            className="block"
            style={{
              fontFamily: 'var(--font-playfair)',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(3.8rem, 14vw, 8.5rem)',
              lineHeight: 0.95,
              textTransform: 'uppercase',
              background: 'linear-gradient(135deg, #c8943f 0%, #f0cc78 45%, #d9ab55 70%, #c8943f 100%)',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.01em',
            }}
          >
            chào đời
          </span>

          {/* Sub-headline — Playfair italic, uppercase */}
          <span
            className="block mt-2"
            style={{
              color: '#c9c3d6',
              fontFamily: 'var(--font-playfair)',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
            nói gì về bạn?
          </span>
        </h1>

        {/* Divider */}
        <div className="mx-auto mb-10 animate-fade-up-delay-1" style={{ width: '80px', height: '1px', background: 'linear-gradient(90deg, transparent, #d9ab55, transparent)' }} />

        {/* Subtitle */}
        <p
          className="max-w-xl mx-auto mb-14 animate-fade-up-delay-1"
          style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: 'clamp(1.05rem, 2vw, 1.25rem)', lineHeight: 1.9, fontWeight: 400 }}
        >
          Bản đồ sao của bạn là dấu ấn riêng — ẩn chứa chìa khóa về
          tính cách, sứ mệnh, tình duyên và những giai đoạn quan trọng trong cuộc đời.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-up-delay-2">
          <Link href="/services" className="btn-hero-primary">
            Khám phá ngay
          </Link>
          <Link href="/auth/register" className="btn-hero-secondary">
            Tạo tài khoản miễn phí
          </Link>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap justify-center gap-3 animate-fade-up-delay-3">
          {[
            'Sự nghiệp & Tài chính',
            'Tình duyên & Hôn nhân',
            'Hợp nhau đến đâu?',
            'Vận hạn sắp tới',
          ].map(label => (
            <span
              key={label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.45rem 1.1rem',
                borderRadius: '2px',
                background: 'rgba(28,21,64,0.55)',
                border: '1px solid rgba(200,148,63,0.14)',
                color: '#8a8399',
                fontFamily: 'var(--font-vietnam)',
                fontSize: '0.88rem',
                fontWeight: 400,
              }}
            >
              <span style={{ color: 'rgba(200,148,63,0.6)', fontSize: '0.5rem' }}>✧</span>
              {label}
            </span>
          ))}
        </div>

      </div>
    </section>
  )
}
