'use client'

// VISUAL ONLY — checkout page restyled to Celestial Sanctum design
// All logic (handleConfirm, sessionStorage reads, API call, routing) untouched

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/contexts/AuthContext'
import { saveJobToHistory } from '@/lib/jobHistory'

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

const SERVICE_ETA: Record<string, string> = {
  career: '3–4',
  love: '4–5',
  synastry: '6–8',
  transit: '6–8',
}

// Shared label style
const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.5rem',
  color: '#d9ab55',
  fontFamily: 'var(--font-vietnam)',
  fontSize: '0.62rem',
  fontWeight: 700,
  letterSpacing: '0.06em',

}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const isPremium = user?.isPremium ?? false
  const planType = user?.planType ?? 'free'
  const isPremiumOrLifetime = isPremium || planType === 'lifetime'
  const premiumToken = user?.premiumToken ?? ''
  const [service, setService] = useState('')
  const [inputData, setInputData] = useState<Record<string, unknown> | null>(null)
  const [inputDataB, setInputDataB] = useState<Record<string, unknown> | null>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [profileUidA, setProfileUidA] = useState('')
  const [profileUidB, setProfileUidB] = useState('')
  const [transitStartDate, setTransitStartDate] = useState('')
  const [transitEndDate, setTransitEndDate] = useState('')

  useEffect(() => {
    const svc = sessionStorage.getItem('selectedService') || ''
    const data = sessionStorage.getItem('inputData')
    const dataB = sessionStorage.getItem('inputDataB')
    setProfileUidA(sessionStorage.getItem('profileUidA') || '')
    setProfileUidB(sessionStorage.getItem('profileUidB') || '')
    if (svc === 'transit') {
      setTransitStartDate(sessionStorage.getItem('transitStartDate') || '')
      setTransitEndDate(sessionStorage.getItem('transitEndDate') || '')
    }

    if (!svc || !data) {
      router.push('/services')
      return
    }

    setService(svc)
    if (data) setInputData(JSON.parse(data))
    if (dataB) setInputDataB(JSON.parse(dataB))

    // Pre-fill with reportEmail if set, else account email
    fetch('/api/user/account', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then((data: { reportEmail?: string; accountEmail?: string } | null) => {
        const prefill = data?.reportEmail || data?.accountEmail || user?.email || ''
        if (prefill) setEmail(prefill)
      })
      .catch(() => { if (user?.email) setEmail(user.email) })
  }, [user, router])

  const fmtDate = (s: string) => { if (!s) return ''; const [y,m,d] = s.split('-'); return `${d}/${m}/${y}` }

  const nameA = (inputData?.name as string) || ''
  const nameB = (inputDataB?.name as string) || ''
  const displayName = service === 'synastry' && nameB ? `${nameA} & ${nameB}` : nameA
  const eta = SERVICE_ETA[service] || '5–8'

  // Free user: create order then go to payment page
  const handlePayment = async () => {
    if (!email.trim()) { alert('Vui lòng nhập email để nhận báo cáo'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service,
          inputData,
          email: email.trim(),
          ...(inputDataB ? { inputDataB } : {}),
          ...(profileUidA ? { profileUidA } : {}),
          ...(profileUidB ? { profileUidB } : {}),
          ...(service === 'transit' && transitStartDate && transitEndDate
            ? { startDate: transitStartDate, endDate: transitEndDate }
            : {}),
        }),
      })
      const result = await res.json()
      if (res.ok && result.orderId) {
        sessionStorage.setItem('paymentOrderId', String(result.orderId))
        sessionStorage.setItem('paymentEmail', email.trim())
        const params = new URLSearchParams({
          orderId: String(result.orderId),
          transferCode: result.transferCode,
          amount: String(result.amount),
          bankAccount: result.bankAccount,
          bankName: result.bankName,
          bankAccountName: result.bankAccountName,
          service,
          name: displayName,
        })
        router.push(`/payment?${params.toString()}`)
      } else {
        alert(result.error || 'Có lỗi khi tạo đơn hàng')
        setLoading(false)
      }
    } catch {
      alert('Lỗi kết nối server')
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!email.trim()) { alert('Vui lòng nhập email để nhận báo cáo'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/astrology/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service,
          inputData,
          email: email.trim(),
          premiumToken,
          name: displayName,
          ...(profileUidA ? { profileUid: profileUidA } : {}),
          ...(service === 'synastry' && inputDataB ? { inputDataB, ...(profileUidB ? { profileUidB } : {}) } : {}),
          ...(service === 'transit' && transitStartDate && transitEndDate ? { startDate: transitStartDate, endDate: transitEndDate } : {}),
        }),
      })
      const result = await res.json()
      if (res.ok && result.jobId) {
        if (user?.username) {
          saveJobToHistory(user.username, {
            jobId: result.jobId,
            service: service as 'career' | 'love' | 'synastry' | 'transit',
            name: displayName,
            email: email.trim(),
            createdAt: new Date().toISOString(),
          })
        }
        const params = new URLSearchParams({ job: result.jobId, service, name: displayName })
        router.push(`/processing?${params.toString()}`)
      } else {
        alert(result.error || 'Có lỗi xảy ra')
        setLoading(false)
      }
    } catch {
      alert('Lỗi kết nối server')
      setLoading(false)
    }
  }

  // Auth still resolving
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#06060f' }}>
        <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '2px solid rgba(200,148,63,0.15)', borderTopColor: '#d9ab55' }} />
      </div>
    )
  }

  // Brief loading spinner while getting jobId
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#06060f' }}>
        <div className="text-center">
          <div
            className="w-10 h-10 rounded-full animate-spin mx-auto mb-4"
            style={{ border: '2px solid rgba(200,148,63,0.15)', borderTopColor: '#d9ab55' }}
          />
          <p style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.65rem', letterSpacing: '0.06em' }}>
            ĐANG KẾT NỐI
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#06060f' }}>
      <Navbar />

      <div className="max-w-lg mx-auto px-4 pt-28 pb-16">
        <div
          className="rounded-2xl p-8 sm:p-10"
          style={{
            background: 'rgba(18,13,46,0.7)',
            border: '1px solid rgba(200,148,63,0.16)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Header */}
          <div className="text-center mb-10">
            <span className="text-5xl block mb-4">{SERVICE_ICONS[service] || '✦'}</span>
            <p className="section-eyebrow mb-2">Xác nhận đặt báo cáo</p>
            <h1
              style={{
                color: '#f4efe6',
                fontFamily: 'var(--font-vietnam)',
                fontSize: '1.4rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                marginBottom: '0.4rem',
              }}
            >
              Luận giải {SERVICE_NAMES[service] || service}
            </h1>
            <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem' }}>
              {displayName}
            </p>
          </div>

          {/* Gold divider */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,148,63,0.3), transparent)', marginBottom: '2rem' }} />

          {/* Order summary */}
          <div className="space-y-3 mb-8">
            {[
              { label: 'Dịch vụ', value: `Luận giải ${SERVICE_NAMES[service] || service}`, valueColor: '#f4efe6' },
              { label: 'Khách hàng', value: displayName, valueColor: '#f4efe6' },
              ...(service === 'transit' && transitStartDate && transitEndDate
                ? [{ label: 'Giai đoạn', value: `${fmtDate(transitStartDate)} → ${fmtDate(transitEndDate)}`, valueColor: '#f4efe6' }]
                : []),
              { label: 'Thời gian tạo', value: `~ ${eta} phút`, valueColor: '#d9ab55' },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-baseline">
                <span style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.65rem', letterSpacing: '0.04em' }}>
                  {row.label}
                </span>
                <span style={{ color: row.valueColor, fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem' }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Email field */}
          <div className="mb-8">
            <label style={labelStyle}>Email nhận báo cáo PDF</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full"
              style={{ borderColor: email ? undefined : 'rgba(196,82,82,0.35)' }}
            />
            {user?.email && email === user.email && (
              <p style={{ color: '#4a4560', fontSize: '0.75rem', marginTop: '0.5rem', fontFamily: 'var(--font-vietnam)', fontStyle: 'italic' }}>
                ✦ Lấy từ tài khoản đăng nhập
              </p>
            )}
            {!email && (
              <p style={{ color: '#8a8399', fontSize: '0.75rem', marginTop: '0.5rem', fontFamily: 'var(--font-vietnam)' }}>
                Báo cáo PDF sẽ được gửi đến địa chỉ email này
              </p>
            )}
          </div>

          {/* CTA: Premium/Lifetime → create report directly; Free/Guest → create order + go to payment */}
          {isPremiumOrLifetime ? (
            <>
              <button
                onClick={handleConfirm}
                disabled={!email.trim()}
                className="w-full py-4 font-bold text-sm tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, #c8943f 0%, #f0cc78 50%, #c8943f 100%)',
                  backgroundSize: '200% 200%',
                  color: '#06060f',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-vietnam)',
                  letterSpacing: '0.1em',
                  opacity: !email.trim() ? 0.4 : 1,
                  boxShadow: email.trim() ? '0 4px 24px rgba(200,148,63,0.3)' : 'none',
                  transition: 'opacity 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                Tạo báo cáo &amp; Gửi Email
              </button>
              <p style={{ color: '#4a4560', fontSize: '0.75rem', textAlign: 'center', marginTop: '0.85rem', fontFamily: 'var(--font-vietnam)' }}>
                Báo cáo PDF sẽ được gửi đến email trong {eta} phút
              </p>
            </>
          ) : (
            <>
              <button
                onClick={handlePayment}
                disabled={!email.trim()}
                className="w-full py-4 font-bold text-sm tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, #c8943f 0%, #f0cc78 50%, #c8943f 100%)',
                  backgroundSize: '200% 200%',
                  color: '#06060f',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-vietnam)',
                  letterSpacing: '0.1em',
                  opacity: !email.trim() ? 0.4 : 1,
                  boxShadow: email.trim() ? '0 4px 24px rgba(200,148,63,0.3)' : 'none',
                  transition: 'opacity 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                Tiến hành thanh toán →
              </button>
              <p style={{ color: '#4a4560', fontSize: '0.75rem', textAlign: 'center', marginTop: '0.85rem', fontFamily: 'var(--font-vietnam)' }}>
                Hoàn tất thanh toán để nhận báo cáo PDF qua email
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
