'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SetupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ctvId = searchParams.get('ctvId')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [ctvCode, setCtvCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [codeAvailable, setCodeAvailable] = useState<null | boolean>(null)

  const checkCode = async (code: string) => {
    if (!code || code.length < 4) { setCodeAvailable(null); return }
    try {
      const res = await fetch(`/api/ctv/verify-code?code=${encodeURIComponent(code)}`)
      const data = await res.json()
      // If valid = true → code is taken (already used by an active CTV)
      setCodeAvailable(!data.valid)
    } catch {
      setCodeAvailable(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ctvId) { setError('Thiếu ctvId'); return }
    if (password !== confirm) { setError('Mật khẩu xác nhận không khớp'); return }
    if (password.length < 8) { setError('Mật khẩu phải ít nhất 8 ký tự'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ctv/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ctvId: Number(ctvId), password, ctvCode }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push('/daisu')
      } else {
        setError(data.error || 'Có lỗi xảy ra')
      }
    } catch {
      setError('Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#06060f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{ color: '#c9a84c', fontSize: '1.5rem', letterSpacing: '0.3em', marginBottom: '0.5rem' }}>✦ ✦ ✦</p>
          <h1 style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Thiết lập tài khoản Đại Sứ</h1>
        </div>

        <div style={{ background: 'rgba(18,13,46,0.8)', border: '1px solid rgba(200,148,63,0.16)', borderRadius: '16px', padding: '2rem' }}>
          <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            Chào mừng bạn! Hãy tạo mật khẩu và chọn mã giới thiệu riêng của bạn.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                Mã giới thiệu của bạn *
              </label>
              <input
                type="text"
                value={ctvCode}
                onChange={e => { setCtvCode(e.target.value); setCodeAvailable(null) }}
                onBlur={() => checkCode(ctvCode)}
                required
                placeholder="vd: hoa_linh hoặc NGUYEN2024"
                className="w-full"
                style={{
                  borderColor: ctvCode
                    ? codeAvailable === true ? 'rgba(74,222,128,0.5)' : codeAvailable === false ? 'rgba(196,82,82,0.5)' : undefined
                    : undefined,
                }}
              />
              {ctvCode.length >= 4 && codeAvailable === true && (
                <p style={{ color: '#4ade80', fontSize: '0.75rem', marginTop: '0.35rem', fontFamily: 'var(--font-vietnam)' }}>✓ Mã này có thể sử dụng</p>
              )}
              {ctvCode.length >= 4 && codeAvailable === false && (
                <p style={{ color: '#c8410a', fontSize: '0.75rem', marginTop: '0.35rem', fontFamily: 'var(--font-vietnam)' }}>✕ Mã đã được sử dụng</p>
              )}
              <p style={{ color: '#4a4560', fontSize: '0.72rem', marginTop: '0.3rem', fontFamily: 'var(--font-vietnam)' }}>
                Chỉ dùng chữ cái, số, dấu - hoặc _. Từ 4–20 ký tự.
              </p>
            </div>

            <div>
              <label style={{ display: 'block', color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                Mật khẩu mới *
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Ít nhất 8 ký tự"
                className="w-full"
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                Xác nhận mật khẩu *
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                placeholder="Nhập lại mật khẩu"
                className="w-full"
              />
            </div>

            {error && <p style={{ color: '#ef4444', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem' }}>{error}</p>}

            <button
              type="submit"
              disabled={loading || !ctvCode || !password || !confirm}
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
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: (loading || !ctvCode || !password || !confirm) ? 0.5 : 1,
                marginTop: '0.25rem',
              }}
            >
              {loading ? 'Đang lưu...' : 'Hoàn tất thiết lập →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function SetupPage() {
  return (
    <Suspense>
      <SetupForm />
    </Suspense>
  )
}
