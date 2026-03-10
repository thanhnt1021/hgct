'use client'

import { useEffect, useState } from 'react'
import LocationPicker from './LocationPicker'
import { X } from 'lucide-react'

export interface ProfileFormData {
  ho: string; dem: string; ten: string; gender: string
  dob: { day: number; month: number; year: number }
  tob: { hour: number; minute: number; unknown: boolean }
  loc: { address: string; lat: number; lon: number; tz: string }
}

export const EMPTY_PROFILE_FORM: ProfileFormData = {
  ho: '', dem: '', ten: '', gender: 'Female',
  dob: { day: 0, month: 0, year: 0 },
  tob: { hour: -1, minute: -1, unknown: false },
  loc: { address: 'Hà Nội, Việt Nam', lat: 21.0245, lon: 105.8412, tz: 'Asia/Ho_Chi_Minh' },
}

const CUR_YEAR = new Date().getFullYear()
const MAX_YEAR = CUR_YEAR + 100
const MIN_YEAR = 1911

const MONTHS = [
  [1,'Tháng 1'],[2,'Tháng 2'],[3,'Tháng 3'],[4,'Tháng 4'],
  [5,'Tháng 5'],[6,'Tháng 6'],[7,'Tháng 7'],[8,'Tháng 8'],
  [9,'Tháng 9'],[10,'Tháng 10'],[11,'Tháng 11'],[12,'Tháng 12'],
] as [number, string][]
const DAYS = Array.from({length: 31}, (_, i) => i + 1)
const YEARS = Array.from({length: MAX_YEAR - MIN_YEAR + 1}, (_, i) => MAX_YEAR - i)
const HOURS = Array.from({length: 24}, (_, i) => i)
const MINUTES = Array.from({length: 60}, (_, i) => i)

interface Props {
  open: boolean
  title?: string
  initialData?: ProfileFormData | null
  saving?: boolean
  onSave: (data: ProfileFormData) => void
  onClose: () => void
}

export default function ProfileFormModal({ open, title, initialData, saving, onSave, onClose }: Props) {
  const [form, setForm] = useState<ProfileFormData>(initialData ?? EMPTY_PROFILE_FORM)
  const [yearMode, setYearMode] = useState<'select' | 'custom'>('select')
  const [customYearText, setCustomYearText] = useState('')
  const [yearError, setYearError] = useState('')
  const [formError, setFormError] = useState('')

  // Sync form when initialData or open changes
  useEffect(() => {
    if (!open) return
    const data = initialData ?? EMPTY_PROFILE_FORM
    setForm(data)
    const inRange = data.dob.year >= MIN_YEAR && data.dob.year <= MAX_YEAR
    setYearMode(inRange || data.dob.year === 0 ? 'select' : 'custom')
    setCustomYearText(inRange || data.dob.year === 0 ? '' : String(data.dob.year))
    setYearError('')
    setFormError('')
  }, [open, initialData])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
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

    onSave({ ...form, dob: { ...form.dob, year: finalYear } })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ maxWidth: 560, background: 'rgba(16,12,38,0.98)', border: '1px solid rgba(201,168,76,0.25)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
          <h3 className="font-bold text-lg" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>
            {title ?? 'Hồ sơ'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: '#6b7280', background: 'rgba(255,255,255,0.05)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
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

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 rounded-xl font-semibold"
            style={{ background: '#c9a84c', color: '#0a0a1a', fontFamily: 'var(--font-vietnam)', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
          <button onClick={onClose} className="px-6 py-3 rounded-xl font-semibold"
            style={{ background: 'rgba(107,114,128,0.15)', color: '#94a3b8', fontFamily: 'var(--font-vietnam)' }}>
            Hủy
          </button>
        </div>
      </div>
    </div>
  )
}
