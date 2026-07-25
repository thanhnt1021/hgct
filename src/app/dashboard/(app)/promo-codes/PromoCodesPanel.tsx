'use client'

import { useState, useEffect, useCallback } from 'react'

interface PromoCodeRow {
  id: number
  code: string
  coins: number
  amountVnd: number
  label: string | null
  enabled: boolean
  maxRedemptions: number | null
  redeemedCount: number
  expiresAt: string | null
  note: string | null
  createdAt: string
}

interface EditState {
  code?: string
  coins?: string
  amountVnd?: string
  label?: string
  maxRedemptions?: string  // '' = null (unlimited)
  expiresAt?: string       // '' = null (không hạn); yyyy-mm-dd
  enabled?: boolean
}

function fmtDate(s: string) {
  const d = new Date(s)
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(10,10,22,0.8)',
  border: '1px solid rgba(201,168,76,0.2)',
  borderRadius: '6px',
  color: '#c9a84c',
  padding: '0.3rem 0.5rem',
  fontFamily: 'var(--font-vietnam)',
  fontSize: '0.78rem',
}

const cellStyle: React.CSSProperties = {
  padding: '0.75rem 0.75rem',
  fontFamily: 'var(--font-vietnam)',
  fontSize: '0.82rem',
  verticalAlign: 'middle',
}

export default function PromoCodesPanel() {
  const [rows, setRows] = useState<PromoCodeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Record<number, EditState>>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [msg, setMsg] = useState('')

  // Form thêm mã mới
  const [newCode, setNewCode] = useState({ code: '', coins: '', amountVnd: '', label: '', maxRedemptions: '', expiresAt: '' })
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/promo-codes')
      if (res.ok) {
        const data = await res.json()
        setRows(data.promoCodes || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const setEdit = (id: number, patch: EditState) => {
    setEditing(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  const save = async (row: PromoCodeRow) => {
    const edit = editing[row.id]
    if (!edit) return
    setSaving(row.id)
    setMsg('')
    try {
      const body: Record<string, unknown> = { id: row.id }
      if (edit.code !== undefined) {
        body.code = edit.code.trim()
      }
      if (edit.coins !== undefined) {
        body.coins = Number(edit.coins)
      }
      if (edit.amountVnd !== undefined) {
        body.amountVnd = Number(edit.amountVnd)
      }
      if (edit.label !== undefined) {
        body.label = edit.label.trim()
      }
      if (edit.maxRedemptions !== undefined) {
        body.maxRedemptions = edit.maxRedemptions.trim() === '' ? null : Number(edit.maxRedemptions)
      }
      if (edit.expiresAt !== undefined) {
        body.expiresAt = edit.expiresAt.trim() === '' ? null : edit.expiresAt
      }
      if (edit.enabled !== undefined) {
        body.enabled = edit.enabled
      }
      const res = await fetch('/api/admin/promo-codes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg(`Đã lưu mã "${row.code}"`)
        setEditing(prev => { const n = { ...prev }; delete n[row.id]; return n })
        await load()
      } else {
        setMsg(`Lỗi: ${data.error}`)
      }
    } finally {
      setSaving(null)
    }
  }

  const remove = async (row: PromoCodeRow) => {
    if (!confirm(`Xoá mã "${row.code}"? Không thể hoàn tác.`)) return
    setDeleting(row.id)
    setMsg('')
    try {
      const res = await fetch(`/api/admin/promo-codes?id=${row.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        setMsg(`Đã xoá mã "${row.code}"`)
        await load()
      } else {
        setMsg(`Lỗi: ${data.error}`)
      }
    } finally {
      setDeleting(null)
    }
  }

  const createCode = async () => {
    if (!newCode.code.trim() || !newCode.coins || !newCode.amountVnd) {
      setMsg('Lỗi: cần nhập mã, số xu và giá')
      return
    }
    setCreating(true)
    setMsg('')
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode.code.trim(),
          coins: Number(newCode.coins),
          amountVnd: Number(newCode.amountVnd),
          label: newCode.label.trim() || undefined,
          maxRedemptions: newCode.maxRedemptions.trim() === '' ? null : Number(newCode.maxRedemptions),
          expiresAt: newCode.expiresAt.trim() === '' ? null : newCode.expiresAt,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg(`Đã tạo mã "${data.promoCode.code}"`)
        setNewCode({ code: '', coins: '', amountVnd: '', label: '', maxRedemptions: '', expiresAt: '' })
        await load()
      } else {
        setMsg(`Lỗi: ${data.error}`)
      }
    } finally {
      setCreating(false)
    }
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

      {/* Form thêm mã mới */}
      <div style={{ background: 'rgba(10,10,22,0.5)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', color: '#6b6585', fontSize: '0.7rem', marginBottom: 4 }}>Mã</label>
          <input style={{ ...inputStyle, width: 120 }} value={newCode.code} onChange={e => setNewCode(p => ({ ...p, code: e.target.value }))} placeholder="vd: uudai2026" />
        </div>
        <div>
          <label style={{ display: 'block', color: '#6b6585', fontSize: '0.7rem', marginBottom: 4 }}>Xu</label>
          <input style={{ ...inputStyle, width: 80 }} type="number" value={newCode.coins} onChange={e => setNewCode(p => ({ ...p, coins: e.target.value }))} />
        </div>
        <div>
          <label style={{ display: 'block', color: '#6b6585', fontSize: '0.7rem', marginBottom: 4 }}>Giá (đ)</label>
          <input style={{ ...inputStyle, width: 100 }} type="number" value={newCode.amountVnd} onChange={e => setNewCode(p => ({ ...p, amountVnd: e.target.value }))} />
        </div>
        <div>
          <label style={{ display: 'block', color: '#6b6585', fontSize: '0.7rem', marginBottom: 4 }}>Label (tuỳ chọn)</label>
          <input style={{ ...inputStyle, width: 160 }} value={newCode.label} onChange={e => setNewCode(p => ({ ...p, label: e.target.value }))} placeholder="Ưu đãi mã ..." />
        </div>
        <div>
          <label style={{ display: 'block', color: '#6b6585', fontSize: '0.7rem', marginBottom: 4 }}>Cap lượt (bỏ trống = ∞)</label>
          <input style={{ ...inputStyle, width: 90 }} type="number" value={newCode.maxRedemptions} onChange={e => setNewCode(p => ({ ...p, maxRedemptions: e.target.value }))} />
        </div>
        <div>
          <label style={{ display: 'block', color: '#6b6585', fontSize: '0.7rem', marginBottom: 4 }}>Hạn dùng (bỏ trống = ∞)</label>
          <input style={{ ...inputStyle, width: 140 }} type="date" value={newCode.expiresAt} onChange={e => setNewCode(p => ({ ...p, expiresAt: e.target.value }))} />
        </div>
        <button
          onClick={createCode}
          disabled={creating}
          style={{ padding: '0.4rem 1rem', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '6px', color: '#4ade80', fontFamily: 'var(--font-vietnam)', fontSize: '0.8rem', cursor: 'pointer', opacity: creating ? 0.5 : 1 }}
        >
          {creating ? '...' : '+ Thêm mã'}
        </button>
      </div>

      <div style={{ background: 'rgba(10,10,22,0.5)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: '12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
              {['#', 'Mã / Label', 'Xu / Giá', 'Đã dùng / Cap', 'Hạn dùng', 'Bật', 'Ngày tạo', ''].map(h => (
                <th key={h} style={{ ...cellStyle, color: '#6b6585', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ ...cellStyle, color: '#6b6585', textAlign: 'center', padding: '2rem' }}>
                  Chưa có mã ưu đãi nào
                </td>
              </tr>
            )}
            {rows.map(row => {
              const edit = editing[row.id] || {}
              // maxRedemptions/expiresAt sửa được cho MỌI mã, kể cả 3 mã cũ đang null (CN1).
              const maxRedemptionsVal = edit.maxRedemptions ?? (row.maxRedemptions === null ? '' : String(row.maxRedemptions))
              const expiresAtVal = edit.expiresAt ?? (row.expiresAt ? row.expiresAt.slice(0, 10) : '')
              const enabledVal = edit.enabled ?? row.enabled
              const codeVal = edit.code ?? row.code
              const coinsVal = edit.coins ?? String(row.coins)
              const amountVndVal = edit.amountVnd ?? String(row.amountVnd)
              const labelVal = edit.label ?? (row.label || '')
              const isDirty = edit.maxRedemptions !== undefined || edit.expiresAt !== undefined || edit.enabled !== undefined
                || edit.code !== undefined || edit.coins !== undefined || edit.amountVnd !== undefined || edit.label !== undefined

              return (
                <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ ...cellStyle, color: '#6b6585' }}>#{row.id}</td>
                  <td style={{ ...cellStyle }}>
                    <input
                      value={codeVal}
                      onChange={e => setEdit(row.id, { code: e.target.value })}
                      style={{ ...inputStyle, width: 110, fontFamily: 'monospace', fontWeight: 600, marginBottom: 4, display: 'block' }}
                    />
                    <input
                      value={labelVal}
                      placeholder="Label (tuỳ chọn)"
                      onChange={e => setEdit(row.id, { label: e.target.value })}
                      style={{ ...inputStyle, width: 110, fontSize: '0.72rem' }}
                    />
                  </td>
                  <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                    <input
                      type="number" min={1}
                      value={coinsVal}
                      onChange={e => setEdit(row.id, { coins: e.target.value })}
                      style={{ ...inputStyle, width: 70, marginRight: 4 }}
                    /> xu /
                    <input
                      type="number" min={1}
                      value={amountVndVal}
                      onChange={e => setEdit(row.id, { amountVnd: e.target.value })}
                      style={{ ...inputStyle, width: 90, marginLeft: 4 }}
                    />đ
                  </td>
                  <td style={{ ...cellStyle }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ color: '#e8e0f0' }}>{row.redeemedCount}</span>
                      <span style={{ color: '#4a4560' }}>/</span>
                      <input
                        type="number" min={0}
                        value={maxRedemptionsVal}
                        placeholder="∞"
                        onChange={e => setEdit(row.id, { maxRedemptions: e.target.value })}
                        style={{ ...inputStyle, width: 60, textAlign: 'right' }}
                      />
                    </div>
                  </td>
                  <td style={{ ...cellStyle }}>
                    <input
                      type="date"
                      value={expiresAtVal}
                      onChange={e => setEdit(row.id, { expiresAt: e.target.value })}
                      style={{ ...inputStyle, width: 140 }}
                    />
                  </td>
                  <td style={{ ...cellStyle }}>
                    <input
                      type="checkbox"
                      checked={enabledVal}
                      onChange={e => setEdit(row.id, { enabled: e.target.checked })}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ ...cellStyle, color: '#4a4560', whiteSpace: 'nowrap' }}>{fmtDate(row.createdAt)}</td>
                  <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                    {isDirty && (
                      <button
                        onClick={() => save(row)}
                        disabled={saving === row.id}
                        style={{ padding: '0.35rem 0.7rem', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', color: '#c9a84c', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', cursor: 'pointer', opacity: saving === row.id ? 0.5 : 1, marginRight: '0.4rem' }}
                      >
                        {saving === row.id ? '...' : 'Lưu'}
                      </button>
                    )}
                    <button
                      onClick={() => remove(row)}
                      disabled={deleting === row.id}
                      style={{ padding: '0.35rem 0.7rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '6px', color: '#f87171', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', cursor: 'pointer', opacity: deleting === row.id ? 0.5 : 1 }}
                    >
                      {deleting === row.id ? '...' : 'Xoá'}
                    </button>
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
