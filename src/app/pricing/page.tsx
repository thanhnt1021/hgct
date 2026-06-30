import { getAllPrices } from '@/lib/pricing'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const TIERS = [
  {
    key: 'free',
    name: 'Miễn Phí',
    price: 0,
    color: 'var(--as-text-muted)',
    highlight: false,
    features: [
      'Xem biểu đồ natal đầy đủ',
      'Bảng nguyên tố & tính chất',
      'Xem trước báo cáo (Mục 1)',
      'Tìm kiếm vị trí sinh',
    ],
    cta: 'Bắt đầu miễn phí',
    href: '/services',
  },
  {
    key: 'paid',
    name: 'Báo Cáo Đơn Lẻ',
    price: -1, // loaded from DB
    color: 'var(--as-cta)',
    highlight: true,
    features: [
      'Báo cáo PDF đầy đủ (7 mục)',
      'Gửi thẳng vào email',
      'Lưu vĩnh viễn trong tài khoản',
      'Có thể tải về & chia sẻ',
      '4 loại: Hướng Nghiệp / Tình Duyên / Cặp Đôi / Vận Hạn',
    ],
    cta: 'Tạo báo cáo ngay',
    href: '/services',
  },
  {
    key: 'premium',
    name: 'Premium',
    price: -2, // computed from business model
    color: 'var(--as-copper-deep)',
    highlight: false,
    badge: 'Sắp ra mắt',
    features: [
      'Tất cả tính năng báo cáo đơn lẻ',
      'Không giới hạn số báo cáo',
      'Ưu tiên xử lý tốc độ cao',
      'Lưu trữ PDF không giới hạn',
      'Hỗ trợ ưu tiên qua email',
    ],
    cta: 'Đăng ký Premium',
    href: '/profile?tab=plans',
    disabled: true,
  },
]

export default async function PricingPage() {
  const prices = await getAllPrices()
  const basePrice = prices.career ?? 3333

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #edd5b1 0%, #e3c89a 100%)', padding: '4rem 1rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <p style={{ color: 'var(--as-copper-deep)', fontSize: '0.75rem', letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: 'var(--font-vietnam)', marginBottom: '0.75rem' }}>
            Chi phí & Gói dịch vụ
          </p>
          <h1 style={{ color: 'var(--as-text-strong)', fontFamily: 'var(--font-playfair)', fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 700, margin: '0 0 1rem' }}>
            Bảng giá dịch vụ
          </h1>
          <p style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', fontSize: '1rem', lineHeight: 1.7, maxWidth: '520px', margin: '0 auto' }}>
            Không có phí ẩn. Trả theo từng báo cáo — nhận PDF đầy đủ, gửi thẳng vào email.
          </p>
        </div>

        {/* Tier cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1.5rem', alignItems: 'start' }}>
          {TIERS.map((tier) => {
            const displayPrice =
              tier.price === -1 ? basePrice
              : tier.price === -2 ? null
              : tier.price

            return (
              <div
                key={tier.key}
                style={{
                  background: tier.highlight
                    ? 'var(--as-surface-raised)'
                    : 'var(--as-surface)',
                  border: `1px solid ${tier.highlight ? 'var(--as-border-gold)' : 'var(--as-border-soft)'}`,
                  borderRadius: '16px',
                  padding: '2rem',
                  position: 'relative',
                  boxShadow: 'var(--as-shadow-card)',
                }}
              >
                {tier.badge && (
                  <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', padding: '4px 16px', background: 'var(--as-cta)', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--as-text-on-dark)', fontFamily: 'var(--font-vietnam)', whiteSpace: 'nowrap' }}>
                    {tier.badge}
                  </div>
                )}
                {tier.highlight && (
                  <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', padding: '4px 16px', background: 'var(--as-cta)', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--as-text-on-dark)', fontFamily: 'var(--font-vietnam)', whiteSpace: 'nowrap' }}>
                    PHỔ BIẾN NHẤT
                  </div>
                )}

                <p style={{ color: tier.color, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'var(--font-vietnam)', margin: '0 0 0.5rem' }}>
                  {tier.name}
                </p>

                <div style={{ marginBottom: '1.5rem' }}>
                  {displayPrice === null ? (
                    <p style={{ color: 'var(--as-copper-deep)', fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-vietnam)', margin: 0 }}>Liên hệ</p>
                  ) : displayPrice === 0 ? (
                    <p style={{ color: '#4ade80', fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-vietnam)', margin: 0 }}>Miễn phí</p>
                  ) : (
                    <div>
                      <span style={{ color: 'var(--as-text-strong)', fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-vietnam)' }}>
                        {displayPrice.toLocaleString('vi-VN')}đ
                      </span>
                      <span style={{ color: 'var(--as-text-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-vietnam)', marginLeft: '6px' }}>/báo cáo</span>
                    </div>
                  )}
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {tier.features.map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--as-text)', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                      <span style={{ color: tier.color, flexShrink: 0, marginTop: '2px' }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.href}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '0.75rem',
                    borderRadius: '999px',
                    fontFamily: 'var(--font-vietnam)',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textDecoration: 'none',
                    ...(tier.disabled
                      ? { background: 'var(--as-surface-raised)', color: 'var(--as-text-muted)', cursor: 'not-allowed', pointerEvents: 'none' as const }
                      : tier.highlight
                        ? { background: 'var(--as-cta)', color: 'var(--as-text-on-dark)', boxShadow: 'var(--as-shadow-glow)' }
                        : { background: 'transparent', color: tier.color, border: `1px solid ${tier.color}` }),
                  }}
                >
                  {tier.cta}
                </Link>
              </div>
            )
          })}
        </div>

        {/* Service price breakdown */}
        <div style={{ marginTop: '3rem', padding: '2rem', background: 'var(--as-surface)', border: '1px solid var(--as-border-soft)', borderRadius: '12px', boxShadow: 'var(--as-shadow-card)' }}>
          <h2 style={{ color: 'var(--as-copper-deep)', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 1.25rem' }}>
            Bảng giá từng dịch vụ
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '0.75rem' }}>
            {[
              { key: 'career', name: 'Hướng Nghiệp', icon: '🎯' },
              { key: 'love', name: 'Tình Duyên', icon: '💝' },
              { key: 'synastry', name: 'Cặp Đôi', icon: '💑' },
              { key: 'transit', name: 'Vận Hạn', icon: '🔮' },
            ].map(svc => (
              <div key={svc.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--as-surface-raised)', borderRadius: '8px', border: '1px solid var(--as-border-soft)' }}>
                <span style={{ color: 'var(--as-text)', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem' }}>{svc.icon} {svc.name}</span>
                <span style={{ color: 'var(--as-cta)', fontFamily: 'var(--font-vietnam)', fontWeight: 700, fontSize: '0.95rem' }}>
                  {(prices[svc.key] ?? 3333).toLocaleString('vi-VN')}đ
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem', lineHeight: 1.8 }}>
            Thanh toán qua chuyển khoản ngân hàng. Báo cáo được gửi tự động sau khi xác nhận giao dịch.<br />
            Câu hỏi? <a href="mailto:support@hatgiongchiemtinh.com" style={{ color: 'var(--as-cta)', textDecoration: 'none' }}>support@hatgiongchiemtinh.com</a>
          </p>
        </div>

      </div>
    </div>
  )
}
