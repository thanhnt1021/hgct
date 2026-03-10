'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Check, Crown } from 'lucide-react'

const PLANS = [
  {
    id: 'free',
    name: 'Miễn phí',
    price: '0đ',
    period: '',
    badge: null,
    features: [
      'Xem bản đồ sao cơ bản',
      'Lưu tối đa 5 bản đồ sao',
      'Xem tổng quan các cung & hành tinh',
    ],
    unavailable: [
      'Báo cáo chiêm tinh chi tiết',
      'Tải PDF báo cáo',
      'Hỗ trợ ưu tiên',
    ],
  },
  {
    id: 'premium_month',
    name: 'Premium Tháng',
    price: '99.000đ',
    period: '/tháng',
    badge: '✦ Premium',
    highlight: false,
    features: [
      'Tất cả tính năng Miễn phí',
      'Lưu không giới hạn bản đồ sao',
      'Báo cáo Sự nghiệp & Tình yêu chi tiết',
      'Báo cáo Synastry (so sánh 2 người)',
      'Báo cáo Transit hàng tháng',
      'Tải PDF báo cáo',
      'Hỗ trợ email ưu tiên',
    ],
    unavailable: [],
  },
  {
    id: 'premium_year',
    name: 'Premium Năm',
    price: '799.000đ',
    period: '/năm',
    badge: '✦ Premium',
    highlight: true,
    tag: 'Tiết kiệm ~33%',
    features: [
      'Tất cả tính năng Premium Tháng',
      'Giá ưu đãi theo năm',
      'Badge "Premium ✦" trên hồ sơ',
    ],
    unavailable: [],
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    price: '1.999.000đ',
    period: ' một lần',
    badge: '★ Lifetime',
    highlight: false,
    features: [
      'Tất cả tính năng Premium',
      'Truy cập vĩnh viễn, không cần gia hạn',
      'Ưu tiên nhận tính năng mới',
      'Badge "Lifetime ★" trên hồ sơ',
    ],
    unavailable: [],
  },
]

export default function SubscriptionPlans() {
  const { user, upgradeToPremium } = useAuth()
  const [activationCode, setActivationCode] = useState('')
  const [activating, setActivating] = useState(false)
  const [activationError, setActivationError] = useState('')
  const [activationSuccess, setActivationSuccess] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  const isPremium = user?.isPremium ?? false
  // Derive current plan label
  const currentPlanId = isPremium ? 'premium_month' : 'free' // simplified — no multi-tier in DB yet

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

  return (
    <div>
      <h2 className="text-xl font-bold mb-2" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>
        Gói dịch vụ
      </h2>
      <p className="text-sm mb-6" style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)' }}>
        Chọn gói phù hợp với nhu cầu chiêm tinh của bạn.
      </p>

      {/* Current plan */}
      <div className="mb-8 rounded-2xl p-5" style={{ background: 'rgba(26,21,53,0.7)', border: isPremium ? '1px solid rgba(201,168,76,0.3)' : '1px solid rgba(201,168,76,0.12)' }}>
        <div className="flex items-center gap-3">
          <Crown size={20} style={{ color: isPremium ? '#d9ab55' : '#6b7280' }} />
          <div>
            <p style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem' }}>GÓI HIỆN TẠI</p>
            <p className="font-bold" style={{ color: isPremium ? '#d9ab55' : '#94a3b8', fontFamily: 'var(--font-vietnam)', fontSize: '1.1rem' }}>
              {isPremium ? 'Premium ✦' : 'Miễn phí'}
            </p>
          </div>
          {isPremium && (
            <span className="ml-auto px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(201,168,76,0.12)', color: '#d9ab55', border: '1px solid rgba(201,168,76,0.25)', fontFamily: 'var(--font-vietnam)' }}>
              Đang hoạt động
            </span>
          )}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {PLANS.map(plan => {
          const isActive = plan.id === currentPlanId
          const isUpgrade = plan.id !== 'free' && !isPremium
          return (
            <div key={plan.id} className="rounded-2xl p-5 flex flex-col relative overflow-hidden"
              style={{
                background: plan.highlight ? 'rgba(61,43,94,0.5)' : 'rgba(26,21,53,0.6)',
                border: isActive ? '1px solid rgba(201,168,76,0.5)' : plan.highlight ? '1px solid rgba(201,168,76,0.25)' : '1px solid rgba(201,168,76,0.1)',
                boxShadow: plan.highlight ? '0 0 24px rgba(201,168,76,0.08)' : 'none',
              }}>
              {/* Highlight badge */}
              {plan.tag && (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: 'rgba(201,168,76,0.15)', color: '#d9ab55', border: '1px solid rgba(201,168,76,0.25)', fontFamily: 'var(--font-vietnam)' }}>
                  {plan.tag}
                </div>
              )}

              {/* Name + Price */}
              <div className="mb-4">
                <p className="font-bold text-base mb-0.5" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>{plan.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold" style={{ color: plan.id === 'free' ? '#6b7280' : '#d9ab55', fontFamily: 'var(--font-vietnam)' }}>{plan.price}</span>
                  {plan.period && <span className="text-sm" style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)' }}>{plan.period}</span>}
                </div>
              </div>

              {/* Features */}
              <ul className="flex-1 space-y-2 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: '#c4b89a', fontFamily: 'var(--font-vietnam)' }}>
                    <Check size={13} style={{ color: '#d9ab55', marginTop: '0.2rem', flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
                {plan.unavailable?.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)' }}>
                    <span style={{ width: 13, height: 13, marginTop: '0.2rem', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isActive ? (
                <div className="py-2.5 text-center rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(201,168,76,0.08)', color: '#d9ab55', border: '1px solid rgba(201,168,76,0.2)', fontFamily: 'var(--font-vietnam)' }}>
                  Gói hiện tại ✓
                </div>
              ) : plan.id === 'free' ? (
                <div className="py-2.5 text-center rounded-xl text-sm"
                  style={{ background: 'rgba(255,255,255,0.03)', color: '#4a4560', fontFamily: 'var(--font-vietnam)' }}>
                  —
                </div>
              ) : (
                <button
                  onClick={() => showToast('Tính năng đăng ký sẽ sớm ra mắt. Liên hệ hỗ trợ để được tư vấn.')}
                  className="py-2.5 text-center rounded-xl text-sm font-semibold w-full transition-all"
                  style={{ background: plan.highlight ? '#c9a84c' : 'rgba(201,168,76,0.1)', color: plan.highlight ? '#0a0a1a' : '#d9ab55', border: plan.highlight ? 'none' : '1px solid rgba(201,168,76,0.2)', fontFamily: 'var(--font-vietnam)' }}
                >
                  Nâng cấp →
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Activation code */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(26,21,53,0.5)', border: '1px solid rgba(201,168,76,0.08)' }}>
        <p className="text-sm mb-3" style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)' }}>
          Có mã kích hoạt đặc biệt? Nhập vào đây:
        </p>
        {activationSuccess ? (
          <div className="py-3 text-center rounded-xl" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem' }}>
            ✓ Kích hoạt thành công! Tài khoản đã được nâng cấp.
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={activationCode}
              onChange={e => setActivationCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleActivate()}
              placeholder="Nhập mã kích hoạt..."
              className="flex-1"
              style={{ fontFamily: 'var(--font-vietnam)' }}
            />
            <button
              onClick={handleActivate}
              disabled={activating || !activationCode.trim()}
              className="px-5 py-2 rounded-xl font-semibold text-sm"
              style={{ background: activationCode.trim() ? '#c9a84c' : 'rgba(201,168,76,0.15)', color: activationCode.trim() ? '#0a0a1a' : '#6b7280', fontFamily: 'var(--font-vietnam)', whiteSpace: 'nowrap' }}
            >
              {activating ? '...' : 'Kích hoạt'}
            </button>
          </div>
        )}
        {activationError && <p className="mt-2 text-xs" style={{ color: '#ef4444', fontFamily: 'var(--font-vietnam)' }}>{activationError}</p>}
        <p className="mt-3 text-xs" style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)' }}>
          Tất cả giá trên là giá tạm tính. Liên hệ hỗ trợ nếu bạn có mã kích hoạt đặc biệt.
        </p>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm shadow-lg"
          style={{ background: 'rgba(26,21,53,0.95)', border: '1px solid rgba(201,168,76,0.3)', color: '#f4efe6', fontFamily: 'var(--font-vietnam)', backdropFilter: 'blur(12px)', maxWidth: '90vw' }}>
          {toastMsg}
        </div>
      )}
    </div>
  )
}
