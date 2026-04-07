'use client'

import { useState } from 'react'
import { SERVICES, SERVICE_LABELS, SERVICE_ICONS } from '@/lib/pricing'

const VND = (n: number) => n.toLocaleString('vi-VN') + 'đ'

function PriceRow({
  svc,
  price,
  configKey,
  onSaved,
}: {
  svc: string
  price: number
  configKey: string
  onSaved: (svc: string, val: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function startEdit() {
    setEditing(true)
    setInput(String(price))
  }

  async function save() {
    const val = parseInt(input, 10)
    if (isNaN(val) || val <= 0) return
    setSaving(true)
    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: configKey, value: String(val) }),
    })
    if (res.ok) {
      onSaved(svc, val)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  return (
    <div
      style={{
        background: '#13131f',
        border: '1px solid rgba(201,168,76,0.12)',
        borderRadius: 10,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <span style={{ fontSize: '1.4rem', width: 32, flexShrink: 0 }}>{SERVICE_ICONS[svc]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e8e0f0' }}>
          {SERVICE_LABELS[svc]}
        </div>
        {editing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
              autoFocus
              style={{
                width: 120,
                background: '#0a0a16',
                border: '1px solid rgba(201,168,76,0.35)',
                borderRadius: 6,
                padding: '4px 10px',
                color: '#f0e8d0',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
            <button
              onClick={save}
              disabled={saving}
              style={{
                padding: '4px 14px',
                background: 'rgba(201,168,76,0.15)',
                border: '1px solid rgba(201,168,76,0.35)',
                borderRadius: 5,
                color: '#c9a84c',
                cursor: 'pointer',
                fontSize: '0.8rem',
                opacity: saving ? 0.5 : 1,
              }}
            >
              {saving ? '…' : 'Lưu'}
            </button>
            <button
              onClick={() => setEditing(false)}
              style={{
                padding: '4px 10px',
                background: 'none',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 5,
                color: '#6b6585',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              Hủy
            </button>
          </div>
        ) : (
          <div style={{ fontSize: '0.85rem', color: '#c9a84c', marginTop: 2 }}>
            {VND(price)}
            {saved && <span style={{ color: '#4ade80', marginLeft: 8 }}>✓ Đã lưu</span>}
          </div>
        )}
      </div>
      {!editing && (
        <button
          onClick={startEdit}
          style={{
            padding: '5px 14px',
            background: 'none',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 5,
            color: '#a09ab8',
            cursor: 'pointer',
            fontSize: '0.78rem',
            flexShrink: 0,
          }}
        >
          Sửa
        </button>
      )}
    </div>
  )
}

export default function PriceEditor({
  initialPrices,
  initialDisplayPrices,
}: {
  initialPrices: Record<string, number>
  initialDisplayPrices: Record<string, number>
}) {
  const [prices, setPrices] = useState<Record<string, number>>(initialPrices)
  const [displayPrices, setDisplayPrices] = useState<Record<string, number>>(initialDisplayPrices)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Section 1: Giá niêm yết */}
      <div>
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f0e8d0', marginBottom: 2 }}>Giá Niêm Yết</p>
          <p style={{ fontSize: '0.75rem', color: '#6b6585' }}>Hiển thị trên trang Dịch Vụ — chỉ để tham khảo, không dùng cho thanh toán</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SERVICES.map((svc) => (
            <PriceRow
              key={`display-${svc}`}
              svc={svc}
              price={displayPrices[svc] ?? 0}
              configKey={`display_price_${svc}`}
              onSaved={(s, v) => setDisplayPrices(prev => ({ ...prev, [s]: v }))}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

      {/* Section 2: Giá bán thật */}
      <div>
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f0e8d0', marginBottom: 2 }}>Giá Bán Thật</p>
          <p style={{ fontSize: '0.75rem', color: '#6b6585' }}>Dùng để tạo mã QR thanh toán — đây là số tiền khách thực trả</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SERVICES.map((svc) => (
            <PriceRow
              key={`real-${svc}`}
              svc={svc}
              price={prices[svc] ?? 0}
              configKey={`price_${svc}`}
              onSaved={(s, v) => setPrices(prev => ({ ...prev, [s]: v }))}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
