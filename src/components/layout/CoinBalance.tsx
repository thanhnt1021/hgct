'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function CoinBalance() {
  const { user } = useAuth()
  const [coin, setCoin] = useState<number | null>(null)

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

  if (!user) {
    return (
      <Link
        href="/auth/login"
        style={{
          color: '#d9ab55',
          fontFamily: 'var(--font-vietnam)',
          fontSize: '0.78rem',
          textDecoration: 'none',
          padding: '0.35rem 0.75rem',
          border: '1px solid rgba(200,148,63,0.25)',
          borderRadius: '4px',
        }}
      >
        Đăng nhập
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
        color: '#f4efe6',
        fontFamily: 'var(--font-vietnam)',
        fontSize: '0.82rem',
        fontWeight: 600,
        background: 'rgba(200,148,63,0.08)',
        border: '1px solid rgba(200,148,63,0.28)',
        borderRadius: '4px',
        padding: '0.35rem 0.75rem',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: '#d9ab55' }}>✦</span>
      <span>{coin == null ? '…' : coin.toLocaleString('vi-VN')}</span>
      <span style={{ color: '#9090a8', fontSize: '0.72rem' }}>xu</span>
      <span style={{ color: '#d9ab55', marginLeft: '0.15rem' }}>+</span>
    </Link>
  )
}
