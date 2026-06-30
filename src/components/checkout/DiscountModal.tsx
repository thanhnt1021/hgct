'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import LuckyWheelModal from './LuckyWheelModal'

interface Props {
  open: boolean
  service: string
  email?: string // used to gate Lucky Wheel (hidden for returning buyers)
  onClose: () => void
  /** Called when user is ready to proceed to checkout. */
  onProceed: (discount: { referralCode?: string; wheelDiscountPct?: number }) => void
}

export default function DiscountModal({ open, service, email, onClose, onProceed }: Props) {
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [showWheel, setShowWheel] = useState(false)
  // firstTime: true = never bought before → show wheel; false = returning → hide wheel
  // null = still loading check → render as first-time skeleton to avoid flash
  const [firstTime, setFirstTime] = useState<boolean | null>(null)

  useEffect(() => {
    if (!open) return
    // Reset on every open so navigating back re-checks the email
    setFirstTime(null)
    const e = (email || '').trim().toLowerCase()
    if (!e) { setFirstTime(true); return }
    fetch(`/api/referral/check-first-time?email=${encodeURIComponent(e)}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() as Promise<{ firstTime: boolean }> : { firstTime: true })
      .then(d => setFirstTime(d.firstTime))
      .catch(() => setFirstTime(true))
  }, [open, email])

  if (!open) return null

  const handleVerifyCode = async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) { setCodeError('Vui lòng nhập mã giới thiệu'); return }
    setVerifying(true)
    setCodeError('')
    try {
      const res = await fetch('/api/referral/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      })
      const data = await res.json() as { valid: boolean; flatPrice?: number }
      if (data.valid) {
        onProceed({ referralCode: trimmed })
      } else {
        setCodeError('Mã không hợp lệ hoặc đã hết hạn')
      }
    } catch {
      setCodeError('Lỗi kết nối, thử lại sau')
    } finally {
      setVerifying(false)
    }
  }

  const handleWheelResult = (pct: number) => {
    setShowWheel(false)
    onProceed({ wheelDiscountPct: pct })
  }

  // While checking, render modal shell but hide options to avoid showing wheel for a returning buyer
  const showWheelSection = firstTime === true

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(22,54,83,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div
          className="w-full rounded-2xl as-form"
          style={{ maxWidth: 420, background: 'var(--as-surface-raised)', border: '1px solid var(--as-border-gold)', boxShadow: 'var(--as-shadow-card)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--as-border-gold)' }}>
            <h3 className="font-bold text-base" style={{ color: 'var(--as-text-strong)', fontFamily: 'var(--font-playfair)' }}>
              {firstTime === false ? 'Tiếp tục thanh toán' : 'Ưu đãi đặc biệt'}
            </h3>
            <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--as-text-strong)', background: 'transparent', border: '1px solid var(--as-border-gold)' }}>
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {/* Option A: Referral code — always shown */}
            <div className="rounded-xl p-4" style={{ border: '1px solid var(--as-border-gold)', background: 'var(--as-surface)' }}>
              <p className="font-semibold text-sm mb-1" style={{ color: 'var(--as-text-strong)', fontFamily: 'var(--font-vietnam)' }}>
                Có mã đại sứ?
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)' }}>
                Nhập mã để được giảm xuống còn <strong style={{ color: 'var(--as-text-strong)' }}>99.000đ</strong> (flat)
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={e => { setCode(e.target.value.toUpperCase()); setCodeError('') }}
                  placeholder="VD: HGCT2026"
                  maxLength={20}
                  style={{ flex: 1, textTransform: 'uppercase', fontSize: '0.85rem' }}
                  onKeyDown={e => { if (e.key === 'Enter') handleVerifyCode() }}
                />
                <button
                  onClick={handleVerifyCode}
                  disabled={verifying}
                  className="px-4 h-9 rounded-lg font-semibold text-sm"
                  style={{ background: 'var(--as-cta)', color: 'var(--as-text-on-dark)', fontFamily: 'var(--font-vietnam)', opacity: verifying ? 0.7 : 1, flexShrink: 0 }}
                >
                  {verifying ? '...' : 'Áp dụng'}
                </button>
              </div>
              {codeError && (
                <p className="text-xs mt-1.5" style={{ color: '#ef4444', fontFamily: 'var(--font-vietnam)' }}>⚠ {codeError}</p>
              )}
            </div>

            {/* Wheel — only shown for first-time buyers */}
            {showWheelSection && (
              <>
                <div className="flex items-center gap-3">
                  <div style={{ flex: 1, height: '1px', background: 'var(--as-border-gold)' }} />
                  <span className="text-xs" style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)' }}>HOẶC</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--as-border-gold)' }} />
                </div>

                <div className="rounded-xl p-4 text-center" style={{ border: '1px solid var(--as-border-gold)', background: 'var(--as-surface)' }}>
                  <p className="font-semibold text-sm mb-1" style={{ color: 'var(--as-text-strong)', fontFamily: 'var(--font-vietnam)' }}>
                    Vòng Xoay May Mắn 🎡
                  </p>
                  <p className="text-xs mb-3" style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)' }}>
                    Quay thử để nhận ưu đãi ngẫu nhiên từ 5% đến 30%
                  </p>
                  <button
                    onClick={() => setShowWheel(true)}
                    className="w-full h-10 rounded-lg font-semibold text-sm"
                    style={{ background: 'var(--as-cta)', color: 'var(--as-text-on-dark)', fontFamily: 'var(--font-vietnam)' }}
                  >
                    Quay ngay →
                  </button>
                </div>
              </>
            )}

            {/* Continue button — label varies */}
            <button
              onClick={() => onProceed({})}
              className="w-full text-center text-sm py-2.5 rounded-lg font-semibold"
              style={
                firstTime === false
                  ? { background: 'var(--as-cta)', color: 'var(--as-text-on-dark)', fontFamily: 'var(--font-vietnam)' }
                  : { color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)' }
              }
            >
              {firstTime === false ? 'Tiếp tục thanh toán →' : 'Bỏ qua, tiếp tục với giá gốc'}
            </button>
          </div>
        </div>
      </div>

      <LuckyWheelModal
        open={showWheel}
        service={service}
        onClose={() => setShowWheel(false)}
        onResult={handleWheelResult}
      />
    </>
  )
}
