'use client'

// Navbar AstroS — 2 dòng (PRD): logo cao bằng cả 2 dòng (như merge cell) bên trái;
// dòng trên = Số xu + Đăng nhập/tên; dòng dưới = menu 4 loại + Liên hệ.
// Mobile: hamburger mở menu. Tông kem #edd5b1.

import Link from 'next/link'
import { useState } from 'react'
import CoinBalance from './CoinBalance'
import { useAuth } from '@/contexts/AuthContext'

const MENU = [
  { label: 'Sự nghiệp và Tiền bạc', href: '/services?type=career' },
  { label: 'Tình duyên cá nhân', href: '/services?type=love' },
  { label: 'Mối quan hệ cặp đôi', href: '/services?type=synastry' },
  { label: 'Vận hạn', href: '/services?type=transit' },
  { label: 'Liên hệ', href: 'mailto:support@hatgiongchiemtinh.com' },
]

function AuthSlot() {
  const { user } = useAuth()
  if (user) {
    return (
      <Link href="/profile" title={user.username || 'Tài khoản'}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.2rem 0.5rem 0.2rem 0.25rem', borderRadius: '999px', border: '1px solid var(--as-border-gold)', textDecoration: 'none' }}>
        {user.image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={user.image} alt="" width={24} height={24} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
          : <span style={{ width: 24, height: 24, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--as-cta)', color: 'var(--as-text-on-dark)', fontSize: '0.72rem', fontWeight: 700 }}>{(user.username || 'A').charAt(0).toUpperCase()}</span>}
        <span className="hidden sm:inline" style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-text-strong)', fontSize: '0.78rem', fontWeight: 600, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username}</span>
      </Link>
    )
  }
  return (
    <Link href="/auth/login" style={{ fontFamily: 'var(--font-vietnam)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--as-text-on-dark)', background: 'var(--as-cta)', padding: '0.42rem 1rem', borderRadius: '999px', textDecoration: 'none', whiteSpace: 'nowrap' }}>Đăng nhập</Link>
  )
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md"
      style={{ background: 'rgba(237,213,177,0.92)', borderBottom: '1px solid var(--as-border-gold)', boxShadow: '0 4px 24px rgba(22,54,83,0.08)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-stretch justify-between gap-4" style={{ minHeight: 78 }}>

        {/* Logo cao bằng cả 2 dòng */}
        <Link href="/" className="flex items-center shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-yestext.png" alt="AstroS" style={{ height: 60, width: 'auto' }} />
        </Link>

        {/* Desktop: 2 dòng bên phải */}
        <div className="hidden lg:flex flex-col items-end justify-center gap-2 flex-1 py-2">
          <div className="flex items-center gap-2.5">
            <CoinBalance />
            <AuthSlot />
          </div>
          <nav className="flex items-center gap-5">
            {MENU.map(m => (
              <Link key={m.label} href={m.href} className="as-nav-link"
                style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-text)', fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap', transition: 'color 0.2s ease' }}>
                {m.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Mobile: xu/login + hamburger */}
        <div className="flex lg:hidden items-center gap-2">
          <CoinBalance />
          <AuthSlot />
          <button type="button" aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ color: 'var(--as-navy-deep)', padding: '8px', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="lg:hidden absolute left-0 right-0 shadow-2xl" style={{ top: '100%', background: 'rgba(244,230,205,0.98)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--as-border-gold)' }}>
          <nav className="flex flex-col px-5 py-2">
            {MENU.map(m => (
              <Link key={m.label} href={m.href} onClick={() => setMenuOpen(false)}
                style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-text)', fontSize: '0.92rem', fontWeight: 500, padding: '0.75rem 0', borderBottom: '1px solid var(--as-border-soft)' }}>
                {m.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
