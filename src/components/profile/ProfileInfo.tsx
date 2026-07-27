'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import ProfileFormModal, { ProfileFormData, EMPTY_PROFILE_FORM } from './ProfileFormModal'
import AvatarCropModal from './AvatarCropModal'

export default function ProfileInfo() {
  const { user, upgradeToPremium } = useAuth()
  const router = useRouter()
  // [F4 — V3] Check theo ĐÚNG username, KHÔNG dùng cờ admin (A-CORE Task 0).
  const isHentaiikidd = user?.username === 'hentaiikidd'

  // Avatar
  const [avatarCropFile, setAvatarCropFile] = useState<File | null>(null)
  const [avatarVersion, setAvatarVersion] = useState(Date.now())
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarFallback, setAvatarFallback] = useState<'custom' | 'google' | 'initials'>('custom')
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Reset to custom whenever a new avatar is uploaded
  useEffect(() => { setAvatarFallback('custom') }, [avatarVersion])

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
  const [accountEmail, setAccountEmail] = useState('')   // readonly — từ Google/đăng ký
  const [acEmail, setAcEmail] = useState('')             // reportEmail — email nhận PDF
  const [acLoading, setAcLoading] = useState(false)
  const [acError, setAcError] = useState('')
  const [acSuccess, setAcSuccess] = useState(false)
  // Set account email (chỉ khi chưa có)
  const [newAccountEmail, setNewAccountEmail] = useState('')
  const [acEmailLoading, setAcEmailLoading] = useState(false)
  const [acEmailError, setAcEmailError] = useState('')
  const [acEmailSuccess, setAcEmailSuccess] = useState(false)

  // Change password
  const [showCp, setShowCp] = useState(false)
  const [cpCurrent, setCpCurrent] = useState('')
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
    fetch('/api/user/account', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data.mainChartData) {
          const { _profileId, ...formData } = data.mainChartData as ProfileFormData & { _profileId?: string }
          setMainChart(formData)
          if (_profileId) setMainChartProfileId(String(_profileId))
        }
        // accountEmail: từ tài khoản, không thay đổi được
        setAccountEmail(data.accountEmail || user?.email || '')
        // reportEmail: email nhận PDF, mặc định = accountEmail nếu chưa set
        setAcEmail(data.reportEmail || data.accountEmail || user?.email || '')
      })
      .catch(() => {})
      .finally(() => setMainChartLoading(false))
  }, [user?.uid])

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
        window.dispatchEvent(new CustomEvent('profiles:refresh', { detail: { mainProfileId: profileId } }))
        window.dispatchEvent(new CustomEvent('chart:updated', { detail: { ten: formData.ten?.trim() || '' } }))
      }
    } catch { /* ignore */ }
    setMainChartSaving(false)
    setMainChartModalOpen(false)
  }

  const handleSaveMainChart = async (formData: ProfileFormData, _saveProfile?: boolean) => {
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
      body: JSON.stringify({ reportEmail: acEmail }),
    })
    const data = await res.json()
    setAcLoading(false)
    if (!res.ok) { setAcError(data.error || 'Lỗi'); return }
    setAcSuccess(true)
    setTimeout(() => setAcSuccess(false), 3000)
  }

  const handleSetAccountEmail = async () => {
    setAcEmailLoading(true); setAcEmailError(''); setAcEmailSuccess(false)
    const res = await fetch('/api/user/account', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountEmail: newAccountEmail }),
    })
    const data = await res.json()
    setAcEmailLoading(false)
    if (!res.ok) { setAcEmailError(data.error || 'Lỗi'); return }
    setAccountEmail(newAccountEmail.trim().toLowerCase())
    setNewAccountEmail('')
    setAcEmailSuccess(true)
    setTimeout(() => setAcEmailSuccess(false), 3000)
  }

  const handleAvatarCropped = async (blob: Blob) => {
    setAvatarUploading(true)
    const form = new FormData()
    form.append('avatar', blob, 'avatar.jpg')
    const res = await fetch('/api/user/avatar', { method: 'POST', body: form })
    setAvatarUploading(false)
    setAvatarCropFile(null)
    if (res.ok) {
      setAvatarVersion(Date.now())
      window.dispatchEvent(new CustomEvent('avatar:updated'))
    } else {
      alert('Lỗi khi lưu ảnh, vui lòng thử lại')
    }
  }

  const handleChangePassword = async () => {
    if (!cpCurrent) { setCpError('Vui lòng nhập mật khẩu hiện tại'); return }
    if (cpNew !== cpConfirm) { setCpError('Mật khẩu mới không khớp'); return }
    if (cpNew.length < 6) { setCpError('Mật khẩu mới ít nhất 6 ký tự'); return }
    setCpLoading(true); setCpError(''); setCpSuccess(false)
    const res = await fetch('/api/user/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: cpCurrent, newPassword: cpNew }),
    })
    const data = await res.json()
    setCpLoading(false)
    if (!res.ok) { setCpError(data.error || 'Lỗi'); return }
    setCpSuccess(true)
    setCpCurrent(''); setCpNew(''); setCpConfirm('')
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
    background: 'var(--as-surface)',
    border: '1px solid var(--as-border-soft)',
    borderRadius: '1rem',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: 'var(--as-shadow-card)',
  }

  const displayName = mainChart ? [mainChart.ho, mainChart.dem, mainChart.ten].filter(Boolean).join(' ') : ''

  return (
    <div>
      {/* Toàn bộ mục lớn "Thông tin cá nhân" (heading + account-type/upgrade + Bản đồ sao của
          bạn) chỉ hiện cho hentaiikidd — Chủ nhà xác nhận lại (2026-07-27) đây là ẨN CẢ MỤC LỚN,
          không phải chỉ 2 mục nhỏ như hiểu ban đầu ở phiếu P002. */}
      {isHentaiikidd && (
      <>
      <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--as-text-strong)', fontFamily: 'var(--font-playfair)' }}>
        Thông tin cá nhân
      </h2>

      {/* No email warning */}
      {!mainChartLoading && !accountEmail && (
        <div className="mb-5 p-4 rounded-xl text-sm" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24', fontFamily: 'var(--font-vietnam)' }}>
          ⚠️ Tài khoản chưa có email. Thêm email trong mục <strong>Thông tin tài khoản</strong> bên dưới để đăng nhập bằng email và khôi phục mật khẩu.
        </div>
      )}

      {/* Account type — [F4 — V3, AC-F4.1] nhãn "LOẠI TÀI KHOẢN" chỉ hiện cho hentaiikidd.
          Nút "Xem gói dịch vụ"/nhập mã kích hoạt PHẢI giữ nguyên cho user thường — đây là
          luồng nâng cấp/monetization, KHÔNG nằm trong "2 mục nhỏ" AC yêu cầu ẩn (AC-F5.2
          cấm phá luồng chính). Card chỉ ẩn hoàn toàn khi không còn gì để hiện (non-hentaiikidd
          + đã premium → không nhãn, không nút, không ô nhập mã). */}
      {(isHentaiikidd || !user.isPremium) && (
      <div style={cardStyle}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          {isHentaiikidd && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: user.isPremium ? 'rgba(22,54,83,0.08)' : 'rgba(22,54,83,0.05)', border: `1px solid ${user.isPremium ? 'var(--as-border-gold)' : 'var(--as-border-soft)'}` }}>
                <span style={{ fontSize: '1.1rem' }}>{user.isPremium ? '✦' : '○'}</span>
              </div>
              <div>
                <p style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', marginBottom: '0.1rem' }}>LOẠI TÀI KHOẢN</p>
                <p style={{ color: user.isPremium ? 'var(--as-copper-deep)' : 'var(--as-text)', fontFamily: 'var(--font-vietnam)', fontWeight: 700 }}>
                  {user.planType === 'lifetime' ? 'Lifetime ★' : user.planType === 'cao_cap' ? 'Cao cấp ✦' : user.isPremium ? 'Tiêu chuẩn ✦' : 'Miễn phí'}
                </p>
              </div>
            </div>
          )}
          {!user.isPremium && (
            <button onClick={() => router.push('/profile?tab=plans')}
              className="px-4 py-2 rounded-xl font-semibold text-sm"
              style={{ background: 'transparent', color: 'var(--as-text-strong)', border: '1px solid var(--as-border-gold)', fontFamily: 'var(--font-vietnam)' }}>
              Xem gói dịch vụ →
            </button>
          )}
        </div>
        {!user.isPremium && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--as-border-soft)' }}>
            <button onClick={() => setShowUpgrade(v => !v)} className="text-sm"
              style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)' }}>
              {showUpgrade ? '▲ Ẩn' : '▼ Nhập mã kích hoạt'}
            </button>
            {showUpgrade && (
              <div className="mt-3 flex gap-2">
                <input type="text" value={upgradeCode} onChange={e => setUpgradeCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUpgrade()}
                  placeholder="Mã kích hoạt..." className="flex-1" style={{ fontFamily: 'var(--font-vietnam)' }} />
                <button onClick={handleUpgrade} disabled={upgrading || !upgradeCode.trim()}
                  className="px-4 py-2 rounded-xl font-semibold text-sm"
                  style={{ background: upgradeCode.trim() ? 'var(--as-cta)' : 'rgba(22,54,83,0.12)', color: upgradeCode.trim() ? 'var(--as-text-on-dark)' : 'var(--as-text-muted)', borderRadius: 999, boxShadow: upgradeCode.trim() ? 'var(--as-shadow-glow)' : 'none' }}>
                  {upgrading ? '...' : 'Kích hoạt'}
                </button>
              </div>
            )}
            {upgradeError && <p className="mt-2 text-xs" style={{ color: '#ef4444', fontFamily: 'var(--font-vietnam)' }}>{upgradeError}</p>}
          </div>
        )}
      </div>
      )}

      {/* ── Bản đồ sao chính — [F4 — V3, AC-F4.1] ẩn hoàn toàn cho non-hentaiikidd ── */}
      {isHentaiikidd && (
      <div style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold" style={{ color: 'var(--as-text-strong)', fontFamily: 'var(--font-playfair)' }}>Bản đồ sao của bạn</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)' }}>
              Bản đồ sao gắn liền với tài khoản
            </p>
          </div>
          <button
            onClick={() => { setModalInitialData(mainChart ?? EMPTY_PROFILE_FORM); setMainChartModalOpen(true) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm"
            style={{ color: 'var(--as-text-strong)', background: 'transparent', border: '1px solid var(--as-border-gold)', fontFamily: 'var(--font-vietnam)' }}
          >
            <Pencil size={13} /> {mainChart ? 'Sửa' : 'Cập nhật'}
          </button>
        </div>

        {mainChartLoading ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(22,54,83,0.15)', borderTopColor: 'var(--as-cta)' }} />
          </div>
        ) : mainChart ? (
          /* Compact stacked card — same pattern as ChartList */
          <div className="rounded-xl px-4 py-3"
            style={{ background: 'var(--as-surface-raised)', border: '1px solid var(--as-border-soft)' }}>
            {/* Row 1: gender icon + name */}
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(22,54,83,0.08)', fontSize: '0.8rem' }}>
                {mainChart.gender === 'Female' ? '♀' : mainChart.gender === 'Male' ? '♂' : '⊕'}
              </div>
              <p className="font-semibold truncate flex-1 min-w-0"
                style={{ color: 'var(--as-text-strong)', fontFamily: 'var(--font-vietnam)', fontSize: '0.92rem' }}>
                {displayName || '(Chưa có tên)'}
              </p>
            </div>
            {/* Row 2: meta — single line, truncate */}
            <p className="truncate mb-2.5"
              style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', paddingLeft: '2.25rem' }}>
              {mainChart.dob.day > 0 ? `${mainChart.dob.day}/${mainChart.dob.month}/${mainChart.dob.year}` : 'Chưa có ngày'} ·{' '}
              {mainChart.tob.unknown ? 'Không rõ giờ' : mainChart.tob.hour >= 0 ? `${String(mainChart.tob.hour).padStart(2,'0')}:${String(mainChart.tob.minute).padStart(2,'0')}` : 'Chưa có giờ'} ·{' '}
              {mainChart.loc.address}
            </p>
            {/* Row 3: action buttons */}
            <div className="flex gap-1.5 flex-wrap" style={{ paddingLeft: '2.25rem' }}>
              {mainChartProfileId && (
                <button
                  onClick={() => router.push(`/chart?id=${mainChartProfileId}`)}
                  style={{ color: 'var(--as-text-strong)', background: 'transparent', border: '1px solid var(--as-border-gold)', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', fontWeight: 600, padding: '0.375rem 0.625rem', borderRadius: '0.5rem', minHeight: 36 }}>
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
                style={{ color: 'var(--as-text-strong)', background: 'transparent', border: '1px solid var(--as-border-gold)', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', fontWeight: 600, padding: '0.375rem 0.625rem', borderRadius: '0.5rem', minHeight: 36 }}>
                Dịch vụ →
              </button>
            </div>
          </div>
        ) : (
          /* CTA when not set */
          <div className="text-center py-5 rounded-xl" style={{ border: '1px dashed var(--as-border-gold)' }}>
            <p className="text-sm mb-3" style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)' }}>
              Cập nhật thông tin để xem bản đồ sao của bạn ✦
            </p>
            <button onClick={() => { setModalInitialData(EMPTY_PROFILE_FORM); setMainChartModalOpen(true) }}
              className="px-5 py-2 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--as-cta)', color: 'var(--as-text-on-dark)', fontFamily: 'var(--font-vietnam)', borderRadius: 999, boxShadow: 'var(--as-shadow-glow)' }}>
              + Thêm thông tin ngay
            </button>
          </div>
        )}
      </div>
      )}
      </>
      )}

      {/* Avatar */}
      <div style={cardStyle}>
        <h3 className="font-bold mb-4" style={{ color: 'var(--as-text-strong)', fontFamily: 'var(--font-playfair)' }}>Ảnh đại diện</h3>
        <div className="flex flex-wrap items-center gap-4">
          {/* Avatar circle — always circular, state-driven fallback chain */}
          <div className="relative flex-shrink-0" style={{ width: 64, height: 64 }}>
            {avatarFallback === 'custom' && (
              <img
                key={avatarVersion}
                src={`/api/user/avatar?v=${avatarVersion}`}
                alt="avatar"
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--as-border-gold)', display: 'block' }}
                onError={() => setAvatarFallback(user.image ? 'google' : 'initials')}
              />
            )}
            {avatarFallback === 'google' && user.image && (
              <img
                src={user.image}
                alt="avatar"
                referrerPolicy="no-referrer"
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--as-border-gold)', display: 'block' }}
                onError={() => setAvatarFallback('initials')}
              />
            )}
            {(avatarFallback === 'initials' || (avatarFallback === 'google' && !user.image)) && (
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--as-cta)', color: 'var(--as-text-on-dark)', border: '2px solid var(--as-border-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-vietnam)' }}>
                {(user.name || user.username || '?')[0].toUpperCase()}
              </div>
            )}
            {avatarUploading && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(22,54,83,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          {/* Upload controls */}
          <div className="min-w-0">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) setAvatarCropFile(f); e.target.value = '' }} />
            <button onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'transparent', color: 'var(--as-text-strong)', border: '1px solid var(--as-border-gold)', fontFamily: 'var(--font-vietnam)', minHeight: 44 }}>
              Đổi ảnh đại diện
            </button>
            <p className="mt-2 text-xs" style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)' }}>
              JPG, PNG · Cắt hình tròn 200×200px
            </p>
          </div>
        </div>
        {avatarCropFile && (
          <AvatarCropModal
            file={avatarCropFile}
            onSave={handleAvatarCropped}
            onClose={() => setAvatarCropFile(null)}
          />
        )}
      </div>

      {/* Account info */}
      <div style={cardStyle}>
        <h3 className="font-bold mb-4" style={{ color: 'var(--as-text-strong)', fontFamily: 'var(--font-playfair)' }}>Thông tin tài khoản</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', letterSpacing: '0.05em' }}>TÊN ĐĂNG NHẬP</label>
            <div className="px-3 py-2.5 rounded-lg text-sm" style={{ background: 'var(--as-surface-raised)', border: '1px solid var(--as-border-soft)', color: 'var(--as-text)', fontFamily: 'var(--font-vietnam)' }}>
              {user.username}
            </div>
          </div>
          {/* Email tài khoản — readonly nếu đã có, editable nếu chưa */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', letterSpacing: '0.05em' }}>EMAIL TÀI KHOẢN</label>
            {accountEmail ? (
              <>
                <div className="px-3 py-2.5 rounded-lg text-sm" style={{ background: 'var(--as-surface-raised)', border: '1px solid var(--as-border-soft)', color: 'var(--as-text)', fontFamily: 'var(--font-vietnam)' }}>
                  {accountEmail}
                </div>
                <p className="mt-1 text-xs" style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)' }}>
                  Email đăng nhập hoặc email Google, không thể thay đổi.
                </p>
              </>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input type="email" value={newAccountEmail} onChange={e => setNewAccountEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && newAccountEmail.trim() && handleSetAccountEmail()}
                    placeholder="Nhập email của bạn..." className="flex-1" style={{ fontFamily: 'var(--font-vietnam)' }} />
                  <button onClick={handleSetAccountEmail} disabled={acEmailLoading || !newAccountEmail.trim()}
                    className="px-4 py-2 rounded-xl font-semibold text-sm"
                    style={{ background: newAccountEmail.trim() ? 'var(--as-cta)' : 'rgba(22,54,83,0.12)', color: newAccountEmail.trim() ? 'var(--as-text-on-dark)' : 'var(--as-text-muted)', whiteSpace: 'nowrap', minHeight: 44, borderRadius: 999, boxShadow: newAccountEmail.trim() ? 'var(--as-shadow-glow)' : 'none' }}>
                    {acEmailLoading ? 'Đang lưu...' : 'Xác nhận'}
                  </button>
                </div>
                {acEmailError && <p className="mt-1.5 text-xs" style={{ color: '#e87070', fontFamily: 'var(--font-vietnam)' }}>{acEmailError}</p>}
                {acEmailSuccess && <p className="mt-1.5 text-xs" style={{ color: '#4ade80', fontFamily: 'var(--font-vietnam)' }}>Đã thêm email tài khoản thành công!</p>}
                <p className="mt-1 text-xs" style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)' }}>
                  Dùng để đăng nhập bằng email và khôi phục mật khẩu.
                </p>
              </>
            )}
          </div>
          {/* Email nhận PDF — editable */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', letterSpacing: '0.05em' }}>EMAIL NHẬN BÁO CÁO PDF</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="email" value={acEmail} onChange={e => setAcEmail(e.target.value)}
                placeholder="email@example.com" className="flex-1" style={{ fontFamily: 'var(--font-vietnam)' }} />
              <button onClick={handleUpdateEmail} disabled={acLoading || !acEmail.trim()}
                className="px-4 py-2 rounded-xl font-semibold text-sm"
                style={{ background: acEmail.trim() ? 'var(--as-cta)' : 'rgba(22,54,83,0.12)', color: acEmail.trim() ? 'var(--as-text-on-dark)' : 'var(--as-text-muted)', whiteSpace: 'nowrap', minHeight: 44, borderRadius: 999, boxShadow: acEmail.trim() ? 'var(--as-shadow-glow)' : 'none' }}>
                {acLoading ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
            {acError && <p className="mt-1.5 text-xs" style={{ color: '#e87070', fontFamily: 'var(--font-vietnam)' }}>{acError}</p>}
            {acSuccess && <p className="mt-1.5 text-xs" style={{ color: '#4ade80', fontFamily: 'var(--font-vietnam)' }}>Đã cập nhật email nhận PDF!</p>}
            <p className="mt-1 text-xs" style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)' }}>
              PDF báo cáo sẽ được gửi đến địa chỉ này.
            </p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div style={cardStyle}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold" style={{ color: 'var(--as-text-strong)', fontFamily: 'var(--font-playfair)' }}>Đổi mật khẩu</h3>
          <button onClick={() => { setShowCp(v => !v); setCpError(''); setCpSuccess(false); setCpCurrent(''); setCpNew(''); setCpConfirm('') }}
            style={{ color: 'var(--as-cta)', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem' }}>
            {showCp ? 'Hủy' : 'Đổi mật khẩu'}
          </button>
        </div>
        {showCp && (
          <div className="mt-4 space-y-3">
            {cpError && <div className="text-sm" style={{ color: '#e87070', fontFamily: 'var(--font-vietnam)' }}>{cpError}</div>}
            {cpSuccess && <div className="text-sm" style={{ color: '#4ade80', fontFamily: 'var(--font-vietnam)' }}>Đổi mật khẩu thành công!</div>}
            <input type="password" value={cpCurrent} onChange={e => setCpCurrent(e.target.value)} placeholder="Mật khẩu hiện tại" style={{ fontFamily: 'var(--font-vietnam)' }} />
            <input type="password" value={cpNew} onChange={e => setCpNew(e.target.value)} placeholder="Mật khẩu mới" style={{ fontFamily: 'var(--font-vietnam)' }} />
            <input type="password" value={cpConfirm} onChange={e => setCpConfirm(e.target.value)} placeholder="Xác nhận mật khẩu mới" style={{ fontFamily: 'var(--font-vietnam)' }} />
            <button onClick={handleChangePassword} disabled={cpLoading}
              style={{ background: 'var(--as-cta)', color: 'var(--as-text-on-dark)', padding: '0.6rem 1.5rem', borderRadius: 999, fontFamily: 'var(--font-vietnam)', fontWeight: 700, fontSize: '0.85rem', opacity: cpLoading ? 0.7 : 1, boxShadow: 'var(--as-shadow-glow)' }}>
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
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(22,54,83,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => { setDupCheckOpen(false); if (pendingFormData) { setModalInitialData(pendingFormData); setMainChartModalOpen(true) } }}
        >
          <div
            style={{ background: 'var(--as-surface-raised)', border: '1px solid var(--as-border-gold)', borderRadius: '1rem', padding: '1.5rem', maxWidth: '420px', width: '100%' }}
            onClick={e => e.stopPropagation()}
          >
            <p className="font-bold mb-2" style={{ color: 'var(--as-text-strong)', fontFamily: 'var(--font-playfair)', fontSize: '1rem' }}>
              Đã tồn tại hồ sơ
            </p>
            <p className="text-sm mb-5" style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', lineHeight: 1.7 }}>
              Đã có hồ sơ tên <strong style={{ color: 'var(--as-copper-deep)' }}>{dupProfile?.name}</strong> trong danh sách. Bạn có muốn cập nhật hồ sơ đó làm thông tin của bản thân không?
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={async () => {
                  setDupCheckOpen(false)
                  if (pendingFormData && dupProfile) await doSaveMainChart(pendingFormData, dupProfile.id)
                }}
                style={{ background: 'var(--as-cta)', color: 'var(--as-text-on-dark)', padding: '0.5rem 1.1rem', borderRadius: 999, fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', border: 'none', boxShadow: 'var(--as-shadow-glow)' }}
              >
                Có, dùng hồ sơ đó
              </button>
              <button
                onClick={() => {
                  setDupCheckOpen(false)
                  if (pendingFormData) { setModalInitialData(pendingFormData); setMainChartModalOpen(true) }
                }}
                style={{ background: 'transparent', color: 'var(--as-text-strong)', border: '1px solid var(--as-border-gold)', padding: '0.5rem 1.1rem', borderRadius: 999, fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', cursor: 'pointer' }}
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
