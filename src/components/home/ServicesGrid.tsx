'use client'

// Trang chủ — 4 cục cha. Bấm vào → CHUYỂN TRANG (không dropdown).
// Cha có sub (Tình yêu / Mối quan hệ) → /services?group=...
// Cha lẻ (Sự nghiệp / Vận hạn) → /services?type=...

import Link from 'next/link'
import { Wallet, Heart, UsersRound, Compass, type LucideIcon } from 'lucide-react'

interface Parent {
  Icon: LucideIcon
  title: string
  href: string
  accent: string
  border: string
  color: string
}

const PARENTS: Parent[] = [
  { Icon: Wallet,     title: 'Sự nghiệp & Tiền bạc',  href: '/services?type=career',     accent: 'rgba(200,148,63,0.08)', border: 'rgba(200,148,63,0.22)', color: '#c8943f' },
  { Icon: Heart,      title: 'Tình yêu & Hôn nhân',   href: '/services?group=love',      accent: 'rgba(185,77,112,0.08)', border: 'rgba(185,77,112,0.22)', color: '#e87da0' },
  { Icon: UsersRound, title: 'Mối quan hệ',           href: '/services?group=relations', accent: 'rgba(120,77,186,0.08)', border: 'rgba(120,77,186,0.22)', color: '#b08ce8' },
  { Icon: Compass,    title: 'Vận hạn',               href: '/services?type=transit',    accent: 'rgba(64,112,184,0.08)', border: 'rgba(64,112,184,0.22)', color: '#78a8f0' },
]

export default function ServicesGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {PARENTS.map(p => (
        <Link
          key={p.title}
          href={p.href}
          className="service-card-link block"
          style={{ background: p.accent, border: `1px solid ${p.border}` }}
        >
          <div className="flex items-center gap-4 p-7" style={{ minHeight: '5.5rem' }}>
            <div
              className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full"
              style={{ background: 'rgba(6,6,15,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <p.Icon size={22} style={{ color: p.color }} strokeWidth={1.5} />
            </div>
            <h3
              className="font-semibold flex-1"
              style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.15rem' }}
            >
              {p.title}
            </h3>
            <span style={{ color: p.color, fontSize: '1.25rem' }}>→</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
