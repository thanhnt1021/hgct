'use client'

// VISUAL ONLY — navigation bar restyled to Celestial Sanctum design

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const { user, logout, isLoading } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [displayTen, setDisplayTen] = useState<string>('')
  const router = useRouter()

  // Fetch "Tên" from main chart data (first name override)
  useEffect(() => {
    if (!user) { setDisplayTen(''); return }
    fetch('/api/user/account', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then((data: { mainChartData?: Record<string, string> | null } | null) => {
        const ten = data?.mainChartData?.ten
        setDisplayTen(ten?.trim() || '')
      })
      .catch(() => setDisplayTen(''))
  }, [user?.uid])

  const handleLogout = () => {
    logout()
    setAvatarOpen(false)
    router.push('/')
  }

  // Display name: Tên (from chart) > Google name > username
  const dropdownName = displayTen || user?.name || user?.username || ''
  // Initials fallback when no avatar image
  const initials = dropdownName
    ? dropdownName.trim().split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase()
    : (user?.username?.[0] ?? '?').toUpperCase()

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(6,6,15,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(200,148,63,0.1)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="2.5" fill="#d9ab55" opacity="0.9"/>
              <circle cx="3"  cy="4"  r="1.2" fill="#d9ab55" opacity="0.6"/>
              <circle cx="19" cy="5"  r="1"   fill="#d9ab55" opacity="0.5"/>
              <circle cx="4"  cy="19" r="1"   fill="#d9ab55" opacity="0.45"/>
              <circle cx="18" cy="18" r="1.3" fill="#d9ab55" opacity="0.55"/>
              <line x1="11" y1="11" x2="3"  y2="4"  stroke="#d9ab55" strokeWidth="0.6" opacity="0.35"/>
              <line x1="11" y1="11" x2="19" y2="5"  stroke="#d9ab55" strokeWidth="0.6" opacity="0.3"/>
              <line x1="11" y1="11" x2="4"  y2="19" stroke="#d9ab55" strokeWidth="0.6" opacity="0.28"/>
              <line x1="11" y1="11" x2="18" y2="18" stroke="#d9ab55" strokeWidth="0.6" opacity="0.32"/>
            </svg>
            <span
              className="font-bold text-sm tracking-wide transition-opacity group-hover:opacity-90"
              style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', letterSpacing: '0.05em' }}
            >
              Hạt Giống Chiêm Tinh
            </span>
          </Link>

          {/* ── Desktop menu ── */}
          <div className="hidden md:flex items-center gap-7">
            <Link href="/#features" className="nav-link">Dịch vụ</Link>
            <Link href="/chart" className="nav-link">Bản đồ sao</Link>
            <Link href="/services" className="nav-link">Đặt báo cáo</Link>

            {!isLoading && (
              user ? (
                <div className="relative">
                  <button onClick={() => setAvatarOpen(!avatarOpen)} className="flex items-center group">
                    {/* Avatar: Google image or initials */}
                    {user.image ? (
                      <img
                        src={user.image}
                        alt="avatar"
                        className="w-8 h-8 rounded-full object-cover"
                        style={{ border: '1.5px solid rgba(217,171,85,0.45)' }}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                        style={{
                          background: 'linear-gradient(135deg, #261c56, #38287a)',
                          color: '#d9ab55',
                          border: '1.5px solid rgba(217,171,85,0.45)',
                          fontFamily: 'var(--font-vietnam)',
                        }}
                      >
                        {initials}
                      </div>
                    )}
                  </button>

                  {avatarOpen && (
                    <div
                      className="absolute right-0 top-11 rounded-xl py-2 w-52 z-50"
                      style={{
                        background: 'rgba(11,11,31,0.97)',
                        border: '1px solid rgba(200,148,63,0.22)',
                        boxShadow: '0 12px 48px rgba(0,0,0,0.7), 0 0 24px rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(20px)',
                      }}
                    >
                      <div className="px-4 py-2.5 border-b" style={{ borderColor: 'rgba(200,148,63,0.1)' }}>
                        <p className="text-sm font-semibold" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>
                          {dropdownName}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)' }}>
                          {user.email}
                        </p>
                      </div>
                      <Link
                        href="/profile"
                        className="block px-4 py-2.5 text-sm transition-colors"
                        style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)' }}
                        onClick={() => setAvatarOpen(false)}
                        onMouseEnter={e => (e.currentTarget.style.color = '#f4efe6')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#8a8399')}
                      >
                        Hồ sơ của tôi
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                        style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#c45252')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#8a8399')}
                      >
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Link href="/auth/login" className="nav-link">Đăng nhập</Link>
                  <Link
                    href="/auth/register"
                    className="px-4 py-2 text-xs font-bold tracking-wider transition-all hover:opacity-90"
                    style={{
                      background: 'linear-gradient(135deg, #c8943f, #f0cc78, #c8943f)',
                      backgroundSize: '200% 200%',
                      color: '#06060f',
                      borderRadius: '3px',
                      fontFamily: 'var(--font-vietnam)',
                      letterSpacing: '0.06em',
                      boxShadow: '0 4px 16px rgba(200,148,63,0.3)',
                    }}
                  >
                    Bắt đầu
                  </Link>
                </div>
              )
            )}
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            className="md:hidden p-1"
            style={{ color: '#8a8399' }}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={menuOpen}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* ── Mobile menu ── */}
        {menuOpen && (
          <div
            className="md:hidden pb-5 pt-3 space-y-1"
            style={{ borderTop: '1px solid rgba(200,148,63,0.1)' }}
          >
            <Link href="/#features" className="block py-2.5 px-1 nav-link" onClick={() => setMenuOpen(false)}>
              Dịch vụ
            </Link>
            <Link href="/chart" className="block py-2.5 px-1 nav-link" onClick={() => setMenuOpen(false)}>
              Bản đồ sao
            </Link>
            <Link href="/services" className="block py-2.5 px-1 nav-link" onClick={() => setMenuOpen(false)}>
              Đặt báo cáo
            </Link>
            {user ? (
              <>
                <Link href="/profile" className="block py-2.5 px-1 nav-link" onClick={() => setMenuOpen(false)}>
                  Hồ sơ của tôi
                </Link>
                <button
                  onClick={() => { handleLogout(); setMenuOpen(false) }}
                  className="block w-full text-left py-2.5 px-1 text-sm"
                  style={{ color: '#c45252', fontFamily: 'var(--font-vietnam)' }}
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="block py-2.5 px-1 nav-link" onClick={() => setMenuOpen(false)}>
                  Đăng nhập
                </Link>
                <Link
                  href="/auth/register"
                  className="block mt-3 py-3 px-4 text-sm font-bold text-center"
                  style={{
                    background: 'linear-gradient(135deg, #c8943f, #f0cc78)',
                    color: '#06060f',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-vietnam)',
                    letterSpacing: '0.05em',
                  }}
                  onClick={() => setMenuOpen(false)}
                >
                  Bắt đầu ngay
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
