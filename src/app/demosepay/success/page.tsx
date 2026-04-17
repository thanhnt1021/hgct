'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import StarField from '@/components/layout/StarField'

function SuccessInner() {
  const params = useSearchParams()
  const memo = params.get('memo') || 'DEMOSEPAY'
  const amount = Number(params.get('amount') || 0)
  const txn = params.get('txn') || ''

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 py-12">
      <StarField />
      <div className="relative z-10 max-w-md w-full text-center">
        <div className="mb-6 text-6xl">✅</div>
        <h1 className="font-playfair italic text-4xl md:text-5xl text-gold-base mb-3">
          Test thành công!
        </h1>
        <p className="font-vietnam text-sm text-white/60 mb-8">
          SePay webhook nhận được giao dịch, notify bot đã fire.
        </p>

        <div className="rounded-2xl p-6" style={{
          background: 'rgba(18,13,46,0.7)',
          border: '1px solid rgba(200,148,63,0.2)',
          backdropFilter: 'blur(20px)',
        }}>
          <div className="font-vietnam text-xs text-white/70 space-y-2 text-left">
            <div>
              <span className="text-white/40">Nội dung:</span>{' '}
              <span className="text-gold-base font-mono">{memo}</span>
            </div>
            <div>
              <span className="text-white/40">Số tiền:</span>{' '}
              <span className="text-gold-base font-mono">{amount.toLocaleString('vi-VN')}đ</span>
            </div>
            {txn && (
              <div>
                <span className="text-white/40">SePay txnId:</span>{' '}
                <span className="text-gold-base font-mono">{txn}</span>
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 font-vietnam text-xs text-white/40 italic">
          End-to-end flow: bank → SePay → webhook → app → notify. Toàn bộ WORK ✓
        </p>

        <a
          href="/demosepay"
          className="inline-block mt-6 font-vietnam text-sm text-gold-base/80 hover:text-gold-base underline underline-offset-4 transition"
        >
          ← Test lại
        </a>
      </div>
    </main>
  )
}

export default function DemoSePaySuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SuccessInner />
    </Suspense>
  )
}
