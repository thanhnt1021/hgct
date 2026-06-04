'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/contexts/AuthContext'
import { COIN_PACKAGES } from '@/lib/coin/packages'

interface OrderInfo {
  orderId: number
  transferCode: string
  amount: number
  coins: number
  bankAccount: string
  bankName: string
  bankAccountName: string
}

const formatAmount = (n: number) => n.toLocaleString('vi-VN') + 'đ'
const fmtXu = (n: number) => n.toLocaleString('vi-VN')

const TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes — same as /payment

export default function CoinTopupPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [order, setOrder] = useState<OrderInfo | null>(null)
  const [creating, setCreating] = useState(false)
  const [creatingCode, setCreatingCode] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [paid, setPaid] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [bankExpanded, setBankExpanded] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(Math.floor(TIMEOUT_MS / 1000))

  const [back, setBack] = useState('') // màn quay lại sau khi nạp xong (vd trang reading)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const b = new URLSearchParams(window.location.search).get('back')
    if (b && b.startsWith('/')) setBack(b)
  }, [])

  // Guest → đăng nhập trước (kèm thông báo "nạp xu" + giữ nguyên next để quay lại trang nạp xu này).
  useEffect(() => {
    if (!isLoading && !user) {
      const nextUrl = window.location.pathname + window.location.search
      router.push(`/auth/login?reason=topup&next=${encodeURIComponent(nextUrl)}`)
    }
  }, [user, isLoading, router])

  // Nạp xong + có màn quay lại (vd trang reading) → tự quay về để dùng xu ngay.
  useEffect(() => {
    if (paid && back) {
      const t = setTimeout(() => router.push(back), 1500)
      return () => clearTimeout(t)
    }
  }, [paid, back, router])

  // Refresh balance on mount + whenever payment completes
  useEffect(() => {
    fetch('/api/coin/balance', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setBalance(typeof d.coin === 'number' ? d.coin : 0))
      .catch(() => {})
  }, [paid])

  // Poll payment status + countdown while waiting
  useEffect(() => {
    if (!order || paid) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/payment/status?orderId=${order.orderId}`, { cache: 'no-store' })
        const data = await res.json()
        if (data.paymentStatus === 'paid') {
          setPaid(true)
          if (intervalRef.current) clearInterval(intervalRef.current)
          if (countdownRef.current) clearInterval(countdownRef.current)
        }
      } catch { /* keep polling */ }
    }
    poll()
    intervalRef.current = setInterval(poll, 3000)

    setSecondsLeft(Math.floor(TIMEOUT_MS / 1000))
    countdownRef.current = setInterval(() => {
      setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [order, paid])

  const create = async (code: string) => {
    setError('')
    setCreating(true)
    setCreatingCode(code)
    try {
      const res = await fetch('/api/coin/topup-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageCode: code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Không tạo được đơn nạp xu')
        return
      }
      setOrder(data as OrderInfo)
    } finally {
      setCreating(false)
      setCreatingCode(null)
    }
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

  // SePay QR — same scheme as /payment
  const qrUrl = order && order.bankAccount && order.bankName
    ? `https://qr.sepay.vn/img?acc=${encodeURIComponent(order.bankAccount)}&bank=${encodeURIComponent(order.bankName)}&amount=${order.amount}&des=${encodeURIComponent(order.transferCode)}`
    : ''

  // ── Paid state — same shape as /payment "paid", but shows coin balance ──
  if (paid && order) {
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
            Nạp xu thành công!
          </h2>
          <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Đã cộng <strong style={{ color: '#d9ab55' }}>{fmtXu(order.coins)} xu</strong> vào tài khoản.
          </p>

          <div className="rounded-xl px-5 py-4 mb-6 inline-block"
            style={{ background: 'rgba(200,148,63,0.08)', border: '1px solid rgba(200,148,63,0.25)' }}>
            <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
              SỐ DƯ HIỆN TẠI
            </p>
            <p style={{ color: '#f0cc78', fontFamily: 'var(--font-vietnam)', fontSize: '1.9rem', fontWeight: 800, margin: 0 }}>
              {balance != null ? fmtXu(balance) : '…'} <span style={{ fontSize: '0.9rem', color: '#d9ab55', fontWeight: 600 }}>xu</span>
            </p>
          </div>

          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <button
              onClick={() => router.push(back || '/services')}
              style={{
                background: 'linear-gradient(135deg, #c8943f 0%, #f0cc78 50%, #c8943f 100%)',
                color: '#06060f', fontFamily: 'var(--font-vietnam)', fontWeight: 700, fontSize: '0.85rem',
                letterSpacing: '0.06em', padding: '0.85rem 1.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
              }}
            >
              {back ? 'Quay lại đọc tiếp →' : 'Bắt đầu xem luận giải →'}
            </button>
            <button
              onClick={() => { setPaid(false); setOrder(null); setError(''); setBankExpanded(false) }}
              style={{
                background: 'transparent', color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem',
                padding: '0.6rem', borderRadius: '4px', border: '1px solid rgba(200,148,63,0.2)', cursor: 'pointer',
              }}
            >
              Nạp thêm
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Waiting for payment — faithful clone of /payment ──
  if (order && !paid) {
    return (
      <div className="min-h-screen" style={{ background: '#06060f' }}>
        <Navbar />

        <div className="max-w-sm mx-auto px-4 pt-24 pb-16">

          {/* Title + amount */}
          <div className="text-center mb-5">
            <p style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.65rem', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '0.3rem' }}>
              THANH TOÁN
            </p>
            <p style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Nạp xu HGCT
            </p>
            <p style={{ color: '#6b6585', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem' }}>
              {fmtXu(order.coins)} xu
            </p>
            <div style={{ marginTop: '0.6rem' }}>
              <span style={{ color: '#f87171', fontFamily: 'var(--font-vietnam)', fontSize: '1.5rem', fontWeight: 800 }}>
                {formatAmount(order.amount)}
              </span>
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
                {order.transferCode}
              </span>
              <button
                onClick={() => handleCopy(order.transferCode)}
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
                  { label: 'Ngân hàng', value: order.bankName },
                  { label: 'Số tài khoản', value: order.bankAccount },
                  { label: 'Chủ tài khoản', value: order.bankAccountName },
                  { label: 'Số tiền', value: formatAmount(order.amount) },
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
                Tự động cộng xu khi nhận tiền.{' '}
                <span style={{ color: '#6b6040' }}>Đã CK chưa thấy? Đợi 1–2 phút.</span>
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ color: secondsLeft < 60 ? '#f87171' : '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.3rem', fontWeight: 800, letterSpacing: '0.05em', margin: 0 }}>
                {formatCountdown(secondsLeft)}
              </p>
            </div>
          </div>

          {/* Cancel link */}
          <div className="text-center">
            <button
              onClick={() => { setOrder(null); setError(''); setBankExpanded(false) }}
              style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(74,69,96,0.4)' }}
            >
              Chọn gói khác
            </button>
          </div>

          {error && (
            <p style={{ marginTop: '1rem', textAlign: 'center', color: '#f87171', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem' }}>⚠ {error}</p>
          )}
        </div>
      </div>
    )
  }

  // ── Package selection — celestial card, same look as /checkout ──
  return (
    <div className="min-h-screen" style={{ background: '#06060f' }}>
      <Navbar />
      <div className="max-w-lg mx-auto px-4 pt-28 pb-16">
        <div className="rounded-2xl p-8 sm:p-10"
          style={{ background: 'rgba(18,13,46,0.7)', border: '1px solid rgba(200,148,63,0.16)', backdropFilter: 'blur(20px)' }}>

          {/* Header */}
          <div className="text-center mb-8">
            <span className="text-5xl block mb-4">🪙</span>
            <p className="section-eyebrow mb-2" style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Nạp xu
            </p>
            <h1 style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
              Chọn gói nạp xu
            </h1>
            <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem', lineHeight: 1.6 }}>
              Xu dùng để mở từng mục trong các bản luận giải chiêm tinh.
            </p>
            {balance != null && (
              <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full"
                style={{ background: 'rgba(200,148,63,0.1)', border: '1px solid rgba(200,148,63,0.25)' }}>
                <span style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem' }}>Số dư:</span>
                <span style={{ color: '#f0cc78', fontFamily: 'var(--font-vietnam)', fontSize: '0.95rem', fontWeight: 700 }}>{fmtXu(balance)} xu</span>
              </div>
            )}
          </div>

          {/* Gold divider */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,148,63,0.3), transparent)', marginBottom: '1.75rem' }} />

          {/* Packages */}
          <div className="flex flex-col gap-3">
            {COIN_PACKAGES.filter(p => !p.hidden).map(p => {
              const disabled = !p.enabled || creating
              const loadingThis = creatingCode === p.code
              return (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => p.enabled && !creating && create(p.code)}
                  disabled={disabled}
                  className="w-full flex items-center justify-between"
                  style={{
                    textAlign: 'left',
                    background: 'rgba(255,255,255,0.025)',
                    border: `1px solid ${p.enabled ? 'rgba(200,148,63,0.18)' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: 12,
                    padding: '1rem 1.15rem',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: p.enabled ? 1 : 0.5,
                    transition: 'border-color 0.2s ease, background 0.2s ease',
                  }}
                  onMouseEnter={e => { if (p.enabled && !creating) { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(200,148,63,0.55)'; el.style.background = 'rgba(200,148,63,0.06)' } }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = p.enabled ? 'rgba(200,148,63,0.18)' : 'rgba(255,255,255,0.05)'; el.style.background = 'rgba(255,255,255,0.025)' }}
                >
                  <div>
                    <p style={{ color: '#6b6585', fontFamily: 'var(--font-vietnam)', fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                      {p.label}
                    </p>
                    {p.enabled ? (
                      <>
                        <p style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.35rem', fontWeight: 800, lineHeight: 1.1 }}>
                          {fmtXu(p.coins)} <span style={{ fontSize: '0.8rem', color: '#d9ab55', fontWeight: 600 }}>xu</span>
                        </p>
                        <p style={{ color: '#6b6585', fontFamily: 'var(--font-vietnam)', fontSize: '0.7rem', marginTop: '0.2rem' }}>
                          ≈ {Math.round(p.amountVnd / p.coins).toLocaleString('vi-VN')}đ / xu
                        </p>
                      </>
                    ) : (
                      <p style={{ color: '#6b6585', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem', marginTop: '0.2rem' }}>Sắp ra mắt</p>
                    )}
                  </div>
                  {p.enabled && (
                    <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '1rem' }}>
                      <p style={{ color: '#f0cc78', fontFamily: 'var(--font-vietnam)', fontSize: '1.05rem', fontWeight: 700 }}>
                        {loadingThis ? '…' : formatAmount(p.amountVnd)}
                      </p>
                      <p style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.7rem', marginTop: '0.15rem' }}>
                        {loadingThis ? 'Đang tạo…' : 'Chọn →'}
                      </p>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {error && (
            <p style={{ marginTop: '1.25rem', textAlign: 'center', color: '#f87171', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem' }}>⚠ {error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
