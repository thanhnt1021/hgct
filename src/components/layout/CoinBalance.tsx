'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function CoinBalance() {
  const { user } = useAuth()
  const [coin, setCoin] = useState<number | null>(null)
  // usePathname (không phải useSearchParams) — tránh phải bọc Suspense vì
  // CoinBalance render trên MỌI trang qua Navbar.
  const pathname = usePathname()

  const fetchBalance = useCallback(async () => {
    if (!user) {
      setCoin(null)
      return
    }
    try {
      const res = await fetch('/api/coin/balance', { cache: 'no-store' })
      const data = await res.json()
      setCoin(typeof data.coin === 'number' ? data.coin : 0)
    } catch {
      // keep last value
    }
  }, [user])

  useEffect(() => {
    fetchBalance()
    if (!user) return
    const id = setInterval(fetchBalance, 30_000)
    const onFocus = () => fetchBalance()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [user, fetchBalance])

  // Guest → vẫn hiện pill "0 xu"; bấm vào ra trang đăng nhập kèm thông báo nạp xu.
  if (!user) {
    return (
      <Link
        href={`/auth/login?reason=topup&next=${encodeURIComponent(pathname || '/profile')}`}
        title="Đăng nhập để nạp xu vào tài khoản"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          color: 'var(--as-text-strong)', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem', fontWeight: 600,
          background: 'rgba(22,54,83,0.06)', border: '1px solid var(--as-border-gold)', borderRadius: '999px',
          padding: '0.3rem 0.7rem', textDecoration: 'none', whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: 'var(--as-cta)' }}>✦</span>
        <span>0</span>
        <span style={{ color: 'var(--as-text-muted)', fontSize: '0.72rem' }}>xu</span>
        <span style={{ color: 'var(--as-cta)', marginLeft: '0.15rem' }}>+</span>
      </Link>
    )
  }

  return (
    <Link
      href="/coin/topup"
      title="Số xu hiện có — bấm để nạp thêm"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        color: 'var(--as-text-strong)',
        fontFamily: 'var(--font-vietnam)',
        fontSize: '0.82rem',
        fontWeight: 600,
        background: 'rgba(22,54,83,0.06)',
        border: '1px solid var(--as-border-gold)',
        borderRadius: '999px',
        padding: '0.3rem 0.7rem',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: 'var(--as-cta)' }}>✦</span>
      <span>{coin == null ? '…' : coin.toLocaleString('vi-VN')}</span>
      <span style={{ color: 'var(--as-text-muted)', fontSize: '0.72rem' }}>xu</span>
      <span style={{ color: 'var(--as-cta)', marginLeft: '0.15rem' }}>+</span>
    </Link>
  )
}
