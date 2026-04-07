'use client'

import { useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import Link from 'next/link'

interface TestResult {
  ok?: boolean
  message?: string
  error?: string
  code?: string
  hint?: string
  details?: string
  config?: Record<string, unknown>
  messageId?: string
}

export default function TestEmailPage() {
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)

  const handleSend = async () => {
    if (!to) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/test-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to }) })
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setResult({ error: String(e) })
    }
    setLoading(false)
  }

  const noPass = result && !result.ok && result.config && !(result.config as Record<string,unknown>).hasPass

  return (
    <div className="min-h-screen" style={{ background: '#0a0a1a' }}>
      <Navbar />
      <div className="max-w-xl mx-auto px-4 pt-24 pb-16">
        <Link href="/services" className="mb-6 inline-flex items-center gap-1 text-sm" style={{ color: '#94a3b8' }}>← Quay lại</Link>

        <div className="rounded-2xl p-8" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">✉️</span>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#f5f0e8', fontFamily: 'var(--font-vietnam)' }}>Kiểm tra Email SMTP</h1>
              <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>Gửi email thử nghiệm để kiểm tra kết nối Hostinger</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5" style={{ color: '#94a3b8' }}>Email nhận thử nghiệm</label>
              <input type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="email@example.com" className="w-full" />
            </div>
            <button onClick={handleSend} disabled={loading || !to} className="w-full py-3 rounded-xl font-semibold"
              style={{ background: loading ? '#1a3a35' : '#10b981', color: '#fff', opacity: (!to || loading) ? 0.6 : 1 }}>
              {loading ? 'Đang gửi...' : 'Gửi email thử nghiệm'}
            </button>
          </div>

          {result && (
            <div className="mt-6 rounded-xl p-4" style={{ background: result.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)', border: `1px solid ${result.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}` }}>
              <p className="font-semibold mb-3" style={{ color: result.ok ? '#34d399' : '#fca5a5', fontFamily: 'var(--font-vietnam)' }}>
                {result.ok ? '✓ Gửi thành công' : '✗ Gửi thất bại'}
              </p>
              {result.message && <p className="text-sm" style={{ color: '#f5f0e8' }}>{result.message}</p>}

              {/* Special case: no password */}
              {noPass && (
                <div className="mt-3 rounded-lg p-3" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                  <p className="text-sm font-semibold mb-2" style={{ color: '#fbbf24' }}>⚠️ Thiếu mật khẩu SMTP</p>
                  <p className="text-xs mb-2" style={{ color: '#94a3b8' }}>Thêm mật khẩu email Hostinger vào file <code style={{ color: '#c9a84c' }}>/home/hgct/hgct/.env.local</code>:</p>
                  <pre className="text-xs font-mono rounded p-2" style={{ background: 'rgba(0,0,0,0.3)', color: '#e8c96e' }}>SMTP_PASS=mật_khẩu_email_của_bạn</pre>
                  <p className="text-xs mt-2" style={{ color: '#6b7280' }}>Sau đó chạy lại: <code style={{ color: '#94a3b8' }}>bash /home/hgct/hgct/deploy.sh</code></p>
                </div>
              )}

              {result.error && !noPass && <p className="text-sm font-mono mt-2" style={{ color: '#fca5a5' }}>{result.error}</p>}
              {result.details && <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{result.details}</p>}
              {result.code && <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Code: <span style={{ color: '#94a3b8' }}>{result.code}</span></p>}
              {result.hint && <p className="text-xs mt-2 font-medium" style={{ color: '#fbbf24' }}>💡 {result.hint}</p>}
              {result.messageId && <p className="text-xs mt-2" style={{ color: '#6b7280' }}>Message-ID: {result.messageId}</p>}

              {result.config && (
                <details className="mt-3">
                  <summary className="text-xs cursor-pointer" style={{ color: '#6b7280' }}>Xem cấu hình SMTP hiện tại</summary>
                  <pre className="text-xs font-mono mt-2 rounded p-2" style={{ background: 'rgba(0,0,0,0.3)', color: '#6b7280' }}>{JSON.stringify(result.config, null, 2)}</pre>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Config guide */}
        <div className="mt-5 rounded-xl p-5" style={{ background: 'rgba(26,21,53,0.6)', border: '1px solid rgba(201,168,76,0.1)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: '#c9a84c', fontFamily: 'var(--font-vietnam)' }}>Cấu hình trong .env.local</p>
          <p className="text-xs mb-3" style={{ color: '#6b7280' }}>File: <code style={{ color: '#94a3b8' }}>/home/hgct/hgct/.env.local</code></p>
          <pre className="text-xs font-mono whitespace-pre-wrap rounded p-3" style={{ background: 'rgba(0,0,0,0.3)', color: '#94a3b8' }}>{`SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=support@hatgiongchiemtinh.com
SMTP_PASS=<mật khẩu email Hostinger>
EMAIL_FROM=Hạt Giống Chiêm Tinh <support@hatgiongchiemtinh.com>`}</pre>
        </div>
      </div>
    </div>
  )
}
