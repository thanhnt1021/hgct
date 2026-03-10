'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (res.ok) {
        setSent(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Không tìm thấy tài khoản')
      }
    } catch {
      setError('Lỗi kết nối server')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-3xl">✨</span>
            <span className="text-2xl font-bold text-amber-400">Hạt Giống Chiêm Tinh</span>
          </Link>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700/50">
          <h2 className="text-2xl font-bold text-white text-center mb-6">Quên mật khẩu</h2>

          {sent ? (
            <div className="text-center">
              <div className="text-4xl mb-4">📧</div>
              <p className="text-slate-300 mb-4">Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu.</p>
              <Link href="/auth/login" className="text-amber-400 hover:text-amber-300">Quay lại đăng nhập</Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Email đã đăng ký</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" placeholder="email@example.com" required />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-amber-700 transition-all disabled:opacity-50">
                  {loading ? 'Đang gửi...' : 'Gửi link đặt lại'}
                </button>
              </form>
              <div className="mt-4 text-center">
                <Link href="/auth/login" className="text-sm text-amber-400 hover:text-amber-300">Quay lại đăng nhập</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
