'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const SERVICE_NAMES: Record<string, string> = {
  career: 'Hướng Nghiệp',
  love: 'Tình Duyên',
  synastry: 'Cặp Đôi',
  transit: 'Vận Hạn',
}

const SERVICE_ICONS: Record<string, string> = {
  career: '🎯',
  love: '💝',
  synastry: '💑',
  transit: '🔮',
}

interface PreviewInput {
  service: string
  inputData: Record<string, unknown>
  inputDataB?: Record<string, unknown>
  startDate?: string
  endDate?: string
  email?: string
  ctvCode?: string
}

export default function PreviewPage() {
  const router = useRouter()
  const [pdfId, setPdfId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('Đang khởi tạo...')
  const [error, setError] = useState('')
  const [previewInput, setPreviewInput] = useState<PreviewInput | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [emailError, setEmailError] = useState('')
  const hasStarted = useRef(false)

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    const raw = typeof window !== 'undefined' ? localStorage.getItem('previewInput') : null
    if (!raw) {
      setError('Không tìm thấy dữ liệu. Vui lòng quay lại và chọn dịch vụ.')
      setLoading(false)
      return
    }

    let parsed: PreviewInput
    try {
      parsed = JSON.parse(raw)
    } catch {
      setError('Dữ liệu không hợp lệ.')
      setLoading(false)
      return
    }

    setPreviewInput(parsed)

    // Start SSE fetch
    fetch('/api/astrology/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    }).then(async (res) => {
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as Record<string, string>).error || 'Preview thất bại')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })

        // Parse SSE events
        const parts = buf.split('\n\n')
        buf = parts.pop() || ''
        for (const part of parts) {
          const lines = part.split('\n')
          const eventLine = lines.find(l => l.startsWith('event: '))
          const dataLine = lines.find(l => l.startsWith('data: '))
          if (!eventLine || !dataLine) continue
          const eventType = eventLine.replace('event: ', '').trim()
          let data: Record<string, unknown> = {}
          try { data = JSON.parse(dataLine.replace('data: ', '')) } catch {}

          if (eventType === 'progress') {
            setProgress(Number(data.pct) || 0)
            setProgressLabel(String(data.label || ''))
          } else if (eventType === 'complete') {
            setPdfId(String(data.id))
            setProgress(100)
            setLoading(false)
          } else if (eventType === 'error') {
            throw new Error(String(data.message || 'Lỗi không xác định'))
          }
        }
      }
    }).catch((err: unknown) => {
      setError((err as Error).message || 'Không thể tạo bản xem trước')
      setLoading(false)
    })
  }, [])

  const service = previewInput?.service || ''
  const serviceName = SERVICE_NAMES[service] || 'Chiêm Tinh'
  const serviceIcon = SERVICE_ICONS[service] || '✦'
  const email = previewInput?.email || ''

  const handleGetFullReport = () => {
    if (!previewInput) return
    const { service: svc, inputData, inputDataB, startDate, endDate, email: em, ctvCode } = previewInput
    sessionStorage.setItem('selectedService', svc)
    sessionStorage.setItem('inputData', JSON.stringify(inputData))
    if (inputDataB) sessionStorage.setItem('inputDataB', JSON.stringify(inputDataB))
    else sessionStorage.removeItem('inputDataB')
    if (svc === 'transit' && startDate) sessionStorage.setItem('transitStartDate', startDate)
    if (svc === 'transit' && endDate) sessionStorage.setItem('transitEndDate', endDate)
    if (em) sessionStorage.setItem('checkoutEmail', em)
    if (ctvCode) sessionStorage.setItem('ctvCode', ctvCode)
    sessionStorage.setItem('autoCheckout', '1')
    router.push('/checkout')
  }

  const handleSendEmail = async () => {
    if (!pdfId || !email || emailSent || emailSending) return
    setEmailSending(true)
    setEmailError('')
    try {
      const res = await fetch('/api/astrology/preview-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pdfId,
          email,
          service,
          name: (previewInput?.inputData?.name as string) || '',
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as Record<string, string>).error || 'Gửi email thất bại')
      }
      setEmailSent(true)
    } catch (err) {
      setEmailError((err as Error).message || 'Gửi email thất bại')
    } finally {
      setEmailSending(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#06060f',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-vietnam, sans-serif)',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.25rem',
          background: 'rgba(18,13,46,0.95)',
          borderBottom: '1px solid rgba(200,148,63,0.15)',
          flexShrink: 0,
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>{serviceIcon}</span>
          <span style={{ color: '#f4efe6', fontWeight: 600, fontSize: '0.9rem' }}>
            Xem trước — {serviceName}
          </span>
          <span
            style={{
              background: 'rgba(200,148,63,0.15)',
              color: '#d9ab55',
              border: '1px solid rgba(200,148,63,0.3)',
              borderRadius: '4px',
              padding: '1px 8px',
              fontSize: '0.68rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
            }}
          >
            MIỄN PHÍ
          </span>
        </div>
        <button
          onClick={handleGetFullReport}
          style={{
            background: 'linear-gradient(135deg, #c8943f, #f0cc78)',
            color: '#06060f',
            borderRadius: '4px',
            padding: '0.45rem 1rem',
            fontWeight: 700,
            fontSize: '0.82rem',
            textDecoration: 'none',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Nhận báo cáo đầy đủ →
        </button>
      </div>

      {/* Loading state with progress bar */}
      {loading && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '2rem' }}>
          {/* Spinner */}
          <div
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '50%',
              border: '2px solid rgba(200,148,63,0.15)',
              borderTopColor: '#d9ab55',
              animation: 'spin 0.9s linear infinite',
              flexShrink: 0,
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          {/* Progress bar */}
          <div style={{ width: '100%', maxWidth: 360 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <p style={{ color: '#8a8399', fontSize: '0.82rem', margin: 0 }}>{progressLabel}</p>
              <p style={{ color: '#d9ab55', fontSize: '0.82rem', margin: 0, fontWeight: 600 }}>{progress}%</p>
            </div>
            <div style={{ height: '4px', background: 'rgba(200,148,63,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #c8943f, #f0cc78)',
                  borderRadius: '2px',
                  transition: 'width 0.4s ease',
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>

          <p style={{ color: '#4a4560', fontSize: '0.78rem', textAlign: 'center', maxWidth: 300, lineHeight: 1.6, margin: 0 }}>
            Đang phân tích bản đồ sao và tạo luận giải cho bạn…
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '2rem' }}>
          <p style={{ color: '#f87171', fontSize: '1rem', textAlign: 'center' }}>⚠ {error}</p>
          <a
            href="/services"
            style={{ color: '#d9ab55', fontSize: '0.9rem', textDecoration: 'underline' }}
          >
            ← Quay lại trang dịch vụ
          </a>
        </div>
      )}

      {/* PDF iframe */}
      {pdfId && !loading && (
        <>
          {/* Email send bar */}
          {email && (
            <div
              style={{
                background: 'rgba(10,8,28,0.97)',
                borderBottom: '1px solid rgba(200,148,63,0.1)',
                padding: '0.6rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexShrink: 0,
              }}
            >
              <p style={{ color: '#6b7280', fontSize: '0.78rem', margin: 0, flex: 1, lineHeight: 1.4 }}>
                Gửi bản xem trước này vào{' '}
                <span style={{ color: '#9090a8' }}>{email}</span>
              </p>
              {!emailSent ? (
                <button
                  onClick={handleSendEmail}
                  disabled={emailSending}
                  style={{
                    background: 'rgba(200,148,63,0.12)',
                    border: '1px solid rgba(200,148,63,0.3)',
                    color: emailSending ? '#6b7280' : '#d9ab55',
                    borderRadius: '4px',
                    padding: '0.35rem 0.85rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: emailSending ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {emailSending ? 'Đang gửi...' : 'Gửi vào email'}
                </button>
              ) : (
                <span style={{ color: '#4ade80', fontSize: '0.78rem', fontWeight: 600, flexShrink: 0 }}>✓ Đã gửi</span>
              )}
              {emailError && (
                <span style={{ color: '#f87171', fontSize: '0.75rem' }}>{emailError}</span>
              )}
            </div>
          )}

          <iframe
            src={`/api/astrology/preview-pdf/${pdfId}`}
            style={{ flex: 1, border: 'none', minHeight: 0 }}
            title="Bản xem trước báo cáo chiêm tinh"
          />

          {/* Info bar at bottom */}
          <div
            style={{
              background: 'rgba(18,13,46,0.97)',
              borderTop: '1px solid rgba(200,148,63,0.1)',
              padding: '0.6rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <p style={{ color: '#4a4560', fontSize: '0.75rem', lineHeight: 1.5, margin: 0 }}>
              Đây là bản xem trước — <span style={{ color: '#6b7280' }}>phần 1 của báo cáo. Nhấn nút ở trên để nhận đầy đủ.</span>
            </p>
          </div>
        </>
      )}
    </div>
  )
}
