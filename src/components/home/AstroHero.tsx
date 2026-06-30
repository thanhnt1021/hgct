'use client'

// S2 Hero — title "ASTROS" CỐ ĐỊNH 1 dòng (luôn hiện mọi screen) + carousel CHỈ 4 loại service
// (tự chạy + nút ← → + dots). KHÔNG còn slide brand/philosophy. Vòng hoàng đạo + ngôi sao tâm,
// hành tinh, trăng, mầm cây, starfield. Nền cát #edd5b1. 2 màu (navy/kem).

import { useEffect, useState } from 'react'
import AstroZodiacWheel from './AstroZodiacWheel'
import AstroServiceModal, { type ServiceDef } from './AstroServiceModal'

const SLIDES: { title: string; subtitle: string; content: string; service: string; needsTwo: boolean }[] = [
  { title: 'Sự nghiệp và Tiền bạc', subtitle: 'Khai phá tiềm năng & thu hút tài lộc', content: 'Định hướng sự nghiệp, tối ưu tài năng và thu hút tài lộc.', service: 'career', needsTwo: false },
  { title: 'Tình duyên cá nhân', subtitle: 'Hiểu cách bạn yêu & bài học tình cảm', content: 'Bản đồ tình cảm cá nhân: bạn yêu thế nào, cần gì và bài học tình duyên của bạn.', service: 'love', needsTwo: false },
  { title: 'Mối quan hệ cặp đôi', subtitle: 'So hai bản đồ sao, điểm hòa hợp', content: 'So sánh hai bản đồ sao để hiểu sự kết nối, điểm hòa hợp và khác biệt giữa hai bạn.', service: 'synastry', needsTwo: true },
  { title: 'Vận hạn', subtitle: 'Nắm bắt cơ hội, hóa giải thách thức', content: 'Dự báo vận hạn, nắm bắt cơ hội và hóa giải thách thức.', service: 'transit', needsTwo: false },
]
const N = SLIDES.length

export default function AstroHero() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [modal, setModal] = useState<ServiceDef | null>(null)
  const go = (d: number) => setI(v => (v + d + N) % N)

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setI(v => (v + 1) % N), 5500)
    return () => clearInterval(id)
  }, [paused])

  const s = SLIDES[i]

  return (
    <section className="relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #f4e6cd 0%, #edd5b1 55%, #e3c89a 100%)', paddingTop: '7rem', paddingBottom: '4.5rem' }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>

      <div className="as-starfield" />
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'var(--as-glow-warm)', pointerEvents: 'none' }} />

      {/* Hành tinh trôi */}
      <div aria-hidden className="hidden sm:block" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '12%', right: '6%', animation: 'asFloat 9s ease-in-out infinite' }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #edd5b1, #163653 78%)' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 92, height: 26, border: '4px solid rgba(22,54,83,0.6)', borderRadius: '50%', transform: 'translate(-50%,-50%) rotate(-22deg)' }} />
        </div>
        <div style={{ position: 'absolute', top: '46%', right: '3%', width: 40, height: 40, borderRadius: '50%', background: 'repeating-linear-gradient(0deg, #edd5b1, #edd5b1 5px, #1a2148 5px, #1a2148 10px)', boxShadow: '0 0 18px rgba(22,54,83,0.3)', animation: 'asFloat 11s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '16%', right: '20%', width: 26, height: 26, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #edd5b1, #163653)', animation: 'asFloat 8s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '16%', left: '5%', width: 34, height: 34, borderRadius: '50%', background: '#163653', boxShadow: 'inset -10px 2px 0 0 #edd5b1', animation: 'asFloat 10s ease-in-out infinite' }} />
      </div>

      {/* Mầm cây + gợn nước */}
      <svg aria-hidden viewBox="0 0 120 70" className="hidden md:block" style={{ position: 'absolute', left: 16, bottom: 12, width: 130, opacity: 0.8, pointerEvents: 'none' }}>
        <path d="M60 60 C60 44 54 38 46 34 C56 34 60 42 60 50 C60 42 66 34 76 34 C66 40 60 44 60 60 Z" fill="#163653" />
        <path d="M60 60 L60 48" stroke="#163653" strokeWidth="2" />
        <path d="M20 64 q15 -6 30 0 M30 68 q18 -6 36 0 M52 64 q15 -6 30 0" stroke="rgba(22,54,83,0.45)" strokeWidth="1.5" fill="none" />
      </svg>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-8 items-center">

        {/* Trái: ASTROS cố định + carousel 4 service */}
        <div className="order-2 lg:order-1 text-center lg:text-left">
          <h1 style={{ fontFamily: 'var(--font-cinzel)', color: 'var(--as-navy-deep)', fontWeight: 600, letterSpacing: '0.16em', fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', lineHeight: 1.05, margin: '0 0 1.5rem', whiteSpace: 'nowrap' }}>
            ASTROS
          </h1>

          <div className="flex items-stretch gap-2 sm:gap-3">
            <button type="button" className="as-arrow self-center" aria-label="Slide trước" onClick={() => go(-1)}>‹</button>

            <div className="flex-1 text-center lg:text-left" style={{ minHeight: 190 }}>
              <div key={i} style={{ animation: 'fadeInUp 0.5s ease' }}>
                <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-gold)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' }}>Khám phá</p>
                <h2 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-text-strong)', fontSize: 'clamp(1.6rem,3.3vw,2.3rem)', fontWeight: 600, marginTop: '0.4rem' }}>{s.title}</h2>
                <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-copper)', fontSize: '0.92rem', fontWeight: 600, marginTop: '0.3rem' }}>{s.subtitle}</p>
                <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-text)', fontSize: '0.98rem', lineHeight: 1.75, marginTop: '0.7rem', maxWidth: 460 }}>{s.content}</p>
                <button type="button" onClick={() => setModal({ service: s.service, title: s.title, needsTwo: s.needsTwo })} style={{ display: 'inline-block', marginTop: '1.4rem', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem', fontWeight: 700, color: 'var(--as-text-on-dark)', background: 'var(--as-cta)', padding: '0.7rem 1.6rem', borderRadius: '999px', border: 'none', cursor: 'pointer', boxShadow: 'var(--as-shadow-glow)' }}>Tạo bản đồ sao</button>
              </div>
            </div>

            <button type="button" className="as-arrow self-center" aria-label="Slide kế" onClick={() => go(1)}>›</button>
          </div>

          <div className="flex gap-1.5 justify-center lg:justify-start mt-6 lg:pl-[54px]">
            {SLIDES.map((_, k) => (
              <button key={k} type="button" aria-label={`Slide ${k + 1}`} onClick={() => setI(k)}
                style={{ width: k === i ? 22 : 8, height: 8, borderRadius: 999, border: 'none', cursor: 'pointer', background: k === i ? 'var(--as-cta)' : 'var(--as-border-gold)', transition: 'all 0.4s ease' }} />
            ))}
          </div>
        </div>

        {/* Phải: vòng hoàng đạo + ngôi sao tỏa sáng ở tâm */}
        <div className="order-1 lg:order-2 relative flex justify-center items-center" style={{ minHeight: 340 }}>
          <AstroZodiacWheel />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <svg width="120" height="120" viewBox="0 0 120 120" style={{ animation: 'asStarPulse 4s ease-in-out infinite' }}>
              <defs>
                <radialGradient id="sunCore" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#faf1de" />
                  <stop offset="45%" stopColor="#edd5b1" />
                  <stop offset="100%" stopColor="#163653" />
                </radialGradient>
              </defs>
              <circle cx="60" cy="60" r="40" fill="url(#sunCore)" opacity="0.35" />
              <circle cx="60" cy="60" r="20" fill="url(#sunCore)" />
              <path d="M60 8 L66 54 L60 60 L54 54 Z M60 112 L54 66 L60 60 L66 66 Z M8 60 L54 54 L60 60 L54 66 Z M112 60 L66 66 L60 60 L66 54 Z" fill="#163653" opacity="0.85" />
              <path d="M24 24 L57 57 L60 60 L52 50 Z M96 96 L63 63 L60 60 L68 70 Z M96 24 L63 57 L60 60 L70 52 Z M24 96 L57 63 L60 60 L50 68 Z" fill="#163653" opacity="0.5" />
            </svg>
          </div>
        </div>
      </div>
      {modal && <AstroServiceModal def={modal} onClose={() => setModal(null)} />}
    </section>
  )
}
