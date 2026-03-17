'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import NatalWheel from '@/components/chart/NatalWheel'
import { PLANET_SYMBOLS, ASPECT_TABLE_OBJECTS } from '@/lib/astrology/symbols'
import ProfileFormModal, { ProfileFormData, EMPTY_PROFILE_FORM } from '@/components/profile/ProfileFormModal'

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
interface DomHouse {
  house: number; score: number
}
interface ChartResult {
  name: string; chartInfo: Record<string, string>
  planets: PlanetRow[]; cusps: CuspRow[]
  aspects: AspectRow[]
  wheelAspects: WheelAspect[]
  elementMatrix: number[][]; elScores: number[]; modScores: number[]
  dominantPlanets: DominantPlanet[]
  tightestAspects: TightAspect[]
  domHouses: DomHouse[]
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
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [profileSearch, setProfileSearch] = useState('')
  const [result, setResult] = useState<ChartResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [chartModalOpen, setChartModalOpen] = useState(false)
  const [chartModalSaving, setChartModalSaving] = useState(false)

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
          // Auto-submit if ?id= param is present
          const preId = new URLSearchParams(window.location.search).get('id')
          const preProfile = preId ? mapped.find((p: Profile) => p.id === preId) : null
          if (preProfile) {
            submitWithData({
              name: preProfile.name, gender: preProfile.gender, dob: preProfile.dob,
              tob: preProfile.tob.unknown ? { hour: 12, minute: 0 } : { hour: preProfile.tob.hour, minute: preProfile.tob.minute },
              loc: preProfile.loc,
            })
          } else {
            setSelected(preId || null)
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

  const handleChartModalSave = async (formData: ProfileFormData, saveProfile: boolean) => {
    setChartModalSaving(true)
    const name = [formData.ho, formData.dem, formData.ten].filter(Boolean).join(' ')
    const inputData = {
      name,
      gender: formData.gender,
      dob: formData.dob,
      tob: formData.tob.unknown ? { hour: 12, minute: 0 } : { hour: formData.tob.hour, minute: formData.tob.minute },
      loc: formData.loc,
    }
    // Nếu tick "Lưu hồ sơ" → POST lên server
    if (saveProfile) {
      try {
        const res = await fetch('/api/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, gender: formData.gender, isTemp: false, data: formData }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.profile) {
            const p = data.profile
            setProfiles(prev => [{
              id: String(p.id),
              name: p.name || name,
              note: formData.note || '',
              gender: formData.gender,
              dob: formData.dob,
              tob: formData.tob,
              loc: formData.loc,
            }, ...prev])
          }
        }
      } catch { /* ignore save error, vẫn tính chart */ }
    }
    setChartModalOpen(false)
    setChartModalSaving(false)
    await submitWithData(inputData)
  }

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

              {/* Nút Nhập thông tin mới — mở modal */}
              <button
                type="button"
                onClick={() => setChartModalOpen(true)}
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

      {/* Modal nhập thông tin mới cho chart */}
      <ProfileFormModal
        open={chartModalOpen}
        title="Nhập thông tin"
        initialData={EMPTY_PROFILE_FORM}
        saving={chartModalSaving}
        showSaveCheckbox
        submitLabel="Xem bản đồ sao ✦"
        onSave={handleChartModalSave}
        onClose={() => setChartModalOpen(false)}
      />
    </div>
  )

  // ── Result view ──────────────────────────────────────────────────
  const {
    name, chartInfo, planets, cusps, aspects, wheelAspects,
    elementMatrix, elScores, modScores,
    dominantPlanets, tightestAspects, domHouses,
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
          {/* Left column: Wheel + Elements/Modality */}
          <div className="flex flex-col gap-8">
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
                ['Vuông Góc','#c84545'], ['Đối Đỉnh','#b84060'], ['Bán Lục Hợp','#00cc00'], ['Ngũ Chiếu','#00cc00'],
              ] as [string, string][]).map(([label, color]) => (
                <span key={label} style={{ color, fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ display: 'inline-block', width: '16px', height: '1.5px', background: color, verticalAlign: 'middle' }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Elements/Modality - inside left column */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(12,10,30,0.7)', border: '1px solid rgba(200,148,63,0.14)' }}>
            <SectionHeader>BẢNG NGUYÊN TỐ & TÍNH CHẤT</SectionHeader>
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              {/* Bars 2-col: nguyên tố trái + tính chất phải */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>NGUYÊN TỐ</p>
                  <div className="space-y-3">
                    {EL_LABELS.map((label, i) => (
                      <div key={i}>
                        <div className="flex justify-between mb-1">
                          <span style={{ color: EL_COLORS[i], fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem', fontWeight: 500 }}>{label}</span>
                          <span style={{ color: '#f4efe6', fontFamily: 'monospace', fontSize: '0.78rem' }}>{Math.round((elScores[i] / elTotals) * 100)}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div style={{ height: '100%', width: `${(elScores[i] / elTotals) * 100}%`, background: EL_COLORS[i], borderRadius: '9999px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>TÍNH CHẤT</p>
                  <div className="space-y-3">
                    {MOD_LABELS.map((label, i) => (
                      <div key={i}>
                        <div className="flex justify-between mb-1">
                          <span style={{ color: '#c8943f', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem', fontWeight: 500 }}>{label}</span>
                          <span style={{ color: '#f4efe6', fontFamily: 'monospace', fontSize: '0.78rem' }}>{Math.round((modScores[i] / modTotals) * 100)}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div style={{ height: '100%', width: `${(modScores[i] / modTotals) * 100}%`, background: '#c8943f', borderRadius: '9999px', opacity: i === 0 ? 1 : i === 1 ? 0.7 : 0.4 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Nhà trội chips */}
              {domHouses && domHouses.length > 0 && (() => {
                const housePlanets: Record<number, string[]> = {}
                for (const p of planets) {
                  if (!housePlanets[p.house]) housePlanets[p.house] = []
                  housePlanets[p.house].push(p.symbol)
                }
                return (
                  <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '1rem' }}>
                    <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>NHÀ TRỘI</p>
                    <div className="flex flex-wrap gap-2">
                      {domHouses.map(({ house, score }) => (
                        <div key={house} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#c8943f', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-vietnam)' }}>Nhà {house}</span>
                          {(housePlanets[house] || []).length > 0 && (
                            <span style={{ color: '#8a8399', fontFamily: 'serif', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
                              {housePlanets[house].join(' ')}
                            </span>
                          )}
                          <span style={{ color: '#55b870', fontFamily: 'monospace', fontSize: '0.65rem' }}>{score}đ</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
              {/* Table below */}
              <div style={{ paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '1.25rem', overflowX: 'auto' }}>
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
            </div>
          </div>
          </div>{/* end left column */}

          {/* Planets + Houses gộp chung 1 card */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(12,10,30,0.7)', border: '1px solid rgba(200,148,63,0.14)' }}>

            {/* Vị trí hành tinh */}
            <SectionHeader>VỊ TRÍ HÀNH TINH</SectionHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2.5 mb-8">
              {planets.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between p-2.5 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                >
                  <div className="flex items-center gap-2.5">
                    <span style={{ color: '#c8943f', fontSize: '1.25rem', fontFamily: 'serif', lineHeight: 1 }}>{p.symbol}</span>
                    <div className="flex flex-col">
                      <span style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontWeight: 500, fontSize: '0.75rem', lineHeight: 1, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {p.nameVn}
                        {p.isRetro && <span style={{ color: '#c45252', fontSize: '0.55rem', fontWeight: 700 }}>Rx</span>}
                      </span>
                      <span style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.65rem', lineHeight: 1, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <span style={{ fontFamily: 'serif', color: '#c8943f' }}>{p.signSymbol}</span>
                        {p.signCode}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#f4efe6', lineHeight: 1, marginBottom: '4px' }}>{fmtDeg(p.degInSign)}</span>
                    <span style={{ fontSize: '0.6rem', color: '#c8943f', background: 'rgba(200,148,63,0.1)', border: '1px solid rgba(200,148,63,0.2)', padding: '1px 6px', borderRadius: '3px', lineHeight: 1 }}>
                      Nhà {p.house}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Độ đỉnh 12 nhà */}
            <SectionHeader>ĐỘ ĐỈNH CỦA 12 NHÀ</SectionHeader>
            {/* grid-flow-col: ép thứ tự hiển thị dọc (1-2-3 / 4-5-6...) */}
            <div className="grid grid-cols-2 grid-rows-6 sm:grid-cols-3 sm:grid-rows-4 lg:grid-cols-2 lg:grid-rows-6 xl:grid-cols-3 xl:grid-rows-4 grid-flow-col gap-2.5">
              {cusps.map((c) => {
                const specialLabel = c.house === 1 ? 'AC' : c.house === 4 ? 'IC' : c.house === 7 ? 'DC' : c.house === 10 ? 'MC' : String(c.house)
                return (
                  <div
                    key={c.house}
                    className="flex items-center justify-between p-2.5 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  >
                    <div className="flex items-center gap-2.5">
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '4px', flexShrink: 0, background: 'rgba(200,148,63,0.1)', border: '1px solid rgba(200,148,63,0.2)', color: '#c8943f', fontSize: '0.6rem', fontWeight: 700, fontFamily: 'var(--font-vietnam)' }}>
                        {specialLabel}
                      </span>
                      <span style={{ color: '#c8943f', fontFamily: 'serif', fontSize: '0.9rem' }}>{c.signSymbol}</span>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#f4efe6', lineHeight: 1, marginBottom: '4px' }}>{fmtDeg(c.degInSign)}</span>
                      <span style={{ fontSize: '0.6rem', color: '#8a8399', fontFamily: 'var(--font-vietnam)', lineHeight: 1 }}>
                        Chủ: <span style={{ color: '#c8943f', fontFamily: 'serif' }}>{c.rulerSymbol}</span>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

          </div>
        </div>


        {/* ─── Aspect Grid (section 3): 15×15 lower-triangle matrix ─── */}
        <div className="rounded-2xl p-5 mb-8" style={{ background: 'rgba(12,10,30,0.7)', border: '1px solid rgba(200,148,63,0.14)' }}>
          <SectionHeader>BẢNG GÓC HỢP CỦA BẢN ĐỒ SAO</SectionHeader>
          <div className="flex flex-col items-center">
            <div className="overflow-x-auto sm:overflow-x-visible w-full flex justify-center">
              <div className="flex flex-col gap-[1px] sm:gap-1">
                {/* Header row — col symbols */}
                <div className="flex gap-[1px] sm:gap-1">
                  <div style={{ width: '24px' }} className="h-6 sm:h-8 flex-shrink-0" />
                  <div className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
                  {ASPECT_TABLE_OBJECTS.slice(0, -1).map((p) => (
                    <div key={p} className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center flex-shrink-0" style={{ color: '#8a8399', fontFamily: 'serif', fontSize: '0.82rem' }}>
                      {PLANET_SYMBOLS[p] || p.slice(0, 2)}
                    </div>
                  ))}
                </div>
                {/* Data rows — skip first planet (no lower-triangle cells) */}
                {ASPECT_TABLE_OBJECTS.slice(1).map((p1, rowIndex) => (
                  <div key={p1} className="flex gap-[1px] sm:gap-1">
                    {/* Count */}
                    <div style={{ width: '24px' }} className="h-6 sm:h-8 flex items-center justify-center flex-shrink-0">
                      {CORE_SET.has(p1) && (majorCount[p1] || 0) > 0 ? (
                        <span style={{
                          display: 'inline-block', minWidth: '16px', padding: '1px 2px',
                          background: 'rgba(200,148,63,0.1)', border: '1px solid rgba(200,148,63,0.3)',
                          borderRadius: '3px', color: '#d9ab55', fontSize: '0.62rem', textAlign: 'center',
                          fontFamily: 'var(--font-vietnam)', fontWeight: 700,
                        }}>
                          {majorCount[p1]}
                        </span>
                      ) : null}
                    </div>
                    {/* Row symbol */}
                    <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center flex-shrink-0" style={{ color: '#d9ab55', fontFamily: 'serif', fontSize: '0.82rem' }}>
                      {PLANET_SYMBOLS[p1] || p1.slice(0, 2)}
                    </div>
                    {/* Matrix cells: col 0 to rowIndex+1 (inclusive, last = diagonal) */}
                    {ASPECT_TABLE_OBJECTS.slice(0, rowIndex + 2).map((p2, colIndex) => {
                      if (colIndex === rowIndex + 1) {
                        return (
                          <div key={p2} className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(200,148,63,0.07)', borderRight: '1px solid rgba(200,148,63,0.12)', borderBottom: '1px solid rgba(200,148,63,0.12)' }}>
                            <span style={{ color: '#d9ab55', fontFamily: 'serif', fontSize: '0.78rem' }}>{PLANET_SYMBOLS[p2] || p2.slice(0, 2)}</span>
                          </div>
                        )
                      }
                      const asp = aspLookup[`${p1}__${p2}`] || aspLookup[`${p2}__${p1}`]
                      if (!asp) {
                        return <div key={p2} className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" style={{ borderRight: '1px solid rgba(200,148,63,0.05)', borderBottom: '1px solid rgba(200,148,63,0.05)' }} />
                      }
                      const typeClr = asp.type === 'Minor' ? '#00cc00' : asp.type === 'Soft' ? '#5578d4' : '#c84545'
                      const orbR = orbRoundClient(asp.orb)
                      return (
                        <div
                          key={p2}
                          className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 relative cursor-default"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,148,63,0.05)', transition: 'background 0.12s', borderRadius: '2px' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                        >
                          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                            <span style={{ position: 'absolute', top: '1px', left: '2px', fontSize: '0.48rem', color: typeClr, lineHeight: 1, fontFamily: 'var(--font-vietnam)', opacity: 0.85 }}>{orbR}</span>
                            <span style={{ color: typeClr, fontFamily: 'serif', fontSize: '0.75rem', lineHeight: 1 }}>{asp.symbol}</span>
                            <span style={{ color: typeClr, fontSize: '0.44rem', lineHeight: 1, marginTop: '1px', fontFamily: 'monospace', opacity: 0.8 }}>{fmtOrb(asp.orb)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-5" style={{ fontFamily: 'var(--font-vietnam)', fontSize: '0.62rem', color: '#8a8399' }}>
              {([
                ['☌', '#d9ab55', 'Trùng tụ (0°)'],
                ['⚹', '#55b870', 'Lục hợp (60°)'],
                ['□', '#c84545', 'Vuông góc (90°)'],
                ['△', '#5578d4', 'Tam hợp (120°)'],
                ['☍', '#b84060', 'Đối đỉnh (180°)'],
                ['⚺', '#00cc00', 'Bán Lục Hợp (30°)'],
                ['⚻', '#00cc00', 'Ngũ Chiếu (150°)'],
              ] as [string, string, string][]).map(([sym, col, label]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span style={{ color: col, fontFamily: 'serif', fontSize: '0.8rem' }}>{sym}</span>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Tiêu điểm góc hợp ────────────────────────── */}
        <div className="rounded-2xl p-5 mb-8" style={{ background: 'rgba(12,10,30,0.7)', border: '1px solid rgba(200,148,63,0.14)' }}>
          <SectionHeader>TIÊU ĐIỂM GÓC HỢP</SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Hành tinh tạo nhiều góc nhất */}
            <div>
              <h3 style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#c8943f', display: 'inline-block', flexShrink: 0 }} />
                Hành tinh tạo nhiều góc nhất
              </h3>
              {dominantPlanets.length === 0 ? (
                <p style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', textAlign: 'center', padding: '2rem 0' }}>Không có dữ liệu</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dominantPlanets.map(dp => (
                    <div key={dp.name} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '12px', padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(200,148,63,0.1)', border: '1px solid rgba(200,148,63,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ color: '#c8943f', fontSize: '1.1rem', fontFamily: 'serif', lineHeight: 1 }}>{dp.symbol}</span>
                        </div>
                        <div>
                          <p style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontWeight: 700, fontSize: '0.88rem', lineHeight: 1, marginBottom: '3px' }}>{dp.nameVn}</p>
                          <p style={{ color: '#c8943f', fontFamily: 'var(--font-vietnam)', fontSize: '0.65rem', lineHeight: 1 }}>{dp.count} góc chính</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {dp.aspects.map((a, ai) => {
                          const col = ASPECT_COLORS[a.aspect] || '#808080'
                          return (
                            <div key={ai} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: col, fontFamily: 'serif', fontSize: '0.9rem', lineHeight: 1, minWidth: '12px', textAlign: 'center' }}>{a.aspSymbol}</span>
                                <span style={{ color: '#c8943f', fontFamily: 'serif' }}>{a.partnerSymbol}</span>
                                <span style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)' }}>{a.partnerNameVn}</span>
                              </div>
                              <span style={{ color: '#4a4560', fontFamily: 'monospace', fontSize: '0.65rem' }}>{fmtOrb(a.orb)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Góc chặt nhất */}
            <div>
              <h3 style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#c84545', display: 'inline-block', flexShrink: 0 }} />
                Góc hợp chặt chẽ nhất
              </h3>
              {tightestAspects.length === 0 ? (
                <p style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', textAlign: 'center', padding: '2rem 0' }}>Không tìm thấy góc hợp</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {tightestAspects.map((a, i) => {
                    const col = ASPECT_COLORS[a.aspect] || '#d9ab55'
                    const cardBg = a.type === 'Hard' ? 'rgba(200,69,69,0.05)' : a.type === 'Soft' ? 'rgba(85,120,212,0.05)' : 'rgba(200,148,63,0.05)'
                    const cardBorder = a.type === 'Hard' ? 'rgba(200,69,69,0.2)' : a.type === 'Soft' ? 'rgba(85,120,212,0.2)' : 'rgba(200,148,63,0.2)'
                    const cardHover = a.type === 'Hard' ? 'rgba(200,69,69,0.10)' : a.type === 'Soft' ? 'rgba(85,120,212,0.10)' : 'rgba(200,148,63,0.10)'
                    return (
                      <div
                        key={i}
                        style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.15s', cursor: 'default' }}
                        onMouseEnter={e => (e.currentTarget.style.background = cardHover)}
                        onMouseLeave={e => (e.currentTarget.style.background = cardBg)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ color: '#c8943f', fontFamily: 'serif', fontSize: '1.1rem', lineHeight: 1 }}>{a.p1Symbol}</span>
                            <span style={{ color: col, fontFamily: 'serif', fontSize: '0.9rem', lineHeight: 1 }}>{a.symbol}</span>
                            <span style={{ color: '#c8943f', fontFamily: 'serif', fontSize: '1.1rem', lineHeight: 1 }}>{a.p2Symbol}</span>
                          </div>
                          <span style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', fontWeight: 500 }}>{a.nameVn}</span>
                        </div>
                        <div style={{ color: col, fontFamily: 'monospace', fontSize: '0.65rem', background: `${col}1a`, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${col}33`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {fmtOrb(a.orb)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
