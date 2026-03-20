'use client'

import { useState, useEffect, useCallback } from 'react'

const SERVICE_LABELS: Record<string, string> = {
  career: '🎯 Hướng Nghiệp',
  love: '💝 Tình Duyên',
  synastry: '💑 Cặp Đôi',
  transit: '🔮 Vận Hạn',
}

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  pending:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  processing: { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  completed:  { color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  failed:     { color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  cancelled:  { color: '#6b6585', bg: 'rgba(107,101,133,0.1)' },
}

interface Order {
  id: number
  service: string
  email: string
  status: string
  paymentStatus: string
  amount: number | null
  paidAt: string | null
  createdAt: string
  retryCount: number
  jobId: string | null
  pdfUrl: string | null
  adminCancelledAt: string | null
  claimedAt: string | null
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}p`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export default function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (statusFilter) params.set('status', statusFilter)
    if (serviceFilter) params.set('service', serviceFilter)
    const res = await fetch(`/api/admin/orders?${params}`)
    if (res.ok) {
      const data = await res.json()
      setOrders(data.orders)
      setTotal(data.total)
    }
    setLoading(false)
  }, [page, statusFilter, serviceFilter])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / 20)

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          style={selectStyle}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="pending">pending</option>
          <option value="processing">processing</option>
          <option value="completed">completed</option>
          <option value="failed">failed</option>
          <option value="cancelled">cancelled</option>
        </select>
        <select
          value={serviceFilter}
          onChange={(e) => { setServiceFilter(e.target.value); setPage(1) }}
          style={selectStyle}
        >
          <option value="">Tất cả dịch vụ</option>
          <option value="career">Hướng Nghiệp</option>
          <option value="love">Tình Duyên</option>
          <option value="synastry">Cặp Đôi</option>
          <option value="transit">Vận Hạn</option>
        </select>
        <button
          onClick={load}
          style={{
            padding: '6px 14px',
            background: 'rgba(201,168,76,0.1)',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: 6,
            color: '#c9a84c',
            cursor: 'pointer',
            fontSize: '0.8rem',
          }}
        >
          {loading ? '…' : '↻ Tải lại'}
        </button>
        <span style={{ fontSize: '0.78rem', color: '#6b6585', alignSelf: 'center' }}>
          {total} đơn
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(201,168,76,0.12)' }}>
              {['#', 'Dịch vụ', 'Email', 'Trạng thái', 'Thanh toán', 'Số tiền', 'Thời gian', ''].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#6b6585', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#4a4560' }}>
                  {loading ? 'Đang tải…' : 'Không có đơn nào'}
                </td>
              </tr>
            )}
            {orders.map((o) => {
              const st = STATUS_STYLES[o.status] || { color: '#a09ab8', bg: 'transparent' }
              return (
                <tr
                  key={o.id}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', opacity: loading ? 0.5 : 1 }}
                >
                  <td style={{ padding: '9px 10px', color: '#4a4560', fontFamily: 'monospace' }}>#{o.id}</td>
                  <td style={{ padding: '9px 10px', color: '#e8e0f0', whiteSpace: 'nowrap' }}>
                    {SERVICE_LABELS[o.service] ?? o.service}
                  </td>
                  <td style={{ padding: '9px 10px', color: '#a09ab8', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.email}
                  </td>
                  <td style={{ padding: '9px 10px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: st.bg,
                      color: st.color,
                      fontSize: '0.72rem',
                    }}>
                      {o.status}
                    </span>
                    {o.adminCancelledAt && <span style={{ marginLeft: 4, fontSize: '0.65rem', color: '#6b6585' }}>admin</span>}
                  </td>
                  <td style={{ padding: '9px 10px' }}>
                    <span style={{ color: o.paymentStatus === 'paid' ? '#4ade80' : '#6b6585', fontSize: '0.75rem' }}>
                      {o.paymentStatus}
                    </span>
                    {o.claimedAt && <span style={{ marginLeft: 4, fontSize: '0.65rem', color: '#f59e0b' }}>claimed</span>}
                  </td>
                  <td style={{ padding: '9px 10px', color: '#c9a84c', whiteSpace: 'nowrap' }}>
                    {o.amount ? o.amount.toLocaleString('vi-VN') + 'đ' : '—'}
                  </td>
                  <td style={{ padding: '9px 10px', color: '#6b6585', whiteSpace: 'nowrap' }}>
                    {timeAgo(o.createdAt)} trước
                  </td>
                  <td style={{ padding: '9px 10px' }}>
                    {o.pdfUrl && (
                      <a
                        href={`/api/pdf/${o.pdfUrl.split('/').pop()?.replace('.pdf', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#c9a84c', fontSize: '0.72rem', textDecoration: 'none' }}
                      >
                        PDF
                      </a>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn}>
            ←
          </button>
          <span style={{ fontSize: '0.8rem', color: '#6b6585', alignSelf: 'center' }}>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtn}>
            →
          </button>
        </div>
      )}
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  padding: '6px 10px',
  background: '#13131f',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 6,
  color: '#a09ab8',
  fontSize: '0.8rem',
  outline: 'none',
  cursor: 'pointer',
}

const pageBtn: React.CSSProperties = {
  padding: '4px 12px',
  background: '#13131f',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 5,
  color: '#a09ab8',
  cursor: 'pointer',
  fontSize: '0.85rem',
}
