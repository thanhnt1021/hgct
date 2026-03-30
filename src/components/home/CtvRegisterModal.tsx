'use client'

import { useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
}

export default function CtvRegisterModal({ open, onClose }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [dob, setDob] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [ctvId, setCtvId] = useState<number | null>(null)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim() || !email.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ctv/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim(), dob: dob || undefined }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setCtvId(data.ctvId ?? null)
        setDone(true)
        // Mở trang setup ngay lập tức trong tab mới (không phụ thuộc vào click link sau)
        if (data.ctvId) {
          window.open(`https://daisu.hatgiongchiemtinh.com/setup?ctvId=${data.ctvId}`, '_blank')
        }
      } else {
        setError(data.error || 'Có lỗi xảy ra, vui lòng thử lại.')
      }
    } catch {
      setError('Lỗi kết nối, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setDone(false)
    setError('')
    setName('')
    setPhone('')
    setEmail('')
    setDob('')
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(200,148,63,0.2)',
    borderRadius: '8px',
    color: '#f4efe6',
    fontFamily: 'var(--font-vietnam)',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.4rem',
    color: '#d9ab55',
    fontFamily: 'var(--font-vietnam)',
    fontSize: '0.62rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'linear-gradient(135deg, #0f0f28, #1a1535)',
          border: '1px solid rgba(200,148,63,0.2)',
          borderRadius: '16px',
          padding: '2rem 1.75rem',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer',
            fontSize: '1.25rem',
            lineHeight: 1,
          }}
        >
          ×
        </button>

        {done ? (
          <div className="text-center">
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌟</div>
            <h3 style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Đăng ký thành công!
            </h3>
            <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              Chúng tôi đã nhận được thông tin của bạn.<br />
              Hãy truy cập trang Đại Sứ để thiết lập mật khẩu và mã giới thiệu của bạn.
            </p>
            <a
              href={ctvId ? `https://daisu.hatgiongchiemtinh.com/setup?ctvId=${ctvId}` : 'https://daisu.hatgiongchiemtinh.com'}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '0.75rem 2rem',
                background: 'linear-gradient(135deg, #c8943f, #f0cc78)',
                color: '#06060f',
                borderRadius: '4px',
                fontFamily: 'var(--font-vietnam)',
                fontSize: '0.88rem',
                fontWeight: 700,
                textDecoration: 'none',
                letterSpacing: '0.04em',
              }}
            >
              Vào trang Đại Sứ →
            </a>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: '#c9a84c', fontFamily: 'var(--font-vietnam)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Chương trình Đại Sứ
              </p>
              <h3 style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                Đăng ký làm Đại Sứ
              </h3>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Họ và tên *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Số điện thoại *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="09xxxxxxxx"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Ngày sinh (tuỳ chọn)</label>
                <input
                  type="date"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                />
              </div>

              {error && (
                <p style={{ color: '#ef4444', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !name.trim() || !phone.trim() || !email.trim()}
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
                  opacity: (loading || !name.trim() || !phone.trim() || !email.trim()) ? 0.5 : 1,
                  marginTop: '0.25rem',
                }}
              >
                {loading ? 'Đang gửi...' : 'Đăng ký ngay →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
