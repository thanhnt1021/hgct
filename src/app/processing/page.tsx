'use client'

// VISUAL ONLY — processing page restyled to Celestial Sanctum design
// All polling logic, job state, redirect logic untouched

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const SERVICE_NAMES: Record<string, string> = {
  career: 'Hướng Nghiệp',
  love: 'Tình Duyên',
  synastry: 'Cặp Đôi',
  transit: 'Vận Hạn',
}
const SERVICE_ICONS: Record<string, string> = {
  career: '🎯', love: '💝', synastry: '💑', transit: '🔮',
}
const SERVICE_ETA: Record<string, string> = {
  career: '3–4', love: '4–5', synastry: '6–8', transit: '6–8',
}

function ProcessingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = searchParams.get('job') || ''
  const service = searchParams.get('service') || ''
  const displayName = searchParams.get('name') || ''

  const [progress, setProgress] = useState(0)
  const [label, setLabel] = useState('Đang khởi tạo...')
  const [status, setStatus] = useState<'processing' | 'done' | 'error'>('processing')
  const [errorMsg, setErrorMsg] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const eta = SERVICE_ETA[service] || '5–8'
  const serviceName = SERVICE_NAMES[service] || 'chiêm tinh'
  const icon = SERVICE_ICONS[service] || '✦'

  useEffect(() => {
    if (!jobId) {
      router.push('/services')
      return
    }

    const poll = async () => {
      try {
        const res = await fetch(`/api/job/${jobId}`)
        if (!res.ok) return
        const job = await res.json()

        setProgress(job.progress ?? 0)
        setLabel(job.label ?? '')
        setStatus(job.status)

        if (job.status === 'done') {
          if (intervalRef.current) clearInterval(intervalRef.current)
          sessionStorage.setItem('reportResult', JSON.stringify({
            ...job.result,
            email: job.result?.email,
          }))
          setTimeout(() => router.push('/success'), 2000)
        } else if (job.status === 'error') {
          if (intervalRef.current) clearInterval(intervalRef.current)
          setErrorMsg(job.error || 'Có lỗi xảy ra khi tạo báo cáo.')
        }
      } catch {
        // network error, keep polling
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 2000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [jobId, router])

  // ── Error state ──
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#06060f' }}>
        <div className="max-w-md w-full text-center">
          <div
            className="rounded-2xl p-10"
            style={{
              background: 'rgba(18,13,46,0.7)',
              border: '1px solid rgba(196,82,82,0.25)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠</p>
            <h2
              className="font-bold mb-3"
              style={{ color: '#e87070', fontFamily: 'var(--font-vietnam)', fontSize: '1.1rem', letterSpacing: '0.03em' }}
            >
              Có lỗi xảy ra
            </h2>
            <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.8 }}>
              {errorMsg}
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/services"
                className="px-5 py-2.5 text-sm font-bold"
                style={{
                  background: 'linear-gradient(135deg, #c8943f, #f0cc78)',
                  color: '#06060f',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-vietnam)',
                  letterSpacing: '0.06em',
                  fontSize: '0.72rem',
                }}
              >
                Thử lại
              </Link>
              <a
                href="mailto:support@hatgiongchiemtinh.com"
                className="px-5 py-2.5 text-sm"
                style={{
                  background: 'rgba(11,11,31,0.8)',
                  color: '#8a8399',
                  border: '1px solid rgba(200,148,63,0.15)',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-vietnam)',
                  fontSize: '0.85rem',
                }}
              >
                Liên hệ hỗ trợ
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Processing state ──
  const steps = [
    { pct: 5,  label: 'Tính toán bản đồ sao' },
    { pct: 15, label: 'Phân tích cung hoàng đạo' },
    { pct: 18, label: 'AI biên soạn luận giải' },
    { pct: 90, label: 'Tạo file PDF' },
    { pct: 95, label: 'Gửi email' },
  ]

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#06060f' }}
    >
      <div className="max-w-md w-full text-center">

        {/* Pulsing stars */}
        <div className="flex items-center justify-center gap-5 mb-10">
          <span
            className="animate-pulse"
            style={{ color: '#d9ab55', fontSize: '0.7rem', animationDuration: '2s' }}
          >
            ✦
          </span>
          <span style={{ color: '#d9ab55', fontSize: '1.1rem' }}>✦</span>
          <span
            className="animate-pulse"
            style={{ color: '#d9ab55', fontSize: '0.7rem', animationDuration: '2s', animationDelay: '0.7s' }}
          >
            ✦
          </span>
        </div>

        {/* Heading */}
        <h2
          className="font-bold mb-3"
          style={{
            color: '#f4efe6',
            fontFamily: 'var(--font-vietnam)',
            fontSize: '1.3rem',
            letterSpacing: '0.04em',
          }}
        >
          Cảm ơn bạn đã tin tưởng!
        </h2>

        <p
          className="mb-10 leading-relaxed"
          style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.95rem' }}
        >
          <span className="mr-2">{icon}</span>
          AI đang biên soạn luận giải{' '}
          <strong style={{ color: '#d9ab55' }}>{serviceName}</strong>
          {displayName && (
            <> riêng cho <strong style={{ color: '#f4efe6' }}>{displayName}</strong></>
          )}
        </p>

        {/* Progress card */}
        <div
          className="rounded-2xl p-8 mb-5"
          style={{
            background: 'rgba(18,13,46,0.75)',
            border: '1px solid rgba(200,148,63,0.16)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Label + percent */}
          <div className="flex justify-between items-center mb-3">
            <span
              style={{
                color: '#d9ab55',
                fontFamily: 'var(--font-vietnam)',
                fontSize: '0.65rem',
                letterSpacing: '0.04em',
                
              }}
            >
              {label}
            </span>
            <span
              style={{
                color: '#d9ab55',
                fontFamily: 'var(--font-vietnam)',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              {progress}%
            </span>
          </div>

          {/* Progress bar */}
          <div
            className="h-1.5 rounded-full overflow-hidden mb-8"
            style={{ background: 'rgba(200,148,63,0.08)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #c8943f, #f0cc78)',
                boxShadow: '0 0 12px rgba(200,148,63,0.5)',
                transition: 'width 700ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>

          {/* Step checklist */}
          <div className="space-y-2.5 text-left">
            {steps.map(step => {
              const done = progress >= step.pct + 5 || (step.pct === 95 && progress >= 100)
              const active = progress >= step.pct && !done
              return (
                <div
                  key={step.pct}
                  className="flex items-center gap-3 text-xs"
                  style={{ color: progress >= step.pct ? '#c9c3d6' : '#4a4560' }}
                >
                  {/* Status indicator */}
                  <div style={{ width: '14px', height: '14px', flexShrink: 0, position: 'relative' }}>
                    {done ? (
                      <span style={{ color: '#3db88a', fontSize: '0.75rem', lineHeight: 1 }}>✓</span>
                    ) : active ? (
                      <span
                        className="animate-pulse"
                        style={{ color: '#d9ab55', fontSize: '0.5rem', position: 'absolute', top: '2px', left: '2px' }}
                      >
                        ◆
                      </span>
                    ) : (
                      <span style={{ color: '#38287a', fontSize: '0.5rem', position: 'absolute', top: '2px', left: '2px' }}>◆</span>
                    )}
                  </div>
                  <span style={{ fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', opacity: progress >= step.pct ? 1 : 0.35 }}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Can close tab note */}
        <div
          className="rounded-xl px-4 py-3 mb-4"
          style={{
            background: 'rgba(61,184,138,0.05)',
            border: '1px solid rgba(61,184,138,0.15)',
          }}
        >
          <p
            style={{
              color: '#3db88a',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-vietnam)',
              lineHeight: 1.7,
            }}
          >
            Bạn có thể <strong>đóng trang này</strong> — báo cáo sẽ tự động gửi vào email khi hoàn thành
          </p>
        </div>

        <p style={{ color: '#4a4560', fontSize: '0.78rem', fontFamily: 'var(--font-vietnam)' }}>
          Dự kiến hoàn thành trong khoảng{' '}
          <strong style={{ color: '#8a8399' }}>{eta} phút</strong>
        </p>
      </div>
    </div>
  )
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#06060f' }} />}>
      <ProcessingInner />
    </Suspense>
  )
}
