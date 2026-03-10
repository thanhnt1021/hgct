'use client'

// VISUAL ONLY — atmospheric background layer

import { useEffect, useRef } from 'react'

export default function ShootingStars() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const interval = setInterval(() => {
      const star = document.createElement('div')
      star.className = 'shooting-star'
      star.style.top = Math.random() * 55 + '%'
      star.style.left = Math.random() * 75 + '%'
      container.appendChild(star)
      setTimeout(() => star.remove(), 1700)
    }, 3500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Starfield CSS layer */}
      <div className="starfield" />

      {/* Nebula glow — top left, purple/indigo */}
      <div
        className="glow-orb"
        style={{
          width: '680px', height: '680px',
          top: '-10%', left: '-12%',
          background: 'radial-gradient(circle, rgba(56,40,122,0.55) 0%, rgba(38,28,86,0.2) 50%, transparent 70%)',
          animation: 'nebulaDrift 28s ease-in-out infinite',
        }}
      />

      {/* Nebula glow — bottom right, deep indigo */}
      <div
        className="glow-orb"
        style={{
          width: '560px', height: '560px',
          bottom: '-8%', right: '-10%',
          background: 'radial-gradient(circle, rgba(28,21,64,0.7) 0%, rgba(56,40,122,0.25) 50%, transparent 70%)',
          animation: 'nebulaDrift 36s ease-in-out infinite reverse',
        }}
      />

      {/* Nebula glow — center, warm gold tint — very faint */}
      <div
        className="glow-orb"
        style={{
          width: '400px', height: '400px',
          top: '40%', left: '45%',
          background: 'radial-gradient(circle, rgba(200,148,63,0.06) 0%, transparent 70%)',
          animation: 'nebulaDrift 42s ease-in-out infinite 8s',
        }}
      />
    </div>
  )
}
