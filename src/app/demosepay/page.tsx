'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import StarField from '@/components/layout/StarField'

// Test SePay payment — 2.000đ, internal use only.
// Polls /api/demosepay/status every 3s; redirects to /demosepay/success on match.
export default function DemoSePayPage() {
  const router = useRouter()
  const [memo, setMemo] = useState<string>('')
  const [status, setStatus] = useState<'waiting' | 'received'>('waiting')
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // HGCT999XXX — match SePay code structure (HGCT + 6 digits), 999xxx = above real orderID range
    const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    setMemo(`HGCT999${rand}`)
  }, [])

  useEffect(() => {
    if (!memo) return
    const poll = async () => {
      try {
        const r = await fetch(`/api/demosepay/status?memo=${encodeURIComponent(memo)}`, { cache: 'no-store' })
        const d = await r.json() as { received: boolean; amount: number | null; txnId: number | null }
        if (d.received) {
          setStatus('received')
          if (pollRef.current) clearInterval(pollRef.current)
          setTimeout(() => {
            router.push(`/demosepay/success?memo=${encodeURIComponent(memo)}&amount=${d.amount ?? 0}&txn=${d.txnId ?? ''}`)
          }, 800)
        }
      } catch {/* silent */}
    }
    poll()
    pollRef.current = setInterval(poll, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [memo, router])

  const AMOUNT = 2000
  const BANK = 'TPB'
  const ACCOUNT = '62941624556'
  const qrUrl = memo
    ? `https://qr.sepay.vn/img?acc=${ACCOUNT}&bank=${BANK}&amount=${AMOUNT}&des=${encodeURIComponent(memo)}`
    : ''

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 py-12">
      <StarField />
      <div className="relative z-10 max-w-md w-full text-center">
        <h1 className="font-playfair italic text-4xl md:text-5xl text-gold-base mb-2">
          Test SePay
        </h1>
        <p className="font-vietnam text-sm text-white/60 mb-8">
          Kiểm tra QR + webhook · 2.000đ
          {status === 'waiting' && <span className="ml-2 text-gold-base/80">· đang chờ chuyển khoản...</span>}
        </p>

        {qrUrl ? (
          <div className="rounded-2xl p-6 mb-6" style={{
            background: 'rgba(18,13,46,0.7)',
            border: '1px solid rgba(200,148,63,0.2)',
            backdropFilter: 'blur(20px)',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="VietQR SePay" className="w-full mx-auto mb-4 rounded-lg" />
            <div className="font-vietnam text-xs text-white/70 space-y-1.5">
              <div>
                <span className="text-white/40">Ngân hàng:</span>{' '}
                <span className="text-gold-base">{BANK} (TPBank)</span>
              </div>
              <div>
                <span className="text-white/40">Số TK:</span>{' '}
                <span className="text-gold-base font-mono">{ACCOUNT}</span>
              </div>
              <div>
                <span className="text-white/40">Số tiền:</span>{' '}
                <span className="text-gold-base font-mono">{AMOUNT.toLocaleString('vi-VN')}đ</span>
              </div>
              <div>
                <span className="text-white/40">Nội dung:</span>{' '}
                <span className="text-gold-base font-mono">{memo}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-white/40 text-sm">
            Đang tạo QR...
          </div>
        )}

        <div className="font-vietnam text-xs text-white/50 leading-relaxed text-left space-y-2">
          <p className="text-gold-base/80 font-medium">Hướng dẫn test:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Quét QR → chuyển <b>2.000đ</b> với đúng nội dung trên</li>
            <li>SePay phát hiện giao dịch → gọi webhook app</li>
            <li>Trang sẽ <b>auto redirect</b> sang /demosepay/success khi nhận được</li>
          </ol>
          <p className="mt-4 text-white/40 italic">
            Poll 3s/lần. Không tạo order trong DB. Test only.
          </p>
        </div>
      </div>
    </main>
  )
}
