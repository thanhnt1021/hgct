// VISUAL ONLY — hero section, Celestial Sanctum design (Server Component)

import Link from 'next/link'

const HERO_DEFAULTS = {
  subtitle: 'Bầu trời lúc bạn chào đời không hề ngẫu nhiên. Nếu bạn đang đọc đến những dòng này, có lẽ trong lòng bạn cũng đang có vài câu hỏi, vài nỗi băn khoăn về bản thân, tình yêu, sự nghiệp hay con đường phía trước. Mỗi bản đồ sao chính là một hạt giống, mỗi hành tinh là một dấu ấn, mỗi góc chiếu là một câu chuyện rất riêng về tính cách, cảm xúc, tình yêu và hành trình cuộc đời của bạn. Bản đồ sao cá nhân giống như một chiếc gương để bạn nhìn lại chính mình rõ hơn. Không phải để biết trước tương lai, mà để hiểu vì sao bạn lại trở thành con người của hiện tại, và mình có thể sống nhẹ hơn như thế nào từ đây.',
  ctaText: 'Thông điệp ngày hôm nay',
}

export default function HeroSection({ subtitle, ctaText }: { subtitle?: string; ctaText?: string }) {
  const sub = subtitle || HERO_DEFAULTS.subtitle
  const cta = ctaText || HERO_DEFAULTS.ctaText
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
          className="max-w-3xl mx-auto mb-14 animate-fade-up-delay-1 text-center"
          style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: 'clamp(1.05rem, 2vw, 1.25rem)', lineHeight: 1.9, fontWeight: 400 }}
        >
          {sub}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-up-delay-2">
          <Link href="/services" className="btn-hero-primary">
            {cta}
          </Link>
        </div>

      </div>
    </section>
  )
}
