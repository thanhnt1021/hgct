'use client'

// VISUAL ONLY — services page restyled to Celestial Sanctum design
// Backend logic (profileToInputData, handleConfirm, routing) untouched

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Search, Plus } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/contexts/AuthContext'

interface Profile {
  id: string
  name: string
  ten?: string
  note?: string
  dob: { day: number; month: number; year: number }
  tob: { hour: number; minute: number; unknown: boolean }
  loc: { address: string; lat: number; lon: number; tz: string }
  gender: string
}

interface ServiceDef {
  type: string
  name: string
  icon: string
  description: string
  color: string
  border: string
  tagColor: string
  needsTwo?: boolean
}

const services: ServiceDef[] = [
  { type: 'career',   name: 'Hướng Nghiệp', icon: '🎯', description: 'Phân tích sự nghiệp, tài năng nổi bật, con đường nghề nghiệp và tài chính phù hợp nhất.', color: 'rgba(200,148,63,0.08)',  border: 'rgba(200,148,63,0.22)',  tagColor: '#c8943f' },
  { type: 'love',     name: 'Tình Duyên',   icon: '💝', description: 'Phân tích phong cách yêu, nhu cầu tình cảm, người bạn đời phù hợp và bài học tình duyên.',   color: 'rgba(185,77,112,0.08)',  border: 'rgba(185,77,112,0.22)',  tagColor: '#b84d70' },
  { type: 'synastry', name: 'Cặp Đôi',      icon: '💑', description: 'So sánh bản đồ sao 2 người — phân tích hòa hợp, xung đột, bài học và chìa khóa hạnh phúc.', color: 'rgba(120,77,186,0.08)',  border: 'rgba(120,77,186,0.22)',  tagColor: '#7c4dba', needsTwo: true },
  { type: 'transit',  name: 'Vận Hạn',      icon: '🔮', description: 'Phân tích transit hiện tại — sự nghiệp, tài chính, tình cảm, sức khỏe trong giai đoạn tới.', color: 'rgba(64,112,184,0.08)',  border: 'rgba(64,112,184,0.22)',  tagColor: '#4070b8' },
]

function profileToInputData(p: Profile) {
  return {
    name: p.name,
    ten: p.ten || '',
    gender: p.gender,
    dob: { day: p.dob.day, month: p.dob.month, year: p.dob.year },
    tob: { hour: p.tob.unknown ? 12 : p.tob.hour, minute: p.tob.unknown ? 0 : p.tob.minute },
    loc: { address: p.loc.address, lat: p.loc.lat, lon: p.loc.lon, tz: p.loc.tz },
  }
}

// ── Custom profile picker ──────────────────────────────────────────

function ProfilePicker({
  profiles,
  selectedId,
  onChange,
  label,
  onNew,
}: {
  profiles: Profile[]
  selectedId: string
  onChange: (id: string) => void
  label: string
  onNew: () => void
}) {
  const [search, setSearch] = useState('')

  const filtered = profiles.filter(p => {
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || (p.note || '').toLowerCase().includes(q)
  })

  return (
    <div>
      <label
        className="block mb-3"
        style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.65rem', letterSpacing: '0.06em' }}
      >
        {label}
      </label>

      {/* Nút Nhập thông tin mới */}
      <button
        type="button"
        onClick={onNew}
        className="w-full flex items-center gap-2 mb-3"
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

      {/* Search */}
      <div
        className="flex items-center gap-2 rounded-lg px-3 mb-2"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(200,148,63,0.1)', minHeight: 36 }}
      >
        <Search size={13} style={{ color: '#6b7280', flexShrink: 0 }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm hồ sơ..."
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem',
            width: '100%', padding: '0.4rem 0',
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ color: '#6b7280', flexShrink: 0, lineHeight: 1 }}>✕</button>
        )}
      </div>

      {/* Profile list */}
      <div className="space-y-1 overflow-y-auto pr-0.5" style={{ maxHeight: 216 }}>
        {filtered.length === 0 && (
          <p style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.8rem', textAlign: 'center', padding: '0.875rem' }}>
            Không tìm thấy hồ sơ
          </p>
        )}
        {filtered.map(p => {
          const isSelected = selectedId === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id)}
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
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────

export default function ServicesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedService, setSelectedService] = useState<ServiceDef | null>(null)
  const [profileA, setProfileA] = useState('')
  const [profileB, setProfileB] = useState('')

  useEffect(() => {
    fetch('/api/profiles')
      .then(r => r.json())
      .then(data => {
        if (data.profiles) {
          setProfiles(data.profiles.map((p: any) => ({
            id: String(p.id),
            ho: p.data?.ho || '',
            dem: p.data?.dem || '',
            ten: p.data?.ten || (p.name.trim().split(/\s+/).pop() || p.name),
            name: p.name,
            note: p.data?.note || '',
            gender: p.gender || 'Female',
            dob: p.data?.dob || { day: 1, month: 1, year: 1990 },
            tob: p.data?.tob || { hour: 12, minute: 0, unknown: false },
            loc: p.data?.loc || { address: 'Hà Nội', lat: 21.02, lon: 105.84, tz: 'Asia/Ho_Chi_Minh' },
            createdAt: p.createdAt || '',
          })))
        }
      })
      .catch(() => setProfiles([]))
  }, [])

  const handleServiceClick = (s: ServiceDef) => {
    setSelectedService(s)
    setProfileA('')
    setProfileB('')
  }

  // Navigate to /input directly (no profile)
  const handleNewA = () => {
    if (!selectedService) return
    sessionStorage.setItem('selectedService', selectedService.type)
    router.push('/input')
  }

  // Navigate to /input?for=synastry directly (profile A data already set)
  const handleNewB = () => {
    if (!selectedService) return
    const pa = profiles.find(p => p.id === profileA)
    if (pa) {
      sessionStorage.setItem('inputData', JSON.stringify(profileToInputData(pa)))
    }
    sessionStorage.setItem('selectedService', selectedService.type)
    router.push('/input?for=synastry')
  }

  const handleConfirm = () => {
    if (!selectedService) return
    const pa = profiles.find(p => p.id === profileA)
    if (!pa) return

    sessionStorage.setItem('inputData', JSON.stringify(profileToInputData(pa)))
    sessionStorage.setItem('selectedService', selectedService.type)

    if (selectedService.needsTwo) {
      const pb = profiles.find(p => p.id === profileB)
      if (!pb) return
      sessionStorage.setItem('inputDataB', JSON.stringify(profileToInputData(pb)))
    }

    router.push('/checkout')
  }

  const canConfirm = profileA !== '' && (!selectedService?.needsTwo || profileB !== '')

  return (
    <div className="min-h-screen" style={{ background: '#06060f' }}>
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 pt-28 pb-16">

        {!selectedService ? (
          <>
            {/* Header */}
            <div className="text-center mb-14">
              <p className="section-eyebrow mb-5">Chiêm tinh chuyên sâu</p>
              <h1
                style={{
                  color: '#f4efe6',
                  fontFamily: 'var(--font-vietnam)',
                  fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
                  fontWeight: 700,
                  marginBottom: '0.75rem',
                  letterSpacing: '0.03em',
                }}
              >
                Chọn dịch vụ
              </h1>
              <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.95rem' }}>
                Mỗi báo cáo được AI biên soạn chi tiết và gửi qua email dưới dạng PDF
              </p>
            </div>

            {/* Service grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {services.map(s => (
                <button
                  key={s.type}
                  onClick={() => handleServiceClick(s)}
                  className="text-left p-7 rounded-xl transition-all"
                  style={{
                    background: s.color,
                    border: `1px solid ${s.border}`,
                    backdropFilter: 'blur(12px)',
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px rgba(0,0,0,0.4)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                  }}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-4xl flex-shrink-0" style={{ lineHeight: 1.2 }}>{s.icon}</span>
                    <div>
                      {s.needsTwo && (
                        <span
                          className="inline-block text-xs px-2.5 py-0.5 rounded-sm mb-2.5"
                          style={{ background: 'rgba(120,77,186,0.2)', color: '#9b6dd6', fontFamily: 'var(--font-vietnam)', fontSize: '0.6rem', letterSpacing: '0.1em' }}
                        >
                          Cần 2 hồ sơ
                        </span>
                      )}
                      <h3
                        className="font-bold mb-2"
                        style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.05rem', letterSpacing: '0.02em' }}
                      >
                        {s.name}
                      </h3>
                      <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem', lineHeight: 1.8 }}>
                        {s.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          /* Profile selection step */
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setSelectedService(null)}
              className="mb-8 flex items-center gap-2 text-sm transition-colors"
              style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#d9ab55')}
              onMouseLeave={e => (e.currentTarget.style.color = '#4a4560')}
            >
              ← Quay lại
            </button>

            <div
              className="rounded-2xl p-8"
              style={{
                background: 'rgba(18,13,46,0.75)',
                border: '1px solid rgba(200,148,63,0.18)',
                backdropFilter: 'blur(20px)',
              }}
            >
              {/* Service header */}
              <div className="flex items-center gap-3 mb-8">
                <span className="text-3xl">{selectedService.icon}</span>
                <div>
                  <h2
                    className="font-bold"
                    style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.1rem', letterSpacing: '0.03em' }}
                  >
                    {selectedService.name}
                  </h2>
                  {selectedService.needsTwo && (
                    <p className="text-xs mt-0.5" style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)' }}>
                      Cần 2 hồ sơ để so sánh
                    </p>
                  )}
                </div>
              </div>

              <div
                className="mb-6"
                style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,148,63,0.2), transparent)' }}
              />

              <div className="space-y-6">
                {profiles.length > 0 ? (
                  <>
                    <ProfilePicker
                      profiles={profiles}
                      selectedId={profileA}
                      onChange={setProfileA}
                      label={selectedService.needsTwo ? 'NGƯỜI THỨ NHẤT' : 'CHỌN HỒ SƠ'}
                      onNew={handleNewA}
                    />

                    {selectedService.needsTwo && (
                      <>
                        <div style={{ height: '1px', background: 'rgba(200,148,63,0.1)' }} />
                        <ProfilePicker
                          profiles={profiles}
                          selectedId={profileB}
                          onChange={setProfileB}
                          label="NGƯỜI THỨ HAI"
                          onNew={handleNewB}
                        />
                      </>
                    )}
                  </>
                ) : (
                  <div className="py-6 text-center">
                    <p className="mb-1" style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem' }}>
                      {user ? 'Bạn chưa có hồ sơ nào.' : 'Không cần tài khoản — nhập thông tin trực tiếp.'}
                    </p>
                    {!user && (
                      <p className="mb-4" style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem' }}>
                        Điền thông tin → xác nhận → thanh toán → nhận PDF qua email.
                      </p>
                    )}
                    {user && <div className="mb-4" />}
                    <button
                      onClick={handleNewA}
                      className="flex items-center gap-2 mx-auto"
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(200,148,63,0.28)',
                        color: '#d9ab55',
                        borderRadius: '6px',
                        padding: '0.6rem 1.25rem',
                        fontFamily: 'var(--font-vietnam)',
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={14} /> Nhập thông tin mới
                    </button>
                  </div>
                )}

                {profiles.length > 0 && (
                  <button
                    onClick={handleConfirm}
                    disabled={!canConfirm}
                    className="w-full py-3.5 mt-2 font-bold text-sm tracking-wider"
                    style={{
                      background: 'linear-gradient(135deg, #c8943f, #f0cc78, #c8943f)',
                      backgroundSize: '200% 200%',
                      color: '#06060f',
                      borderRadius: '4px',
                      fontFamily: 'var(--font-vietnam)',
                      letterSpacing: '0.08em',
                      opacity: canConfirm ? 1 : 0.35,
                      boxShadow: canConfirm ? '0 4px 20px rgba(200,148,63,0.25)' : 'none',
                      transition: 'opacity 0.2s ease',
                      cursor: canConfirm ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Tiếp tục →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
