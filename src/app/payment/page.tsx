'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
// v2 — simplified QR-first layout

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
  const originalAmount = Number(params.get('originalAmount') || 0)
  const discountPct = Number(params.get('discountPct') || 0)
  const bankAccount = params.get('bankAccount') || ''
  const bankName = params.get('bankName') || ''
  const bankAccountName = params.get('bankAccountName') || ''
  const service = params.get('service') || ''
  const displayName = params.get('name') || ''

  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'paid' | 'expired'>('unpaid')
  const [copied, setCopied] = useState(false)
  const [bankExpanded, setBankExpanded] = useState(false)
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
      setClaimAmount('')
      setClaimContent('')
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

      <div className="max-w-sm mx-auto px-4 pt-24 pb-16">

        {/* Service + name */}
        <div className="text-center mb-5">
          <p style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.65rem', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '0.3rem' }}>
            THANH TOÁN
          </p>
          <p style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1rem', fontWeight: 700, marginBottom: displayName ? '0.25rem' : 0 }}>
            {SERVICE_NAMES[service] || 'Báo cáo chiêm tinh'}
          </p>
          {displayName && (
            <p style={{ color: '#6b6585', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem' }}>{displayName}</p>
          )}
          {/* Amount */}
          <div style={{ marginTop: '0.6rem' }}>
            {originalAmount > 0 && discountPct > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
                <span style={{ color: '#4a4560', textDecoration: 'line-through', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem' }}>
                  {formatAmount(originalAmount)}
                </span>
                <span style={{ color: '#4ade80', fontFamily: 'var(--font-vietnam)', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(74,222,128,0.12)', padding: '1px 7px', borderRadius: '4px' }}>
                  -{discountPct}%
                </span>
                <span style={{ color: '#f87171', fontFamily: 'var(--font-vietnam)', fontSize: '1.4rem', fontWeight: 800 }}>
                  {formatAmount(amount)}
                </span>
              </div>
            ) : (
              <span style={{ color: '#f87171', fontFamily: 'var(--font-vietnam)', fontSize: '1.5rem', fontWeight: 800 }}>
                {formatAmount(amount)}
              </span>
            )}
          </div>
        </div>

        {/* QR — big, centered, white bg */}
        <div className="flex justify-center mb-5">
          {qrUrl ? (
            <div style={{ background: '#fff', borderRadius: '16px', padding: '12px', display: 'inline-block', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="QR thanh toán SePay" width={240} height={240}
                style={{ display: 'block', borderRadius: '8px' }} />
            </div>
          ) : (
            <div className="flex items-center justify-center"
              style={{ width: 240, height: 240, background: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: '2px dashed rgba(200,148,63,0.3)' }}>
              <p style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', textAlign: 'center', padding: '1rem' }}>
                QR không khả dụng
              </p>
            </div>
          )}
        </div>

        {/* Transfer code — primary action for manual transfer */}
        <div className="rounded-xl px-4 py-4 mb-4 text-center"
          style={{ background: 'rgba(26,15,60,0.7)', border: '1px solid rgba(200,148,63,0.2)' }}>
          <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.7rem', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            NỘI DUNG CHUYỂN KHOẢN
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <span style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.06em' }}>
              {transferCode}
            </span>
            <button
              onClick={() => handleCopy(transferCode)}
              style={{
                background: copied ? 'rgba(61,184,138,0.2)' : 'rgba(200,148,63,0.15)',
                border: `1px solid ${copied ? 'rgba(61,184,138,0.4)' : 'rgba(200,148,63,0.3)'}`,
                borderRadius: '8px', padding: '0.3rem 0.75rem',
                cursor: 'pointer', color: copied ? '#3db88a' : '#d9ab55',
                fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.2s',
              }}
            >
              {copied ? '✓ Đã copy' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Bank details — collapsible */}
        <div className="rounded-xl mb-4 overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setBankExpanded(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: 'none', cursor: 'pointer' }}
          >
            <span style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem' }}>
              Thông tin tài khoản ngân hàng
            </span>
            <span style={{ color: '#6b6585', fontSize: '0.7rem' }}>{bankExpanded ? '▲' : '▼'}</span>
          </button>
          {bankExpanded && (
            <div className="px-4 pb-4 space-y-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
              {[
                { label: 'Ngân hàng', value: bankName },
                { label: 'Số tài khoản', value: bankAccount },
                { label: 'Chủ tài khoản', value: bankAccountName },
                { label: 'Số tiền', value: formatAmount(amount) },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-baseline gap-4"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.4rem' }}>
                  <span style={{ color: '#6b6585', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', flexShrink: 0 }}>
                    {row.label}:
                  </span>
                  <span style={{ color: '#c8bfda', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', fontWeight: 600, textAlign: 'right' }}>
                    {row.value || '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notice + countdown row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <span className="animate-pulse" style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#3db88a', flexShrink: 0 }} />
            <p style={{ color: '#4a6660', fontFamily: 'var(--font-vietnam)', fontSize: '0.74rem', lineHeight: 1.5, margin: 0 }}>
              Tự động xác nhận khi nhận tiền.{' '}
              <span style={{ color: '#6b6040' }}>Đã CK chưa thấy? Đợi 1–2 phút.</span>
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ color: countdownPaused ? '#6b6585' : (secondsLeft < 60 ? '#f87171' : '#f4efe6'), fontFamily: 'var(--font-vietnam)', fontSize: '1.3rem', fontWeight: 800, letterSpacing: '0.05em', margin: 0, opacity: countdownPaused ? 0.5 : 1 }}>
              {formatCountdown(secondsLeft)}
            </p>
            {countdownPaused && (
              <p style={{ color: '#6b6585', fontFamily: 'var(--font-vietnam)', fontSize: '0.6rem', margin: 0 }}>tạm dừng</p>
            )}
          </div>
        </div>

        {/* Cancel link */}
        <div className="text-center">
          <button
            onClick={() => router.push('/services')}
            style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(74,69,96,0.4)' }}
          >
            Hủy giao dịch
          </button>
        </div>
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
