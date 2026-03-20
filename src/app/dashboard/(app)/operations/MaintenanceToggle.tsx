'use client'

import { useState, useTransition } from 'react'

export default function MaintenanceToggle({ currentMode }: { currentMode: string }) {
  const [mode, setMode] = useState(currentMode)
  const [isPending, startTransition] = useTransition()

  const isMaintenance = mode === 'maintenance'

  async function toggle() {
    const next = isMaintenance ? 'normal' : 'maintenance'
    startTransition(async () => {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'site_mode', value: next }),
      })
      if (res.ok) setMode(next)
    })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <button
        onClick={toggle}
        disabled={isPending}
        style={{
          position: 'relative',
          width: 52,
          height: 28,
          borderRadius: 14,
          border: 'none',
          background: isMaintenance ? '#c9a84c' : '#2a2a3d',
          cursor: isPending ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
          flexShrink: 0,
          opacity: isPending ? 0.6 : 1,
        }}
        aria-label="Toggle maintenance mode"
      >
        <span style={{
          position: 'absolute',
          top: 3,
          left: isMaintenance ? 26 : 3,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
        }} />
      </button>

      <div>
        <div style={{
          fontSize: '0.9rem',
          fontWeight: 600,
          color: isMaintenance ? '#c9a84c' : '#e8e0f0',
        }}>
          {isMaintenance ? 'Đang bảo trì' : 'Hoạt động bình thường'}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#6b6585' }}>
          {isMaintenance
            ? 'Trang /services hiển thị thông báo bảo trì'
            : 'Khách hàng có thể đặt dịch vụ bình thường'}
        </div>
      </div>
    </div>
  )
}
