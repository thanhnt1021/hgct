'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function RecoverInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState(searchParams.get('token') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-submit if token in URL
  const autoSubmitted = useRef(false)
  useEffect(() => {
    const urlToken = searchParams.get('token')
    if (urlToken && !autoSubmitted.current) {
      autoSubmitted.current = true
      handleSubmit(urlToken)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(tokenValue?: string) {
    const t = (tokenValue ?? token).toUpperCase().trim()
    if (!t) { setError('Vui lòng nhập mã khôi phục'); return }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const res = await fetch('/api/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: t }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Có lỗi xảy ra. Vui lòng thử lại.')
        setLoading(false)
        return
      }

      if (data.status === 'completed') {
        setMessage(data.message)
        setLoading(false)
        return
      }

      if (data.status === 'processing' && data.jobId) {
        router.push(`/processing?job=${data.jobId}&service=${data.service || ''}&name=${encodeURIComponent(data.name || '')}`)
        return
      }

      if (data.status === 'retrying') {
        router.push(`/processing?job=${data.jobId}&service=${data.service || ''}&name=${encodeURIComponent(data.name || '')}`)
        return
      }

      setMessage(data.message || 'Đang xử lý...')
      setLoading(false)
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(180deg, #edd5b1 0%, #e3c89a 100%)' }}>
      <div className="max-w-md w-full">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span style={{ color: 'var(--as-copper-deep)', fontSize: '0.7rem' }}>✦</span>
            <span style={{ color: 'var(--as-copper-deep)', fontSize: '1.1rem' }}>✦</span>
            <span style={{ color: 'var(--as-copper-deep)', fontSize: '0.7rem' }}>✦</span>
          </div>
          <h1 className="font-bold mb-2" style={{
            color: 'var(--as-text-strong)',
            fontFamily: 'var(--font-playfair)',
            fontSize: '1.4rem',
            letterSpacing: '0.06em',
          }}>
            Khôi phục báo cáo
          </h1>
          <p style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem', lineHeight: 1.7 }}>
            Nhập mã khôi phục từ email để tiếp tục xử lý báo cáo của bạn
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{
          background: 'var(--as-surface)',
          border: '1px solid var(--as-border-soft)',
          boxShadow: 'var(--as-shadow-card)',
        }}>

          {message ? (
            // Success / completed state
            <div className="text-center">
              <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>✅</p>
              <p style={{ color: '#3db88a', fontFamily: 'var(--font-vietnam)', fontSize: '1rem', lineHeight: 1.7 }}>
                {message}
              </p>
              <button
                onClick={() => router.push('/profile?tab=history')}
                className="mt-6 px-6 py-2.5 font-bold text-sm"
                style={{
                  background: 'var(--as-cta)',
                  color: 'var(--as-text-on-dark)',
                  borderRadius: '999px',
                  fontFamily: 'var(--font-vietnam)',
                  cursor: 'pointer',
                  boxShadow: 'var(--as-shadow-glow)',
                }}
              >
                Xem lịch sử báo cáo
              </button>
            </div>
          ) : (
            <>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: 'var(--as-text-muted)',
                fontFamily: 'var(--font-vietnam)',
                fontSize: '0.8rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                Mã khôi phục (8 ký tự)
              </label>
              <input
                ref={inputRef}
                type="text"
                value={token}
                onChange={e => setToken(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Ví dụ: ABC12345"
                maxLength={8}
                autoFocus
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'var(--as-surface-raised)',
                  border: error ? '1px solid rgba(239,68,68,0.5)' : '1px solid var(--as-border-gold)',
                  borderRadius: '10px',
                  color: 'var(--as-text-strong)',
                  fontFamily: 'var(--font-vietnam)',
                  fontSize: '1.4rem',
                  letterSpacing: '0.3em',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginBottom: '16px',
                }}
              />

              {error && (
                <p style={{
                  color: '#ef4444',
                  fontFamily: 'var(--font-vietnam)',
                  fontSize: '0.85rem',
                  marginBottom: '16px',
                  lineHeight: 1.6,
                }}>
                  {error}
                </p>
              )}

              <button
                onClick={() => handleSubmit()}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: loading ? 'rgba(22,54,83,0.3)' : 'var(--as-cta)',
                  color: loading ? 'var(--as-text-muted)' : 'var(--as-text-on-dark)',
                  fontFamily: 'var(--font-vietnam)',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  borderRadius: '999px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.04em',
                  transition: 'all 0.2s',
                  boxShadow: loading ? 'none' : 'var(--as-shadow-glow)',
                }}
              >
                {loading ? 'Đang xử lý...' : 'Khôi phục báo cáo →'}
              </button>
            </>
          )}
        </div>

        {/* Help */}
        <p className="text-center mt-6" style={{
          color: 'var(--as-text-muted)',
          fontFamily: 'var(--font-vietnam)',
          fontSize: '0.8rem',
          lineHeight: 1.7,
        }}>
          Không tìm thấy mã?{' '}
          <a
            href="mailto:support@hatgiongchiemtinh.com"
            style={{ color: 'var(--as-cta)', textDecoration: 'underline' }}
          >
            Liên hệ hỗ trợ
          </a>
        </p>
      </div>
    </div>
  )
}

export default function RecoverPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #edd5b1 0%, #e3c89a 100%)' }} />}>
      <RecoverInner />
    </Suspense>
  )
}
