'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/contexts/AuthContext'
import LocationPicker from '@/components/profile/LocationPicker'

const LS_PROFILES = 'hatgiong_profiles'

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

function makeId() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }

function loadProfiles(): Profile[] {
  try { return JSON.parse(localStorage.getItem(LS_PROFILES) || '[]') } catch { return [] }
}
function saveProfiles(ps: Profile[]) { localStorage.setItem(LS_PROFILES, JSON.stringify(ps)) }

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

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login')
  }, [user, isLoading, router])

  useEffect(() => {
    setProfiles(loadProfiles())
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

  const handleSave = () => {
    if (!form.ten.trim()) return alert('Vui lòng nhập tên')
    setSaving(true)
    const name = [form.ho, form.dem, form.ten].filter(Boolean).join(' ')
    const updated = [...profiles]

    if (editingId) {
      const idx = updated.findIndex(p => p.id === editingId)
      if (idx >= 0) updated[idx] = { ...updated[idx], ...form, name }
    } else {
      updated.push({ id: makeId(), ...form, name, createdAt: new Date().toISOString() })
    }
    saveProfiles(updated)
    setProfiles(updated)
    setShowForm(false)
    setEditingId(null)
    setSaving(false)
  }

  const handleDelete = (id: string) => {
    const updated = profiles.filter(p => p.id !== id)
    saveProfiles(updated)
    setProfiles(updated)
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
              <button
                onClick={() => { sessionStorage.setItem('inputData', JSON.stringify({ name: p.name, gender: p.gender, dob: p.dob, tob: { hour: p.tob.unknown ? 12 : p.tob.hour, minute: p.tob.unknown ? 0 : p.tob.minute }, loc: p.loc })); router.push('/services') }}
                className="mt-4 w-full py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'rgba(61,43,94,0.6)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.2)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(61,43,94,0.9)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(61,43,94,0.6)')}>
                Chọn dịch vụ →
              </button>
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
