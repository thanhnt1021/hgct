'use client'

// VISUAL ONLY — Canvas-based animated starfield background

import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  size: number
  opacity: number
  twinkleSpeed: number
  twinkleOffset: number
  isGold: boolean
}

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const animationRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const initStars = () => {
      const starCount = Math.floor((canvas.width * canvas.height) / 5500)
      starsRef.current = Array.from({ length: starCount }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.3,
        opacity: Math.random() * 0.5 + 0.2,
        twinkleSpeed: Math.random() * 0.012 + 0.004,
        twinkleOffset: Math.random() * Math.PI * 2,
        isGold: Math.random() > 0.72, // ~28% gold stars
      }))
    }

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initStars()
    }

    const animate = (time: number) => {
      // void-deep background
      ctx.fillStyle = '#06060f'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      starsRef.current.forEach((star) => {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset)
        const opacity = star.opacity + twinkle * 0.22

        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)

        if (star.isGold) {
          ctx.fillStyle = `rgba(240, 204, 120, ${Math.max(0.12, opacity)})`
        } else {
          ctx.fillStyle = `rgba(244, 239, 230, ${Math.max(0.08, opacity * 0.75)})`
        }
        ctx.fill()

        // Subtle glow for larger stars
        if (star.size > 1.1) {
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.size * 2.8, 0, Math.PI * 2)
          if (star.isGold) {
            ctx.fillStyle = `rgba(200, 148, 63, ${Math.max(0, opacity * 0.09)})`
          } else {
            ctx.fillStyle = `rgba(201, 195, 214, ${Math.max(0, opacity * 0.05)})`
          }
          ctx.fill()
        }
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    animationRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationRef.current)
    }
  }, [])

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 -z-10"
        aria-hidden="true"
      />

      {/* Nebula glow orbs — CSS layer on top of canvas */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Top-left purple nebula */}
        <div
          className="glow-orb"
          style={{
            width: '680px', height: '680px',
            top: '-10%', left: '-12%',
            background: 'radial-gradient(circle, rgba(56,40,122,0.5) 0%, rgba(38,28,86,0.18) 50%, transparent 70%)',
            animation: 'nebulaDrift 28s ease-in-out infinite',
          }}
        />
        {/* Bottom-right deep indigo nebula */}
        <div
          className="glow-orb"
          style={{
            width: '560px', height: '560px',
            bottom: '-8%', right: '-10%',
            background: 'radial-gradient(circle, rgba(28,21,64,0.65) 0%, rgba(56,40,122,0.22) 50%, transparent 70%)',
            animation: 'nebulaDrift 36s ease-in-out infinite reverse',
          }}
        />
        {/* Center warm gold tint */}
        <div
          className="glow-orb"
          style={{
            width: '400px', height: '400px',
            top: '40%', left: '45%',
            background: 'radial-gradient(circle, rgba(200,148,63,0.05) 0%, transparent 70%)',
            animation: 'nebulaDrift 42s ease-in-out infinite 8s',
          }}
        />
      </div>
    </>
  )
}
