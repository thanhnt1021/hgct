'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface CtVData {
  id: number
  name: string
  email: string
  ctvCode: string | null
  commissionRate: number
  status: string
}

interface Stats {
  totalOrders: number
  totalCommission: number
  paidCommission: number
}

interface Order {
  id: number
  service: string
  email: string
  amount: number | null
  createdAt: string
  commission: { amount: number; status: string; paidAt: string | null } | null
}

const SERVICE_LABELS: Record<string, string> = {
  career: 'Hướng Nghiệp',
  love: 'Tình Duyên',
  synastry: 'Cặp Đôi',
  transit: 'Vận Hạn',
}

export default function DaisuDashboard({ ctv, stats: initialStats }: { ctv: CtVData; stats: Stats }) {
  const router = useRouter()
  const [stats] = useState<Stats>(initialStats)
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'orders'>('overview')
  const [logoutLoading, setLogoutLoading] = useState(false)

  const pendingCommission = stats.totalCommission - stats.paidCommission
  const appUrl = typeof window !== 'undefined' ? window.location.origin.replace('daisu.', '') : 'https://hatgiongchiemtinh.com'
  const referralUrl = ctv.ctvCode ? `${appUrl}?ctv=${ctv.ctvCode}` : ''

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true)
    try {
      const res = await fetch('/api/ctv/orders')
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
      }
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'orders') loadOrders()
  }, [tab, loadOrders])

  const handleLogout = async () => {
    setLogoutLoading(true)
    await fetch('/api/ctv/logout', { method: 'POST' })
    router.push('/daisu/login')
  }

  const copyUrl = () => {
    if (referralUrl) navigator.clipboard.writeText(referralUrl)
  }

  const fmtDate = (s: string) => {
    const d = new Date(s)
    return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`
  }

  const fmtAmount = (n: number | null | undefined) => n ? n.toLocaleString('vi-VN') + 'đ' : '—'

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.5rem 1.25rem',
    borderRadius: '6px',
    background: active ? 'rgba(200,148,63,0.15)' : 'transparent',
    border: active ? '1px solid rgba(200,148,63,0.3)' : '1px solid transparent',
    color: active ? '#d9ab55' : '#6b7280',
    fontFamily: 'var(--font-vietnam)',
    fontSize: '0.82rem',
    fontWeight: active ? 700 : 400,
    cursor: 'pointer',
    letterSpacing: '0.03em',
  })

  return (
    <div style={{ minHeight: '100vh', background: '#06060f', color: '#f4efe6' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid rgba(200,148,63,0.1)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: '#c9a84c', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'var(--font-vietnam)', margin: 0 }}>✦ Trang Đại Sứ</p>
          <p style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1rem', fontWeight: 700, margin: 0 }}>{ctv.name}</p>
        </div>
        <button
          onClick={handleLogout}
          disabled={logoutLoading}
          style={{ background: 'none', border: '1px solid rgba(200,148,63,0.2)', borderRadius: '6px', padding: '0.4rem 1rem', color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', cursor: 'pointer' }}
        >
          Đăng xuất
        </button>
      </header>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          <button style={tabStyle(tab === 'overview')} onClick={() => setTab('overview')}>Tổng quan</button>
          <button style={tabStyle(tab === 'orders')} onClick={() => setTab('orders')}>Đơn hàng</button>
        </div>

        {tab === 'overview' && (
          <>
            {/* Stats cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { label: 'Tổng đơn', value: String(stats.totalOrders), color: '#c9a84c' },
                { label: 'Tổng hoa hồng', value: fmtAmount(stats.totalCommission), color: '#4ade80' },
                { label: 'Đã thanh toán', value: fmtAmount(stats.paidCommission), color: '#60a5fa' },
                { label: 'Chờ thanh toán', value: fmtAmount(pendingCommission), color: '#f59e0b' },
              ].map(card => (
                <div key={card.label} style={{ background: 'rgba(18,13,46,0.7)', border: '1px solid rgba(200,148,63,0.12)', borderRadius: '12px', padding: '1.25rem' }}>
                  <p style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{card.label}</p>
                  <p style={{ color: card.color, fontFamily: 'var(--font-vietnam)', fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* CTV info */}
            <div style={{ background: 'rgba(18,13,46,0.7)', border: '1px solid rgba(200,148,63,0.12)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>Thông tin tài khoản</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {[
                  { label: 'Email', value: ctv.email },
                  { label: 'Mã giới thiệu', value: ctv.ctvCode || '—' },
                  { label: 'Tỷ lệ hoa hồng', value: `${Math.round(ctv.commissionRate * 100)}%` },
                  { label: 'Trạng thái', value: ctv.status === 'active' ? '✓ Hoạt động' : ctv.status },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem' }}>{row.label}</span>
                    <span style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem', fontWeight: 500 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Referral link */}
            {referralUrl && (
              <div style={{ background: 'rgba(18,13,46,0.7)', border: '1px solid rgba(200,148,63,0.12)', borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Link giới thiệu</h3>
                <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
                  Chia sẻ link này với khách hàng. Đơn đặt qua link sẽ tự động điền mã giới thiệu của bạn.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <code style={{ flex: 1, background: 'rgba(0,0,0,0.3)', padding: '0.6rem 0.85rem', borderRadius: '6px', fontSize: '0.82rem', color: '#c9a84c', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {referralUrl}
                  </code>
                  <button
                    onClick={copyUrl}
                    style={{ padding: '0.6rem 1rem', background: 'rgba(200,148,63,0.15)', border: '1px solid rgba(200,148,63,0.3)', borderRadius: '6px', color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Sao chép
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'orders' && (
          <div style={{ background: 'rgba(18,13,46,0.7)', border: '1px solid rgba(200,148,63,0.12)', borderRadius: '12px', padding: '1.5rem' }}>
            <h3 style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>Đơn hàng qua mã của bạn</h3>

            {ordersLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="w-8 h-8 rounded-full animate-spin mx-auto" style={{ border: '2px solid rgba(200,148,63,0.15)', borderTopColor: '#d9ab55' }} />
              </div>
            ) : orders.length === 0 ? (
              <p style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem', textAlign: 'center', padding: '2rem 0' }}>
                Chưa có đơn hàng nào qua mã của bạn
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', fontFamily: 'var(--font-vietnam)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(200,148,63,0.1)' }}>
                      {['#', 'Dịch vụ', 'Email khách', 'Giá trị', 'Hoa hồng', 'Trạng thái', 'Ngày'].map(h => (
                        <th key={h} style={{ padding: '0.5rem 0.75rem', color: '#4a4560', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.65rem 0.75rem', color: '#6b7280' }}>#{o.id}</td>
                        <td style={{ padding: '0.65rem 0.75rem', color: '#f4efe6' }}>{SERVICE_LABELS[o.service] || o.service}</td>
                        <td style={{ padding: '0.65rem 0.75rem', color: '#8a8399', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.email}</td>
                        <td style={{ padding: '0.65rem 0.75rem', color: '#c9a84c' }}>{fmtAmount(o.amount)}</td>
                        <td style={{ padding: '0.65rem 0.75rem', color: '#4ade80' }}>{o.commission ? fmtAmount(o.commission.amount) : '—'}</td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          {o.commission ? (
                            <span style={{ color: o.commission.status === 'paid' ? '#4ade80' : '#f59e0b', fontSize: '0.75rem' }}>
                              {o.commission.status === 'paid' ? '✓ Đã trả' : '⏳ Chờ'}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', color: '#4a4560', whiteSpace: 'nowrap' }}>{fmtDate(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
