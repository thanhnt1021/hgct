'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Check, X, Star } from 'lucide-react'

type Billing = 'monthly' | 'yearly'

// planType values that map to "Standard" (the old 'premium' DB value = equivalent of new Standard)
const isStandard = (planType: string) => planType === 'premium' || planType === 'standard'
const isCaoCap = (planType: string) => planType === 'cao_cap'
const isLifetime = (planType: string) => planType === 'lifetime'

const PLANS = [
  {
    id: 'free',
    name: 'Miễn phí',
    color: '#6b7280',
    recommended: false,
    features: [
      'Xem bản đồ sao tương tác',
      'Lưu tối đa 5 bản đồ sao',
      'Tổng quan cung & hành tinh',
    ],
    locked: [
      'Báo cáo chiêm tinh chi tiết (PDF)',
      'Báo cáo Synastry & Vận hạn',
      'Hỗ trợ khách hàng',
    ],
  },
  {
    id: 'standard',
    name: 'Tiêu chuẩn',
    recommended: true,
    color: '#c9a84c',
    monthly: { price: '79.000đ', period: '/tháng' },
    yearly:  { price: '699.000đ', period: '/năm', perMonth: '~58.000đ/tháng', savings: '26%' },
    features: [
      'Tất cả tính năng Miễn phí',
      'Lưu không giới hạn bản đồ sao',
      'Báo cáo Sự nghiệp chi tiết (PDF)',
      'Báo cáo Tình yêu chi tiết (PDF)',
      'Hỗ trợ qua email',
    ],
    locked: [
      'Báo cáo Synastry (so sánh cặp đôi)',
      'Báo cáo Transit & Vận hạn',
    ],
  },
  {
    id: 'cao_cap',
    name: 'Cao cấp',
    color: '#a78bfa',
    recommended: false,
    monthly: { price: '149.000đ', period: '/tháng' },
    yearly:  { price: '1.290.000đ', period: '/năm', perMonth: '~108.000đ/tháng', savings: '28%' },
    features: [
      'Tất cả tính năng Tiêu chuẩn',
      'Báo cáo Synastry (so sánh cặp đôi)',
      'Báo cáo Transit & Vận hạn',
      'Ưu tiên nhận tính năng mới',
      'Hỗ trợ ưu tiên',
    ],
    locked: [],
  },
] as const

export default function SubscriptionPlans() {
  const { user, upgradeToPremium } = useAuth()
  const [billing, setBilling] = useState<Billing>('monthly')
  const [activationCode, setActivationCode] = useState('')
  const [activating, setActivating] = useState(false)
  const [activationError, setActivationError] = useState('')
  const [activationSuccess, setActivationSuccess] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  const planType = user?.planType ?? 'free'
  const isPremium = user?.isPremium ?? false

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  const handleActivate = async () => {
    if (!activationCode.trim()) return
    setActivating(true); setActivationError(''); setActivationSuccess(false)
    const result = await upgradeToPremium(activationCode)
    setActivating(false)
    if (result.ok) {
      setActivationSuccess(true)
      setActivationCode('')
    } else {
      setActivationError(result.error || 'Mã không hợp lệ')
    }
  }

  // Current plan label
  const currentLabel = isLifetime(planType)
    ? 'Lifetime ★'
    : isCaoCap(planType)
    ? 'Cao cấp ✦'
    : isStandard(planType)
    ? 'Tiêu chuẩn ✦'
    : 'Miễn phí'

  // Is a given visible plan card the user's active plan?
  const isActive = (id: string) => {
    if (id === 'free') return !isPremium
    if (id === 'standard') return isStandard(planType)
    if (id === 'cao_cap') return isCaoCap(planType)
    return false
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>
        Gói dịch vụ
      </h2>
      <p className="text-sm mb-6" style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)' }}>
        Chọn gói phù hợp với nhu cầu chiêm tinh của bạn.
      </p>

      {/* Current plan badge */}
      {isPremium && (
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ background: isLifetime(planType) ? 'rgba(167,139,250,0.1)' : 'rgba(201,168,76,0.1)', border: `1px solid ${isLifetime(planType) ? 'rgba(167,139,250,0.3)' : 'rgba(201,168,76,0.3)'}` }}>
          <Star size={13} style={{ color: isLifetime(planType) ? '#a78bfa' : '#d9ab55' }} />
          <span style={{ color: isLifetime(planType) ? '#a78bfa' : '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem', fontWeight: 600 }}>
            Gói hiện tại: {currentLabel}
          </span>
        </div>
      )}

      {/* Billing toggle */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center p-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => setBilling('monthly')}
            className="px-5 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              background: billing === 'monthly' ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: billing === 'monthly' ? '#f4efe6' : '#6b7280',
              fontFamily: 'var(--font-vietnam)',
            }}
          >
            Tháng
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className="px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2"
            style={{
              background: billing === 'yearly' ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: billing === 'yearly' ? '#f4efe6' : '#6b7280',
              fontFamily: 'var(--font-vietnam)',
            }}
          >
            Năm
            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', fontSize: '0.65rem' }}>
              −26%
            </span>
          </button>
        </div>
      </div>

      {/* Plan cards — 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {PLANS.map(plan => {
          const active = isActive(plan.id)
          const isRec = plan.recommended
          const pricing = plan.id !== 'free'
            ? (plan as typeof PLANS[1])[billing]
            : null

          return (
            <div key={plan.id}
              className="rounded-2xl p-5 flex flex-col relative"
              style={{
                background: isRec ? 'rgba(41,31,70,0.8)' : 'rgba(26,21,53,0.5)',
                border: active
                  ? `2px solid ${plan.color}`
                  : isRec
                  ? `1.5px solid rgba(201,168,76,0.35)`
                  : '1px solid rgba(201,168,76,0.1)',
                boxShadow: isRec ? '0 0 32px rgba(201,168,76,0.06)' : 'none',
              }}
            >
              {/* Recommended badge */}
              {isRec && !active && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: '#c9a84c', color: '#0a0a1a', fontFamily: 'var(--font-vietnam)', whiteSpace: 'nowrap' }}>
                  ✦ Phổ biến nhất
                </div>
              )}
              {active && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: plan.color, color: '#0a0a1a', fontFamily: 'var(--font-vietnam)', whiteSpace: 'nowrap' }}>
                  Đang dùng
                </div>
              )}

              {/* Plan name */}
              <p className="font-bold text-base mb-3" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>
                {plan.name}
              </p>

              {/* Price */}
              <div className="mb-4">
                {pricing ? (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold" style={{ color: plan.color, fontFamily: 'var(--font-vietnam)', letterSpacing: '-0.02em' }}>
                        {pricing.price}
                      </span>
                      <span className="text-sm" style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)' }}>
                        {pricing.period}
                      </span>
                    </div>
                    {billing === 'yearly' && 'perMonth' in pricing && (
                      <p className="text-xs mt-1" style={{ color: '#4ade80', fontFamily: 'var(--font-vietnam)' }}>
                        {(pricing as typeof PLANS[1]['yearly']).perMonth}
                      </p>
                    )}
                    {billing === 'monthly' && (
                      <p className="text-xs mt-1" style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)' }}>
                        Chu kỳ 30 ngày từ ngày thanh toán
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold" style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)' }}>0đ</span>
                    <span className="text-sm" style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)' }}>/mãi mãi</span>
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="flex-1 space-y-2.5 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: '#c4b89a', fontFamily: 'var(--font-vietnam)' }}>
                    <Check size={13} style={{ color: plan.color, marginTop: '0.25rem', flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
                {plan.locked.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: '#3d3558', fontFamily: 'var(--font-vietnam)' }}>
                    <X size={13} style={{ color: '#3d3558', marginTop: '0.25rem', flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {active ? (
                <div className="py-2.5 text-center rounded-xl text-sm font-semibold"
                  style={{ background: `${plan.color}18`, color: plan.color, border: `1px solid ${plan.color}44`, fontFamily: 'var(--font-vietnam)' }}>
                  Gói hiện tại
                </div>
              ) : plan.id === 'free' ? (
                <div className="py-2.5 text-center rounded-xl text-sm"
                  style={{ color: '#4a4560', border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'var(--font-vietnam)' }}>
                  Gói cơ bản
                </div>
              ) : (
                <button
                  onClick={() => showToast('Tính năng thanh toán sẽ sớm ra mắt. Liên hệ hỗ trợ để được tư vấn nâng cấp.')}
                  className="py-2.5 rounded-xl text-sm font-semibold w-full transition-all"
                  style={{
                    background: isRec
                      ? 'linear-gradient(135deg,#c8943f,#f0cc78)'
                      : `${plan.color}22`,
                    color: isRec ? '#0a0a1a' : plan.color,
                    border: isRec ? 'none' : `1px solid ${plan.color}44`,
                    fontFamily: 'var(--font-vietnam)',
                  }}
                >
                  {isRec ? 'Nâng cấp ngay →' : 'Chọn gói này →'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Feature comparison note */}
      <p className="text-center text-xs mb-8" style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)' }}>
        Gói Năm: 365 ngày từ ngày thanh toán · Hủy bất cứ lúc nào
      </p>

      {/* Activation code */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(26,21,53,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-sm font-medium mb-1" style={{ color: '#94a3b8', fontFamily: 'var(--font-vietnam)' }}>
          Có mã kích hoạt đặc biệt?
        </p>
        <p className="text-xs mb-3" style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)' }}>
          Nhập mã để kích hoạt gói dịch vụ ngay lập tức.
        </p>
        {activationSuccess ? (
          <div className="py-3 text-center rounded-xl" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem' }}>
            ✓ Kích hoạt thành công! Tài khoản đã được nâng cấp.
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={activationCode}
                onChange={e => setActivationCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleActivate()}
                placeholder="Nhập mã kích hoạt..."
                className="flex-1"
                style={{ fontFamily: 'var(--font-vietnam)', textTransform: 'none' }}
              />
              <button
                onClick={handleActivate}
                disabled={activating || !activationCode.trim()}
                className="px-5 py-2 rounded-xl font-semibold text-sm"
                style={{
                  background: activationCode.trim() ? 'linear-gradient(135deg,#c8943f,#f0cc78)' : 'rgba(201,168,76,0.1)',
                  color: activationCode.trim() ? '#0a0a1a' : '#6b7280',
                  fontFamily: 'var(--font-vietnam)',
                  opacity: activating ? 0.7 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {activating ? 'Đang xử lý...' : 'Kích hoạt'}
              </button>
            </div>
            {activationError && (
              <p className="mt-2 text-xs" style={{ color: '#e87070', fontFamily: 'var(--font-vietnam)' }}>{activationError}</p>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm max-w-sm text-center"
          style={{ background: 'rgba(11,11,31,0.97)', border: '1px solid rgba(201,168,76,0.2)', color: '#f4efe6', fontFamily: 'var(--font-vietnam)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          {toastMsg}
        </div>
      )}
    </div>
  )
}
