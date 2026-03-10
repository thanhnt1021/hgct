'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/contexts/AuthContext'
import LocationPicker from '@/components/profile/LocationPicker'

interface Profile {
  id: string
  ho: string
  dem: string
  ten: string
  name: string
  gender: string
  dob: { day: number; month: number; year: number }
  tob: { hour: number; minute: number; unknown: boolean }
  loc: { address: string; lat: number; lon: number; tz: string }
  createdAt: string
}

const CUR_YEAR = new Date().getFullYear()
const MAX_YEAR = CUR_YEAR + 100
const MIN_YEAR = 1911

const EMPTY_FORM = {
  ho: '', dem: '', ten: '', gender: 'Female',
  dob: { day: 0, month: 0, year: 0 },
  tob: { hour: -1, minute: -1, unknown: false },
  loc: { address: 'Hà Nội, Việt Nam', lat: 21.0245, lon: 105.8412, tz: 'Asia/Ho_Chi_Minh' },
}

export default function ProfilePage() {
  const { user, isLoading, upgradeToPremium } = useAuth()
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [yearMode, setYearMode] = useState<'select' | 'custom'>('select')
  const [customYearText, setCustomYearText] = useState('')
  const [yearError, setYearError] = useState('')
  const [formError, setFormError] = useState('')
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgradeCode, setUpgradeCode] = useState('')
  const [upgrading, setUpgrading] = useState(false)
  const [upgradeError, setUpgradeError] = useState('')
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [cpNew, setCpNew] = useState('')
  const [cpConfirm, setCpConfirm] = useState('')
  const [cpLoading, setCpLoading] = useState(false)
  const [cpError, setCpError] = useState('')
  const [cpSuccess, setCpSuccess] = useState(false)
  const [acEmail, setAcEmail] = useState('')
  const [acLoading, setAcLoading] = useState(false)
  const [acError, setAcError] = useState('')
  const [acSuccess, setAcSuccess] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login')
  }, [user, isLoading, router])

  useEffect(() => {
    if (user) setAcEmail(user.email || '')
  }, [user])

  useEffect(() => {
    fetch('/api/profiles')
      .then(r => r.json())
      .then(data => {
        if (data.profiles) {
          setProfiles(data.profiles.map((p: any) => ({
            id: String(p.id),
            ho: p.data?.ho || '',
            dem: p.data?.dem || '',
            ten: p.data?.ten || p.name,
            name: p.name,
            gender: p.gender || 'Female',
            dob: p.data?.dob || { day: 0, month: 0, year: 0 },
            tob: p.data?.tob || { hour: -1, minute: -1, unknown: false },
            loc: p.data?.loc || { address: 'Hà Nội', lat: 21.02, lon: 105.84, tz: 'Asia/Ho_Chi_Minh' },
            createdAt: p.createdAt || '',
          })))
        }
      })
      .catch(() => setProfiles([]))
  }, [])

  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const openNew = () => {
    setForm(EMPTY_FORM)
    setYearMode('select')
    setCustomYearText('')
    setYearError('')
    setFormError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    setFormError('')
    setYearError('')

    if (!form.ten.trim()) { setFormError('Vui lòng nhập tên'); return }
    if (form.dob.day === 0) { setFormError('Vui lòng chọn ngày sinh'); return }
    if (form.dob.month === 0) { setFormError('Vui lòng chọn tháng sinh'); return }

    let finalYear = form.dob.year
    if (yearMode === 'custom') {
      const y = parseInt(customYearText, 10)
      if (!customYearText.trim() || isNaN(y) || y < -4712 || y > 5399) {
        setYearError('Năm không hợp lệ. Nhập số từ -4712 đến 5399.')
        return
      }
      finalYear = y
    } else if (form.dob.year === 0) {
      setFormError('Vui lòng chọn năm sinh')
      return
    }

    if (!form.tob.unknown && (form.tob.hour === -1 || form.tob.minute === -1)) {
      setFormError('Vui lòng chọn giờ và phút sinh (hoặc tích "Không rõ giờ sinh")')
      return
    }

    setSaving(true)
    const finalDob = { ...form.dob, year: finalYear }
    const name = [form.ho, form.dem, form.ten].filter(Boolean).join(' ')
    const body = { name, gender: form.gender, data: { dob: finalDob, tob: form.tob, loc: form.loc, ho: form.ho, dem: form.dem, ten: form.ten } }

    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok && data.profile) {
        const p = data.profile
        setProfiles(prev => [{
          id: String(p.id),
          ho: p.data?.ho || '',
          dem: p.data?.dem || '',
          ten: p.data?.ten || p.name,
          name: p.name,
          gender: p.gender || 'Female',
          dob: p.data?.dob || finalDob,
          tob: p.data?.tob || form.tob,
          loc: p.data?.loc || form.loc,
          createdAt: p.createdAt || '',
        }, ...prev])
        setShowForm(false)
      }
    } catch { /* ignore */ }

    setSaving(false)
  }

  const handleUpgrade = async () => {
    if (!upgradeCode.trim()) return
    setUpgrading(true)
    setUpgradeError('')
    const result = await upgradeToPremium(upgradeCode)
    setUpgrading(false)
    if (result.ok) {
      setShowUpgrade(false)
      setUpgradeCode('')
    } else {
      setUpgradeError(result.error || 'Mã không hợp lệ')
    }
  }

  const handleUpdateAccount = async () => {
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
    setTimeout(() => { setCpSuccess(false); setShowChangePassword(false) }, 2000)
  }

  const MONTHS = [
    [1,'Tháng 1'],[2,'Tháng 2'],[3,'Tháng 3'],[4,'Tháng 4'],
    [5,'Tháng 5'],[6,'Tháng 6'],[7,'Tháng 7'],[8,'Tháng 8'],
    [9,'Tháng 9'],[10,'Tháng 10'],[11,'Tháng 11'],[12,'Tháng 12'],
  ] as [number, string][]
  const DAYS = Array.from({length: 31}, (_, i) => i + 1)
  const YEARS = Array.from({length: MAX_YEAR - MIN_YEAR + 1}, (_, i) => MAX_YEAR - i)
  const HOURS = Array.from({length: 24}, (_, i) => i)
  const MINUTES = Array.from({length: 60}, (_, i) => i)

  if (isLoading || !user) return null

  return (
    <div className="min-h-screen" style={{ background: '#0a0a1a' }}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">

        {/* Account type card */}
        <div className="mb-8 rounded-2xl p-6" style={{ background: 'rgba(26,21,53,0.6)', border: `1px solid ${user.isPremium ? 'rgba(201,168,76,0.35)' : 'rgba(201,168,76,0.12)'}` }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: user.isPremium ? 'rgba(201,168,76,0.12)' : 'rgba(107,114,128,0.12)', border: `1px solid ${user.isPremium ? 'rgba(201,168,76,0.3)' : 'rgba(107,114,128,0.2)'}` }}
              >
                <span style={{ fontSize: '1.3rem' }}>{user.isPremium ? '✦' : '○'}</span>
              </div>
              <div>
                <p style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', marginBottom: '0.2rem' }}>Loại tài khoản</p>
                <p style={{ color: user.isPremium ? '#d9ab55' : '#94a3b8', fontFamily: 'var(--font-vietnam)', fontSize: '1.15rem', fontWeight: 700 }}>
                  {user.isPremium ? 'Premium ✦' : 'Miễn phí'}
                </p>
                {user.isPremium && (
                  <p style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                    Truy cập đầy đủ tất cả báo cáo chiêm tinh
                  </p>
                )}
              </div>
            </div>
            {!user.isPremium && (
              <button
                onClick={() => { setShowUpgrade(v => !v); setUpgradeError('') }}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm"
                style={{ background: 'linear-gradient(135deg, #c8943f, #f0cc78)', color: '#0a0a1a' }}
              >
                Nâng cấp tài khoản
              </button>
            )}
          </div>

          {!user.isPremium && showUpgrade && (
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(201,168,76,0.1)' }}>
              <p style={{ color: '#94a3b8', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem', marginBottom: '0.85rem' }}>
                Nhập mã nâng cấp để kích hoạt tài khoản Premium:
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={upgradeCode}
                  onChange={e => setUpgradeCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUpgrade()}
                  placeholder="Nhập mã nâng cấp..."
                  className="flex-1"
                  style={{ fontFamily: 'var(--font-vietnam)' }}
                />
                <button
                  onClick={handleUpgrade}
                  disabled={upgrading || !upgradeCode.trim()}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm"
                  style={{ background: upgradeCode.trim() ? '#c9a84c' : 'rgba(201,168,76,0.2)', color: upgradeCode.trim() ? '#0a0a1a' : '#6b7280', transition: 'all 0.2s' }}
                >
                  {upgrading ? 'Đang xử lý...' : 'Kích hoạt'}
                </button>
              </div>
              {upgradeError && (
                <p style={{ color: '#ef4444', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem', marginTop: '0.6rem' }}>
                  {upgradeError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Warning: no email */}
        {user && !user.email && (
          <div className="mb-6 p-4 rounded-xl text-sm" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24', fontFamily: 'var(--font-vietnam)' }}>
            ⚠️ Tài khoản chưa có email. Thêm email bên dưới để có thể đăng nhập bằng email và khôi phục mật khẩu.
          </div>
        )}

        {/* Thông tin tài khoản */}
        <div className="mb-8 rounded-2xl p-6" style={{ background: 'rgba(26,21,53,0.6)', border: '1px solid rgba(201,168,76,0.12)' }}>
          <h3 className="mb-4 font-bold" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>Thông tin tài khoản</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', letterSpacing: '0.05em' }}>TÊN ĐĂNG NHẬP</label>
              <div className="px-3 py-2.5 rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.1)', color: '#94a3b8', fontFamily: 'var(--font-vietnam)' }}>
                {user?.username}
              </div>
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', letterSpacing: '0.05em' }}>EMAIL</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={acEmail}
                  onChange={e => setAcEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="flex-1"
                  style={{ fontFamily: 'var(--font-vietnam)' }}
                />
                <button
                  onClick={handleUpdateAccount}
                  disabled={acLoading || !acEmail.trim()}
                  className="px-4 py-2 rounded-xl font-semibold text-sm"
                  style={{ background: acEmail.trim() ? 'linear-gradient(135deg, #c8943f, #f0cc78)' : 'rgba(201,168,76,0.15)', color: acEmail.trim() ? '#06060f' : '#6b7280', fontFamily: 'var(--font-vietnam)', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
                >
                  {acLoading ? 'Đang lưu...' : 'Lưu email'}
                </button>
              </div>
              {acError && <p className="mt-1.5 text-xs" style={{ color: '#e87070', fontFamily: 'var(--font-vietnam)' }}>{acError}</p>}
              {acSuccess && <p className="mt-1.5 text-xs" style={{ color: '#4ade80', fontFamily: 'var(--font-vietnam)' }}>Email đã được cập nhật! Bạn có thể dùng email này để đăng nhập.</p>}
            </div>
          </div>
        </div>

        {/* Đổi mật khẩu */}
        <div className="mb-8 rounded-2xl p-6" style={{ background: 'rgba(26,21,53,0.6)', border: '1px solid rgba(201,168,76,0.12)' }}>
          <div className="flex items-center justify-between">
            <h3 style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontWeight: 700 }}>Đổi mật khẩu</h3>
            <button onClick={() => { setShowChangePassword(!showChangePassword); setCpError(''); setCpSuccess(false) }}
              style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem' }}>
              {showChangePassword ? 'Hủy' : 'Đổi mật khẩu'}
            </button>
          </div>
          {showChangePassword && (
            <div className="mt-4 space-y-3">
              {cpError && <div style={{ color: '#e87070', fontSize: '0.85rem' }}>{cpError}</div>}
              {cpSuccess && <div style={{ color: '#4ade80', fontSize: '0.85rem' }}>Đổi mật khẩu thành công!</div>}
              <input type="password" value={cpNew} onChange={e => setCpNew(e.target.value)} placeholder="Mật khẩu mới" />
              <input type="password" value={cpConfirm} onChange={e => setCpConfirm(e.target.value)} placeholder="Xác nhận mật khẩu mới" />
              <button onClick={handleChangePassword} disabled={cpLoading}
                style={{ background: 'linear-gradient(135deg, #c8943f, #f0cc78)', color: '#06060f', padding: '0.6rem 1.5rem', borderRadius: '4px', fontFamily: 'var(--font-vietnam)', fontWeight: 700, fontSize: '0.85rem', opacity: cpLoading ? 0.7 : 1 }}>
                {cpLoading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
              </button>
            </div>
          )}
        </div>

        {/* ── Thêm bản đồ sao ── */}
        <div className="mb-8 rounded-2xl p-6" style={{ background: 'rgba(26,21,53,0.6)', border: '1px solid rgba(201,168,76,0.12)' }}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>Thêm bản đồ sao</h3>
            <button
              onClick={() => { if (showForm) { setShowForm(false) } else { openNew() } }}
              className="px-4 py-2 rounded-xl font-semibold text-sm"
              style={{ background: showForm ? 'rgba(107,114,128,0.15)' : '#c9a84c', color: showForm ? '#94a3b8' : '#0a0a1a', fontFamily: 'var(--font-vietnam)' }}
            >
              {showForm ? 'Hủy' : '+ Thêm'}
            </button>
          </div>

          {showForm && (
            <div className="mt-6">
              <div className="space-y-5">
                {/* Name fields */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm mb-1.5" style={{ color: '#94a3b8' }}>Họ</label>
                    <input type="text" value={form.ho} onChange={e => setF('ho', e.target.value)} placeholder="Nguyễn" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1.5" style={{ color: '#94a3b8' }}>Đệm</label>
                    <input type="text" value={form.dem} onChange={e => setF('dem', e.target.value)} placeholder="Văn" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1.5" style={{ color: '#94a3b8' }}>Tên <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="text" value={form.ten} onChange={e => setF('ten', e.target.value)} placeholder="An" />
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: '#94a3b8' }}>Giới tính</label>
                  <div className="flex gap-3">
                    {[{v:'Female',l:'♀ Nữ'},{v:'Male',l:'♂ Nam'},{v:'Other',l:'Khác'}].map(g => (
                      <button key={g.v} type="button" onClick={() => setF('gender', g.v)} className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                        style={{ background: form.gender === g.v ? '#3d2b5e' : 'rgba(26,21,53,0.8)', color: form.gender === g.v ? '#c9a84c' : '#94a3b8', border: form.gender === g.v ? '1px solid rgba(201,168,76,0.4)' : '1px solid rgba(201,168,76,0.1)' }}>
                        {g.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date of birth */}
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: '#94a3b8' }}>Ngày sinh</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: '#6b7280' }}>Ngày</label>
                      <select value={form.dob.day === 0 ? '' : form.dob.day} onChange={e => setF('dob', { ...form.dob, day: +e.target.value })}>
                        <option value="">-</option>
                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: '#6b7280' }}>Tháng</label>
                      <select value={form.dob.month === 0 ? '' : form.dob.month} onChange={e => setF('dob', { ...form.dob, month: +e.target.value })}>
                        <option value="">-</option>
                        {MONTHS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: '#6b7280' }}>Năm</label>
                      {yearMode === 'select' ? (
                        <select
                          value={form.dob.year === 0 ? '' : form.dob.year}
                          onChange={e => {
                            if (e.target.value === '__custom__') {
                              setYearMode('custom')
                              setCustomYearText('')
                            } else {
                              setF('dob', { ...form.dob, year: +e.target.value })
                            }
                          }}
                        >
                          <option value="">-</option>
                          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                          <option value="__custom__">Năm khác...</option>
                        </select>
                      ) : (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={customYearText}
                            onChange={e => { setCustomYearText(e.target.value); setYearError('') }}
                            placeholder="VD: 1850"
                            style={{ flex: 1, minWidth: 0 }}
                          />
                          <button
                            type="button"
                            onClick={() => { setYearMode('select'); setCustomYearText(''); setF('dob', { ...form.dob, year: 0 }); setYearError('') }}
                            style={{ color: '#6b7280', fontSize: '0.85rem', padding: '0 0.4rem', flexShrink: 0 }}
                          >✕</button>
                        </div>
                      )}
                      {yearError && <p style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '0.25rem', fontFamily: 'var(--font-vietnam)' }}>{yearError}</p>}
                    </div>
                  </div>
                </div>

                {/* Time of birth */}
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: '#94a3b8' }}>Giờ sinh</label>
                  <div className="flex items-center gap-3 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.tob.unknown} onChange={e => setF('tob', { ...form.tob, unknown: e.target.checked })} style={{ width: 'auto', padding: 0 }} />
                      <span className="text-sm" style={{ color: '#94a3b8' }}>Không rõ giờ sinh</span>
                    </label>
                  </div>
                  {!form.tob.unknown && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#6b7280' }}>Giờ (0–23)</label>
                        <select value={form.tob.hour === -1 ? '' : form.tob.hour} onChange={e => setF('tob', { ...form.tob, hour: +e.target.value })}>
                          <option value="">-</option>
                          {HOURS.map(h => <option key={h} value={h}>{String(h).padStart(2,'0')}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#6b7280' }}>Phút</label>
                        <select value={form.tob.minute === -1 ? '' : form.tob.minute} onChange={e => setF('tob', { ...form.tob, minute: +e.target.value })}>
                          <option value="">-</option>
                          {MINUTES.map(m => <option key={m} value={m}>{String(m).padStart(2,'0')}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <LocationPicker value={form.loc} onChange={v => setF('loc', v)} label="Nơi sinh" />

                {formError && (
                  <p style={{ color: '#ef4444', fontSize: '0.82rem', fontFamily: 'var(--font-vietnam)' }}>⚠ {formError}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl font-semibold" style={{ background: '#c9a84c', color: '#0a0a1a' }}>
                    {saving ? 'Đang lưu...' : 'Lưu hồ sơ'}
                  </button>
                  <button onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl font-semibold" style={{ background: 'rgba(107,114,128,0.15)', color: '#94a3b8' }}>
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Danh sách Bản đồ sao ── */}
        <div className="mb-8 rounded-2xl p-6" style={{ background: 'rgba(26,21,53,0.6)', border: '1px solid rgba(201,168,76,0.12)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>Danh sách Bản đồ sao</h3>
              <p className="text-xs mt-0.5" style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)' }}>{profiles.length} hồ sơ đã lưu</p>
            </div>
            <button
              onClick={() => router.push('/my-charts')}
              style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem' }}
            >
              Xem tất cả →
            </button>
          </div>

          {profiles.length === 0 ? (
            <div className="mt-4 text-center py-6 rounded-xl" style={{ border: '1px dashed rgba(201,168,76,0.15)' }}>
              <p style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem' }}>
                Chưa có hồ sơ nào. Nhấn &quot;+ Thêm&quot; bên trên để bắt đầu.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {profiles.slice(0, 3).map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 flex-wrap"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.08)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '0.92rem' }}>{p.name}</p>
                    <p style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', marginTop: '0.1rem' }}>
                      {p.gender === 'Female' ? '♀' : p.gender === 'Male' ? '♂' : '⊕'} · {p.dob.day}/{p.dob.month}/{p.dob.year} · {p.loc.address}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => router.push(`/chart?id=${p.id}`)}
                      className="px-2.5 py-1.5 rounded-lg text-xs"
                      style={{ color: '#d9ab55', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', fontFamily: 'var(--font-vietnam)' }}
                    >
                      Bản đồ ✦
                    </button>
                  </div>
                </div>
              ))}
              {profiles.length > 3 && (
                <p className="text-center text-xs pt-1" style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)' }}>
                  và {profiles.length - 3} hồ sơ khác — <button onClick={() => router.push('/my-charts')} style={{ color: '#d9ab55' }}>Xem tất cả →</button>
                </p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
