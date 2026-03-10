'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import LocationPicker from './LocationPicker'
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X } from 'lucide-react'

interface Profile {
  id: string
  ho: string; dem: string; ten: string; name: string; gender: string
  dob: { day: number; month: number; year: number }
  tob: { hour: number; minute: number; unknown: boolean }
  loc: { address: string; lat: number; lon: number; tz: string }
  createdAt: string
}

const CUR_YEAR = new Date().getFullYear()
const MAX_YEAR = CUR_YEAR + 100
const MIN_YEAR = 1911
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

const MONTHS = [
  [1,'Tháng 1'],[2,'Tháng 2'],[3,'Tháng 3'],[4,'Tháng 4'],
  [5,'Tháng 5'],[6,'Tháng 6'],[7,'Tháng 7'],[8,'Tháng 8'],
  [9,'Tháng 9'],[10,'Tháng 10'],[11,'Tháng 11'],[12,'Tháng 12'],
] as [number, string][]
const DAYS = Array.from({length: 31}, (_, i) => i + 1)
const YEARS = Array.from({length: MAX_YEAR - MIN_YEAR + 1}, (_, i) => MAX_YEAR - i)
const HOURS = Array.from({length: 24}, (_, i) => i)
const MINUTES = Array.from({length: 60}, (_, i) => i)

const EMPTY_FORM = {
  ho: '', dem: '', ten: '', gender: 'Female',
  dob: { day: 0, month: 0, year: 0 },
  tob: { hour: -1, minute: -1, unknown: false },
  loc: { address: 'Hà Nội, Việt Nam', lat: 21.0245, lon: 105.8412, tz: 'Asia/Ho_Chi_Minh' },
}

export default function ChartList() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [pendingPageSize, setPendingPageSize] = useState(10)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [yearMode, setYearMode] = useState<'select' | 'custom'>('select')
  const [customYearText, setCustomYearText] = useState('')
  const [yearError, setYearError] = useState('')
  const [formError, setFormError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/profiles')
      .then(r => r.json())
      .then(data => {
        if (data.profiles) {
          setProfiles(data.profiles.map((p: any) => ({
            id: String(p.id),
            ho: p.data?.ho || '', dem: p.data?.dem || '',
            ten: p.data?.ten || p.name, name: p.name,
            gender: p.gender || 'Female',
            dob: p.data?.dob || { day: 0, month: 0, year: 0 },
            tob: p.data?.tob || { hour: -1, minute: -1, unknown: false },
            loc: p.data?.loc || { address: 'Hà Nội', lat: 21.02, lon: 105.84, tz: 'Asia/Ho_Chi_Minh' },
            createdAt: p.createdAt || '',
          })))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [modalOpen])

  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const openNew = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setYearMode('select'); setCustomYearText(''); setYearError(''); setFormError('')
    setModalOpen(true)
  }

  const openEdit = (p: Profile) => {
    const inRange = p.dob.year >= MIN_YEAR && p.dob.year <= MAX_YEAR
    setYearMode(inRange || p.dob.year === 0 ? 'select' : 'custom')
    setCustomYearText(inRange || p.dob.year === 0 ? '' : String(p.dob.year))
    setYearError(''); setFormError('')
    setForm({ ho: p.ho, dem: p.dem, ten: p.ten, gender: p.gender, dob: p.dob, tob: p.tob, loc: p.loc })
    setEditingId(p.id)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setFormError(''); setYearError('')
  }

  const handleSave = async () => {
    setFormError(''); setYearError('')
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
      setFormError('Vui lòng chọn năm sinh'); return
    }
    if (!form.tob.unknown && (form.tob.hour === -1 || form.tob.minute === -1)) {
      setFormError('Vui lòng chọn giờ và phút sinh (hoặc tích "Không rõ giờ sinh")'); return
    }

    setSaving(true)
    const finalDob = { ...form.dob, year: finalYear }
    const name = [form.ho, form.dem, form.ten].filter(Boolean).join(' ')
    const body = { name, gender: form.gender, data: { dob: finalDob, tob: form.tob, loc: form.loc, ho: form.ho, dem: form.dem, ten: form.ten } }

    try {
      if (editingId) {
        const res = await fetch('/api/profiles', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...body }),
        })
        if (res.ok) {
          setProfiles(prev => prev.map(p => p.id === editingId ? { ...p, ...form, dob: finalDob, name } : p))
          closeModal()
        }
      } else {
        const res = await fetch('/api/profiles', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (res.ok && data.profile) {
          const p = data.profile
          setProfiles(prev => [{
            id: String(p.id), ho: p.data?.ho || '', dem: p.data?.dem || '',
            ten: p.data?.ten || p.name, name: p.name, gender: p.gender || 'Female',
            dob: p.data?.dob || finalDob, tob: p.data?.tob || form.tob,
            loc: p.data?.loc || form.loc, createdAt: p.createdAt || '',
          }, ...prev])
          closeModal()
        }
      }
    } catch { /* ignore */ }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    try { await fetch(`/api/profiles?id=${id}`, { method: 'DELETE' }) } catch { /* ignore */ }
    setProfiles(prev => prev.filter(p => p.id !== id))
    setDeleteConfirm(null)
  }

  const applyPageSize = () => {
    setPageSize(pendingPageSize)
    setPage(0)
  }

  const totalPages = Math.ceil(profiles.length / pageSize)
  const paginated = profiles.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>Bản đồ sao</h2>
          {profiles.length > 0 && (
            <p className="text-sm mt-0.5" style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)' }}>
              {profiles.length} hồ sơ đã lưu
            </p>
          )}
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm"
          style={{ background: '#c9a84c', color: '#0a0a1a', fontFamily: 'var(--font-vietnam)' }}
        >
          <Plus size={15} /> Thêm hồ sơ
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(201,168,76,0.2)', borderTopColor: '#c9a84c' }} />
        </div>
      )}

      {/* Empty */}
      {!loading && profiles.length === 0 && (
        <div className="text-center py-12 rounded-2xl" style={{ border: '1px dashed rgba(201,168,76,0.15)' }}>
          <p style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', marginBottom: '1rem' }}>Chưa có hồ sơ nào.</p>
          <button onClick={openNew} className="px-5 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: '#c9a84c', color: '#0a0a1a', fontFamily: 'var(--font-vietnam)' }}>
            + Tạo hồ sơ đầu tiên
          </button>
        </div>
      )}

      {/* Profile list */}
      {!loading && paginated.length > 0 && (
        <div className="space-y-2">
          {paginated.map(p => (
            <div key={p.id} className="rounded-xl flex items-center gap-3 px-4 py-3 flex-wrap"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.08)' }}>
              {/* Gender icon */}
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(61,43,94,0.5)', fontSize: '0.9rem' }}>
                {p.gender === 'Female' ? '♀' : p.gender === 'Male' ? '♂' : '⊕'}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem' }}>{p.name}</p>
                <p style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', marginTop: '0.1rem' }}>
                  {p.dob.day > 0 ? `${p.dob.day}/${p.dob.month}/${p.dob.year}` : 'Chưa có ngày'} ·{' '}
                  {p.tob.unknown ? 'Không rõ giờ' : p.tob.hour >= 0 ? `${String(p.tob.hour).padStart(2,'0')}:${String(p.tob.minute).padStart(2,'0')}` : 'Chưa có giờ'} ·{' '}
                  {p.loc.address}
                </p>
              </div>
              {/* Actions */}
              <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
                <button onClick={() => router.push(`/chart?id=${p.id}`)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ color: '#d9ab55', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', fontFamily: 'var(--font-vietnam)' }}>
                  Bản đồ ✦
                </button>
                <button
                  onClick={() => { sessionStorage.setItem('inputData', JSON.stringify({ name: p.name, gender: p.gender, dob: p.dob, tob: { hour: p.tob.unknown ? 12 : (p.tob.hour >= 0 ? p.tob.hour : 12), minute: p.tob.unknown ? 0 : (p.tob.minute >= 0 ? p.tob.minute : 0) }, loc: p.loc })); router.push('/services') }}
                  className="px-2.5 py-1.5 rounded-lg text-xs"
                  style={{ color: '#c9a84c', background: 'rgba(61,43,94,0.5)', border: '1px solid rgba(201,168,76,0.15)', fontFamily: 'var(--font-vietnam)' }}>
                  Dịch vụ
                </button>
                <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg"
                  style={{ color: '#c9a84c', background: 'rgba(201,168,76,0.08)' }} title="Sửa">
                  <Pencil size={13} />
                </button>
                {deleteConfirm === p.id ? (
                  <>
                    <button onClick={() => handleDelete(p.id)} className="px-2.5 py-1.5 rounded-lg text-xs"
                      style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', fontFamily: 'var(--font-vietnam)' }}>Xác nhận</button>
                    <button onClick={() => setDeleteConfirm(null)} className="px-2.5 py-1.5 rounded-lg text-xs"
                      style={{ color: '#94a3b8', background: 'rgba(148,163,184,0.08)', fontFamily: 'var(--font-vietnam)' }}>Hủy</button>
                  </>
                ) : (
                  <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 rounded-lg"
                    style={{ color: '#6b7280', background: 'rgba(107,114,128,0.08)' }} title="Xóa">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer: page size + pagination */}
      {!loading && profiles.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3 mt-5">
          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <span style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.8rem' }}>Hiển thị:</span>
            <select
              value={pendingPageSize}
              onChange={e => setPendingPageSize(+e.target.value)}
              style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.82rem', fontFamily: 'var(--font-vietnam)' }}
            >
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {pendingPageSize !== pageSize && (
              <button
                onClick={applyPageSize}
                className="px-3 py-1 rounded-lg text-xs font-semibold"
                style={{ background: '#c9a84c', color: '#0a0a1a', fontFamily: 'var(--font-vietnam)' }}
              >
                Áp dụng
              </button>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm"
                style={{ color: page === 0 ? '#4a4560' : '#d9ab55', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.1)' }}>
                <ChevronLeft size={14} /> Trước
              </button>
              <span style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem' }}>
                {page + 1} / {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm"
                style={{ color: page >= totalPages - 1 ? '#4a4560' : '#d9ab55', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.1)' }}>
                Sau <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Floating Modal ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div
            className="w-full max-h-[90vh] overflow-y-auto rounded-2xl"
            style={{
              maxWidth: 560,
              background: 'rgba(16,12,38,0.98)',
              border: '1px solid rgba(201,168,76,0.25)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4"
              style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
              <h3 className="font-bold text-lg" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>
                {editingId ? 'Chỉnh sửa hồ sơ' : 'Thêm hồ sơ mới'}
              </h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg transition-colors"
                style={{ color: '#6b7280', background: 'rgba(255,255,255,0.05)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-5">
              {/* Name */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Họ</label>
                  <input type="text" value={form.ho} onChange={e => setF('ho', e.target.value)} placeholder="Nguyễn" />
                </div>
                <div>
                  <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Đệm</label>
                  <input type="text" value={form.dem} onChange={e => setF('dem', e.target.value)} placeholder="Văn" />
                </div>
                <div>
                  <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Tên <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" value={form.ten} onChange={e => setF('ten', e.target.value)} placeholder="An" />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm mb-1.5" style={{ color: '#94a3b8' }}>Giới tính</label>
                <div className="flex gap-2 flex-wrap">
                  {[{v:'Female',l:'♀ Nữ'},{v:'Male',l:'♂ Nam'},{v:'Other',l:'Khác'}].map(g => (
                    <button key={g.v} type="button" onClick={() => setF('gender', g.v)}
                      className="px-3 py-2 rounded-xl text-sm transition-all"
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
                    <select value={form.dob.day === 0 ? '' : form.dob.day}
                      onChange={e => setF('dob', { ...form.dob, day: +e.target.value })}>
                      <option value="">-</option>
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: '#6b7280' }}>Tháng</label>
                    <select value={form.dob.month === 0 ? '' : form.dob.month}
                      onChange={e => setF('dob', { ...form.dob, month: +e.target.value })}>
                      <option value="">-</option>
                      {MONTHS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: '#6b7280' }}>Năm</label>
                    {yearMode === 'select' ? (
                      <select value={form.dob.year === 0 ? '' : form.dob.year}
                        onChange={e => {
                          if (e.target.value === '__custom__') { setYearMode('custom'); setCustomYearText('') }
                          else setF('dob', { ...form.dob, year: +e.target.value })
                        }}>
                        <option value="">-</option>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        <option value="__custom__">Năm khác...</option>
                      </select>
                    ) : (
                      <div className="flex gap-1">
                        <input type="text" value={customYearText}
                          onChange={e => { setCustomYearText(e.target.value); setYearError('') }}
                          placeholder="VD: 1850" style={{ flex: 1, minWidth: 0 }} />
                        <button type="button"
                          onClick={() => { setYearMode('select'); setCustomYearText(''); setF('dob', { ...form.dob, year: 0 }); setYearError('') }}
                          style={{ color: '#6b7280', fontSize: '0.85rem', padding: '0 0.4rem', flexShrink: 0 }}>✕</button>
                      </div>
                    )}
                    {yearError && <p style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '0.2rem' }}>{yearError}</p>}
                  </div>
                </div>
              </div>

              {/* Time of birth */}
              <div>
                <label className="block text-sm mb-1.5" style={{ color: '#94a3b8' }}>Giờ sinh</label>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input type="checkbox" checked={form.tob.unknown}
                    onChange={e => setF('tob', { ...form.tob, unknown: e.target.checked })}
                    style={{ width: 'auto', padding: 0 }} />
                  <span className="text-sm" style={{ color: '#94a3b8' }}>Không rõ giờ sinh</span>
                </label>
                {!form.tob.unknown && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: '#6b7280' }}>Giờ (0–23)</label>
                      <select value={form.tob.hour === -1 ? '' : form.tob.hour}
                        onChange={e => setF('tob', { ...form.tob, hour: +e.target.value })}>
                        <option value="">-</option>
                        {HOURS.map(h => <option key={h} value={h}>{String(h).padStart(2,'0')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: '#6b7280' }}>Phút</label>
                      <select value={form.tob.minute === -1 ? '' : form.tob.minute}
                        onChange={e => setF('tob', { ...form.tob, minute: +e.target.value })}>
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
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl font-semibold"
                style={{ background: '#c9a84c', color: '#0a0a1a', fontFamily: 'var(--font-vietnam)', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Đang lưu...' : editingId ? 'Cập nhật hồ sơ' : 'Lưu hồ sơ'}
              </button>
              <button onClick={closeModal} className="px-6 py-3 rounded-xl font-semibold"
                style={{ background: 'rgba(107,114,128,0.15)', color: '#94a3b8', fontFamily: 'var(--font-vietnam)' }}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
