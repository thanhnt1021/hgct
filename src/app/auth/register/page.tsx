'use client'

// VISUAL ONLY — register page restyled to Celestial Sanctum design
// All auth logic (handleSubmit, useAuth, form state, routing) untouched

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton'

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.4rem',
  color: '#8a8399',
  fontFamily: 'var(--font-vietnam)',
  fontSize: '0.6rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  
}

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [form, setForm] = useState({ username: '', name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [next, setNext] = useState('/profile')

  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get('next')
    if (n && n.startsWith('/')) setNext(n)
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Mật khẩu không khớp'); return }
    setLoading(true); setError('')
    const result = await register(form.username, form.name, form.email, form.password)
    if (!result.ok) { setError(result.error || 'Đăng ký thất bại'); setLoading(false) }
    else router.push(next)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: '#06060f' }}
    >
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <div className="flex items-center justify-center gap-2.5">
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
            Tạo tài khoản
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'username', label: 'Tên đăng nhập', type: 'text', placeholder: 'username' },
              { key: 'name',     label: 'Họ và tên',     type: 'text', placeholder: 'Nguyễn Văn A' },
              { key: 'email',    label: 'Email',          type: 'email', placeholder: 'email@example.com' },
              { key: 'password', label: 'Mật khẩu',      type: 'password', placeholder: 'Ít nhất 6 ký tự' },
              { key: 'confirm',  label: 'Nhập lại mật khẩu', type: 'password', placeholder: '••••••••' },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => set(f.key, e.target.value)}
                  required
                  placeholder={f.placeholder}
                />
              </div>
            ))}

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
              {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
            </button>
          </form>

          <GoogleSignInButton callbackUrl={next} />

          <div
            className="mt-5 text-center"
            style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem' }}
          >
            Đã có tài khoản?{' '}
            <Link
              href={`/auth/login?next=${encodeURIComponent(next)}`}
              className="font-semibold transition-colors"
              style={{ color: '#d9ab55' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f0cc78')}
              onMouseLeave={e => (e.currentTarget.style.color = '#d9ab55')}
            >
              Đăng nhập
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/privacy" style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem' }}>Chính sách bảo mật</Link>
          <span style={{ color: '#4a4560', margin: '0 0.5rem', fontSize: '0.72rem' }}>·</span>
          <Link href="/terms" style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem' }}>Điều khoản sử dụng</Link>
        </div>

      </div>
    </div>
  )
}
