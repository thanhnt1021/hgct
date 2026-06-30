'use client'

// VISUAL ONLY — login page restyled to Celestial Sanctum design
// All auth logic (handleSubmit, useAuth, routing) untouched

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton'

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.4rem',
  color: 'var(--as-text-muted)',
  fontFamily: 'var(--font-vietnam)',
  fontSize: '0.6rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  
}

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [next, setNext] = useState('/profile')
  const [reason, setReason] = useState('')

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const n = p.get('next')
    if (n && n.startsWith('/')) setNext(n)
    setReason(p.get('reason') || '')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await login(username, password)
    if (!result.ok) {
      setError(result.error || 'Đăng nhập thất bại')
      setLoading(false)
    } else {
      router.push(next)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(180deg, #edd5b1 0%, #e3c89a 100%)' }}
    >
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <div className="flex items-center justify-center gap-2.5 mb-2">
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="11" r="2.5" fill="#163653" opacity="0.9"/>
                <circle cx="3"  cy="4"  r="1.2" fill="#163653" opacity="0.55"/>
                <circle cx="19" cy="5"  r="1"   fill="#163653" opacity="0.45"/>
                <circle cx="4"  cy="19" r="1"   fill="#163653" opacity="0.4"/>
                <circle cx="18" cy="18" r="1.3" fill="#163653" opacity="0.5"/>
                <line x1="11" y1="11" x2="3"  y2="4"  stroke="#163653" strokeWidth="0.6" opacity="0.3"/>
                <line x1="11" y1="11" x2="19" y2="5"  stroke="#163653" strokeWidth="0.6" opacity="0.25"/>
                <line x1="11" y1="11" x2="4"  y2="19" stroke="#163653" strokeWidth="0.6" opacity="0.22"/>
                <line x1="11" y1="11" x2="18" y2="18" stroke="#163653" strokeWidth="0.6" opacity="0.28"/>
              </svg>
              <span
                style={{
                  color: 'var(--as-text-strong)',
                  fontFamily: 'var(--font-vietnam)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  letterSpacing: '0.06em',
                }}
              >
                Hạt Giống Chiêm Tinh
              </span>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 sm:p-10"
          style={{
            background: 'var(--as-surface)',
            border: '1px solid var(--as-border-gold)',
            boxShadow: 'var(--as-shadow-card)',
          }}
        >
          <h2
            className="text-center font-bold mb-8"
            style={{
              color: 'var(--as-text-strong)',
              fontFamily: 'var(--font-playfair)',
              fontSize: '1.1rem',
              letterSpacing: '0.06em',
            }}
          >
            Đăng nhập
          </h2>

          {reason === 'topup' && (
            <div
              className="mb-5 p-3 rounded-lg text-sm text-center"
              style={{
                background: 'rgba(22,54,83,0.06)',
                border: '1px solid var(--as-border-gold)',
                color: 'var(--as-text-strong)',
                fontFamily: 'var(--font-vietnam)',
              }}
            >
              Đăng nhập để có thể nạp xu và mở nội dung
            </div>
          )}

          {error && (
            <div
              className="mb-5 p-3 rounded-lg text-sm text-center"
              style={{
                background: 'rgba(196,82,82,0.1)',
                border: '1px solid rgba(196,82,82,0.3)',
                color: '#e87070',
                fontFamily: 'var(--font-vietnam)',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label style={labelStyle}>Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            <div className="text-right" style={{ marginTop: '-0.5rem' }}>
              <Link
                href="/auth/forgot-password"
                style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--as-cta)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--as-text-muted)')}
              >
                Quên mật khẩu?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 font-bold text-sm mt-2"
              style={{
                background: 'var(--as-cta)',
                backgroundSize: '200% 200%',
                color: 'var(--as-text-on-dark)',
                borderRadius: '999px',
                fontFamily: 'var(--font-vietnam)',
                letterSpacing: '0.1em',
                boxShadow: 'var(--as-shadow-glow)',
                opacity: loading ? 0.7 : 1,
                transition: 'opacity 0.2s ease',
              }}
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <GoogleSignInButton callbackUrl={next} />

          <div
            className="mt-5 text-center"
            style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem' }}
          >
            Chưa có tài khoản?{' '}
            <Link href={`/auth/register?next=${encodeURIComponent(next)}`} style={{ color: 'var(--as-cta)', fontWeight: 600, textDecoration: 'underline' }}>
              Đăng ký ngay
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/privacy" style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem' }}>Chính sách bảo mật</Link>
          <span style={{ color: 'var(--as-text-muted)', margin: '0 0.5rem', fontSize: '0.72rem' }}>·</span>
          <Link href="/terms" style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem' }}>Điều khoản sử dụng</Link>
        </div>

      </div>
    </div>
  )
}
