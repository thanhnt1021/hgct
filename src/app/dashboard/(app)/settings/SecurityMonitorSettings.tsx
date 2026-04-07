'use client'

import { useState, useEffect } from 'react'

const PRESETS = [5, 10, 15, 30, 60]

export default function SecurityMonitorSettings() {
  const [current, setCurrent] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/security-interval')
      .then(r => r.json())
      .then(d => { setCurrent(d.interval); setInput(String(d.interval)) })
      .catch(() => {})
  }, [])

  async function save(val?: number) {
    const n = val ?? parseInt(input)
    if (!n || n < 5 || n > 1440) {
      setMsg({ ok: false, text: 'Phải từ 5–1440 phút' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/security-interval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: n }),
      })
      const data = await res.json()
      if (res.ok) {
        setCurrent(n)
        setInput(String(n))
        setMsg({ ok: true, text: `Đã đổi thành ${n} phút` })
      } else {
        setMsg({ ok: false, text: data.error || 'Lỗi' })
      }
    } catch (e) {
      setMsg({ ok: false, text: String(e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ marginTop: 32, borderTop: '1px solid rgba(201,168,76,0.1)', paddingTop: 24 }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#f0e8d0', marginBottom: 4 }}>Security Monitor</h2>
      <p style={{ color: '#6b6585', fontSize: '0.78rem', marginBottom: 16 }}>
        Tần suất quét bảo mật tự động.{current !== null && ` Hiện tại: ${current} phút.`}
      </p>

      {/* Preset buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => { setInput(String(p)); save(p) }}
            disabled={saving}
            style={{
              padding: '5px 14px',
              borderRadius: 4,
              border: `1px solid ${current === p ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.2)'}`,
              background: current === p ? 'rgba(201,168,76,0.15)' : 'transparent',
              color: current === p ? '#c9a84c' : '#9b8fb5',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '0.82rem',
            }}
          >
            {p} phút
          </button>
        ))}
      </div>

      {/* Custom input */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="number"
          min={5}
          max={1440}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          style={{
            width: 80,
            padding: '5px 10px',
            background: '#13131f',
            border: '1px solid rgba(201,168,76,0.2)',
            borderRadius: 4,
            color: '#e8e0f0',
            fontSize: '0.85rem',
          }}
        />
        <span style={{ color: '#6b6585', fontSize: '0.82rem' }}>phút</span>
        <button
          onClick={() => save()}
          disabled={saving}
          style={{
            padding: '5px 14px',
            background: 'rgba(201,168,76,0.1)',
            border: '1px solid rgba(201,168,76,0.25)',
            borderRadius: 4,
            color: '#c9a84c',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '0.82rem',
          }}
        >
          {saving ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>

      {msg && (
        <p style={{ marginTop: 8, fontSize: '0.78rem', color: msg.ok ? '#4ade80' : '#f87171' }}>
          {msg.text}
        </p>
      )}
    </div>
  )
}
