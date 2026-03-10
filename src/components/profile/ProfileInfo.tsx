'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import ProfileFormModal, { ProfileFormData, EMPTY_PROFILE_FORM } from './ProfileFormModal'

export default function ProfileInfo() {
  const { user, upgradeToPremium } = useAuth()
  const router = useRouter()

  // Main chart (bản đồ chính của tài khoản)
  const [mainChart, setMainChart] = useState<ProfileFormData | null>(null)
  const [mainChartProfileId, setMainChartProfileId] = useState<string | null>(null)
  const [mainChartLoading, setMainChartLoading] = useState(true)
  const [mainChartModalOpen, setMainChartModalOpen] = useState(false)
  const [mainChartSaving, setMainChartSaving] = useState(false)
  const [modalInitialData, setModalInitialData] = useState<ProfileFormData>(EMPTY_PROFILE_FORM)

  // Duplicate name check dialog
  const [dupCheckOpen, setDupCheckOpen] = useState(false)
  const [dupProfile, setDupProfile] = useState<{ id: string; name: string } | null>(null)
  const [pendingFormData, setPendingFormData] = useState<ProfileFormData | null>(null)

  // Email
  const [acEmail, setAcEmail] = useState('')
  const [acLoading, setAcLoading] = useState(false)
  const [acError, setAcError] = useState('')
  const [acSuccess, setAcSuccess] = useState(false)

  // Change password
  const [showCp, setShowCp] = useState(false)
  const [cpNew, setCpNew] = useState('')
  const [cpConfirm, setCpConfirm] = useState('')
  const [cpLoading, setCpLoading] = useState(false)
  const [cpError, setCpError] = useState('')
  const [cpSuccess, setCpSuccess] = useState(false)

  // Upgrade code
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgradeCode, setUpgradeCode] = useState('')
  const [upgrading, setUpgrading] = useState(false)
  const [upgradeError, setUpgradeError] = useState('')

  useEffect(() => {
    if (user) setAcEmail(user.email || '')
  }, [user])

  useEffect(() => {
    fetch('/api/user/account')
      .then(r => r.json())
      .then(data => {
        if (data.mainChartData) {
          const { _profileId, ...formData } = data.mainChartData as ProfileFormData & { _profileId?: string }
          setMainChart(formData)
          if (_profileId) setMainChartProfileId(String(_profileId))
        }
      })
      .catch(() => {})
      .finally(() => setMainChartLoading(false))
  }, [])

  const doSaveMainChart = async (formData: ProfileFormData, existingProfileId?: string) => {
    setMainChartSaving(true)
    try {
      // Trim whitespace from name parts before saving
      const trimmedData: ProfileFormData = { ...formData, ho: formData.ho.trim(), dem: formData.dem.trim(), ten: formData.ten.trim() }
      formData = trimmedData
      const name = [formData.ho, formData.dem, formData.ten].filter(Boolean).join(' ')
      let profileId: string | null = existingProfileId ?? mainChartProfileId ?? null

      if (existingProfileId) {
        // Link to an existing profile (user confirmed dup)
        await fetch('/api/profiles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: existingProfileId, name, gender: formData.gender, data: formData }),
        })
        profileId = existingProfileId
      } else if (profileId) {
        // Update currently linked profile
        await fetch('/api/profiles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: profileId, name, gender: formData.gender, data: formData }),
        })
      } else {
        // Create new profile
        const res = await fetch('/api/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, gender: formData.gender, data: formData }),
        })
        const created = await res.json()
        if (created.profile) profileId = String(created.profile.id)
      }

      const toSave = { ...formData, _profileId: profileId }
      const res = await fetch('/api/user/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mainChartData: toSave }),
      })
      if (res.ok) {
        setMainChart(formData)
        setMainChartProfileId(profileId)
        setMainChartModalOpen(false)
        window.dispatchEvent(new CustomEvent('profiles:refresh', { detail: { mainProfileId: profileId } }))
      }
    } catch { /* ignore */ }
    setMainChartSaving(false)
  }

  const handleSaveMainChart = async (formData: ProfileFormData) => {
    const newName = [formData.ho.trim(), formData.dem.trim(), formData.ten.trim()].filter(Boolean).join(' ')
    try {
      const res = await fetch('/api/profiles')
      const data = await res.json()
      if (data.profiles) {
        const dup = (data.profiles as any[]).find(p =>
          p.name.trim().toLowerCase() === newName.toLowerCase() &&
          String(p.id) !== mainChartProfileId
        )
        if (dup) {
          setPendingFormData(formData)
          setDupProfile({ id: String(dup.id), name: dup.name })
          setDupCheckOpen(true)
          return
        }
      }
    } catch { /* proceed without dup check */ }
    await doSaveMainChart(formData)
  }

  const handleUpdateEmail = async () => {
    setAcLoading(true); setAcError(''); setAcSuccess(false)
    const res = await fetch('/api/user/account', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: acEmail }),
    })
    const data = await res.json()
    setAcLoading(false)
    if (!res.ok) { setAcError(data.error || 'Lỗi'); return }
    setAcSuccess(true)
    setTimeout(() => setAcSuccess(false), 3000)
  }

  const handleChangePassword = async () => {
    if (cpNew !== cpConfirm) { setCpError('Mật khẩu không khớp'); return }
    if (cpNew.length < 6) { setCpError('Mật khẩu ít nhất 6 ký tự'); return }
    setCpLoading(true); setCpError(''); setCpSuccess(false)
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: cpNew }),
    })
    const data = await res.json()
    setCpLoading(false)
    if (!res.ok) { setCpError(data.error || 'Lỗi'); return }
    setCpSuccess(true)
    setCpNew(''); setCpConfirm('')
    setTimeout(() => { setCpSuccess(false); setShowCp(false) }, 2000)
  }

  const handleUpgrade = async () => {
    if (!upgradeCode.trim()) return
    setUpgrading(true); setUpgradeError('')
    const result = await upgradeToPremium(upgradeCode)
    setUpgrading(false)
    if (result.ok) { setShowUpgrade(false); setUpgradeCode('') }
    else setUpgradeError(result.error || 'Mã không hợp lệ')
  }

  if (!user) return null

  const cardStyle: React.CSSProperties = {
    background: 'rgba(26,21,53,0.6)',
    border: '1px solid rgba(201,168,76,0.12)',
    borderRadius: '1rem',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  }

  const displayName = mainChart ? [mainChart.ho, mainChart.dem, mainChart.ten].filter(Boolean).join(' ') : ''

  return (
    <div>
      <h2 className="text-xl font-bold mb-6" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>
        Thông tin cá nhân
      </h2>

      {/* No email warning */}
      {!user.email && (
        <div className="mb-5 p-4 rounded-xl text-sm" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24', fontFamily: 'var(--font-vietnam)' }}>
          ⚠️ Tài khoản chưa có email. Thêm email bên dưới để đăng nhập bằng email và khôi phục mật khẩu.
        </div>
      )}

      {/* Account type */}
      <div style={cardStyle}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: user.isPremium ? 'rgba(201,168,76,0.12)' : 'rgba(107,114,128,0.1)', border: `1px solid ${user.isPremium ? 'rgba(201,168,76,0.3)' : 'rgba(107,114,128,0.2)'}` }}>
              <span style={{ fontSize: '1.1rem' }}>{user.isPremium ? '✦' : '○'}</span>
            </div>
            <div>
              <p style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', marginBottom: '0.1rem' }}>LOẠI TÀI KHOẢN</p>
              <p style={{ color: user.isPremium ? '#d9ab55' : '#94a3b8', fontFamily: 'var(--font-vietnam)', fontWeight: 700 }}>
                {user.isPremium ? 'Premium ✦' : 'Miễn phí'}
              </p>
            </div>
          </div>
          {!user.isPremium && (
            <button onClick={() => router.push('/profile?tab=plans')}
              className="px-4 py-2 rounded-xl font-semibold text-sm"
              style={{ background: 'rgba(201,168,76,0.12)', color: '#d9ab55', border: '1px solid rgba(201,168,76,0.2)', fontFamily: 'var(--font-vietnam)' }}>
              Xem gói dịch vụ →
            </button>
          )}
        </div>
        {!user.isPremium && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(201,168,76,0.08)' }}>
            <button onClick={() => setShowUpgrade(v => !v)} className="text-sm"
              style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)' }}>
              {showUpgrade ? '▲ Ẩn' : '▼ Nhập mã kích hoạt'}
            </button>
            {showUpgrade && (
              <div className="mt-3 flex gap-2">
                <input type="text" value={upgradeCode} onChange={e => setUpgradeCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUpgrade()}
                  placeholder="Mã kích hoạt..." className="flex-1" style={{ fontFamily: 'var(--font-vietnam)' }} />
                <button onClick={handleUpgrade} disabled={upgrading || !upgradeCode.trim()}
                  className="px-4 py-2 rounded-xl font-semibold text-sm"
                  style={{ background: upgradeCode.trim() ? '#c9a84c' : 'rgba(201,168,76,0.15)', color: upgradeCode.trim() ? '#0a0a1a' : '#6b7280' }}>
                  {upgrading ? '...' : 'Kích hoạt'}
                </button>
              </div>
            )}
            {upgradeError && <p className="mt-2 text-xs" style={{ color: '#ef4444', fontFamily: 'var(--font-vietnam)' }}>{upgradeError}</p>}
          </div>
        )}
      </div>

      {/* ── Bản đồ sao chính ── */}
      <div style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>Bản đồ sao của bạn</h3>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)' }}>
              Bản đồ sao gắn liền với tài khoản
            </p>
          </div>
          <button
            onClick={() => { setModalInitialData(mainChart ?? EMPTY_PROFILE_FORM); setMainChartModalOpen(true) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm"
            style={{ color: '#d9ab55', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)', fontFamily: 'var(--font-vietnam)' }}
          >
            <Pencil size={13} /> {mainChart ? 'Sửa' : 'Cập nhật'}
          </button>
        </div>

        {mainChartLoading ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(201,168,76,0.2)', borderTopColor: '#c9a84c' }} />
          </div>
        ) : mainChart ? (
          /* Display like a chart row */
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 flex-wrap"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(61,43,94,0.6)', fontSize: '0.9rem' }}>
              {mainChart.gender === 'Female' ? '♀' : mainChart.gender === 'Male' ? '♂' : '⊕'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '0.92rem' }}>
                {displayName || '(Chưa có tên)'}
              </p>
              <p style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', marginTop: '0.1rem' }}>
                {mainChart.dob.day > 0 ? `${mainChart.dob.day}/${mainChart.dob.month}/${mainChart.dob.year}` : 'Chưa có ngày'} ·{' '}
                {mainChart.tob.unknown ? 'Không rõ giờ' : mainChart.tob.hour >= 0 ? `${String(mainChart.tob.hour).padStart(2,'0')}:${String(mainChart.tob.minute).padStart(2,'0')}` : 'Chưa có giờ'} ·{' '}
                {mainChart.loc.address}
              </p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
              {mainChartProfileId && (
                <button
                  onClick={() => router.push(`/chart?id=${mainChartProfileId}`)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ color: '#d9ab55', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', fontFamily: 'var(--font-vietnam)' }}
                >
                  Bản đồ ✦
                </button>
              )}
              <button
                onClick={() => {
                  sessionStorage.setItem('inputData', JSON.stringify({
                    name: displayName, gender: mainChart.gender, dob: mainChart.dob,
                    tob: { hour: mainChart.tob.unknown ? 12 : (mainChart.tob.hour >= 0 ? mainChart.tob.hour : 12), minute: mainChart.tob.unknown ? 0 : (mainChart.tob.minute >= 0 ? mainChart.tob.minute : 0) },
                    loc: mainChart.loc,
                  }))
                  router.push('/services')
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                style={{ color: '#d9ab55', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', fontFamily: 'var(--font-vietnam)' }}
              >
                Dịch vụ →
              </button>
            </div>
          </div>
        ) : (
          /* CTA when not set */
          <div className="text-center py-5 rounded-xl" style={{ border: '1px dashed rgba(201,168,76,0.15)' }}>
            <p className="text-sm mb-3" style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)' }}>
              Cập nhật thông tin để xem bản đồ sao của bạn ✦
            </p>
            <button onClick={() => { setModalInitialData(EMPTY_PROFILE_FORM); setMainChartModalOpen(true) }}
              className="px-5 py-2 rounded-xl font-semibold text-sm"
              style={{ background: '#c9a84c', color: '#0a0a1a', fontFamily: 'var(--font-vietnam)' }}>
              + Thêm thông tin ngay
            </button>
          </div>
        )}
      </div>

      {/* Account info */}
      <div style={cardStyle}>
        <h3 className="font-bold mb-4" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>Thông tin tài khoản</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', letterSpacing: '0.05em' }}>TÊN ĐĂNG NHẬP</label>
            <div className="px-3 py-2.5 rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.1)', color: '#94a3b8', fontFamily: 'var(--font-vietnam)' }}>
              {user.username}
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', letterSpacing: '0.05em' }}>EMAIL</label>
            <div className="flex gap-2">
              <input type="email" value={acEmail} onChange={e => setAcEmail(e.target.value)}
                placeholder="email@example.com" className="flex-1" style={{ fontFamily: 'var(--font-vietnam)' }} />
              <button onClick={handleUpdateEmail} disabled={acLoading || !acEmail.trim()}
                className="px-4 py-2 rounded-xl font-semibold text-sm"
                style={{ background: acEmail.trim() ? 'linear-gradient(135deg,#c8943f,#f0cc78)' : 'rgba(201,168,76,0.15)', color: acEmail.trim() ? '#06060f' : '#6b7280', whiteSpace: 'nowrap' }}>
                {acLoading ? 'Đang lưu...' : 'Lưu email'}
              </button>
            </div>
            {acError && <p className="mt-1.5 text-xs" style={{ color: '#e87070', fontFamily: 'var(--font-vietnam)' }}>{acError}</p>}
            {acSuccess && <p className="mt-1.5 text-xs" style={{ color: '#4ade80', fontFamily: 'var(--font-vietnam)' }}>Email đã cập nhật!</p>}
          </div>
        </div>
      </div>

      {/* Change password */}
      <div style={cardStyle}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>Đổi mật khẩu</h3>
          <button onClick={() => { setShowCp(v => !v); setCpError(''); setCpSuccess(false) }}
            style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem' }}>
            {showCp ? 'Hủy' : 'Đổi mật khẩu'}
          </button>
        </div>
        {showCp && (
          <div className="mt-4 space-y-3">
            {cpError && <div className="text-sm" style={{ color: '#e87070' }}>{cpError}</div>}
            {cpSuccess && <div className="text-sm" style={{ color: '#4ade80' }}>Đổi mật khẩu thành công!</div>}
            <input type="password" value={cpNew} onChange={e => setCpNew(e.target.value)} placeholder="Mật khẩu mới" />
            <input type="password" value={cpConfirm} onChange={e => setCpConfirm(e.target.value)} placeholder="Xác nhận mật khẩu mới" />
            <button onClick={handleChangePassword} disabled={cpLoading}
              style={{ background: 'linear-gradient(135deg,#c8943f,#f0cc78)', color: '#06060f', padding: '0.6rem 1.5rem', borderRadius: '4px', fontFamily: 'var(--font-vietnam)', fontWeight: 700, fontSize: '0.85rem', opacity: cpLoading ? 0.7 : 1 }}>
              {cpLoading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
            </button>
          </div>
        )}
      </div>

      {/* Main chart modal */}
      <ProfileFormModal
        open={mainChartModalOpen}
        title={mainChart ? 'Chỉnh sửa bản đồ sao của bạn' : 'Thêm bản đồ sao của bạn'}
        initialData={modalInitialData}
        saving={mainChartSaving}
        onSave={handleSaveMainChart}
        onClose={() => setMainChartModalOpen(false)}
      />

      {/* Duplicate name dialog */}
      {dupCheckOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => { setDupCheckOpen(false); if (pendingFormData) { setModalInitialData(pendingFormData); setMainChartModalOpen(true) } }}
        >
          <div
            style={{ background: '#120d2e', border: '1px solid rgba(200,148,63,0.25)', borderRadius: '1rem', padding: '1.5rem', maxWidth: '420px', width: '100%' }}
            onClick={e => e.stopPropagation()}
          >
            <p className="font-bold mb-2" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1rem' }}>
              Đã tồn tại hồ sơ
            </p>
            <p className="text-sm mb-5" style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', lineHeight: 1.7 }}>
              Đã có hồ sơ tên <strong style={{ color: '#d9ab55' }}>{dupProfile?.name}</strong> trong danh sách. Bạn có muốn cập nhật hồ sơ đó làm thông tin của bản thân không?
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={async () => {
                  setDupCheckOpen(false)
                  if (pendingFormData && dupProfile) await doSaveMainChart(pendingFormData, dupProfile.id)
                }}
                style={{ background: 'linear-gradient(135deg,#c8943f,#f0cc78)', color: '#06060f', padding: '0.5rem 1.1rem', borderRadius: '8px', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', border: 'none' }}
              >
                Có, dùng hồ sơ đó
              </button>
              <button
                onClick={() => {
                  setDupCheckOpen(false)
                  if (pendingFormData) { setModalInitialData(pendingFormData); setMainChartModalOpen(true) }
                }}
                style={{ background: 'rgba(11,11,31,0.8)', color: '#8a8399', border: '1px solid rgba(200,148,63,0.1)', padding: '0.5rem 1.1rem', borderRadius: '8px', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Đổi tên khác
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
