'use client'

// VISUAL ONLY — services page restyled to Celestial Sanctum design
// Backend logic (profileToInputData, handleConfirm, routing) untouched

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Navbar from '@/components/layout/Navbar'

interface Profile {
  id: string
  name: string
  ten?: string
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

function ProfileDropdown({ profiles, selectedId, onChange, label }: { profiles: Profile[]; selectedId: string; onChange: (id: string) => void; label: string }) {
  return (
    <div>
      <label
        className="block mb-1.5"
        style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.65rem', letterSpacing: '0.06em',  }}
      >
        {label}
      </label>
      <select value={selectedId} onChange={e => onChange(e.target.value)}>
        <option value="">— Chọn hồ sơ —</option>
        {profiles.map(p => (
          <option key={p.id} value={p.id}>{p.name} ({p.dob.day}/{p.dob.month}/{p.dob.year})</option>
        ))}
        <option value="__new__">+ Nhập thông tin mới</option>
      </select>
    </div>
  )
}

export default function ServicesPage() {
  const router = useRouter()
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

  const handleConfirm = () => {
    if (!selectedService) return

    if (profileA === '__new__' || profiles.length === 0) {
      sessionStorage.setItem('selectedService', selectedService.type)
      router.push('/input')
      return
    }

    const pa = profiles.find(p => p.id === profileA)
    if (!pa) return

    sessionStorage.setItem('inputData', JSON.stringify(profileToInputData(pa)))
    sessionStorage.setItem('selectedService', selectedService.type)

    if (selectedService.needsTwo) {
      if (profileB === '__new__') {
        router.push('/input?for=synastry')
        return
      }
      const pb = profiles.find(p => p.id === profileB)
      if (!pb) return
      sessionStorage.setItem('inputDataB', JSON.stringify(profileToInputData(pb)))
    }

    router.push('/checkout')
  }

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

              <div className="space-y-5">
                {profiles.length > 0 ? (
                  <>
                    <ProfileDropdown
                      profiles={profiles}
                      selectedId={profileA}
                      onChange={setProfileA}
                      label={selectedService.needsTwo ? 'Người thứ nhất' : 'Chọn hồ sơ'}
                    />
                    {selectedService.needsTwo && (
                      <ProfileDropdown profiles={profiles} selectedId={profileB} onChange={setProfileB} label="Người thứ hai" />
                    )}
                    <p style={{ color: '#4a4560', fontSize: '0.8rem', fontFamily: 'var(--font-vietnam)' }}>
                      Hoặc chọn &quot;Nhập thông tin mới&quot; để điền trực tiếp mà không cần lưu hồ sơ
                    </p>
                  </>
                ) : (
                  <div className="py-6 text-center">
                    <p className="mb-4" style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem' }}>
                      Bạn chưa có hồ sơ nào.
                    </p>
                    <button
                      onClick={() => router.push('/profile')}
                      style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem' }}
                    >
                      Tạo hồ sơ ngay →
                    </button>
                  </div>
                )}

                <button
                  onClick={handleConfirm}
                  disabled={profiles.length > 0 && (!profileA || (selectedService.needsTwo && !profileB))}
                  className="w-full py-3.5 mt-2 font-bold text-sm tracking-wider"
                  style={{
                    background: 'linear-gradient(135deg, #c8943f, #f0cc78, #c8943f)',
                    backgroundSize: '200% 200%',
                    color: '#06060f',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-vietnam)',
                    letterSpacing: '0.08em',
                    opacity: (profiles.length > 0 && (!profileA || (selectedService.needsTwo && !profileB))) ? 0.45 : 1,
                    boxShadow: '0 4px 20px rgba(200,148,63,0.25)',
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  {profileA === '__new__' || profiles.length === 0 ? 'Điền thông tin mới →' : 'Tiếp tục →'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
