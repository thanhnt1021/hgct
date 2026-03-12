'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Share2, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ReportViewerProps {
  jobId: string
  pdfUrl: string
  pdfFilename: string
  name: string
  service: string
  createdAt: string
}

const SERVICE_LABELS: Record<string, string> = {
  career: 'Sự Nghiệp',
  love: 'Tình Yêu',
  synastry: 'Cặp Đôi',
  transit: 'Vận Hạn',
}

const SERVICE_COLORS: Record<string, string> = {
  career: '#3b82f6',
  love: '#ec4899',
  synastry: '#8b5cf6',
  transit: '#f59e0b',
}

export default function ReportViewer({ jobId, pdfUrl, pdfFilename, name, service, createdAt }: ReportViewerProps) {
  const router = useRouter()
  const [isIOS, setIsIOS] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [iframeError, setIframeError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const ua = navigator.userAgent
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream)
  }, [])

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = pdfFilename
    a.click()
  }

  const handleShare = async () => {
    const reportUrl = `${window.location.origin}/report/${jobId}`
    setSharing(true)
    setShareMsg('')
    try {
      if (navigator.share) {
        let shareData: ShareData = {
          title: `Báo cáo chiêm tinh - ${name}`,
          text: `Xem báo cáo chiêm tinh ${SERVICE_LABELS[service] || service} của ${name}`,
          url: reportUrl,
        }
        if (typeof navigator.canShare === 'function') {
          try {
            const res = await fetch(pdfUrl)
            const blob = await res.blob()
            const file = new File([blob], pdfFilename, { type: 'application/pdf' })
            if (navigator.canShare({ files: [file] })) {
              shareData = { title: shareData.title, text: shareData.text, files: [file] }
            }
          } catch { /* fallback to URL share */ }
        }
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(reportUrl)
        setShareMsg('Đã copy link!')
        setTimeout(() => setShareMsg(''), 2500)
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setShareMsg('Không thể chia sẻ')
        setTimeout(() => setShareMsg(''), 2500)
      }
    } finally {
      setSharing(false)
    }
  }

  const serviceColor = SERVICE_COLORS[service] || '#c9a84c'
  const dateStr = new Date(createdAt).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  return (
    <div style={{ background: '#0a0a1a', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        background: 'rgba(10,10,26,0.95)',
        borderBottom: '1px solid rgba(201,168,76,0.1)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => router.back()}
          style={{ color: '#6b7280', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{ background: `${serviceColor}22`, color: serviceColor, fontFamily: 'var(--font-vietnam)', fontSize: '0.7rem', padding: '1px 7px', borderRadius: 4 }}>
              {SERVICE_LABELS[service] || service}
            </span>
            <span style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.7rem' }}>{dateStr}</span>
          </div>
        </div>
      </div>

      {/* PDF area */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {isIOS ? (
          /* iOS: cannot embed PDF reliably — show card with actions */
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: 'calc(100dvh - 140px)', padding: '32px 24px', gap: 24,
          }}>
            {/* Report card */}
            <div style={{
              width: '100%', maxWidth: 360,
              background: 'linear-gradient(135deg, rgba(26,21,53,0.9), rgba(10,10,26,0.95))',
              border: `1px solid ${serviceColor}33`,
              borderRadius: 20, padding: '32px 24px',
              textAlign: 'center',
              boxShadow: `0 8px 32px ${serviceColor}18`,
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: `${serviceColor}22`, border: `2px solid ${serviceColor}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: 28,
              }}>
                {service === 'career' ? '🌟' : service === 'love' ? '💫' : service === 'synastry' ? '✨' : '🔮'}
              </div>
              <h2 style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>
                Báo cáo {SERVICE_LABELS[service] || service}
              </h2>
              <p style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem', marginBottom: 4 }}>{name}</p>
              <p style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem' }}>{dateStr}</p>
            </div>
            <p style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.8rem', textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
              Nhấn <strong style={{ color: '#a78bfa' }}>Tải về</strong> để gửi file qua Messenger, Zalo hoặc lưu vào máy. Nhấn <strong style={{ color: '#d9ab55' }}>Xem báo cáo</strong> để mở và đọc PDF.
            </p>
          </div>
        ) : (
          /* Android / Desktop: embed PDF in iframe */
          !iframeError ? (
            <iframe
              ref={iframeRef}
              src={pdfUrl}
              style={{ width: '100%', height: 'calc(100dvh - 140px)', border: 'none', display: 'block' }}
              title={`Báo cáo ${name}`}
              onError={() => setIframeError(true)}
            />
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: 'calc(100dvh - 140px)', gap: 12, padding: 24,
            }}>
              <p style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', textAlign: 'center' }}>
                Không thể hiển thị PDF. Vui lòng tải về để xem.
              </p>
            </div>
          )
        )}
      </div>

      {/* Sticky bottom bar */}
      <div style={{
        position: 'sticky', bottom: 0, zIndex: 10,
        display: 'flex', gap: 12, padding: '12px 16px',
        background: 'rgba(10,10,26,0.97)',
        borderTop: '1px solid rgba(201,168,76,0.1)',
      }}>
        <button
          onClick={handleDownload}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 16px', borderRadius: 12,
            background: 'rgba(201,168,76,0.12)', color: '#d9ab55',
            border: '1px solid rgba(201,168,76,0.2)',
            fontFamily: 'var(--font-vietnam)', fontWeight: 600, fontSize: '0.88rem',
            cursor: 'pointer',
          }}
        >
          <Download size={16} /> Xem báo cáo
        </button>
        <div style={{ flex: 1, position: 'relative' }}>
          <button
            onClick={handleShare}
            disabled={sharing}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 16px', borderRadius: 12,
              background: 'rgba(61,43,94,0.5)', color: '#a78bfa',
              border: '1px solid rgba(167,139,250,0.25)',
              fontFamily: 'var(--font-vietnam)', fontWeight: 600, fontSize: '0.88rem',
              cursor: sharing ? 'not-allowed' : 'pointer',
              opacity: sharing ? 0.7 : 1,
            }}
          >
            <Share2 size={16} /> {sharing ? 'Đang tải...' : 'Tải về'}
          </button>
          {shareMsg && (
            <span style={{
              position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
              whiteSpace: 'nowrap', fontSize: '0.75rem', padding: '4px 10px', borderRadius: 6,
              background: 'rgba(26,21,53,0.95)', color: '#a78bfa',
              border: '1px solid rgba(167,139,250,0.2)',
              fontFamily: 'var(--font-vietnam)',
            }}>
              {shareMsg}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
