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

const EMPTY_FORM = {
  ho: '', dem: '', ten: '', gender: 'Female',
  dob: { day: 1, month: 1, year: 1990 },
  tob: { hour: 12, minute: 0, unknown: false },
  loc: { address: 'Hà Nội, Việt Nam', lat: 21.0245, lon: 105.8412, tz: 'Asia/Ho_Chi_Minh' },
}

export default function ProfilePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { upgradeToPremium } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
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
            dob: p.data?.dob || { day: 1, month: 1, year: 1990 },
            tob: p.data?.tob || { hour: 12, minute: 0, unknown: false },
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
    setEditingId(null)
    setShowForm(true)
  }

  const openEdit = (p: Profile) => {
    setForm({ ho: p.ho, dem: p.dem, ten: p.ten, gender: p.gender, dob: p.dob, tob: p.tob, loc: p.loc })
    setEditingId(p.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.ten.trim()) return alert('Vui lòng nhập tên')
    setSaving(true)
    const name = [form.ho, form.dem, form.ten].filter(Boolean).join(' ')
    const body = { name, gender: form.gender, data: { dob: form.dob, tob: form.tob, loc: form.loc, ho: form.ho, dem: form.dem, ten: form.ten } }

    try {
      if (editingId) {
        const res = await fetch('/api/profiles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...body }),
        })
        const data = await res.json()
        if (res.ok && data.profile) {
          setProfiles(prev => prev.map(p => p.id === editingId ? { ...p, ...form, name } : p))
        }
      } else {
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
            dob: p.data?.dob || form.dob,
            tob: p.data?.tob || form.tob,
            loc: p.data?.loc || form.loc,
            createdAt: p.createdAt || '',
          }, ...prev])
        }
      }
    } catch { /* ignore */ }

    setShowForm(false)
    setEditingId(null)
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/profiles?id=${id}`, { method: 'DELETE' })
    } catch { /* ignore */ }
    setProfiles(prev => prev.filter(p => p.id !== id))
    setDeleteConfirm(null)
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

  const MONTHS = ['1','2','3','4','5','6','7','8','9','10','11','12']
  const DAYS = Array.from({length: 31}, (_, i) => String(i + 1))
  const YEARS = Array.from({length: 100}, (_, i) => String(2010 - i))

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

          {/* Upgrade form */}
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

        {/* Bản đồ sao */}
        <div className="mb-8 rounded-2xl p-6" style={{ background: 'rgba(26,21,53,0.6)', border: '1px solid rgba(201,168,76,0.12)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>Bản đồ sao</h3>
            <a href="/chart" style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem' }}>Xem tất cả →</a>
          </div>
          {profiles.length === 0 ? (
            <p style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem' }}>
              Chưa có hồ sơ nào. Tạo hồ sơ để xem bản đồ sao.
            </p>
          ) : (
            <div className="space-y-2">
              {profiles.map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.08)' }}
                >
                  <div>
                    <p className="font-semibold" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '0.92rem' }}>{p.name}</p>
                    <p style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', marginTop: '0.1rem' }}>
                      {p.dob.day}/{p.dob.month}/{p.dob.year} · {p.loc.address}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/chart?id=${p.id}`)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'rgba(201,168,76,0.1)', color: '#d9ab55', border: '1px solid rgba(201,168,76,0.2)', fontFamily: 'var(--font-vietnam)' }}
                  >
                    Xem bản đồ →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#f5f0e8', fontFamily: 'var(--font-vietnam)' }}>Hồ sơ của tôi</h1>
            <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>Xin chào, {user.name}</p>
          </div>
          <button onClick={openNew} className="px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2" style={{ background: '#c9a84c', color: '#0a0a1a' }}>
            <span>+</span> Thêm hồ sơ
          </button>
        </div>

        {/* Profile cards */}
        {profiles.length === 0 && !showForm && (
          <div className="text-center py-16 rounded-2xl" style={{ border: '1px dashed rgba(201,168,76,0.2)' }}>
            <p className="text-lg mb-2" style={{ color: '#94a3b8' }}>Chưa có hồ sơ nào</p>
            <p className="text-sm mb-6" style={{ color: '#6b7280' }}>Tạo hồ sơ để lưu thông tin sinh nhật và sử dụng cho các báo cáo chiêm tinh</p>
            <button onClick={openNew} className="px-6 py-3 rounded-xl font-semibold" style={{ background: '#c9a84c', color: '#0a0a1a' }}>
              Tạo hồ sơ đầu tiên
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {profiles.map(p => (
            <div key={p.id} className="rounded-2xl p-6" style={{ background: 'rgba(26,21,53,0.6)', border: '1px solid rgba(201,168,76,0.15)' }}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg" style={{ color: '#f5f0e8', fontFamily: 'var(--font-vietnam)' }}>{p.name}</h3>
                  <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{p.gender === 'Female' ? '♀ Nữ' : p.gender === 'Male' ? '♂ Nam' : '⊕ Khác'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-xs" style={{ color: '#c9a84c', background: 'rgba(201,168,76,0.1)' }}>Sửa</button>
                  {deleteConfirm === p.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-xs" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>Xác nhận</button>
                      <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-lg text-xs" style={{ color: '#94a3b8', background: 'rgba(148,163,184,0.1)' }}>Hủy</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 rounded-lg text-xs" style={{ color: '#6b7280', background: 'rgba(107,114,128,0.1)' }}>Xóa</button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 text-sm" style={{ color: '#94a3b8' }}>
                <p>📅 {p.dob.day}/{p.dob.month}/{p.dob.year} · {p.tob.unknown ? 'Không rõ giờ' : `${String(p.tob.hour).padStart(2,'0')}:${String(p.tob.minute).padStart(2,'0')}`}</p>
                <p>📍 {p.loc.address}</p>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { sessionStorage.setItem('inputData', JSON.stringify({ name: p.name, gender: p.gender, dob: p.dob, tob: { hour: p.tob.unknown ? 12 : p.tob.hour, minute: p.tob.unknown ? 0 : p.tob.minute }, loc: p.loc })); router.push('/services') }}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: 'rgba(61,43,94,0.6)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.2)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(61,43,94,0.9)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(61,43,94,0.6)')}>
                  Chọn dịch vụ →
                </button>
                <button
                  onClick={() => router.push(`/chart?id=${p.id}`)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: 'rgba(201,168,76,0.08)', color: '#d9ab55', border: '1px solid rgba(201,168,76,0.15)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.18)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.08)')}>
                  Bản đồ sao ✦
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add/Edit form */}
        {showForm && (
          <div className="rounded-2xl p-6" style={{ background: 'rgba(26,21,53,0.8)', border: '1px solid rgba(201,168,76,0.25)' }}>
            <h2 className="text-xl font-bold mb-6" style={{ color: '#f5f0e8', fontFamily: 'var(--font-vietnam)' }}>
              {editingId ? 'Chỉnh sửa hồ sơ' : 'Tạo hồ sơ mới'}
            </h2>

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
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: '#6b7280' }}>Ngày</label>
                    <select value={form.dob.day} onChange={e => setF('dob', { ...form.dob, day: +e.target.value })}>
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: '#6b7280' }}>Tháng</label>
                    <select value={form.dob.month} onChange={e => setF('dob', { ...form.dob, month: +e.target.value })}>
                      {MONTHS.map(m => <option key={m} value={m}>Tháng {m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: '#6b7280' }}>Năm</label>
                    <select value={form.dob.year} onChange={e => setF('dob', { ...form.dob, year: +e.target.value })}>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Time of birth */}
              <div>
                <label className="block text-sm mb-1.5" style={{ color: '#94a3b8' }}>Giờ sinh</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.tob.unknown} onChange={e => setF('tob', { ...form.tob, unknown: e.target.checked })} style={{ width: 'auto', padding: 0 }} />
                    <span className="text-sm" style={{ color: '#94a3b8' }}>Không rõ giờ sinh</span>
                  </label>
                </div>
                {!form.tob.unknown && (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: '#6b7280' }}>Giờ (0-23)</label>
                      <input type="number" min={0} max={23} value={form.tob.hour} onChange={e => setF('tob', { ...form.tob, hour: +e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: '#6b7280' }}>Phút</label>
                      <input type="number" min={0} max={59} value={form.tob.minute} onChange={e => setF('tob', { ...form.tob, minute: +e.target.value })} />
                    </div>
                  </div>
                )}
              </div>

              {/* Location */}
              <LocationPicker value={form.loc} onChange={v => setF('loc', v)} label="Nơi sinh" />

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl font-semibold" style={{ background: '#c9a84c', color: '#0a0a1a' }}>
                  {saving ? 'Đang lưu...' : editingId ? 'Cập nhật hồ sơ' : 'Lưu hồ sơ'}
                </button>
                <button onClick={() => { setShowForm(false); setEditingId(null) }} className="px-6 py-3 rounded-xl font-semibold" style={{ background: 'rgba(107,114,128,0.15)', color: '#94a3b8' }}>
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
