'use client'

import { useState } from 'react'
import Link from 'next/link'

type Step = 'identifier' | 'newPassword' | 'success'

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.4rem',
  color: '#8a8399',
  fontFamily: 'var(--font-vietnam)',
  fontSize: '0.6rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('identifier')
  const [identifier, setIdentifier] = useState('')
  const [foundUsername, setFoundUsername] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFindAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier.trim() }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Không tìm thấy tài khoản'); return }
    setFoundUsername(data.username)
    setResetToken(data.token)
    setStep('newPassword')
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirm) { setError('Mật khẩu không khớp'); return }
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Đặt lại thất bại'); return }
    setStep('success')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#06060f' }}
    >
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <div className="flex items-center justify-center gap-2.5 mb-2">
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="11" r="2.5" fill="#d9ab55" opacity="0.9"/>
                <circle cx="3"  cy="4"  r="1.2" fill="#d9ab55" opacity="0.55"/>
                <circle cx="19" cy="5"  r="1"   fill="#d9ab55" opacity="0.45"/>
                <circle cx="4"  cy="19" r="1"   fill="#d9ab55" opacity="0.4"/>
                <circle cx="18" cy="18" r="1.3" fill="#d9ab55" opacity="0.5"/>
                <line x1="11" y1="11" x2="3"  y2="4"  stroke="#d9ab55" strokeWidth="0.6" opacity="0.3"/>
                <line x1="11" y1="11" x2="19" y2="5"  stroke="#d9ab55" strokeWidth="0.6" opacity="0.25"/>
                <line x1="11" y1="11" x2="4"  y2="19" stroke="#d9ab55" strokeWidth="0.6" opacity="0.22"/>
                <line x1="11" y1="11" x2="18" y2="18" stroke="#d9ab55" strokeWidth="0.6" opacity="0.28"/>
              </svg>
              <span
                style={{
                  color: '#d9ab55',
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
            background: 'rgba(18,13,46,0.7)',
            border: '1px solid rgba(200,148,63,0.16)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <h2
            className="text-center font-bold mb-8"
            style={{
              color: '#f4efe6',
              fontFamily: 'var(--font-vietnam)',
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

          {step === 'identifier' && (
            <form onSubmit={handleFindAccount} className="space-y-5">
              <div>
                <label style={labelStyle}>Email hoặc tên đăng nhập</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  required
                  placeholder="email@example.com hoặc username"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 font-bold text-sm mt-2"
                style={{
                  background: 'linear-gradient(135deg, #c8943f 0%, #f0cc78 50%, #c8943f 100%)',
                  backgroundSize: '200% 200%',
                  color: '#06060f',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-vietnam)',
                  letterSpacing: '0.1em',
                  boxShadow: '0 4px 20px rgba(200,148,63,0.25)',
                  opacity: loading ? 0.7 : 1,
                  transition: 'opacity 0.2s ease',
                }}
              >
                {loading ? 'Đang tìm kiếm...' : 'Tìm tài khoản'}
              </button>
              <div
                className="text-center"
                style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem' }}
              >
                <Link
                  href="/auth/login"
                  className="font-semibold transition-colors"
                  style={{ color: '#d9ab55' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f0cc78')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#d9ab55')}
                >
                  Quay lại đăng nhập
                </Link>
              </div>
            </form>
          )}

          {step === 'newPassword' && (
            <form onSubmit={handleSetPassword} className="space-y-5">
              <div
                className="p-3 rounded-lg text-sm text-center"
                style={{
                  background: 'rgba(201,168,76,0.08)',
                  border: '1px solid rgba(201,168,76,0.2)',
                  color: '#d9ab55',
                  fontFamily: 'var(--font-vietnam)',
                }}
              >
                Đã tìm thấy tài khoản: <strong>{foundUsername}</strong>
              </div>
              <div>
                <label style={labelStyle}>Mật khẩu mới</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
              <div>
                <label style={labelStyle}>Xác nhận mật khẩu</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 font-bold text-sm mt-2"
                style={{
                  background: 'linear-gradient(135deg, #c8943f 0%, #f0cc78 50%, #c8943f 100%)',
                  backgroundSize: '200% 200%',
                  color: '#06060f',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-vietnam)',
                  letterSpacing: '0.1em',
                  boxShadow: '0 4px 20px rgba(200,148,63,0.25)',
                  opacity: loading ? 0.7 : 1,
                  transition: 'opacity 0.2s ease',
                }}
              >
                {loading ? 'Đang lưu...' : 'Đặt mật khẩu mới'}
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center space-y-5">
              <div
                className="p-4 rounded-lg text-sm"
                style={{
                  background: 'rgba(74,222,128,0.08)',
                  border: '1px solid rgba(74,222,128,0.2)',
                  color: '#4ade80',
                  fontFamily: 'var(--font-vietnam)',
                }}
              >
                Mật khẩu đã được đặt lại thành công!
              </div>
              <Link
                href="/auth/login"
                className="inline-block w-full py-3.5 font-bold text-sm text-center"
                style={{
                  background: 'linear-gradient(135deg, #c8943f 0%, #f0cc78 50%, #c8943f 100%)',
                  color: '#06060f',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-vietnam)',
                  letterSpacing: '0.1em',
                  boxShadow: '0 4px 20px rgba(200,148,63,0.25)',
                }}
              >
                Đăng nhập ngay
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
