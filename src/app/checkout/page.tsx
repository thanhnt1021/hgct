'use client'

// VISUAL ONLY — checkout page restyled to Celestial Sanctum design
// All logic (handleConfirm, sessionStorage reads, API call, routing) untouched

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  const { user } = useAuth()
  const isPremium = user?.isPremium ?? false
  const premiumToken = user?.premiumToken ?? ''
  const [service, setService] = useState('')
  const [inputData, setInputData] = useState<Record<string, unknown> | null>(null)
  const [inputDataB, setInputDataB] = useState<Record<string, unknown> | null>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const svc = sessionStorage.getItem('selectedService') || ''
    const data = sessionStorage.getItem('inputData')
    const dataB = sessionStorage.getItem('inputDataB')

    if (!svc || !data) {
      router.push('/services')
      return
    }

    setService(svc)
    if (data) setInputData(JSON.parse(data))
    if (dataB) setInputDataB(JSON.parse(dataB))

    if (user?.email) setEmail(user.email)
  }, [user, router])

  const nameA = (inputData?.name as string) || ''
  const nameB = (inputDataB?.name as string) || ''
  const displayName = service === 'synastry' && nameB ? `${nameA} & ${nameB}` : nameA
  const eta = SERVICE_ETA[service] || '5–8'

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
          ...(service === 'synastry' && inputDataB ? { inputDataB } : {}),
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

  // Premium gate — shown when user is not logged in or not premium
  if (!user || !isPremium) {
    return (
      <div className="min-h-screen" style={{ background: '#06060f' }}>
        <Navbar />
        <div className="max-w-lg mx-auto px-4 pt-28 pb-16">
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: 'rgba(18,13,46,0.7)', border: '1px solid rgba(200,148,63,0.2)', backdropFilter: 'blur(20px)' }}
          >
            {/* Icon */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8"
              style={{ background: 'rgba(200,148,63,0.08)', border: '1px solid rgba(200,148,63,0.25)' }}
            >
              <span style={{ fontSize: '2.2rem' }}>✦</span>
            </div>

            <p className="section-eyebrow mb-3">Tài khoản Premium</p>
            <h1
              style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}
            >
              Chỉ dành cho tài khoản nâng cấp
            </h1>

            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,148,63,0.3), transparent)', margin: '1.5rem 0' }} />

            <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '1rem', lineHeight: 1.8, marginBottom: '2rem' }}>
              {!user
                ? 'Vui lòng đăng nhập và nâng cấp tài khoản để tạo báo cáo chiêm tinh.'
                : 'Tài khoản của bạn chưa được nâng cấp. Vui lòng nâng cấp để tạo báo cáo.'}
            </p>

            <div className="flex flex-col gap-3">
              {!user ? (
                <>
                  <Link
                    href="/auth/login"
                    className="block py-4 font-bold text-sm tracking-wider text-center"
                    style={{ background: 'linear-gradient(135deg, #c8943f 0%, #f0cc78 50%, #c8943f 100%)', color: '#06060f', borderRadius: '4px', fontFamily: 'var(--font-vietnam)', letterSpacing: '0.1em' }}
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/auth/register"
                    className="block py-3.5 font-semibold text-sm text-center"
                    style={{ border: '1px solid rgba(200,148,63,0.3)', color: '#d9ab55', borderRadius: '4px', fontFamily: 'var(--font-vietnam)' }}
                  >
                    Tạo tài khoản
                  </Link>
                </>
              ) : (
                <Link
                  href="/profile"
                  className="block py-4 font-bold text-sm tracking-wider text-center"
                  style={{ background: 'linear-gradient(135deg, #c8943f 0%, #f0cc78 50%, #c8943f 100%)', color: '#06060f', borderRadius: '4px', fontFamily: 'var(--font-vietnam)', letterSpacing: '0.1em' }}
                >
                  Nâng cấp tài khoản →
                </Link>
              )}
              <button
                onClick={() => router.back()}
                style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
              >
                ← Quay lại
              </button>
            </div>
          </div>
        </div>
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
              { label: 'Thời gian tạo', value: `~ ${eta} phút`, valueColor: '#d9ab55' },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-baseline">
                <span style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.65rem', letterSpacing: '0.04em',  }}>
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

          {/* Payment placeholder */}
          <div
            className="rounded-xl p-5 mb-8"
            style={{
              background: 'rgba(6,6,15,0.6)',
              border: '1px solid rgba(200,148,63,0.1)',
            }}
          >
            <p
              style={{
                color: '#4a4560',
                fontFamily: 'var(--font-vietnam)',
                fontSize: '0.6rem',
                letterSpacing: '0.06em',
                
                marginBottom: '0.85rem',
              }}
            >
              Thanh toán
            </p>
            <div className="space-y-1.5" style={{ fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem' }}>
              <p style={{ color: '#4a4560' }}>Ngân hàng: <span style={{ color: '#c9c3d6' }}>MB Bank</span></p>
              <p style={{ color: '#4a4560' }}>Số TK: <span style={{ color: '#c9c3d6' }}>xxxx xxxx xxxx</span></p>
              <p style={{ color: '#4a4560' }}>Chủ TK: <span style={{ color: '#c9c3d6' }}>HAT GIONG CHIEM TINH</span></p>
            </div>
          </div>

          {/* Confirm button */}
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
            Tạo báo cáo & Gửi Email
          </button>

          <p style={{ color: '#4a4560', fontSize: '0.75rem', textAlign: 'center', marginTop: '0.85rem', fontFamily: 'var(--font-vietnam)' }}>
            Báo cáo PDF sẽ được gửi đến email trong {eta} phút
          </p>
        </div>
      </div>
    </div>
  )
}
