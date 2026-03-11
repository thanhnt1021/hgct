'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import NatalWheel from '@/components/chart/NatalWheel'
import { PLANET_SYMBOLS, ASPECT_TABLE_OBJECTS } from '@/lib/astrology/symbols'

// ─── Types ─────────────────────────────────────────────────────────

interface Profile {
  id: string; name: string; note: string; gender: string
  dob: { day: number; month: number; year: number }
  tob: { hour: number; minute: number; unknown: boolean }
  loc: { address: string; lat: number; lon: number; tz: string }
}

interface PlanetRow {
  name: string; nameVn: string; symbol: string; lon: number
  sign: string; signCode: string; signSymbol: string; signIdx: number
  degInSign: number; house: number; isRetro: boolean
}
interface CuspRow {
  house: number; lon: number; sign: string; signCode: string
  signSymbol: string; degInSign: number; ruler: string; rulerSymbol: string
}
interface AspectRow {
  p1: string; p2: string; p1Symbol: string; p2Symbol: string
  aspect: string; nameVn: string; symbol: string; orb: number; type: string
}
interface WheelAspect {
  p1: string; p2: string; aspect: string; type: string
}
interface DominantAspect {
  partner: string; partnerSymbol: string; partnerNameVn: string
  aspect: string; aspSymbol: string; aspNameVn: string; orb: number; type: string
}
interface DominantPlanet {
  name: string; nameVn: string; symbol: string; count: number
  aspects: DominantAspect[]
}
interface TightAspect {
  p1: string; p2: string; p1Symbol: string; p2Symbol: string
  aspect: string; nameVn: string; symbol: string; orb: number; type: string
}
interface ChartResult {
  name: string; chartInfo: Record<string, string>
  planets: PlanetRow[]; cusps: CuspRow[]
  aspects: AspectRow[]
  wheelAspects: WheelAspect[]
  elementMatrix: number[][]; elScores: number[]; modScores: number[]
  dominantPlanets: DominantPlanet[]
  tightestAspects: TightAspect[]
  rawPlanets: Record<string, { lon: number; speed?: number }>
  rawCusps: number[]; angles: { Asc: number; MC: number }
}

// ─── Helpers ───────────────────────────────────────────────────────

function fmtDeg(deg: number) {
  const d = Math.floor(deg)
  const m = Math.floor((deg - d) * 60)
  return `${d}°${String(m).padStart(2, '0')}'`
}

function fmtOrb(orb: number) {
  const d = Math.floor(Math.abs(orb))
  const m = Math.round((Math.abs(orb) - d) * 60)
  return `${d}°${String(m).padStart(2, '0')}'`
}

function orbRoundClient(orb: number): number {
  const d = Math.floor(Math.abs(orb))
  const m = (Math.abs(orb) - d) * 60
  return m <= 30 ? d : d + 1
}

// Core planets for count row in aspect grid
const CORE_SET = new Set(['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'])

const ASPECT_COLORS: Record<string, string> = {
  Conjunction: '#d9ab55',
  Trine: '#5578d4', Sextile: '#55b870',
  Square: '#c84545', Opposition: '#b84060',
  Semisextile: '#00cc00', Quincunx: '#00cc00',
}

const EL_LABELS = ['Lửa 🔥', 'Đất 🌱', 'Khí 💨', 'Nước 💧']
const EL_COLORS = ['#d06040', '#58a840', '#c8a030', '#4060c8']
const MOD_LABELS = ['Tiên Phong', 'Kiên Định', 'Linh Hoạt']

// ─── Section header ────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,148,63,0.3))' }} />
      <p style={{ color: '#c8943f', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
        {children}
      </p>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(200,148,63,0.3), transparent)' }} />
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────

export default function ChartPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [profileSearch, setProfileSearch] = useState('')
  const [result, setResult] = useState<ChartResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submitWithData = useCallback(async (inputData: object) => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/chart', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputData }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Lỗi tính toán'); setLoading(false); return }
      setResult(data)
    } catch { setError('Lỗi kết nối server') }
    setLoading(false)
  }, [])

  useEffect(() => {
    // Auto-submit if coming back from /input?for=chart
    const chartData = sessionStorage.getItem('chartInputData')
    if (chartData) {
      sessionStorage.removeItem('chartInputData')
      submitWithData(JSON.parse(chartData))
      return
    }

    fetch('/api/profiles')
      .then(r => r.json())
      .then(data => {
        if (data.profiles) {
          const mapped = data.profiles.map((p: any) => ({
            id: String(p.id),
            name: p.name,
            note: p.data?.note || '',
            gender: p.gender || 'Female',
            dob: p.data?.dob || { day: 1, month: 1, year: 1990 },
            tob: p.data?.tob || { hour: 12, minute: 0, unknown: false },
            loc: p.data?.loc || { address: '', lat: 0, lon: 0, tz: 'Asia/Ho_Chi_Minh' },
          }))
          setProfiles(mapped)
          // Pre-select from URL param ?id=
          const preId = new URLSearchParams(window.location.search).get('id')
          if (preId && mapped.find((p: Profile) => p.id === preId)) {
            setSelected(preId)
          }
        }
      })
      .catch(() => {})
      .finally(() => setProfilesLoading(false))
  }, [submitWithData])

  const handleSubmit = async () => {
    const profile = profiles.find(p => p.id === selected)
    if (!profile) return
    await submitWithData({
      name: profile.name, gender: profile.gender, dob: profile.dob,
      tob: profile.tob.unknown ? { hour: 12, minute: 0 } : { hour: profile.tob.hour, minute: profile.tob.minute },
      loc: profile.loc,
    })
  }

  const resetResult = () => { setResult(null); setError('') }

  // ── Loading ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#06060f' }}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-full animate-spin mx-auto mb-5"
          style={{ border: '2px solid rgba(200,148,63,0.15)', borderTopColor: '#d9ab55' }} />
        <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem' }}>
          Đang tính toán bản đồ sao...
        </p>
      </div>
    </div>
  )

  // ── Profile selector ─────────────────────────────────────────────
  if (!result) return (
    <div className="min-h-screen" style={{ background: '#06060f' }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-28 pb-16">
        <div className="text-center mb-12">
          <p className="section-eyebrow mb-4">Chiêm tinh học</p>
          <h1 style={{ color: '#f4efe6', fontFamily: 'var(--font-playfair)', fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(2rem, 6vw, 3.2rem)', textTransform: 'uppercase' }}>
            Bản Đồ Sao
          </h1>
          <div className="mx-auto mt-5 mb-6" style={{ width: '60px', height: '1px', background: 'linear-gradient(90deg,transparent,#d9ab55,transparent)' }} />
          <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '1rem', lineHeight: 1.8 }}>
            Chọn hồ sơ để xem bản đồ sao đầy đủ với vị trí hành tinh, nhà, góc hợp và phân tích nguyên tố.
          </p>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ background: 'rgba(18,13,46,0.75)', border: '1px solid rgba(200,148,63,0.18)', backdropFilter: 'blur(20px)' }}
        >
          {profilesLoading ? (
            <div className="text-center py-6">
              <div className="w-8 h-8 rounded-full animate-spin mx-auto"
                style={{ border: '2px solid rgba(200,148,63,0.15)', borderTopColor: '#d9ab55' }} />
            </div>
          ) : (
            <div className="space-y-4">
              <label style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.65rem', letterSpacing: '0.06em', display: 'block', marginBottom: '0.25rem' }}>
                CHỌN HỒ SƠ
              </label>

              {/* Nút Nhập thông tin mới */}
              <button
                type="button"
                onClick={() => router.push('/input?for=chart')}
                className="w-full flex items-center gap-2"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(200,148,63,0.28)',
                  color: '#d9ab55',
                  borderRadius: '6px',
                  padding: '0.55rem 0.875rem',
                  fontFamily: 'var(--font-vietnam)',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,148,63,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Plus size={14} /> Nhập thông tin mới
              </button>

              {profiles.length > 0 && (
                <>
                  {/* Search */}
                  <div className="flex items-center gap-2 rounded-lg px-3"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(200,148,63,0.1)', minHeight: 38 }}>
                    <Search size={13} style={{ color: '#6b7280', flexShrink: 0 }} />
                    <input
                      type="text"
                      value={profileSearch}
                      onChange={e => setProfileSearch(e.target.value)}
                      placeholder="Tìm hồ sơ..."
                      style={{ background: 'transparent', border: 'none', outline: 'none', color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem', width: '100%', padding: '0.4rem 0' }}
                    />
                    {profileSearch && (
                      <button onClick={() => setProfileSearch('')} style={{ color: '#6b7280', flexShrink: 0, lineHeight: 1 }}>✕</button>
                    )}
                  </div>

                  {/* Profile list */}
                  <div className="space-y-1 overflow-y-auto pr-0.5" style={{ maxHeight: 240 }}>
                    {profiles
                      .filter(p => {
                        const q = profileSearch.toLowerCase()
                        return p.name.toLowerCase().includes(q) || p.note.toLowerCase().includes(q)
                      })
                      .map(p => {
                        const isSelected = selected === p.id
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelected(p.id)}
                            className="w-full text-left rounded-lg px-3 py-2.5"
                            style={{
                              background: isSelected ? 'rgba(200,148,63,0.12)' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${isSelected ? 'rgba(200,148,63,0.32)' : 'rgba(255,255,255,0.05)'}`,
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                            onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
                          >
                            <p style={{ color: isSelected ? '#f0cc78' : '#f4efe6', fontFamily: 'var(--font-vietnam)', fontWeight: 600, fontSize: '0.88rem', margin: 0 }}>
                              {p.name}
                            </p>
                            <p style={{ color: '#8b8fa8', fontFamily: 'var(--font-vietnam)', fontSize: '0.7rem', fontStyle: 'italic', minHeight: '1em', marginTop: '0.15rem' }}>
                              {p.note || ''}
                            </p>
                          </button>
                        )
                      })}
                  </div>

                  {error && (
                    <p style={{ color: '#c45252', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem' }}>
                      {error}
                    </p>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={!selected}
                    className="w-full py-3.5 font-bold text-sm"
                    style={{
                      background: selected ? 'linear-gradient(135deg,#c8943f,#f0cc78,#c8943f)' : 'rgba(200,148,63,0.15)',
                      color: selected ? '#06060f' : '#4a4560',
                      borderRadius: '4px', fontFamily: 'var(--font-vietnam)', letterSpacing: '0.1em',
                      transition: 'all 0.2s',
                      boxShadow: selected ? '0 4px 24px rgba(200,148,63,0.25)' : 'none',
                      cursor: selected ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Xem bản đồ sao ✦
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ── Result view ──────────────────────────────────────────────────
  const {
    name, chartInfo, planets, cusps, aspects, wheelAspects,
    elementMatrix, elScores, modScores,
    dominantPlanets, tightestAspects,
    rawPlanets, rawCusps, angles,
  } = result

  // Aspect lookup for grid
  const aspLookup: Record<string, AspectRow> = {}
  for (const a of aspects) {
    aspLookup[`${a.p1}__${a.p2}`] = a
    aspLookup[`${a.p2}__${a.p1}`] = a
  }

  // Major aspect count per core planet — both partners must be CORE (section 3e)
  const majorCount: Record<string, number> = {}
  for (const a of aspects) {
    if (a.type === 'Minor') continue
    if (!CORE_SET.has(a.p1) || !CORE_SET.has(a.p2)) continue
    majorCount[a.p1] = (majorCount[a.p1] || 0) + 1
    majorCount[a.p2] = (majorCount[a.p2] || 0) + 1
  }

  const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem' }
  const th: React.CSSProperties = { color: '#6a6080', fontSize: '0.68rem', letterSpacing: '0.06em', fontWeight: 600, padding: '0.5rem 0.75rem', textAlign: 'left', borderBottom: '1px solid rgba(200,148,63,0.1)' }
  const td: React.CSSProperties = { padding: '0.6rem 0.75rem', borderBottom: '1px solid rgba(200,148,63,0.06)', verticalAlign: 'middle' }

  const elTotals = elScores.reduce((a, b) => a + b, 0) || 1
  const modTotals = modScores.reduce((a, b) => a + b, 0) || 1

  return (
    <div className="min-h-screen" style={{ background: '#06060f' }}>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-16">

        {/* Page header */}
        <div className="flex items-start justify-between mb-10 flex-wrap gap-4">
          <div>
            <p className="section-eyebrow mb-2">Bản đồ sao bản mệnh</p>
            <h1 style={{ color: '#f4efe6', fontFamily: 'var(--font-playfair)', fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(1.8rem,5vw,2.8rem)', textTransform: 'uppercase' }}>
              {name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-4" style={{ fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', color: '#4a4560' }}>
              <span>🕐 {chartInfo.local_time}</span>
              <span>📍 {chartInfo.lat_lon}</span>
              <span>🏠 {chartInfo.house_sys}</span>
            </div>
          </div>
          <button
            onClick={resetResult}
            style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem', background: 'none', border: '1px solid rgba(200,148,63,0.15)', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer' }}
          >
            ← Chọn hồ sơ khác
          </button>
        </div>

        {/* ─── Wheel + Planets ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Wheel */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(12,10,30,0.7)', border: '1px solid rgba(200,148,63,0.14)' }}>
            <SectionHeader>BÁNH XE BẢN ĐỒ SAO</SectionHeader>
            <NatalWheel
              rawPlanets={rawPlanets}
              rawCusps={rawCusps}
              angles={angles}
              wheelAspects={wheelAspects}
              planetSymbols={PLANET_SYMBOLS}
            />
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 justify-center">
              {([
                ['Trùng','#d9ab55'], ['Tam Hợp','#5578d4'], ['Lục Hợp','#55b870'],
                ['Vuông Góc','#c84545'], ['Đối Đỉnh','#b84060'], ['Phụ','#00cc00'],
              ] as [string, string][]).map(([label, color]) => (
                <span key={label} style={{ color, fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ display: 'inline-block', width: '16px', height: '1.5px', background: color, verticalAlign: 'middle' }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Planet table */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(12,10,30,0.7)', border: '1px solid rgba(200,148,63,0.14)' }}>
            <SectionHeader>VỊ TRÍ HÀNH TINH</SectionHeader>
            <div style={{ overflowY: 'auto', maxHeight: '520px' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={th}>Hành tinh</th>
                    <th style={th}>Cung</th>
                    <th style={{ ...th, textAlign: 'right' }}>Độ</th>
                    <th style={{ ...th, textAlign: 'center' }}>Nhà</th>
                  </tr>
                </thead>
                <tbody>
                  {planets.map((p) => (
                    <tr key={p.name}>
                      <td style={td}>
                        <span style={{ color: '#d9ab55', fontSize: '1rem', marginRight: '6px', fontFamily: 'serif' }}>{p.symbol}</span>
                        <span style={{ color: '#c9c3d6' }}>{p.nameVn}</span>
                        {p.isRetro && <span style={{ color: '#c45252', fontSize: '0.72rem', marginLeft: '4px' }}>℞</span>}
                      </td>
                      <td style={td}>
                        <span style={{ marginRight: '4px', fontFamily: 'serif' }}>{p.signSymbol}</span>
                        <span style={{ color: '#8a8399' }}>{p.signCode}</span>
                      </td>
                      <td style={{ ...td, textAlign: 'right', color: '#f4efe6', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtDeg(p.degInSign)}
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', minWidth: '24px', padding: '1px 5px',
                          background: 'rgba(200,148,63,0.08)', border: '1px solid rgba(200,148,63,0.2)',
                          borderRadius: '3px', color: '#d9ab55', fontSize: '0.78rem', textAlign: 'center',
                        }}>
                          {p.house}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ─── House Cusps ──────────────────────────────── */}
        <div className="rounded-2xl p-5 mb-8" style={{ background: 'rgba(12,10,30,0.7)', border: '1px solid rgba(200,148,63,0.14)' }}>
          <SectionHeader>ĐỘ ĐỈNH CỦA 12 NHÀ</SectionHeader>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...tableStyle, minWidth: '480px' }}>
              <thead>
                <tr>
                  {['Nhà','Cung','Độ','Chủ tinh'].map(h => (
                    <th key={h} style={{ ...th, textAlign: h === 'Độ' ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cusps.map((c) => (
                  <tr key={c.house}>
                    <td style={td}>
                      <span style={{
                        display: 'inline-block', minWidth: '28px', padding: '1px 6px',
                        background: 'rgba(200,148,63,0.08)', border: '1px solid rgba(200,148,63,0.2)',
                        borderRadius: '3px', color: '#d9ab55', fontSize: '0.8rem', textAlign: 'center',
                      }}>
                        {c.house}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{ marginRight: '5px', fontFamily: 'serif' }}>{c.signSymbol}</span>
                      <span style={{ color: '#c9c3d6' }}>{c.sign}</span>
                    </td>
                    <td style={{ ...td, textAlign: 'right', color: '#f4efe6', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtDeg(c.degInSign)}
                    </td>
                    <td style={td}>
                      <span style={{ color: '#d9ab55', fontFamily: 'serif', marginRight: '5px' }}>{c.rulerSymbol}</span>
                      <span style={{ color: '#8a8399' }}>{c.ruler}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Element / Modality ───────────────────────── */}
        <div className="rounded-2xl p-5 mb-8" style={{ background: 'rgba(12,10,30,0.7)', border: '1px solid rgba(200,148,63,0.14)' }}>
          <SectionHeader>BẢNG NGUYÊN TỐ & TÍNH CHẤT</SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ ...tableStyle, minWidth: '320px' }}>
                <thead>
                  <tr>
                    <th style={th}>Nguyên tố</th>
                    {MOD_LABELS.map(m => <th key={m} style={{ ...th, textAlign: 'center' }}>{m}</th>)}
                    <th style={{ ...th, textAlign: 'center' }}>Tổng</th>
                  </tr>
                </thead>
                <tbody>
                  {elementMatrix.map((row, ei) => (
                    <tr key={ei}>
                      <td style={td}>
                        <span style={{ color: EL_COLORS[ei], fontFamily: 'var(--font-vietnam)', fontWeight: 600 }}>
                          {EL_LABELS[ei]}
                        </span>
                      </td>
                      {row.map((val, mi) => (
                        <td key={mi} style={{ ...td, textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block', minWidth: '28px', padding: '1px 6px',
                            background: val > 0 ? 'rgba(200,148,63,0.08)' : 'transparent',
                            border: val > 0 ? '1px solid rgba(200,148,63,0.18)' : '1px solid transparent',
                            borderRadius: '3px', color: val > 0 ? '#f4efe6' : '#4a4560',
                          }}>
                            {val}
                          </span>
                        </td>
                      ))}
                      <td style={{ ...td, textAlign: 'center', color: EL_COLORS[ei], fontWeight: 700 }}>{elScores[ei]}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '1px solid rgba(200,148,63,0.15)' }}>
                    <td style={{ ...td, color: '#6a6080', fontSize: '0.72rem' }}>Tổng</td>
                    {modScores.map((v, i) => (
                      <td key={i} style={{ ...td, textAlign: 'center', color: '#d9ab55', fontWeight: 700 }}>{v}</td>
                    ))}
                    <td style={{ ...td, textAlign: 'center', color: '#8a8399' }}>{elTotals}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="space-y-4">
              <div>
                <p style={{ color: '#6a6080', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '0.75rem' }}>NGUYÊN TỐ</p>
                {EL_LABELS.map((label, i) => (
                  <div key={i} className="mb-2.5">
                    <div className="flex justify-between mb-1">
                      <span style={{ color: EL_COLORS[i], fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem' }}>{label}</span>
                      <span style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem' }}>{elScores[i]} / {elTotals}</span>
                    </div>
                    <div style={{ height: '5px', background: 'rgba(200,148,63,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(elScores[i] / elTotals) * 100}%`, background: EL_COLORS[i], borderRadius: '3px', opacity: 0.8 }} />
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <p style={{ color: '#6a6080', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '0.75rem' }}>TÍNH CHẤT</p>
                {MOD_LABELS.map((label, i) => (
                  <div key={i} className="mb-2.5">
                    <div className="flex justify-between mb-1">
                      <span style={{ color: '#c9c3d6', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem' }}>{label}</span>
                      <span style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem' }}>{modScores[i]} / {modTotals}</span>
                    </div>
                    <div style={{ height: '5px', background: 'rgba(200,148,63,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(modScores[i] / modTotals) * 100}%`, background: '#d9ab55', borderRadius: '3px', opacity: 0.7 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Aspect Grid (section 3): 15×15 lower-triangle matrix ─── */}
        <div className="rounded-2xl p-5 mb-8" style={{ background: 'rgba(12,10,30,0.7)', border: '1px solid rgba(200,148,63,0.14)' }}>
          <SectionHeader>BẢNG GÓC HỢP CỦA BẢN ĐỒ SAO</SectionHeader>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '0.75rem', fontFamily: 'var(--font-vietnam)' }}>
              <tbody>
                {ASPECT_TABLE_OBJECTS.map((p1, i) => (
                  <tr key={p1}>
                    {/* Left count column — only for 10 CORE_PLANETS (section 3e) */}
                    <td style={{ width: '28px', height: '40px', textAlign: 'center', padding: '2px 3px', verticalAlign: 'middle' }}>
                      {CORE_SET.has(p1) && (majorCount[p1] || 0) > 0 ? (
                        <span style={{
                          display: 'inline-block', minWidth: '18px', padding: '1px 3px',
                          background: 'rgba(200,148,63,0.1)', border: '1px solid rgba(200,148,63,0.3)',
                          borderRadius: '3px', color: '#d9ab55', fontSize: '0.68rem', textAlign: 'center',
                          fontFamily: 'var(--font-vietnam)', fontWeight: 700,
                        }}>
                          {majorCount[p1]}
                        </span>
                      ) : null}
                    </td>
                    {/* Row planet symbol (section 3a: column icon header) */}
                    <td style={{ width: '28px', height: '40px', textAlign: 'right', padding: '2px 5px 2px 0', color: '#d9ab55', fontSize: '0.85rem', fontFamily: 'serif', verticalAlign: 'middle' }}>
                      {PLANET_SYMBOLS[p1] || p1.slice(0, 2)}
                    </td>
                    {/* Matrix cells */}
                    {ASPECT_TABLE_OBJECTS.map((p2, j) => {
                      const cellBorder: React.CSSProperties = {
                        borderRight: '1px solid rgba(200,148,63,0.05)',
                        borderBottom: '1px solid rgba(200,148,63,0.05)',
                      }
                      if (j > i) {
                        // Upper triangle: blank
                        return <td key={p2} style={{ width: '32px', height: '40px', background: 'rgba(200,148,63,0.02)', ...cellBorder }} />
                      }
                      if (j === i) {
                        // Diagonal: planet symbol = column header (section 3c)
                        return (
                          <td key={p2} style={{ width: '32px', height: '40px', textAlign: 'center', verticalAlign: 'middle', background: 'rgba(200,148,63,0.07)', borderRight: '1px solid rgba(200,148,63,0.12)', borderBottom: '1px solid rgba(200,148,63,0.12)' }}>
                            <span style={{ color: '#d9ab55', fontFamily: 'serif', fontSize: '0.82rem' }}>
                              {PLANET_SYMBOLS[p2] || p2.slice(0, 2)}
                            </span>
                          </td>
                        )
                      }
                      // Lower triangle (j < i): aspect info (section 3d)
                      const asp = aspLookup[`${p1}__${p2}`] || aspLookup[`${p2}__${p1}`]
                      if (!asp) {
                        return <td key={p2} style={{ width: '32px', height: '40px', ...cellBorder }} />
                      }
                      // Type-based color: Hard=red, Soft=blue, Minor=green
                      const typeClr = asp.type === 'Minor' ? '#00cc00' : asp.type === 'Soft' ? '#5578d4' : '#c84545'
                      const orbR = orbRoundClient(asp.orb)
                      return (
                        <td key={p2} style={{ width: '32px', height: '40px', textAlign: 'center', verticalAlign: 'middle', padding: '1px', position: 'relative', ...cellBorder }}>
                          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                            <span style={{ position: 'absolute', top: '1px', left: '2px', fontSize: '0.5rem', color: typeClr, lineHeight: 1, fontFamily: 'var(--font-vietnam)', opacity: 0.85 }}>{orbR}</span>
                            <span style={{ color: typeClr, fontFamily: 'serif', fontSize: '0.8rem', lineHeight: 1 }}>{asp.symbol}</span>
                            <span style={{ color: typeClr, fontSize: '0.48rem', lineHeight: 1, marginTop: '1px', fontFamily: 'monospace', opacity: 0.8 }}>{fmtOrb(asp.orb)}</span>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Dominant Planets ─────────────────────────── */}
        <div className="rounded-2xl p-5 mb-8" style={{ background: 'rgba(12,10,30,0.7)', border: '1px solid rgba(200,148,63,0.14)' }}>
          <SectionHeader>HÀNH TINH TẠO NHIỀU GÓC NHẤT</SectionHeader>
          {dominantPlanets.length === 0 ? (
            <p style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', textAlign: 'center', padding: '2rem 0' }}>
              Không có dữ liệu
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dominantPlanets.map(dp => (
                <div key={dp.name} style={{ background: 'rgba(200,148,63,0.04)', border: '1px solid rgba(200,148,63,0.12)', borderRadius: '10px', padding: '14px 16px' }}>
                  {/* Planet header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span style={{ color: '#d9ab55', fontSize: '1.5rem', fontFamily: 'serif', lineHeight: 1 }}>{dp.symbol}</span>
                    <div>
                      <p style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontWeight: 700, fontSize: '0.95rem' }}>{dp.nameVn}</p>
                      <p style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem' }}>{dp.count} góc chính</p>
                    </div>
                  </div>
                  {/* Aspect list */}
                  <div className="space-y-1">
                    {dp.aspects.map((a, ai) => {
                      const col = ASPECT_COLORS[a.aspect] || '#808080'
                      return (
                        <div key={ai} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                          <span style={{ color: col, fontFamily: 'serif', fontSize: '0.9rem', minWidth: '14px', textAlign: 'center' }}>{a.aspSymbol}</span>
                          <span style={{ color: '#d9ab55', fontFamily: 'serif' }}>{a.partnerSymbol}</span>
                          <span style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)' }}>{a.partnerNameVn}</span>
                          <span style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', marginLeft: 'auto', fontSize: '0.72rem' }}>{fmtOrb(a.orb)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Tightest Aspects ─────────────────────────── */}
        <div className="rounded-2xl p-5 mb-8" style={{ background: 'rgba(12,10,30,0.7)', border: '1px solid rgba(200,148,63,0.14)' }}>
          <SectionHeader>GÓC CHẶT NHẤT</SectionHeader>
          {tightestAspects.length === 0 ? (
            <p style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', textAlign: 'center', padding: '2rem 0' }}>
              Không tìm thấy góc hợp
            </p>
          ) : (
            <div className="space-y-3">
              {tightestAspects.map((a, i) => {
                const col = ASPECT_COLORS[a.aspect] || '#d9ab55'
                return (
                  <div key={i} className="flex items-center gap-4 flex-wrap" style={{
                    padding: '10px 14px', borderRadius: '8px',
                    background: `${col}08`, border: `1px solid ${col}28`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#d9ab55', fontFamily: 'serif', fontSize: '1.3rem' }}>{a.p1Symbol}</span>
                      <span style={{ color: col, fontFamily: 'serif', fontSize: '1.4rem', lineHeight: 1 }}>{a.symbol}</span>
                      <span style={{ color: '#d9ab55', fontFamily: 'serif', fontSize: '1.3rem' }}>{a.p2Symbol}</span>
                    </div>
                    <div>
                      <span style={{ color: '#c9c3d6', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem' }}>
                        {a.p1} {a.nameVn} {a.p2}
                      </span>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: '5px',
                        background: `${col}15`, border: `1px solid ${col}40`,
                        color: col, fontFamily: 'var(--font-vietnam)', fontWeight: 700, fontSize: '0.9rem',
                      }}>
                        orb {fmtOrb(a.orb)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
