'use client'

import { useState } from 'react'
import Link from 'next/link'

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.4rem',
  color: 'var(--as-text-muted)',
  fontFamily: 'var(--font-vietnam)',
  fontSize: '0.6rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Có lỗi xảy ra, vui lòng thử lại')
      } else {
        setSent(true)
      }
    } catch {
      setError('Không thể kết nối máy chủ, vui lòng thử lại')
    }
    setLoading(false)
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
              <img src="/logo-notext.png" alt="AstroS" style={{ height: 30, width: 'auto' }} />
              <span
                style={{
                  color: 'var(--as-text-strong)',
                  fontFamily: 'var(--font-cinzel)',
                  fontWeight: 600,
                  fontSize: '1.2rem',
                  letterSpacing: '0.2em',
                }}
              >
                ASTRO S
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
            Quên mật khẩu
          </h2>

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

          {sent ? (
            <div className="space-y-5">
              <div
                className="p-4 rounded-lg text-sm text-center"
                style={{
                  background: 'rgba(74,222,128,0.08)',
                  border: '1px solid rgba(74,222,128,0.2)',
                  color: '#4ade80',
                  fontFamily: 'var(--font-vietnam)',
                  lineHeight: 1.7,
                }}
              >
                Nếu email tồn tại, bạn sẽ nhận được link trong vài phút.
                <br />
                <span style={{ color: '#6b7280', fontSize: '0.85em' }}>Kiểm tra cả hộp thư spam.</span>
              </div>
              <div
                className="text-center"
                style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem' }}
              >
                <Link
                  href="/auth/login"
                  className="font-semibold transition-colors"
                  style={{ color: 'var(--as-cta)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--as-copper-deep)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--as-cta)')}
                >
                  Quay lại đăng nhập
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label style={labelStyle}>Email tài khoản</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="email@example.com"
                />
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
                {loading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
              </button>
              <div
                className="text-center"
                style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem' }}
              >
                <Link
                  href="/auth/login"
                  className="font-semibold transition-colors"
                  style={{ color: 'var(--as-cta)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--as-copper-deep)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--as-cta)')}
                >
                  Quay lại đăng nhập
                </Link>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  )
}
