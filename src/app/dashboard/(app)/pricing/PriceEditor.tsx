'use client'

import { useState } from 'react'
import { SERVICES, SERVICE_LABELS, SERVICE_ICONS } from '@/lib/pricing'

const VND = (n: number) => n.toLocaleString('vi-VN') + 'đ'

export default function PriceEditor({ initialPrices }: { initialPrices: Record<string, number> }) {
  const [prices, setPrices] = useState<Record<string, number>>(initialPrices)
  const [editing, setEditing] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  function startEdit(svc: string) {
    setEditing(svc)
    setInput(String(prices[svc] ?? ''))
  }

  async function save(svc: string) {
    const val = parseInt(input, 10)
    if (isNaN(val) || val <= 0) return
    setSaving(true)
    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: `price_${svc}`, value: String(val) }),
    })
    if (res.ok) {
      setPrices((prev) => ({ ...prev, [svc]: val }))
      setEditing(null)
      setSavedKey(svc)
      setTimeout(() => setSavedKey(null), 2000)
    }
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {SERVICES.map((svc) => (
        <div
          key={svc}
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
            {editing === svc ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <input
                  type="number"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') save(svc); if (e.key === 'Escape') setEditing(null) }}
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
                  onClick={() => save(svc)}
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
                  onClick={() => setEditing(null)}
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
                {VND(prices[svc] ?? 0)}
                {savedKey === svc && <span style={{ color: '#4ade80', marginLeft: 8 }}>✓ Đã lưu</span>}
              </div>
            )}
          </div>
          {editing !== svc && (
            <button
              onClick={() => startEdit(svc)}
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
      ))}
    </div>
  )
}
