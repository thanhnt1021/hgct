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
  const [copied, setCopied] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(Math.floor(TIMEOUT_MS / 1000))
  const [failCount, setFailCount] = useState(0)
  const [countdownPaused, setCountdownPaused] = useState(false)

  // Countdown-expired state: show 2 branches
  const [showExpiredChoice, setShowExpiredChoice] = useState(false)
  const [showClaimForm, setShowClaimForm] = useState(false)
  const [claimAmount, setClaimAmount] = useState('')
  const [claimContent, setClaimContent] = useState('')
  const [claimSubmitting, setClaimSubmitting] = useState(false)
  const [claimDone, setClaimDone] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAt = useRef(Date.now())
  const pausedAt = useRef(0)   // timestamp when pause started
  const pausedMs = useRef(0)   // total ms paused

  // Build SePay QR URL
  const qrUrl = bankAccount && bankName
    ? `https://qr.sepay.vn/img?acc=${encodeURIComponent(bankAccount)}&bank=${encodeURIComponent(bankName)}&amount=${amount}&des=${encodeURIComponent(transferCode)}`
    : ''

  useEffect(() => {
    if (!orderId) {
      router.push('/services')
      return
    }

    // Countdown timer — respects pause
    countdownRef.current = setInterval(() => {
      if (countdownPaused) return
      const elapsed = (Date.now() - startedAt.current) - pausedMs.current
      const remaining = Math.max(0, Math.floor((TIMEOUT_MS - elapsed) / 1000))
      setSecondsLeft(remaining)
      if (remaining === 0) {
        if (countdownRef.current) clearInterval(countdownRef.current)
        if (intervalRef.current) clearInterval(intervalRef.current)
        // Final status check before showing expired
        checkOnceOnExpiry()
      }
    }, 1000)

    // Poll payment status every 3 seconds
    const poll = async () => {
      try {
        const res = await fetch(`/api/payment/status?orderId=${orderId}`)
        if (!res.ok) throw new Error('not ok')
        const data = await res.json()
        setFailCount(0)
        setCountdownPaused(false)
        if (countdownPaused && pausedAt.current > 0) {
          pausedMs.current += Date.now() - pausedAt.current
          pausedAt.current = 0
        }
        if (data.paymentStatus === 'paid' && data.jobId) {
          setPaymentStatus('paid')
          if (intervalRef.current) clearInterval(intervalRef.current)
          if (countdownRef.current) clearInterval(countdownRef.current)
          setTimeout(() => {
            const p = new URLSearchParams({ job: data.jobId, service, name: displayName })
            router.replace(`/processing?${p.toString()}`)
          }, 1800)
        }
      } catch {
        setFailCount(prev => {
          const next = prev + 1
          if (next >= 4 && !countdownPaused) {
            setCountdownPaused(true)
            pausedAt.current = Date.now()
          }
          return next
        })
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 3000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, router, service, displayName])

  // Update pause tracking when countdownPaused changes
  useEffect(() => {
    if (countdownPaused) {
      if (pausedAt.current === 0) pausedAt.current = Date.now()
    } else {
      if (pausedAt.current > 0) {
        pausedMs.current += Date.now() - pausedAt.current
        pausedAt.current = 0
      }
    }
  }, [countdownPaused])

  async function checkOnceOnExpiry() {
    try {
      const res = await fetch(`/api/payment/status?orderId=${orderId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.paymentStatus === 'paid' && data.jobId) {
          setPaymentStatus('paid')
          setTimeout(() => {
            const p = new URLSearchParams({ job: data.jobId, service, name: displayName })
            router.replace(`/processing?${p.toString()}`)
          }, 1800)
          return
        }
      }
    } catch { /* ignore */ }
    setShowExpiredChoice(true)
  }

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

  const handleClaim = async () => {
    setClaimSubmitting(true)
    try {
      await fetch('/api/payment/claim-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: Number(orderId), amount: Number(claimAmount) || undefined, transferContent: claimContent || undefined }),
      })
      setClaimDone(true)
    } catch {
      setClaimDone(true)  // show success anyway — backend handles retry
    } finally {
      setClaimSubmitting(false)
    }
  }

  // Polling status banner
  const statusBanner = (() => {
    if (failCount === 0) return null
    if (failCount <= 3) return null  // silent
    if (failCount <= 10) return { text: '⏳ Đang kết nối lại...', color: '#d9ab55' }
    if (failCount <= 20) return { text: '🔄 Hệ thống đang cập nhật. Giao dịch vẫn an toàn.', color: '#d9ab55' }
    return { text: '⚠️ Mất kết nối. Đã CK thì hệ thống sẽ tự xác nhận khi khôi phục.', color: '#e87070' }
  })()

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

  // ── Expired state: show 2 branches ──
  if (showExpiredChoice) {
    if (claimDone) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#06060f' }}>
          <div className="max-w-sm w-full rounded-2xl p-8 text-center"
            style={{ background: 'rgba(18,13,46,0.8)', border: '1px solid rgba(61,184,138,0.2)' }}>
            <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>📬</p>
            <h2 style={{ color: '#3db88a', fontFamily: 'var(--font-vietnam)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Đã ghi nhận!
            </h2>
            <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem', lineHeight: 1.7 }}>
              Admin sẽ xác nhận và tạo báo cáo trong vòng <strong style={{ color: '#d9ab55' }}>30 phút</strong>.<br />
              Báo cáo sẽ gửi đến email của bạn.
            </p>
          </div>
        </div>
      )
    }

    if (showClaimForm) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#06060f' }}>
          <div className="max-w-sm w-full rounded-2xl p-8"
            style={{ background: 'rgba(18,13,46,0.8)', border: '1px solid rgba(200,148,63,0.2)' }}>
            <h2 style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center' }}>
              🖐️ Báo đã chuyển khoản
            </h2>
            <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.83rem', lineHeight: 1.7, marginBottom: '1.5rem', textAlign: 'center' }}>
              Điền thông tin để admin xác nhận nhanh hơn
            </p>
            <div className="space-y-4">
              <div>
                <label style={{ display: 'block', color: '#d9ab55', fontSize: '0.65rem', letterSpacing: '0.06em', fontWeight: 700, marginBottom: '0.4rem', fontFamily: 'var(--font-vietnam)' }}>
                  Số tiền đã chuyển
                </label>
                <input
                  type="number"
                  value={claimAmount}
                  onChange={e => setClaimAmount(e.target.value)}
                  placeholder={`${amount > 0 ? amount : 'VD: 9999'}`}
                  className="w-full"
                  style={{ fontFamily: 'var(--font-vietnam)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#d9ab55', fontSize: '0.65rem', letterSpacing: '0.06em', fontWeight: 700, marginBottom: '0.4rem', fontFamily: 'var(--font-vietnam)' }}>
                  Nội dung chuyển khoản
                </label>
                <input
                  type="text"
                  value={claimContent}
                  onChange={e => setClaimContent(e.target.value)}
                  placeholder={transferCode || 'VD: HGCT001234'}
                  className="w-full"
                  style={{ fontFamily: 'var(--font-vietnam)' }}
                />
              </div>
              <button
                onClick={handleClaim}
                disabled={claimSubmitting}
                className="w-full py-3 font-bold text-sm"
                style={{
                  background: 'linear-gradient(135deg, #c8943f, #f0cc78)',
                  color: '#06060f',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-vietnam)',
                  opacity: claimSubmitting ? 0.7 : 1,
                  cursor: claimSubmitting ? 'not-allowed' : 'pointer',
                  border: 'none',
                  letterSpacing: '0.08em',
                }}
              >
                {claimSubmitting ? 'Đang gửi...' : 'Gửi thông tin →'}
              </button>
              <button
                onClick={() => setShowClaimForm(false)}
                style={{ width: '100%', background: 'none', border: 'none', color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.83rem', cursor: 'pointer', paddingTop: '0.5rem' }}
              >
                ← Quay lại
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#06060f' }}>
        <div className="max-w-sm w-full rounded-2xl p-8 text-center"
          style={{ background: 'rgba(18,13,46,0.8)', border: '1px solid rgba(200,148,63,0.15)' }}>
          <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏱</p>
          <h2 style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Hết thời gian chờ
          </h2>
          <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '2rem' }}>
            Phiên thanh toán đã hết hạn (15 phút).
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowClaimForm(true)}
              style={{
                background: 'linear-gradient(135deg, #c8943f, #f0cc78)',
                color: '#06060f', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem',
                fontWeight: 700, letterSpacing: '0.06em', padding: '0.85rem 1.5rem',
                borderRadius: '4px', border: 'none', cursor: 'pointer',
              }}
            >
              ✋ Tôi đã chuyển khoản rồi
            </button>
            <button
              onClick={() => router.push('/services')}
              style={{
                background: 'transparent', color: '#8a8399', fontFamily: 'var(--font-vietnam)',
                fontSize: '0.85rem', padding: '0.85rem 1.5rem', borderRadius: '4px',
                border: '1px solid rgba(200,148,63,0.15)', cursor: 'pointer',
              }}
            >
              Chưa CK — Quay lại chọn dịch vụ
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Waiting for payment ──
  return (
    <div className="min-h-screen" style={{ background: '#06060f' }}>
      <Navbar />

      {/* Connection status banner */}
      {statusBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 text-center py-2 px-4"
          style={{ background: 'rgba(18,13,46,0.95)', borderBottom: `1px solid ${statusBanner.color}33` }}>
          <p style={{ color: statusBanner.color, fontFamily: 'var(--font-vietnam)', fontSize: '0.8rem' }}>
            {statusBanner.text}
          </p>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 pt-28 pb-16">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(245,240,232,0.97)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
        >
          {/* Header strip — includes amount */}
          <div className="px-6 py-5 text-center"
            style={{ background: 'linear-gradient(135deg, #1a0f2e 0%, #0d0720 100%)', borderBottom: '1px solid rgba(200,148,63,0.2)' }}>
            <p style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.6rem', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '0.3rem' }}>
              THANH TOÁN
            </p>
            <h1 style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.03em', marginBottom: '0.2rem' }}>
              {SERVICE_NAMES[service] || 'Báo cáo chiêm tinh'}
            </h1>
            {displayName && (
              <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem', marginBottom: '0.4rem' }}>
                {displayName}
              </p>
            )}
            <p style={{ color: '#c8410a', fontFamily: 'var(--font-vietnam)', fontSize: '1.6rem', fontWeight: 800, letterSpacing: '0.02em', margin: 0 }}>
              {formatAmount(amount)}
            </p>
          </div>

          <div className="px-6 py-5">

            {/* QR Code from SePay */}
            <div className="flex justify-center mb-6">
              {qrUrl ? (
                <div className="rounded-xl p-3"
                  style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', display: 'inline-block' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt="QR thanh toán SePay" width={200} height={200}
                    style={{ display: 'block', borderRadius: '8px' }} />
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-xl"
                  style={{ width: 200, height: 200, background: '#f0ebe2', border: '2px dashed rgba(200,148,63,0.4)' }}>
                  <p style={{ color: '#b0a8a0', fontFamily: 'var(--font-vietnam)', fontSize: '0.65rem', textAlign: 'center' }}>
                    QR không khả dụng
                  </p>
                </div>
              )}
            </div>

            {/* Bank info */}
            <div className="rounded-xl p-4 mb-4"
              style={{ background: 'rgba(26,15,46,0.06)', border: '1px solid rgba(0,0,0,0.07)' }}>
              <p style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.6rem', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.6rem' }}>
                THÔNG TIN CHUYỂN KHOẢN
              </p>
              <div className="space-y-2">
                {[
                  { label: 'Ngân hàng', value: bankName },
                  { label: 'Số tài khoản', value: bankAccount },
                  { label: 'Chủ tài khoản', value: bankAccountName },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-baseline gap-4"
                    style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: '#9991a8', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', flexShrink: 0 }}>
                      {row.label}:
                    </span>
                    <span style={{ color: '#1a0f2e', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem', fontWeight: 600, textAlign: 'right' }}>
                      {row.value || '—'}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-baseline gap-4"
                  style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#9991a8', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', flexShrink: 0 }}>Số tiền:</span>
                  <span style={{ color: '#c8410a', fontFamily: 'var(--font-vietnam)', fontSize: '1.1rem', fontWeight: 800 }}>
                    {formatAmount(amount)}
                  </span>
                </div>
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
                        border: 'none', borderRadius: '6px', padding: '0.25rem 0.5rem',
                        cursor: 'pointer', color: copied ? '#3db88a' : '#9991a8',
                        fontFamily: 'var(--font-vietnam)', fontSize: '0.7rem', fontWeight: 600, transition: 'all 0.2s',
                      }}
                    >
                      {copied ? '✓' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Combined notice */}
            <div className="rounded-lg px-4 py-3 mb-4 flex items-center gap-3"
              style={{ background: 'rgba(61,184,138,0.05)', border: '1px solid rgba(61,184,138,0.15)' }}>
              <span className="animate-pulse" style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#3db88a', flexShrink: 0 }} />
              <p style={{ color: '#4a6660', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', lineHeight: 1.6, margin: 0 }}>
                Tự động xác nhận và tạo báo cáo ngay khi nhận tiền.{' '}
                <span style={{ color: '#8a7a55' }}>💡 Đã CK chưa thấy? Đợi 1–2 phút.</span>
              </p>
            </div>

            {/* Countdown */}
            <div className="text-center mb-4">
              <p style={{ color: '#9991a8', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                {countdownPaused ? 'Đang kết nối lại — đếm ngược tạm dừng' : 'Phiên thanh toán còn hiệu lực'}
              </p>
              <p style={{
                color: countdownPaused ? '#8a8399' : (secondsLeft < 60 ? '#c8410a' : '#3d2b5e'),
                fontFamily: 'var(--font-vietnam)', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.05em',
                opacity: countdownPaused ? 0.5 : 1,
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
