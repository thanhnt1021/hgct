'use client'
import { useState } from 'react'

const SERVICES = [
  { value: 'career',   label: 'Hướng Nghiệp', color: '#c8943f' },
  { value: 'love',     label: 'Tình Duyên',   color: '#b84d70' },
  { value: 'synastry', label: 'Cặp Đôi',      color: '#7c4dba' },
  { value: 'vanhan',   label: 'Vận Hạn',       color: '#4070b8' },
]
const SERVICE_IMG: Record<string, string> = {
  career: 'HuongNghiep', love: 'TinhDuyen', synastry: 'CapDoi', vanhan: 'VanHan',
}

interface Profile { id: string; name: string; data: Record<string, unknown> }

const today    = new Date().toISOString().split('T')[0]
const nextYear = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]

const SEL: React.CSSProperties = {
  background: '#1c1540',
  color: '#c9c3d6',
  border: '1px solid #38287a',
  borderRadius: 6,
  padding: '8px 12px',
  fontSize: 14,
  minWidth: 220,
  cursor: 'pointer',
  outline: 'none',
}
const LBL: React.CSSProperties = {
  display: 'block',
  color: '#8a8399',
  fontSize: '0.68rem',
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  marginBottom: 6,
  fontFamily: 'var(--font-vietnam, sans-serif)',
}

export default function ChartPreview({ profiles }: { profiles: Profile[] }) {
  const [service,    setService]    = useState('career')
  const [profileId,  setProfileId]  = useState(profiles[0]?.id ?? '')
  const [profileIdB, setProfileIdB] = useState(profiles[1]?.id ?? profiles[0]?.id ?? '')
  const [startDate,  setStartDate]  = useState(today)
  const [endDate,    setEndDate]    = useState(nextYear)
  const [svgHtml,    setSvgHtml]    = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  const isCapDoi = service === 'synastry'
  const isVanHan = service === 'vanhan'
  const svc      = SERVICES.find(s => s.value === service)

  async function handlePreview() {
    setLoading(true); setError(''); setSvgHtml('')
    try {
      const res = await fetch('/api/chart/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service, profileId,
          profileIdB: isCapDoi ? profileIdB : undefined,
          startDate:  isVanHan ? startDate : undefined,
          endDate:    isVanHan ? endDate   : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Lỗi server')
      setSvgHtml(json.svgString)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi không xác định')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary, #06060f)',
      color: '#c9c3d6',
      padding: '32px 20px',
      fontFamily: 'var(--font-vietnam, sans-serif)',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* ── Header ── */}
        <h1 style={{
          fontFamily: 'var(--font-display, serif)',
          color: '#d9ab55',
          fontSize: 22,
          fontWeight: 400,
          letterSpacing: '0.08em',
          marginBottom: 28,
          borderBottom: '1px solid #261c56',
          paddingBottom: 16,
        }}>
          Preview Bản Đồ Sao
        </h1>

        {/* ── Service selector ── */}
        <div style={{ marginBottom: 22 }}>
          <span style={LBL}>Loại dịch vụ</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SERVICES.map(s => (
              <button key={s.value} onClick={() => setService(s.value)}
                style={{
                  padding: '7px 18px',
                  borderRadius: 6,
                  border: `1px solid ${service === s.value ? s.color : '#261c56'}`,
                  background: service === s.value ? `${s.color}22` : 'transparent',
                  color: service === s.value ? s.color : '#8a8399',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-vietnam, sans-serif)',
                  transition: 'all 0.15s',
                }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Profile A ── */}
        <div style={{ marginBottom: 14 }}>
          <label style={LBL}>{isCapDoi ? 'Profile — Người A' : 'Profile'}</label>
          <select value={profileId} onChange={e => setProfileId(e.target.value)} style={SEL}>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* ── Profile B (Cap Doi only) ── */}
        {isCapDoi && (
          <div style={{ marginBottom: 14 }}>
            <label style={LBL}>Profile — Người B</label>
            <select value={profileIdB} onChange={e => setProfileIdB(e.target.value)} style={SEL}>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        {/* ── Date range (Van Han only) ── */}
        {isVanHan && (
          <div style={{ marginBottom: 14 }}>
            <label style={LBL}>Khoảng thời gian</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{ ...SEL, minWidth: 150 }} />
              <span style={{ color: '#38287a' }}>→</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                style={{ ...SEL, minWidth: 150 }} />
            </div>
          </div>
        )}

        {/* ── Submit button ── */}
        <button onClick={handlePreview} disabled={loading}
          style={{
            marginTop: 8,
            padding: '10px 32px',
            background: loading
              ? '#1c1540'
              : 'linear-gradient(135deg, #c8943f, #d9ab55)',
            color: loading ? '#8a8399' : '#06060f',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.04em',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-vietnam, sans-serif)',
          }}>
          {loading ? 'Đang tính...' : 'Xem bản đồ sao'}
        </button>

        {error && (
          <p style={{ color: '#c45252', marginTop: 12, fontSize: 13 }}>{error}</p>
        )}

        {/* ── Preview area ── */}
        {svgHtml && (
          <div style={{ marginTop: 32 }}>
            <span style={{ ...LBL, marginBottom: 12 }}>
              Preview — {svc?.label}
            </span>
            {/* Image + SVG overlay */}
            <div style={{ position: 'relative', display: 'inline-block', maxWidth: 700, width: '100%' }}>
              <img
                src={`/api/imgs/pdf-${SERVICE_IMG[service] ?? 'HuongNghiep'}-02.jpg`}
                alt="PDF background"
                style={{ display: 'block', width: '100%' }}
              />
              {/* SVG overlay — aspectRatio:1 giữ chart vuông, top/left/width căn vào inner rectangle */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '90%',
                }}
                dangerouslySetInnerHTML={{ __html: svgHtml }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
