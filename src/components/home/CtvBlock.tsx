'use client'

import { useState } from 'react'
import CtvRegisterModal from './CtvRegisterModal'

export default function CtvBlock() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          {/* Eyebrow */}
          <p
            style={{
              fontFamily: 'var(--font-vietnam)',
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#c9a84c',
              marginBottom: '1rem',
            }}
          >
            Chương trình Đại Sứ
          </p>

          <h2
            style={{
              fontFamily: 'var(--font-vietnam)',
              fontSize: 'clamp(1.4rem, 4vw, 2rem)',
              fontWeight: 700,
              color: '#f4efe6',
              marginBottom: '1rem',
              lineHeight: 1.3,
            }}
          >
            Nếu bản đồ sao đã giúp bạn hiểu rõ hơn về mình, hãy để nó chạm đến thêm nhiều người.
          </h2>

          <p
            style={{
              fontFamily: 'var(--font-vietnam)',
              fontSize: '1rem',
              color: '#8a8399',
              lineHeight: 1.8,
              maxWidth: '520px',
              margin: '0 auto 2.5rem',
            }}
          >
            Chia sẻ mã Đại Sứ của bạn — mỗi người tìm được câu trả lời từ bản đồ
            sao là một điều bạn góp phần tạo ra. Và với mỗi báo cáo hoàn thành qua
            mã của bạn, bạn nhận{' '}
            <span style={{ color: '#c9a84c', fontWeight: 600 }}>hoa hồng 10%</span>.
          </p>

          {/* 3 benefits */}
          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10"
            style={{ maxWidth: '600px', margin: '0 auto 2.5rem' }}
          >
            {[
              { icon: '✦', title: 'Mã chiêm tinh của riêng bạn', desc: 'Mỗi Đại Sứ có một mã duy nhất để chia sẻ với cộng đồng của mình' },
              { icon: '💫', title: 'Hoa hồng 10% mỗi đơn', desc: 'Tự động ghi nhận vào tài khoản sau mỗi báo cáo hoàn thành' },
              { icon: '🔭', title: 'Dashboard cá nhân', desc: 'Theo dõi lịch sử đơn hàng và hoa hồng theo thời gian thực' },
            ].map(b => (
              <div
                key={b.title}
                style={{
                  padding: '1.25rem',
                  borderRadius: '12px',
                  background: 'rgba(18,13,46,0.6)',
                  border: '1px solid rgba(200,148,63,0.15)',
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{b.icon}</div>
                <p style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  {b.title}
                </p>
                <p style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', lineHeight: 1.5 }}>
                  {b.desc}
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={() => setOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #c8943f 0%, #f0cc78 50%, #c8943f 100%)',
              backgroundSize: '200% 200%',
              color: '#06060f',
              border: 'none',
              borderRadius: '4px',
              padding: '0.9rem 2.5rem',
              fontFamily: 'var(--font-vietnam)',
              fontSize: '0.9rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              cursor: 'pointer',
              boxShadow: '0 4px 24px rgba(200,148,63,0.25)',
            }}
          >
            Trở thành Đại Sứ →
          </button>
        </div>
      </section>

      <CtvRegisterModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
