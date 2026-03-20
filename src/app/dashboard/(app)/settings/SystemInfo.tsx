'use client'

import { useState, useEffect } from 'react'

interface SystemData {
  uptime: string
  heapMB: number
  rssMB: number
  totalMemMB: number
  freeMemMB: number
  nodeVersion: string
  platform: string
  orderCount: number
  jobCount: number
  userCount: number
  env: string
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{
      background: '#13131f',
      border: '1px solid rgba(201,168,76,0.1)',
      borderRadius: 8,
      padding: '14px 18px',
    }}>
      <div style={{ fontSize: '0.7rem', color: '#6b6585', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e8e0f0' }}>{value}</div>
    </div>
  )
}

export default function SystemInfo() {
  const [data, setData] = useState<SystemData | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/system-info')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return <p style={{ color: '#4a4560', fontSize: '0.85rem' }}>Đang tải…</p>
  if (!data) return <p style={{ color: '#f87171', fontSize: '0.85rem' }}>Không lấy được thông tin</p>

  const memPct = Math.round(((data.totalMemMB - data.freeMemMB) / data.totalMemMB) * 100)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 24 }}>
        <StatCard label="Uptime" value={data.uptime} />
        <StatCard label="Môi trường" value={data.env} />
        <StatCard label="Node.js" value={data.nodeVersion} />
        <StatCard label="Tổng đơn hàng" value={data.orderCount.toLocaleString()} />
        <StatCard label="Tổng jobs" value={data.jobCount.toLocaleString()} />
        <StatCard label="Tổng users" value={data.userCount.toLocaleString()} />
        <StatCard label="Heap JS" value={`${data.heapMB} MB`} />
        <StatCard label="RSS" value={`${data.rssMB} MB`} />
        <StatCard label="RAM hệ thống" value={
          <span>
            {data.totalMemMB - data.freeMemMB} / {data.totalMemMB} MB
            <span style={{ fontSize: '0.75rem', color: memPct > 80 ? '#f87171' : '#6b6585', marginLeft: 6 }}>({memPct}%)</span>
          </span>
        } />
      </div>

      <button
        onClick={load}
        style={{
          padding: '6px 16px',
          background: 'rgba(201,168,76,0.1)',
          border: '1px solid rgba(201,168,76,0.25)',
          borderRadius: 5,
          color: '#c9a84c',
          cursor: 'pointer',
          fontSize: '0.8rem',
        }}
      >
        ↻ Tải lại
      </button>
    </div>
  )
}
