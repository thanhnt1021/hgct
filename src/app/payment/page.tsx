'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'

const SERVICE_NAMES: Record<string, string> = {
  career: 'Luận Giải Hướng Nghiệp',
  love: 'Luận Giải Tình Duyên',
  synastry: 'Luận Giải Cặp Đôi',
  transit: 'Luận Giải Vận Hạn',
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ'
}

const TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes

function PaymentInner() {
  const router = useRouter()
  const params = useSearchParams()

  const orderId = params.get('orderId') || ''
  const transferCode = params.get('transferCode') || ''
  const amount = Number(params.get('amount') || 0)
  const bankAccount = params.get('bankAccount') || ''
  const bankName = params.get('bankName') || ''
  const bankAccountName = params.get('bankAccountName') || ''
  const service = params.get('service') || ''
  const displayName = params.get('name') || ''

  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'paid' | 'expired'>('unpaid')
  const [jobId, setJobId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(Math.floor(TIMEOUT_MS / 1000))
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAt = useRef(Date.now())

  // Build SePay QR URL
  const qrUrl = bankAccount && bankName
    ? `https://qr.sepay.vn/img?acc=${encodeURIComponent(bankAccount)}&bank=${encodeURIComponent(bankName)}&amount=${amount}&des=${encodeURIComponent(transferCode)}`
    : ''

  useEffect(() => {
    if (!orderId) {
      router.push('/services')
      return
    }

    // Countdown timer
    countdownRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt.current
      const remaining = Math.max(0, Math.floor((TIMEOUT_MS - elapsed) / 1000))
      setSecondsLeft(remaining)
      if (remaining === 0) {
        if (countdownRef.current) clearInterval(countdownRef.current)
        if (intervalRef.current) clearInterval(intervalRef.current)
        setPaymentStatus('expired')
      }
    }, 1000)

    // Poll payment status every 3 seconds
    const poll = async () => {
      try {
        const res = await fetch(`/api/payment/status?orderId=${orderId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.paymentStatus === 'paid' && data.jobId) {
          setPaymentStatus('paid')
          setJobId(data.jobId)
          if (intervalRef.current) clearInterval(intervalRef.current)
          if (countdownRef.current) clearInterval(countdownRef.current)
          // Redirect to processing after brief success message
          setTimeout(() => {
            const p = new URLSearchParams({ job: data.jobId, service, name: displayName })
            router.replace(`/processing?${p.toString()}`)
          }, 1800)
        }
      } catch {
        // network error — keep polling
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 3000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [orderId, router, service, displayName])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // ── Paid state ──
  if (paymentStatus === 'paid') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#06060f' }}>
        <div className="text-center px-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(61,184,138,0.12)', border: '1px solid rgba(61,184,138,0.3)' }}
          >
            <span style={{ fontSize: '2.2rem' }}>✓</span>
          </div>
          <h2 style={{ color: '#3db88a', fontFamily: 'var(--font-vietnam)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Thanh toán thành công!
          </h2>
          <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem' }}>
            Đang chuyển sang trang xử lý báo cáo...
          </p>
          <div className="w-8 h-8 rounded-full animate-spin mx-auto mt-6"
            style={{ border: '2px solid rgba(200,148,63,0.15)', borderTopColor: '#d9ab55' }} />
        </div>
      </div>
    )
  }

  // ── Expired state ──
  if (paymentStatus === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#06060f' }}>
        <div
          className="max-w-sm w-full rounded-2xl p-8 text-center"
          style={{ background: 'rgba(18,13,46,0.8)', border: '1px solid rgba(200,148,63,0.15)' }}
        >
          <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏱</p>
          <h2 style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Hết thời gian chờ
          </h2>
          <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '2rem' }}>
            Phiên thanh toán đã hết hạn (15 phút). Vui lòng quay lại và thử lại.
          </p>
          <button
            onClick={() => router.push('/services')}
            style={{
              background: 'linear-gradient(135deg, #c8943f, #f0cc78)',
              color: '#06060f',
              fontFamily: 'var(--font-vietnam)',
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              padding: '0.75rem 2rem',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Quay lại chọn dịch vụ
          </button>
        </div>
      </div>
    )
  }

  // ── Waiting for payment ──
  return (
    <div className="min-h-screen" style={{ background: '#06060f' }}>
      <Navbar />

      <div className="max-w-md mx-auto px-4 pt-28 pb-16">
        {/* Card — light on dark, matching example */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(245,240,232,0.97)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header strip */}
          <div
            className="px-8 py-5 text-center"
            style={{ background: 'linear-gradient(135deg, #1a0f2e 0%, #0d0720 100%)', borderBottom: '1px solid rgba(200,148,63,0.2)' }}
          >
            <p style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.6rem', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '0.4rem' }}>
              THANH TOÁN
            </p>
            <h1 style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.03em' }}>
              {SERVICE_NAMES[service] || 'Báo cáo chiêm tinh'}
            </h1>
            {displayName && (
              <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem', marginTop: '0.3rem' }}>
                {displayName}
              </p>
            )}
          </div>

          <div className="px-8 py-7">
            {/* Amount */}
            <div className="text-center mb-6">
              <p style={{ color: '#6b6880', fontFamily: 'var(--font-vietnam)', fontSize: '0.7rem', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                SỐ TIỀN THANH TOÁN
              </p>
              <p style={{ color: '#c8410a', fontFamily: 'var(--font-vietnam)', fontSize: '2rem', fontWeight: 800, letterSpacing: '0.02em' }}>
                {formatAmount(amount)}
              </p>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(0,0,0,0.08)', marginBottom: '1.5rem' }} />

            {/* QR Code from SePay */}
            <div className="flex justify-center mb-6">
              {qrUrl ? (
                <div
                  className="rounded-xl p-3"
                  style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', display: 'inline-block' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrUrl}
                    alt="QR thanh toán SePay"
                    width={200}
                    height={200}
                    style={{ display: 'block', borderRadius: '8px' }}
                  />
                </div>
              ) : (
                <div
                  className="flex items-center justify-center rounded-xl"
                  style={{ width: 200, height: 200, background: '#f0ebe2', border: '2px dashed rgba(200,148,63,0.4)' }}
                >
                  <p style={{ color: '#b0a8a0', fontFamily: 'var(--font-vietnam)', fontSize: '0.65rem', textAlign: 'center' }}>
                    QR không khả dụng
                  </p>
                </div>
              )}
            </div>

            {/* Bank info */}
            <div
              className="rounded-xl p-5 mb-5"
              style={{ background: 'rgba(26,15,46,0.06)', border: '1px solid rgba(0,0,0,0.07)' }}
            >
              <p style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.6rem', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.75rem' }}>
                THÔNG TIN CHUYỂN KHOẢN
              </p>
              <div className="space-y-2.5">
                {[
                  { label: 'Ngân hàng', value: bankName },
                  { label: 'Số tài khoản', value: bankAccount },
                  { label: 'Chủ tài khoản', value: bankAccountName },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-baseline gap-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: '#9991a8', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', flexShrink: 0 }}>
                      {row.label}:
                    </span>
                    <span style={{ color: '#1a0f2e', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem', fontWeight: 600, textAlign: 'right' }}>
                      {row.value || '—'}
                    </span>
                  </div>
                ))}

                {/* Amount row */}
                <div className="flex justify-between items-baseline gap-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#9991a8', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', flexShrink: 0 }}>Số tiền:</span>
                  <span style={{ color: '#c8410a', fontFamily: 'var(--font-vietnam)', fontSize: '1.1rem', fontWeight: 800 }}>
                    {formatAmount(amount)}
                  </span>
                </div>

                {/* Transfer content — highlighted + copyable */}
                <div className="flex justify-between items-center gap-4 pt-1">
                  <span style={{ color: '#9991a8', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', flexShrink: 0 }}>
                    Nội dung CK:
                  </span>
                  <div className="flex items-center gap-2">
                    <span style={{ color: '#1a55e3', fontFamily: 'var(--font-vietnam)', fontSize: '1rem', fontWeight: 800, letterSpacing: '0.04em', background: 'rgba(26,85,227,0.08)', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                      {transferCode}
                    </span>
                    <button
                      onClick={() => handleCopy(transferCode)}
                      title="Sao chép nội dung"
                      style={{
                        background: copied ? 'rgba(61,184,138,0.15)' : 'rgba(0,0,0,0.06)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.25rem 0.5rem',
                        cursor: 'pointer',
                        color: copied ? '#3db88a' : '#9991a8',
                        fontFamily: 'var(--font-vietnam)',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                      }}
                    >
                      {copied ? '✓' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Auto-confirm notice */}
            <div
              className="rounded-xl p-4 mb-5"
              style={{ background: 'rgba(61,184,138,0.06)', border: '1px solid rgba(61,184,138,0.18)' }}
            >
              <div className="flex items-start gap-3">
                <span style={{ flexShrink: 0, marginTop: '0.1rem' }}>
                  <span className="animate-pulse" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#3db88a' }} />
                </span>
                <p style={{ color: '#2d8f6a', fontFamily: 'var(--font-vietnam)', fontSize: '0.8rem', lineHeight: 1.6, margin: 0 }}>
                  Hệ thống sẽ <strong>tự động xác nhận</strong> và tạo báo cáo ngay khi nhận được tiền — bạn không cần làm gì thêm.
                </p>
              </div>
            </div>

            {/* Countdown */}
            <div className="text-center mb-5">
              <p style={{ color: '#9991a8', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                Phiên thanh toán còn hiệu lực
              </p>
              <p style={{
                color: secondsLeft < 60 ? '#c8410a' : '#3d2b5e',
                fontFamily: 'var(--font-vietnam)',
                fontSize: '1.4rem',
                fontWeight: 800,
                letterSpacing: '0.05em',
              }}>
                {formatCountdown(secondsLeft)}
              </p>
            </div>

            {/* Cancel link */}
            <div className="text-center">
              <button
                onClick={() => router.push('/services')}
                style={{ color: '#9991a8', fontFamily: 'var(--font-vietnam)', fontSize: '0.8rem', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(153,145,168,0.4)' }}
              >
                Hủy giao dịch
              </button>
            </div>
          </div>
        </div>

        {/* Help note */}
        <p style={{ color: '#38287a', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', textAlign: 'center', marginTop: '1.25rem', lineHeight: 1.7 }}>
          Quét mã QR hoặc chuyển khoản thủ công với đúng nội dung <strong style={{ color: '#4a3870' }}>{transferCode}</strong>.<br />
          Báo cáo sẽ được gửi tới email sau khi xác nhận.
        </p>
      </div>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#06060f' }} />}>
      <PaymentInner />
    </Suspense>
  )
}
