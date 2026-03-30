'use client'

import { useState, useEffect, useCallback } from 'react'

interface CtvRow {
  id: number
  name: string
  email: string
  phone: string
  ctvCode: string | null
  status: string
  commissionRate: number
  orderCount: number
  totalCommission: number
  paidCommission: number
  pendingCommission: number
  createdAt: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_setup: { label: 'Chờ thiết lập', color: '#f59e0b' },
  active: { label: 'Hoạt động', color: '#4ade80' },
  disabled: { label: 'Đã tắt', color: '#6b6585' },
}

function fmtAmount(n: number) { return n.toLocaleString('vi-VN') + 'đ' }
function fmtDate(s: string) {
  const d = new Date(s)
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`
}

export default function CtvAdminPanel() {
  const [ctvs, setCtvs] = useState<CtvRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Record<number, { status?: string; commissionRate?: string }>>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ctv')
      if (res.ok) {
        const data = await res.json()
        setCtvs(data.ctvs || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const save = async (id: number) => {
    const edit = editing[id]
    if (!edit) return
    setSaving(id)
    setMsg('')
    try {
      const res = await fetch('/api/admin/ctv', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ctvId: id,
          ...(edit.status !== undefined ? { status: edit.status } : {}),
          ...(edit.commissionRate !== undefined ? { commissionRate: edit.commissionRate } : {}),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg(`Đã lưu #${id}`)
        setEditing(prev => { const n = { ...prev }; delete n[id]; return n })
        await load()
      } else {
        setMsg(`Lỗi: ${data.error}`)
      }
    } finally {
      setSaving(null)
    }
  }

  const setEdit = (id: number, field: 'status' | 'commissionRate', val: string) => {
    setEditing(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }))
  }

  const cellStyle: React.CSSProperties = {
    padding: '0.75rem 0.75rem',
    fontFamily: 'var(--font-vietnam)',
    fontSize: '0.82rem',
    verticalAlign: 'middle',
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <div className="w-8 h-8 rounded-full animate-spin mx-auto" style={{ border: '2px solid rgba(201,168,76,0.15)', borderTopColor: '#c9a84c' }} />
      </div>
    )
  }

  return (
    <div>
      {msg && (
        <div style={{ padding: '0.75rem 1rem', background: msg.startsWith('Lỗi') ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)', border: `1px solid ${msg.startsWith('Lỗi') ? 'rgba(248,113,113,0.3)' : 'rgba(74,222,128,0.3)'}`, borderRadius: '8px', color: msg.startsWith('Lỗi') ? '#f87171' : '#4ade80', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {msg}
        </div>
      )}

      <div style={{ background: 'rgba(10,10,22,0.5)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: '12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
              {['#', 'Tên / Email', 'Mã CTV', 'Trạng thái', 'Hoa hồng %', 'Đơn', 'Tổng HH', 'Chờ TT', 'Ngày tạo', ''].map(h => (
                <th key={h} style={{ ...cellStyle, color: '#6b6585', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ctvs.length === 0 && (
              <tr>
                <td colSpan={10} style={{ ...cellStyle, color: '#6b6585', textAlign: 'center', padding: '2rem' }}>
                  Chưa có Đại Sứ nào
                </td>
              </tr>
            )}
            {ctvs.map(ctv => {
              const edit = editing[ctv.id] || {}
              const statusVal = edit.status ?? ctv.status
              const rateVal = edit.commissionRate ?? String(Math.round(ctv.commissionRate * 100))
              const isDirty = edit.status !== undefined || edit.commissionRate !== undefined
              const st = STATUS_LABELS[statusVal] || { label: statusVal, color: '#8a8399' }

              return (
                <tr key={ctv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ ...cellStyle, color: '#6b6585' }}>#{ctv.id}</td>
                  <td style={{ ...cellStyle }}>
                    <p style={{ color: '#e8e0f0', margin: 0, fontWeight: 500 }}>{ctv.name}</p>
                    <p style={{ color: '#6b6585', margin: 0, fontSize: '0.75rem' }}>{ctv.email}</p>
                    <p style={{ color: '#4a4560', margin: 0, fontSize: '0.72rem' }}>{ctv.phone}</p>
                  </td>
                  <td style={{ ...cellStyle, color: '#c9a84c', fontFamily: 'monospace' }}>
                    {ctv.ctvCode || <span style={{ color: '#4a4560' }}>—</span>}
                  </td>
                  <td style={{ ...cellStyle }}>
                    <select
                      value={statusVal}
                      onChange={e => setEdit(ctv.id, 'status', e.target.value)}
                      style={{
                        background: 'rgba(10,10,22,0.8)',
                        border: '1px solid rgba(201,168,76,0.2)',
                        borderRadius: '6px',
                        color: st.color,
                        padding: '0.3rem 0.5rem',
                        fontFamily: 'var(--font-vietnam)',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="pending_setup">Chờ thiết lập</option>
                      <option value="active">Hoạt động</option>
                      <option value="disabled">Đã tắt</option>
                    </select>
                  </td>
                  <td style={{ ...cellStyle }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <input
                        type="number"
                        min={0} max={100} step={1}
                        value={rateVal}
                        onChange={e => setEdit(ctv.id, 'commissionRate', e.target.value)}
                        style={{
                          width: '56px',
                          background: 'rgba(10,10,22,0.8)',
                          border: '1px solid rgba(201,168,76,0.2)',
                          borderRadius: '6px',
                          color: '#c9a84c',
                          padding: '0.3rem 0.5rem',
                          fontFamily: 'var(--font-vietnam)',
                          fontSize: '0.82rem',
                          textAlign: 'right',
                        }}
                      />
                      <span style={{ color: '#6b6585', fontSize: '0.78rem' }}>%</span>
                    </div>
                  </td>
                  <td style={{ ...cellStyle, color: '#e8e0f0' }}>{ctv.orderCount}</td>
                  <td style={{ ...cellStyle, color: '#4ade80' }}>{fmtAmount(ctv.totalCommission)}</td>
                  <td style={{ ...cellStyle, color: '#f59e0b' }}>{fmtAmount(ctv.pendingCommission)}</td>
                  <td style={{ ...cellStyle, color: '#4a4560', whiteSpace: 'nowrap' }}>{fmtDate(ctv.createdAt)}</td>
                  <td style={{ ...cellStyle }}>
                    {isDirty && (
                      <button
                        onClick={() => save(ctv.id)}
                        disabled={saving === ctv.id}
                        style={{
                          padding: '0.35rem 0.85rem',
                          background: 'rgba(201,168,76,0.15)',
                          border: '1px solid rgba(201,168,76,0.3)',
                          borderRadius: '6px',
                          color: '#c9a84c',
                          fontFamily: 'var(--font-vietnam)',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          opacity: saving === ctv.id ? 0.5 : 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {saving === ctv.id ? '...' : 'Lưu'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
