'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'

const SERVICE_NAMES: Record<string, string> = {
  career: 'Luận Giải Hướng Nghiệp',
  love: 'Luận Giải Tình Duyên',
  synastry: 'Luận Giải Cặp Đôi',
  transit: 'Luận Giải Vận Hạn',
}

const SERVICE_PRICES: Record<string, string> = {
  career: '99.000',
  love: '99.000',
  synastry: '149.000',
  transit: '149.000',
}

function genTransferCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'HGCT'
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export default function PaymentPage() {
  const router = useRouter()
  const [service, setService] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [transferCode, setTransferCode] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    const svc = sessionStorage.getItem('selectedService') || ''
    const rawEmail = sessionStorage.getItem('paymentEmail') || ''
    const inputData = sessionStorage.getItem('inputData')
    const inputDataB = sessionStorage.getItem('inputDataB')

    if (!svc) { router.push('/services'); return }

    setService(svc)
    setEmail(rawEmail)
    setTransferCode(genTransferCode())

    if (inputData) {
      try {
        const parsed = JSON.parse(inputData)
        const nameA = parsed.name || ''
        if (svc === 'synastry' && inputDataB) {
          const parsedB = JSON.parse(inputDataB)
          setDisplayName(nameA && parsedB.name ? `${nameA} & ${parsedB.name}` : nameA)
        } else {
          setDisplayName(nameA)
        }
      } catch { /* ignore */ }
    }
  }, [router])

  const serviceName = SERVICE_NAMES[service] || 'Báo cáo chiêm tinh'
  const price = SERVICE_PRICES[service] || '99.000'

  return (
    <div className="min-h-screen" style={{ background: '#06060f' }}>
      <Navbar />

      <div className="max-w-md mx-auto px-4 pt-28 pb-16">
        {/* Card — light on dark */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(245,240,232,0.96)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header strip */}
          <div
            className="px-8 py-5 text-center"
            style={{ background: 'linear-gradient(135deg, #1a0f2e 0%, #0d0720 100%)', borderBottom: '1px solid rgba(200,148,63,0.2)' }}
          >
            <p
              style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.6rem', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '0.4rem' }}
            >
              THANH TOÁN
            </p>
            <h1
              style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.03em' }}
            >
              {serviceName}
            </h1>
            {displayName && (
              <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem', marginTop: '0.3rem' }}>
                {displayName}
              </p>
            )}
          </div>

          <div className="px-8 py-7">
            {/* Amount */}
            <div className="text-center mb-7">
              <p style={{ color: '#6b6880', fontFamily: 'var(--font-vietnam)', fontSize: '0.7rem', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                SỐ TIỀN THANH TOÁN
              </p>
              <p
                style={{ color: '#c8410a', fontFamily: 'var(--font-vietnam)', fontSize: '2rem', fontWeight: 800, letterSpacing: '0.02em' }}
              >
                {price}
                <span style={{ fontSize: '1rem', fontWeight: 600, marginLeft: '0.3rem' }}>VND</span>
              </p>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(0,0,0,0.08)', marginBottom: '1.5rem' }} />

            {/* QR placeholder */}
            <div className="flex justify-center mb-6">
              <div
                className="flex items-center justify-center rounded-xl"
                style={{
                  width: 180,
                  height: 180,
                  background: '#f0ebe2',
                  border: '2px dashed rgba(200,148,63,0.4)',
                }}
              >
                <div className="text-center">
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>◫</div>
                  <p style={{ color: '#b0a8a0', fontFamily: 'var(--font-vietnam)', fontSize: '0.65rem', letterSpacing: '0.06em' }}>
                    QR CODE
                  </p>
                  <p style={{ color: '#c9b8a8', fontFamily: 'var(--font-vietnam)', fontSize: '0.6rem', marginTop: '0.25rem' }}>
                    (sắp có)
                  </p>
                </div>
              </div>
            </div>

            {/* Bank info */}
            <div
              className="rounded-xl p-5 mb-5"
              style={{ background: 'rgba(26,15,46,0.06)', border: '1px solid rgba(0,0,0,0.07)' }}
            >
              <p style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.6rem', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.75rem' }}>
                THÔNG TIN CHUYỂN KHOẢN
              </p>
              <div className="space-y-2">
                {[
                  { label: 'Ngân hàng', value: 'MB Bank' },
                  { label: 'Số tài khoản', value: '1234 5678 9012' },
                  { label: 'Chủ tài khoản', value: 'HAT GIONG CHIEM TINH' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-baseline gap-4">
                    <span style={{ color: '#9991a8', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', flexShrink: 0 }}>
                      {row.label}
                    </span>
                    <span style={{ color: '#1a0f2e', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem', fontWeight: 600, textAlign: 'right' }}>
                      {row.value}
                    </span>
                  </div>
                ))}
                {/* Transfer content — highlighted */}
                <div style={{ height: '1px', background: 'rgba(0,0,0,0.07)', margin: '0.5rem 0' }} />
                <div className="flex justify-between items-center gap-4">
                  <span style={{ color: '#9991a8', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', flexShrink: 0 }}>
                    Nội dung CK
                  </span>
                  <span
                    style={{ color: '#c8410a', fontFamily: 'var(--font-vietnam)', fontSize: '1rem', fontWeight: 800, letterSpacing: '0.05em' }}
                  >
                    {transferCode}
                  </span>
                </div>
              </div>
            </div>

            {/* Note */}
            <p style={{ color: '#9991a8', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', lineHeight: 1.6, marginBottom: '1.5rem', textAlign: 'center' }}>
              Vui lòng ghi đúng nội dung chuyển khoản để hệ thống xác nhận tự động.
              {email && (
                <><br />Báo cáo sẽ được gửi đến <strong style={{ color: '#3d2b5e' }}>{email}</strong> sau khi xác nhận.</>
              )}
            </p>

            {/* Confirm button */}
            {!confirmed ? (
              <button
                onClick={() => setConfirmed(true)}
                className="w-full py-4 font-bold text-sm tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, #c8943f 0%, #f0cc78 50%, #c8943f 100%)',
                  color: '#06060f',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-vietnam)',
                  letterSpacing: '0.08em',
                  boxShadow: '0 4px 20px rgba(200,148,63,0.35)',
                }}
              >
                Tôi đã chuyển khoản ✓
              </button>
            ) : (
              <div
                className="w-full py-4 text-center rounded-xl"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}
              >
                <p style={{ color: '#16a34a', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem', fontWeight: 700 }}>
                  Cảm ơn! Đang xác nhận thanh toán...
                </p>
                <p style={{ color: '#4ade80', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                  Chúng tôi sẽ gửi email khi xác nhận xong.
                </p>
              </div>
            )}

            {/* Cancel link */}
            <div className="text-center mt-4">
              <button
                onClick={() => router.push('/services')}
                style={{ color: '#9991a8', fontFamily: 'var(--font-vietnam)', fontSize: '0.8rem', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(153,145,168,0.4)' }}
              >
                Hủy giao dịch
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
