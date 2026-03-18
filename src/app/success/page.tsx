'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { useSearchParams } from 'next/navigation'

const SERVICE_NAMES: Record<string, string> = {
  career: 'Hướng Nghiệp',
  love: 'Tình Duyên',
  synastry: 'Cặp Đôi',
  transit: 'Vận Hạn',
}

function SuccessInner() {
  const searchParams = useSearchParams()
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [service, setService] = useState('')
  const [loading, setLoading] = useState(true)
  const [noData, setNoData] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('reportResult')
    const storedService = sessionStorage.getItem('selectedService') || ''
    const urlService = searchParams.get('service') || ''

    if (stored) {
      setResult(JSON.parse(stored))
      setService(storedService || urlService)
      setLoading(false)
      return
    }

    // sessionStorage empty — try URL params (e.g. direct navigate, tab restore, force-redirect)
    const jobId = searchParams.get('jobId')
    if (urlService || storedService) setService(urlService || storedService)

    if (jobId) {
      fetch(`/api/job/${jobId}`)
        .then(r => r.ok ? r.json() : null)
        .then((job) => {
          if (job?.result) {
            setResult({ ...job.result, email: job.result.email })
          } else {
            setNoData(true)
          }
          setLoading(false)
        })
        .catch(() => { setNoData(true); setLoading(false) })
    } else {
      setNoData(true)
      setLoading(false)
    }
  }, [searchParams])

  const email = result?.email as string
  const pdfUrl = result?.pdfUrl as string
  const pdfFilename = result?.pdfFilename as string
  const emailSent = result?.emailSent as boolean | undefined
  const serviceName = SERVICE_NAMES[service] || 'chiêm tinh'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#06060f' }}>
        <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '2px solid rgba(200,148,63,0.15)', borderTopColor: '#d9ab55' }} />
      </div>
    )
  }

  if (noData) {
    return (
      <div className="min-h-screen" style={{ background: '#06060f' }}>
        <Navbar />
        <div className="max-w-lg mx-auto px-4 pt-28 pb-16 text-center">
          <div
            className="rounded-2xl p-10"
            style={{
              background: 'rgba(18,13,46,0.7)',
              border: '1px solid rgba(200,148,63,0.16)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📬</p>
            <h1
              className="font-bold mb-3"
              style={{
                color: '#f4efe6',
                fontFamily: 'var(--font-vietnam)',
                fontSize: '1.3rem',
                letterSpacing: '0.04em',
              }}
            >
              Báo cáo đang được gửi
            </h1>
            <p
              style={{
                color: '#8a8399',
                fontFamily: 'var(--font-vietnam)',
                fontSize: '0.9rem',
                lineHeight: 1.8,
                marginBottom: '2rem',
              }}
            >
              Kiểm tra email hoặc vào{' '}
              <strong style={{ color: '#d9ab55' }}>Lịch sử đơn hàng</strong>{' '}
              để xem kết quả.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/profile?tab=history"
                className="px-7 py-3 text-sm font-bold"
                style={{
                  background: 'linear-gradient(135deg, #c8943f, #f0cc78)',
                  color: '#06060f',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-vietnam)',
                  letterSpacing: '0.08em',
                  fontSize: '0.72rem',
                }}
              >
                Lịch sử đơn hàng →
              </Link>
              <Link
                href="/services"
                className="px-7 py-3 text-sm"
                style={{
                  background: 'transparent',
                  color: '#8a8399',
                  border: '1px solid rgba(200,148,63,0.15)',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-vietnam)',
                  fontSize: '0.85rem',
                }}
              >
                Tạo báo cáo mới
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#06060f' }}>
      <Navbar />

      <div className="max-w-lg mx-auto px-4 pt-28 pb-16 text-center">

        {/* Success card */}
        <div
          className="rounded-2xl p-10 mb-5"
          style={{
            background: 'rgba(18,13,46,0.7)',
            border: '1px solid rgba(200,148,63,0.16)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Stars ornament */}
          <div className="flex items-center justify-center gap-5 mb-7">
            <div style={{ height: '1px', width: '40px', background: 'linear-gradient(90deg, transparent, rgba(200,148,63,0.4))' }} />
            <span style={{ color: '#d9ab55', fontSize: '0.85rem' }}>✦</span>
            <span style={{ color: '#d9ab55', fontSize: '1.4rem' }}>✦</span>
            <span style={{ color: '#d9ab55', fontSize: '0.85rem' }}>✦</span>
            <div style={{ height: '1px', width: '40px', background: 'linear-gradient(90deg, rgba(200,148,63,0.4), transparent)' }} />
          </div>

          <h1
            className="font-bold mb-3"
            style={{
              color: '#f4efe6',
              fontFamily: 'var(--font-vietnam)',
              fontSize: 'clamp(1.2rem, 4vw, 1.6rem)',
              letterSpacing: '0.04em',
            }}
          >
            Cảm ơn bạn đã tin tưởng!
          </h1>

          <p
            className="mb-9 leading-relaxed"
            style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.95rem', lineHeight: 1.85 }}
          >
            Luận giải <strong style={{ color: '#d9ab55' }}>{serviceName}</strong> của bạn đã được tạo xong
            và đang trên đường đến hộp thư.
          </p>

          {/* Email delivery notice */}
          {email && (
            <div
              className="rounded-xl p-5 mb-7 text-left"
              style={{
                background: emailSent ? 'rgba(61,184,138,0.06)' : 'rgba(200,148,63,0.06)',
                border: `1px solid ${emailSent ? 'rgba(61,184,138,0.2)' : 'rgba(200,148,63,0.2)'}`,
              }}
            >
              <div className="flex items-start gap-3">
                <span style={{ fontSize: '1.2rem', marginTop: '0.1rem', flexShrink: 0 }}>
                  {emailSent ? '📬' : '⏳'}
                </span>
                <div>
                  <p
                    className="font-semibold mb-1"
                    style={{
                      color: emailSent ? '#3db88a' : '#d9ab55',
                      fontFamily: 'var(--font-vietnam)',
                      fontSize: '0.75rem',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {emailSent ? 'File đã được gửi đến hộp thư' : 'Đang gửi file, xin chờ một chút...'}
                  </p>
                  <p style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem' }}>
                    {email}
                  </p>
                  <p style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', marginTop: '0.4rem', fontStyle: 'italic' }}>
                    Kiểm tra mục Spam nếu không thấy trong hộp thư chính
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PDF download */}
          {pdfUrl && (
            <a
              href={pdfUrl}
              download={pdfFilename || 'bao_cao.pdf'}
              className="inline-flex items-center gap-2 mb-8 px-6 py-3 text-sm font-semibold transition-all"
              style={{
                background: 'rgba(200,148,63,0.1)',
                color: '#d9ab55',
                border: '1px solid rgba(200,148,63,0.28)',
                borderRadius: '4px',
                fontFamily: 'var(--font-vietnam)',
                fontSize: '0.72rem',
                letterSpacing: '0.1em',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,148,63,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(200,148,63,0.1)')}
            >
              ↓ Tải PDF về máy
            </a>
          )}

          {/* Divider */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,148,63,0.2), transparent)', margin: '0.5rem 0 1.75rem' }} />

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/services"
              className="px-7 py-3 text-sm font-bold"
              style={{
                background: 'linear-gradient(135deg, #c8943f, #f0cc78)',
                color: '#06060f',
                borderRadius: '4px',
                fontFamily: 'var(--font-vietnam)',
                letterSpacing: '0.08em',
                fontSize: '0.72rem',
              }}
            >
              Tạo báo cáo khác
            </Link>
            <Link
              href="/"
              className="px-7 py-3 text-sm"
              style={{
                background: 'transparent',
                color: '#8a8399',
                border: '1px solid rgba(200,148,63,0.15)',
                borderRadius: '4px',
                fontFamily: 'var(--font-vietnam)',
                fontSize: '0.85rem',
              }}
            >
              Về trang chủ
            </Link>
          </div>
        </div>

        {/* Support card */}
        <div
          className="rounded-2xl p-6 text-left"
          style={{
            background: 'rgba(11,11,31,0.6)',
            border: '1px solid rgba(200,148,63,0.09)',
          }}
        >
          <p
            className="mb-4"
            style={{
              color: '#8a8399',
              fontFamily: 'var(--font-vietnam)',
              fontSize: '0.65rem',
              letterSpacing: '0.06em',

            }}
          >
            Sau 10 phút chưa nhận được?
          </p>
          <div className="space-y-3">
            <p style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.83rem', lineHeight: 1.75 }}>
              Trước tiên hãy kiểm tra thư mục{' '}
              <strong style={{ color: '#8a8399' }}>Spam / Junk</strong> — đôi khi email tự động bị lọc vào đó.
            </p>
            <p style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.83rem' }}>
              Nếu vẫn chưa có, liên hệ hỗ trợ qua:
            </p>
            <div className="flex flex-col gap-2 mt-1">
              {[
                { href: 'mailto:support@hatgiongchiemtinh.com', label: 'support@hatgiongchiemtinh.com' },
                { href: 'https://zalo.me/hatgiongchiemtinh', label: 'Chat Zalo' },
                { href: 'https://m.me/hatgiongchiemtinh', label: 'Facebook Messenger' },
              ].map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  target={link.href.startsWith('http') ? '_blank' : undefined}
                  rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="flex items-center gap-2 transition-colors"
                  style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.83rem' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f0cc78')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#d9ab55')}
                >
                  <span style={{ color: 'rgba(200,148,63,0.5)', fontSize: '0.5rem' }}>✦</span>
                  {link.label}
                </a>
              ))}
            </div>
            <p style={{ color: '#38287a', fontSize: '0.75rem', fontFamily: 'var(--font-vietnam)', marginTop: '0.75rem', fontStyle: 'italic' }}>
              Hỗ trợ 8:00–22:00 hàng ngày · Phản hồi trong vòng 30 phút
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#06060f' }} />}>
      <SuccessInner />
    </Suspense>
  )
}
