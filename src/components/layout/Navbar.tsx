'use client'

// Navbar — logo + coin balance widget

import Link from 'next/link'
import { useState } from 'react'
import CoinBalance from './CoinBalance'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-[#06060f]/95 to-[#06060f]/60 backdrop-blur-md border-b border-[#c8943f]/20 h-16 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-3">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="3" fill="#d9ab55"/>
            <circle cx="12" cy="4" r="1.5" fill="#d9ab55"/>
            <circle cx="20" cy="12" r="1.5" fill="#d9ab55"/>
            <circle cx="12" cy="20" r="1.5" fill="#d9ab55"/>
            <circle cx="4" cy="12" r="1.5" fill="#d9ab55"/>
            <path d="M12 4L12 9M20 12L15 12M12 20L12 15M4 12L9 12" stroke="#d9ab55" strokeWidth="1.5"/>
          </svg>
          <span
            className="font-bold text-sm tracking-wide uppercase transition-opacity group-hover:opacity-90"
            style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', letterSpacing: '0.05em' }}
          >
            Hạt Giống Chiêm Tinh
          </span>
        </Link>

        {/* Coin balance / login */}
        <CoinBalance />

        {/* Mobile hamburger */}
        <button
          className="hidden"
          style={{ color: '#d9ab55', padding: '10px', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={menuOpen}
          type="button"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </div>

      {/* Mobile menu — empty */}
      {menuOpen && (
        <div
          className="md:hidden absolute top-16 left-0 right-0 shadow-2xl"
          style={{
            background: 'rgba(6,6,15,0.95)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(200,148,63,0.2)',
          }}
        />
      )}
    </header>
  )
}
