'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DaisuLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ctv/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.needsSetup) {
          router.push(`/daisu/setup?setupToken=${data.setupToken}`)
        } else {
          router.push('/daisu')
        }
      } else {
        setError(data.error || 'Đăng nhập thất bại')
      }
    } catch {
      setError('Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#06060f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{ color: '#c9a84c', fontSize: '1.5rem', letterSpacing: '0.3em', marginBottom: '0.5rem' }}>✦ ✦ ✦</p>
          <h1 style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.05em', margin: 0 }}>
            Trang Đại Sứ
          </h1>
          <p style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            AstroS
          </p>
        </div>

        <div style={{ background: 'rgba(18,13,46,0.8)', border: '1px solid rgba(200,148,63,0.16)', borderRadius: '16px', padding: '2rem' }}>
          <h2 style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>
            Đăng nhập
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="email@example.com"
                className="w-full"
              />
            </div>
            <div>
              <label style={{ display: 'block', color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                Mật khẩu
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full"
              />
              <p style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', marginTop: '0.3rem' }}>
                Đã đăng ký qua trang chủ nhưng chưa có mật khẩu? Nhập email và để trống mật khẩu rồi bấm Đăng nhập.
              </p>
            </div>

            {error && (
              <p style={{ color: '#ef4444', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.8rem',
                background: 'linear-gradient(135deg, #c8943f 0%, #f0cc78 50%, #c8943f 100%)',
                backgroundSize: '200% 200%',
                color: '#06060f',
                border: 'none',
                borderRadius: '4px',
                fontFamily: 'var(--font-vietnam)',
                fontSize: '0.88rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                marginTop: '0.25rem',
              }}
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
