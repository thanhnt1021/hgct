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
  note?: string
  createdAt: string
}

const CUR_YEAR = new Date().getFullYear()

const MONTHS = [
  [1,'Tháng 1'],[2,'Tháng 2'],[3,'Tháng 3'],[4,'Tháng 4'],
  [5,'Tháng 5'],[6,'Tháng 6'],[7,'Tháng 7'],[8,'Tháng 8'],
  [9,'Tháng 9'],[10,'Tháng 10'],[11,'Tháng 11'],[12,'Tháng 12'],
] as [number, string][]
const DAYS = Array.from({length: 31}, (_, i) => i + 1)
const YEARS = Array.from({length: 101}, (_, i) => CUR_YEAR - i)
const HOURS = Array.from({length: 24}, (_, i) => i)
const MINUTES = Array.from({length: 60}, (_, i) => i)

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.25rem',
  color: 'var(--as-text)',
  fontFamily: 'var(--font-vietnam)',
  fontSize: '0.75rem',
  fontWeight: 500,
}

const subLabelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.25rem',
  color: 'var(--as-text-muted)',
  fontFamily: 'var(--font-vietnam)',
  fontSize: '0.75rem',
}

export default function MyChartsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<typeof EMPTY_FORM | null>(null)
  const [saving, setSaving] = useState(false)
  const [yearMode, setYearMode] = useState<'select' | 'custom'>('select')
  const [customYearText, setCustomYearText] = useState('')
  const [yearError, setYearError] = useState('')
  const [formError, setFormError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const EMPTY_FORM = {
    ho: '', dem: '', ten: '', gender: 'Female',
    dob: { day: 0, month: 0, year: 0 },
    tob: { hour: -1, minute: -1, unknown: false },
    loc: { address: 'Hà Nội, Việt Nam', lat: 21.0245, lon: 105.8412, tz: 'Asia/Ho_Chi_Minh' },
    note: '',
  }

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login?next=/my-charts')
  }, [user, isLoading, router])

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
            note: p.data?.note || '',
            createdAt: p.createdAt || '',
          })))
        }
      })
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false))
  }, [])

  const setF = (k: string, v: unknown) => setForm(f => f ? { ...f, [k]: v } : f)

  const openEdit = (p: Profile) => {
    const inRange = p.dob.year >= CUR_YEAR - 100 && p.dob.year <= CUR_YEAR
    setYearMode(inRange || p.dob.year === 0 ? 'select' : 'custom')
    setCustomYearText(inRange || p.dob.year === 0 ? '' : String(p.dob.year))
    setYearError('')
    setFormError('')
    setForm({ ho: p.ho, dem: p.dem, ten: p.ten, gender: p.gender, dob: p.dob, tob: p.tob, loc: p.loc, note: p.note || '' })
    setEditingId(p.id)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(null)
    setYearError('')
    setFormError('')
  }

  const handleSave = async () => {
    if (!form) return
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
    const body = {
      id: editingId, name, gender: form.gender,
      data: { dob: finalDob, tob: form.tob, loc: form.loc, ho: form.ho, dem: form.dem, ten: form.ten, note: form.note },
    }

    try {
      const res = await fetch('/api/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setProfiles(prev => prev.map(p => p.id === editingId
          ? { ...p, ...form, dob: finalDob, name }
          : p
        ))
        cancelEdit()
      }
    } catch { /* ignore */ }

    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/profiles?id=${id}`, { method: 'DELETE' })
    } catch { /* ignore */ }
    setProfiles(prev => prev.filter(p => p.id !== id))
    setDeleteConfirm(null)
  }

  if (isLoading || !user) return null

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #edd5b1 0%, #e3c89a 100%)' }}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">

        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => router.push('/profile')}
            style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem' }}
          >
            ← Hồ sơ
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--as-text-strong)', fontFamily: 'var(--font-playfair)' }}>
              Danh sách Bản đồ sao
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)' }}>
              {profiles.length} hồ sơ đã lưu
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--as-border-soft)', borderTopColor: 'var(--as-cta)' }} />
          </div>
        )}

        {/* Empty state */}
        {!loading && profiles.length === 0 && (
          <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--as-surface)', border: '1px dashed var(--as-border-soft)', boxShadow: 'var(--as-shadow-card)' }}>
            <p style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', marginBottom: '1rem' }}>
              Chưa có hồ sơ nào.
            </p>
            <button
              onClick={() => router.push('/profile')}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--as-cta)', color: 'var(--as-text-on-dark)', fontFamily: 'var(--font-vietnam)', borderRadius: '999px', boxShadow: 'var(--as-shadow-glow)' }}
            >
              + Thêm bản đồ sao
            </button>
          </div>
        )}

        {/* Profile list */}
        {!loading && profiles.length > 0 && (
          <div className="space-y-4">
            {profiles.map(p => (
              <div key={p.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--as-surface)', border: editingId === p.id ? '1px solid var(--as-border-gold)' : '1px solid var(--as-border-soft)', boxShadow: 'var(--as-shadow-card)' }}>
                {/* Row */}
                <div className="flex items-center gap-3 px-5 py-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold" style={{ color: 'var(--as-text-strong)', fontFamily: 'var(--font-vietnam)', fontSize: '0.95rem' }}>{p.name}</p>
                    <p style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                      {p.gender === 'Female' ? '♀' : p.gender === 'Male' ? '♂' : '⊕'} ·{' '}
                      {p.dob.day > 0 && p.dob.month > 0 && p.dob.year > 0
                        ? `${p.dob.day}/${p.dob.month}/${p.dob.year}`
                        : 'Chưa có ngày sinh'} ·{' '}
                      {p.tob.unknown ? 'Không rõ giờ' : (p.tob.hour >= 0 && p.tob.minute >= 0) ? `${String(p.tob.hour).padStart(2,'0')}:${String(p.tob.minute).padStart(2,'0')}` : 'Chưa có giờ'} ·{' '}
                      {p.loc.address}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
                    <button
                      onClick={() => editingId === p.id ? cancelEdit() : openEdit(p)}
                      className="px-2.5 py-1.5 rounded-lg text-xs"
                      style={{ color: editingId === p.id ? 'var(--as-text-muted)' : 'var(--as-cta)', background: editingId === p.id ? 'rgba(22,54,83,0.06)' : 'rgba(22,54,83,0.07)', fontFamily: 'var(--font-vietnam)' }}
                    >
                      {editingId === p.id ? 'Hủy' : 'Sửa'}
                    </button>
                    {deleteConfirm === p.id ? (
                      <>
                        <button onClick={() => handleDelete(p.id)} className="px-2.5 py-1.5 rounded-lg text-xs" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', fontFamily: 'var(--font-vietnam)' }}>Xác nhận xóa</button>
                        <button onClick={() => setDeleteConfirm(null)} className="px-2.5 py-1.5 rounded-lg text-xs" style={{ color: 'var(--as-text-muted)', background: 'rgba(22,54,83,0.06)', fontFamily: 'var(--font-vietnam)' }}>Hủy</button>
                      </>
                    ) : (
                      <button onClick={() => setDeleteConfirm(p.id)} className="px-2.5 py-1.5 rounded-lg text-xs" style={{ color: 'var(--as-text-muted)', background: 'rgba(22,54,83,0.06)', fontFamily: 'var(--font-vietnam)' }}>Xóa</button>
                    )}
                    <button
                      onClick={() => { sessionStorage.setItem('inputData', JSON.stringify({ name: p.name, gender: p.gender, dob: p.dob, tob: { hour: p.tob.unknown ? 12 : (p.tob.hour >= 0 ? p.tob.hour : 12), minute: p.tob.unknown ? 0 : (p.tob.minute >= 0 ? p.tob.minute : 0) }, loc: p.loc })); router.push('/services') }}
                      className="px-2.5 py-1.5 rounded-lg text-xs"
                      style={{ color: 'var(--as-cta)', background: 'rgba(22,54,83,0.07)', border: '1px solid var(--as-border-soft)', fontFamily: 'var(--font-vietnam)' }}
                    >
                      Dịch vụ
                    </button>
                    <button
                      onClick={() => router.push(`/chart?id=${p.id}`)}
                      className="px-2.5 py-1.5 rounded-lg text-xs"
                      style={{ color: 'var(--as-text-on-dark)', background: 'var(--as-cta)', border: '1px solid var(--as-border-soft)', fontFamily: 'var(--font-vietnam)' }}
                    >
                      Bản đồ ✦
                    </button>
                  </div>
                </div>

                {/* Inline edit form */}
                {editingId === p.id && form && (
                  <div className="px-5 pb-5 pt-2 as-form" style={{ borderTop: '1px solid var(--as-border-soft)' }}>
                    <div className="space-y-4 form-compact">

                      {/* Row 1: Name + Gender same row */}
                      <div className="grid gap-3 items-end" style={{ gridTemplateColumns: '1fr auto' }}>
                        <div>
                          <label style={labelStyle}>Họ và tên</label>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label style={subLabelStyle}>Họ</label>
                              <input type="text" value={form.ho} onChange={e => setF('ho', e.target.value)} placeholder="Nguyễn" />
                            </div>
                            <div>
                              <label style={subLabelStyle}>Đệm</label>
                              <input type="text" value={form.dem} onChange={e => setF('dem', e.target.value)} placeholder="Văn" />
                            </div>
                            <div>
                              <label style={subLabelStyle}>Tên <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" value={form.ten} onChange={e => setF('ten', e.target.value)} placeholder="An" />
                            </div>
                          </div>
                        </div>
                        <div style={{ width: '5.5rem' }}>
                          <label style={labelStyle}>Giới tính</label>
                          <select value={form.gender} onChange={e => setF('gender', e.target.value)}>
                            <option value="Female">Nữ</option>
                            <option value="Male">Nam</option>
                            <option value="Other">Khác</option>
                          </select>
                        </div>
                      </div>

                      {/* Row 2: Date + Time same row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {/* Date */}
                        <div>
                          <label style={labelStyle}>Ngày sinh</label>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label style={subLabelStyle}>Ngày</label>
                              <select value={form.dob.day === 0 ? '' : form.dob.day} onChange={e => setF('dob', { ...form.dob, day: +e.target.value })}>
                                <option value="">-</option>
                                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={subLabelStyle}>Tháng</label>
                              <select value={form.dob.month === 0 ? '' : form.dob.month} onChange={e => setF('dob', { ...form.dob, month: +e.target.value })}>
                                <option value="">-</option>
                                {MONTHS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={subLabelStyle}>Năm</label>
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
                                  <option value="__custom__">Năm khác...</option>
                                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
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
                                    style={{ color: 'var(--as-text-muted)', fontSize: '0.85rem', padding: '0 0.4rem', flexShrink: 0 }}
                                  >✕</button>
                                </div>
                              )}
                              {yearError && <p style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '0.25rem', fontFamily: 'var(--font-vietnam)' }}>{yearError}</p>}
                            </div>
                          </div>
                        </div>

                        {/* Time */}
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <label style={{ ...labelStyle, marginBottom: 0 }}>Giờ sinh</label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input type="checkbox" checked={form.tob.unknown} onChange={e => setF('tob', { ...form.tob, unknown: e.target.checked })} style={{ width: '1rem', height: '1rem', padding: 0 }} />
                              <span style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem' }}>Không rõ</span>
                            </label>
                          </div>
                          {!form.tob.unknown && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label style={subLabelStyle}>Giờ (0–23)</label>
                                <select value={form.tob.hour === -1 ? '' : form.tob.hour} onChange={e => setF('tob', { ...form.tob, hour: +e.target.value })}>
                                  <option value="">-</option>
                                  {HOURS.map(h => <option key={h} value={h}>{String(h).padStart(2,'0')}</option>)}
                                </select>
                              </div>
                              <div>
                                <label style={subLabelStyle}>Phút</label>
                                <select value={form.tob.minute === -1 ? '' : form.tob.minute} onChange={e => setF('tob', { ...form.tob, minute: +e.target.value })}>
                                  <option value="">-</option>
                                  {MINUTES.map(m => <option key={m} value={m}>{String(m).padStart(2,'0')}</option>)}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Location */}
                      <LocationPicker value={form.loc} onChange={v => setF('loc', v)} label="Nơi sinh" />

                      {/* Note */}
                      <div>
                        <label style={labelStyle}>
                          Biệt danh / Ghi chú{' '}
                          <span style={{ color: 'var(--as-text-muted)', fontSize: '0.7rem', fontWeight: 400 }}>(tuỳ chọn)</span>
                        </label>
                        <input
                          type="text"
                          value={form.note || ''}
                          onChange={e => setF('note', e.target.value)}
                          placeholder="VD: Anh trai, bạn thân Mai..."
                          maxLength={120}
                        />
                      </div>

                      {formError && (
                        <p style={{ color: '#ef4444', fontSize: '0.82rem', fontFamily: 'var(--font-vietnam)' }}>⚠ {formError}</p>
                      )}

                      <div className="flex gap-3 pt-1">
                        <button onClick={handleSave} disabled={saving} className="flex-1 h-9 rounded-lg font-semibold" style={{ background: 'var(--as-cta)', color: 'var(--as-text-on-dark)', fontFamily: 'var(--font-vietnam)', borderRadius: '999px', boxShadow: 'var(--as-shadow-glow)', opacity: saving ? 0.7 : 1 }}>
                          {saving ? 'Đang lưu...' : 'Cập nhật hồ sơ'}
                        </button>
                        <button onClick={cancelEdit} className="px-6 h-9 rounded-lg font-semibold" style={{ background: 'rgba(22,54,83,0.06)', color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)' }}>
                          Hủy
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add button at bottom */}
        {!loading && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => router.push('/profile')}
              className="px-6 py-3 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--as-cta)', color: 'var(--as-text-on-dark)', border: 'none', fontFamily: 'var(--font-vietnam)', borderRadius: '999px', boxShadow: 'var(--as-shadow-glow)' }}
            >
              + Thêm bản đồ sao mới
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
