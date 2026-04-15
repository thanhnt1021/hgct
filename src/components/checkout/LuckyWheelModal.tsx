'use client'

import { useState, useRef } from 'react'
import { X } from 'lucide-react'

const SEGMENTS = [5, 10, 15, 18, 20, 25, 28, 30]
const COLORS = [
  '#7c3aed', '#a855f7', '#7c3aed', '#6d28d9',
  '#a855f7', '#7c3aed', '#9333ea', '#6d28d9',
]

// Exact price table per service
const EXACT_PRICES: Record<string, Record<number, number>> = {
  career:  { 5:189000, 10:179000, 15:169000, 18:163000, 20:159000, 25:149000, 28:143000, 30:139000 },
  love:    { 5:189000, 10:179000, 15:169000, 18:163000, 20:159000, 25:149000, 28:143000, 30:139000 },
  transit: { 5:189000, 10:179000, 15:169000, 18:163000, 20:159000, 25:149000, 28:143000, 30:139000 },
  synastry:{ 5:255000, 10:242000, 15:229000, 18:221000, 20:215000, 25:202000, 28:194000, 30:188000 },
}

const BASE_PRICES: Record<string, number> = {
  career: 199000, love: 199000, transit: 199000, synastry: 269000,
}

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + 'đ'
}

const N = SEGMENTS.length
const ANGLE_PER = 360 / N

interface Props {
  open: boolean
  service: string
  onClose: () => void
  onResult: (pct: number) => void
}

export default function LuckyWheelModal({ open, service, onClose, onResult }: Props) {
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<number | null>(null)
  const hasSpun = useRef(false)

  if (!open) return null

  const spin = () => {
    if (spinning || hasSpun.current) return
    hasSpun.current = true
    setSpinning(true)
    setResult(null)

    // Pick random segment
    const idx = Math.floor(Math.random() * N)
    // Rotate so that segment lands under the pointer (top = 0deg)
    // Each segment center is at (idx * ANGLE_PER + ANGLE_PER/2)
    // We need to rotate the wheel so that segment center aligns at 0deg (pointer at top)
    const segmentCenter = idx * ANGLE_PER + ANGLE_PER / 2
    const extra = 5 * 360 // 5 full spins for drama
    const targetRotation = rotation + extra + (360 - segmentCenter)

    setRotation(targetRotation)

    setTimeout(() => {
      setSpinning(false)
      setResult(SEGMENTS[idx])
    }, 4500)
  }

  const handleConfirm = () => {
    if (result !== null) onResult(result)
  }

  const exactPrice = result !== null ? (EXACT_PRICES[service]?.[result] ?? null) : null
  const basePrice = BASE_PRICES[service] ?? 199000

  // Build SVG wheel
  const size = 260
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 4

  const polarToCartesian = (angle: number, radius: number) => ({
    x: cx + radius * Math.sin((angle * Math.PI) / 180),
    y: cy - radius * Math.cos((angle * Math.PI) / 180),
  })

  const segments = SEGMENTS.map((pct, i) => {
    const startAngle = i * ANGLE_PER
    const endAngle = startAngle + ANGLE_PER
    const start = polarToCartesian(startAngle, r)
    const end = polarToCartesian(endAngle, r)
    const mid = polarToCartesian(startAngle + ANGLE_PER / 2, r * 0.68)
    const largeArc = ANGLE_PER > 180 ? 1 : 0
    const d = `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`
    return { d, color: COLORS[i], mid, pct }
  })

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget && !spinning) onClose() }}
    >
      <div
        className="w-full rounded-2xl"
        style={{ maxWidth: 360, background: 'rgba(16,12,38,0.99)', border: '1px solid rgba(168,85,247,0.3)', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3" style={{ borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
          <h3 className="font-bold text-base" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>
            Vòng Xoay May Mắn 🎡
          </h3>
          {!spinning && (
            <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: '#6b7280', background: 'rgba(255,255,255,0.05)' }}>
              <X size={18} />
            </button>
          )}
        </div>

        {/* Wheel */}
        <div className="flex flex-col items-center px-5 py-5 space-y-4">
          <div style={{ position: 'relative', width: size, height: size }}>
            {/* Pointer */}
            <div style={{
              position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '10px solid transparent', borderRight: '10px solid transparent',
              borderTop: '20px solid #f0cc78',
              zIndex: 10,
            }} />
            <svg
              width={size}
              height={size}
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? 'transform 4.5s cubic-bezier(0.17,0.67,0.12,1)' : 'none',
                borderRadius: '50%',
                boxShadow: '0 0 30px rgba(168,85,247,0.3)',
              }}
            >
              {segments.map((seg, i) => (
                <g key={i}>
                  <path d={seg.d} fill={seg.color} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <text
                    x={seg.mid.x}
                    y={seg.mid.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fff"
                    fontSize="13"
                    fontWeight="700"
                    fontFamily="var(--font-vietnam)"
                    transform={`rotate(${i * ANGLE_PER + ANGLE_PER / 2}, ${seg.mid.x}, ${seg.mid.y})`}
                  >
                    -{seg.pct}%
                  </text>
                </g>
              ))}
              {/* Center circle */}
              <circle cx={cx} cy={cy} r={20} fill="rgba(16,12,38,0.9)" stroke="rgba(240,204,120,0.5)" strokeWidth="2" />
            </svg>
          </div>

          {/* Result */}
          {result !== null && (
            <div className="text-center rounded-xl px-5 py-3 w-full" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)' }}>
              <p className="text-sm font-semibold" style={{ color: '#f0cc78', fontFamily: 'var(--font-vietnam)' }}>
                Chúc mừng! Bạn trúng -{result}%
              </p>
              {exactPrice && (
                <p className="text-xs mt-1" style={{ color: '#94a3b8', fontFamily: 'var(--font-vietnam)' }}>
                  <span style={{ textDecoration: 'line-through', color: '#6b7280' }}>{fmt(basePrice)}</span>
                  {' → '}
                  <strong style={{ color: '#4ade80' }}>{fmt(exactPrice)}</strong>
                </p>
              )}
            </div>
          )}

          {/* Spin / Confirm button */}
          {result === null ? (
            <button
              onClick={spin}
              disabled={spinning}
              className="w-full h-11 rounded-xl font-semibold"
              style={{
                background: spinning ? 'rgba(107,114,128,0.3)' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                color: '#fff',
                fontFamily: 'var(--font-vietnam)',
                fontSize: '0.92rem',
              }}
            >
              {spinning ? 'Đang quay...' : 'Quay ngay!'}
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              className="w-full h-11 rounded-xl font-semibold"
              style={{ background: 'linear-gradient(135deg, #c8943f, #f0cc78)', color: '#06060f', fontFamily: 'var(--font-vietnam)', fontSize: '0.92rem' }}
            >
              Thanh toán ngay →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
