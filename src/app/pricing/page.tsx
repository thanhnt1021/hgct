import { getAllPrices } from '@/lib/pricing'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const TIERS = [
  {
    key: 'free',
    name: 'Miễn Phí',
    price: 0,
    color: '#8a8399',
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
    color: '#c9a84c',
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
    color: '#a78bfa',
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
    <div style={{ minHeight: '100vh', background: '#06060f', padding: '4rem 1rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <p style={{ color: '#c9a84c', fontSize: '0.75rem', letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: 'var(--font-vietnam)', marginBottom: '0.75rem' }}>
            Chi phí & Gói dịch vụ
          </p>
          <h1 style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 700, margin: '0 0 1rem' }}>
            Bảng giá dịch vụ
          </h1>
          <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '1rem', lineHeight: 1.7, maxWidth: '520px', margin: '0 auto' }}>
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
                    ? 'linear-gradient(135deg,rgba(201,168,76,0.08),rgba(201,168,76,0.02))'
                    : 'rgba(18,13,46,0.6)',
                  border: `1px solid ${tier.highlight ? 'rgba(201,168,76,0.35)' : 'rgba(100,90,140,0.2)'}`,
                  borderRadius: '16px',
                  padding: '2rem',
                  position: 'relative',
                }}
              >
                {tier.badge && (
                  <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', padding: '4px 16px', background: '#a78bfa', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: '#fff', fontFamily: 'var(--font-vietnam)', whiteSpace: 'nowrap' }}>
                    {tier.badge}
                  </div>
                )}
                {tier.highlight && (
                  <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', padding: '4px 16px', background: '#c9a84c', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: '#06060f', fontFamily: 'var(--font-vietnam)', whiteSpace: 'nowrap' }}>
                    PHỔ BIẾN NHẤT
                  </div>
                )}

                <p style={{ color: tier.color, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'var(--font-vietnam)', margin: '0 0 0.5rem' }}>
                  {tier.name}
                </p>

                <div style={{ marginBottom: '1.5rem' }}>
                  {displayPrice === null ? (
                    <p style={{ color: '#a78bfa', fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-vietnam)', margin: 0 }}>Liên hệ</p>
                  ) : displayPrice === 0 ? (
                    <p style={{ color: '#4ade80', fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-vietnam)', margin: 0 }}>Miễn phí</p>
                  ) : (
                    <div>
                      <span style={{ color: '#f4efe6', fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-vietnam)' }}>
                        {displayPrice.toLocaleString('vi-VN')}đ
                      </span>
                      <span style={{ color: '#6b7280', fontSize: '0.85rem', fontFamily: 'var(--font-vietnam)', marginLeft: '6px' }}>/báo cáo</span>
                    </div>
                  )}
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {tier.features.map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#b8a99a', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem', lineHeight: 1.5 }}>
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
                    borderRadius: '6px',
                    fontFamily: 'var(--font-vietnam)',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textDecoration: 'none',
                    ...(tier.disabled
                      ? { background: 'rgba(100,90,140,0.2)', color: '#6b7280', cursor: 'not-allowed', pointerEvents: 'none' as const }
                      : tier.highlight
                        ? { background: 'linear-gradient(135deg,#c8943f,#f0cc78,#c8943f)', color: '#06060f' }
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
        <div style={{ marginTop: '3rem', padding: '2rem', background: 'rgba(18,13,46,0.5)', border: '1px solid rgba(100,90,140,0.2)', borderRadius: '12px' }}>
          <h2 style={{ color: '#c9a84c', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 1.25rem' }}>
            Bảng giá từng dịch vụ
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '0.75rem' }}>
            {[
              { key: 'career', name: 'Hướng Nghiệp', icon: '🎯' },
              { key: 'love', name: 'Tình Duyên', icon: '💝' },
              { key: 'synastry', name: 'Cặp Đôi', icon: '💑' },
              { key: 'transit', name: 'Vận Hạn', icon: '🔮' },
            ].map(svc => (
              <div key={svc.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(201,168,76,0.04)', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.1)' }}>
                <span style={{ color: '#b8a99a', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem' }}>{svc.icon} {svc.name}</span>
                <span style={{ color: '#c9a84c', fontFamily: 'var(--font-vietnam)', fontWeight: 700, fontSize: '0.95rem' }}>
                  {(prices[svc.key] ?? 3333).toLocaleString('vi-VN')}đ
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem', lineHeight: 1.8 }}>
            Thanh toán qua chuyển khoản ngân hàng. Báo cáo được gửi tự động sau khi xác nhận giao dịch.<br />
            Câu hỏi? <a href="mailto:support@hatgiongchiemtinh.com" style={{ color: '#c9a84c', textDecoration: 'none' }}>support@hatgiongchiemtinh.com</a>
          </p>
        </div>

      </div>
    </div>
  )
}
