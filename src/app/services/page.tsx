'use client'

// VISUAL ONLY — services page restyled to Celestial Sanctum design
// Backend logic (profileToInputData, handleConfirm, routing) untouched

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Search, Plus } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/contexts/AuthContext'
import ProfileFormModal, { ProfileFormData, EMPTY_PROFILE_FORM } from '@/components/profile/ProfileFormModal'

interface Profile {
  id: string
  profileUid: string
  name: string
  ten?: string
  note?: string
  dob: { day: number; month: number; year: number }
  tob: { hour: number; minute: number; unknown: boolean }
  loc: { address: string; lat: number; lon: number; tz: string }
  gender: string
  isTemp?: boolean  // true = nhập mới qua modal nhưng chưa lưu
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

  // Chỉ hiện permanent profiles trong search list
  const permanentProfiles = profiles.filter(p => !p.isTemp)
  const filteredList = permanentProfiles.filter(p => {
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || (p.note || '').toLowerCase().includes(q)
  })

  // Profile tạm thời đang được chọn (nếu có)
  const selectedProfile = profiles.find(p => p.id === selectedId)
  const tempSelected = selectedProfile?.isTemp ? selectedProfile : null

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
        className="w-full flex items-center gap-2 mb-2"
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

      {/* Hiển thị hồ sơ tạm (chưa lưu) nếu đang được chọn */}
      {tempSelected && (
        <div
          className="flex items-center justify-between rounded-lg px-3 py-2.5 mb-2"
          style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.3)',
          }}
        >
          <div>
            <p style={{ color: '#f59e0b', fontFamily: 'var(--font-vietnam)', fontWeight: 600, fontSize: '0.88rem', margin: 0 }}>
              {tempSelected.name}
            </p>
            <p style={{ color: '#92400e', fontFamily: 'var(--font-vietnam)', fontSize: '0.7rem', marginTop: '0.1rem' }}>
              Chưa lưu vào danh sách
            </p>
          </div>
          <span style={{ color: '#f59e0b', fontSize: '0.72rem', fontFamily: 'var(--font-vietnam)', background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: '4px' }}>
            ✦ Đã chọn
          </span>
        </div>
      )}

      {/* Search */}
      {permanentProfiles.length > 0 && (
        <>
          <div
            className="flex items-center gap-2 rounded-lg px-3 mb-2"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(200,148,63,0.1)', minHeight: 36 }}
          >
            <Search size={13} style={{ color: '#6b7280', flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm hồ sơ đã lưu..."
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

          {/* Profile list — chỉ permanent */}
          <div className="space-y-1 overflow-y-auto pr-0.5" style={{ maxHeight: 180 }}>
            {filteredList.length === 0 && (
              <p style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.8rem', textAlign: 'center', padding: '0.875rem' }}>
                Không tìm thấy hồ sơ
              </p>
            )}
            {filteredList.map(p => {
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
        </>
      )}
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
  const [transitStartDate, setTransitStartDate] = useState('')
  const [transitEndDate, setTransitEndDate] = useState('')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTarget, setModalTarget] = useState<'A' | 'B'>('A')
  const [modalSaving, setModalSaving] = useState(false)

  useEffect(() => {
    fetch('/api/profiles')
      .then(r => r.json())
      .then(data => {
        if (data.profiles) {
          setProfiles(data.profiles.map((p: any) => ({
            id: String(p.id),
            profileUid: p.profileUid || '',
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
            isTemp: false,
          })))
        }
      })
      .catch(() => setProfiles([]))
  }, [])

  // Set default transit dates khi chọn dịch vụ Vận Hạn
  useEffect(() => {
    if (selectedService?.type === 'transit') {
      const today = new Date()
      const oneYearLater = new Date(today)
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)
      setTransitStartDate(today.toISOString().split('T')[0])
      setTransitEndDate(oneYearLater.toISOString().split('T')[0])
    }
  }, [selectedService?.type])

  const handleServiceClick = (s: ServiceDef) => {
    setSelectedService(s)
    setProfileA('')
    setProfileB('')
  }

  // Mở modal để nhập thông tin mới
  const openModalFor = (target: 'A' | 'B') => {
    setModalTarget(target)
    setModalOpen(true)
  }

  // Tính label nút submit modal theo context
  const getModalSubmitLabel = () => {
    if (!selectedService?.needsTwo) return 'Xác nhận'
    if (modalTarget === 'B') return 'Tiếp tục →'
    // Target = A: kiểm tra B đã chọn chưa
    return profileB !== '' ? 'Tiếp tục →' : 'Chọn người tiếp theo →'
  }

  const handleModalSave = async (formData: ProfileFormData, saveProfile: boolean) => {
    setModalSaving(true)
    const name = [formData.ho, formData.dem, formData.ten].filter(Boolean).join(' ')

    let profileId = `local_${Date.now()}`
    let profileUid = ''
    let savedPermanently = false

    // Thử POST lên server (cần đăng nhập)
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          gender: formData.gender,
          isTemp: !saveProfile,
          data: formData,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.profile) {
          profileId = String(data.profile.id)
          profileUid = data.profile.profileUid || ''
          savedPermanently = saveProfile
        }
      }
    } catch { /* non-logged-in hoặc lỗi mạng: dùng local data */ }

    const newProfile: Profile = {
      id: profileId,
      profileUid,
      name,
      ten: formData.ten,
      note: formData.note || '',
      gender: formData.gender,
      dob: formData.dob,
      tob: formData.tob,
      loc: formData.loc,
      isTemp: !savedPermanently,
    }

    // Thêm vào danh sách profiles (bao gồm cả temp — sẽ được filter trong picker)
    setProfiles(prev => [newProfile, ...prev])

    if (modalTarget === 'A') {
      setProfileA(profileId)
      sessionStorage.setItem('profileUidA', profileUid)
    } else {
      setProfileB(profileId)
      sessionStorage.setItem('profileUidB', profileUid)
    }

    setModalOpen(false)
    setModalSaving(false)
  }

  const handleConfirm = () => {
    if (!selectedService) return
    const pa = profiles.find(p => p.id === profileA)
    if (!pa) return

    sessionStorage.setItem('inputData', JSON.stringify(profileToInputData(pa)))
    sessionStorage.setItem('selectedService', selectedService.type)
    sessionStorage.setItem('profileUidA', pa.profileUid || '')

    if (selectedService.needsTwo) {
      const pb = profiles.find(p => p.id === profileB)
      if (!pb) return
      sessionStorage.setItem('inputDataB', JSON.stringify(profileToInputData(pb)))
      sessionStorage.setItem('profileUidB', pb.profileUid || '')
    }

    if (selectedService.type === 'transit') {
      sessionStorage.setItem('transitStartDate', transitStartDate)
      sessionStorage.setItem('transitEndDate', transitEndDate)
    } else {
      sessionStorage.removeItem('transitStartDate')
      sessionStorage.removeItem('transitEndDate')
    }

    router.push('/checkout')
  }

  const transitDaysApart = transitStartDate && transitEndDate
    ? Math.round((new Date(transitEndDate).getTime() - new Date(transitStartDate).getTime()) / 86400000)
    : 0
  const transitDatesValid = selectedService?.type !== 'transit' || (
    transitStartDate !== '' && transitEndDate !== '' && transitDaysApart > 0 && transitDaysApart <= 365
  )
  const canConfirm = profileA !== '' && (!selectedService?.needsTwo || profileB !== '') && transitDatesValid
  const hasAnyProfile = profiles.length > 0

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
                {hasAnyProfile ? (
                  <>
                    <ProfilePicker
                      profiles={profiles}
                      selectedId={profileA}
                      onChange={id => { setProfileA(id); sessionStorage.setItem('profileUidA', profiles.find(p => p.id === id)?.profileUid || '') }}
                      label={selectedService.needsTwo ? 'NGƯỜI THỨ NHẤT' : 'CHỌN HỒ SƠ'}
                      onNew={() => openModalFor('A')}
                    />

                    {selectedService.needsTwo && (
                      <>
                        <div style={{ height: '1px', background: 'rgba(200,148,63,0.1)' }} />
                        <ProfilePicker
                          profiles={profiles}
                          selectedId={profileB}
                          onChange={id => { setProfileB(id); sessionStorage.setItem('profileUidB', profiles.find(p => p.id === id)?.profileUid || '') }}
                          label="NGƯỜI THỨ HAI"
                          onNew={() => openModalFor('B')}
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
                      onClick={() => openModalFor('A')}
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

                {/* ── Transit date range picker ─────────────────────── */}
                {selectedService?.type === 'transit' && (
                  <div>
                    <div style={{ height: '1px', background: 'rgba(200,148,63,0.1)', marginBottom: '1.25rem' }} />
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.62rem', letterSpacing: '0.06em' }}>
                          TỪ NGÀY
                        </label>
                        <input
                          type="date"
                          value={transitStartDate}
                          onChange={e => setTransitStartDate(e.target.value)}
                          style={{
                            width: '100%', background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(200,148,63,0.22)', borderRadius: '6px',
                            padding: '0.52rem 0.7rem', color: '#f4efe6',
                            fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem',
                            outline: 'none', colorScheme: 'dark',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.62rem', letterSpacing: '0.06em' }}>
                          ĐẾN NGÀY
                        </label>
                        <input
                          type="date"
                          value={transitEndDate}
                          onChange={e => setTransitEndDate(e.target.value)}
                          style={{
                            width: '100%', background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(200,148,63,0.22)', borderRadius: '6px',
                            padding: '0.52rem 0.7rem', color: '#f4efe6',
                            fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem',
                            outline: 'none', colorScheme: 'dark',
                          }}
                        />
                      </div>
                    </div>
                    {transitStartDate && transitEndDate && transitDaysApart <= 0 && (
                      <p style={{ color: '#f87171', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', marginBottom: '0.5rem' }}>
                        ⚠ Ngày kết thúc phải sau ngày bắt đầu
                      </p>
                    )}
                    {transitDaysApart > 365 && (
                      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)', borderRadius: '6px', padding: '0.55rem 0.8rem' }}>
                        <p style={{ color: '#d4a017', fontFamily: 'var(--font-vietnam)', fontSize: '0.8rem', margin: 0 }}>
                          ⚠ Vui lòng chọn khoảng thời gian tối đa 1 năm
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {(hasAnyProfile || profileA !== '') && (
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

      {/* Modal nhập thông tin mới */}
      <ProfileFormModal
        open={modalOpen}
        title={
          selectedService?.needsTwo
            ? (modalTarget === 'A' ? 'Người thứ nhất' : 'Người thứ hai')
            : 'Nhập thông tin'
        }
        initialData={EMPTY_PROFILE_FORM}
        saving={modalSaving}
        showSaveCheckbox
        submitLabel={getModalSubmitLabel()}
        onSave={handleModalSave}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
