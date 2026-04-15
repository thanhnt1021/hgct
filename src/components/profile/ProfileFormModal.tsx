'use client'

import { useEffect, useState } from 'react'
import LocationPicker from './LocationPicker'
import { X } from 'lucide-react'

export interface ProfileFormData {
  ho: string; dem: string; ten: string; gender: string
  dob: { day: number; month: number; year: number }
  tob: { hour: number; minute: number; unknown: boolean }
  loc: { address: string; lat: number; lon: number; tz: string }
  note?: string
}

export const EMPTY_PROFILE_FORM: ProfileFormData = {
  ho: '', dem: '', ten: '', gender: 'Female',
  dob: { day: 0, month: 0, year: 0 },
  tob: { hour: -1, minute: -1, unknown: false },
  loc: { address: 'Hà Nội, Việt Nam', lat: 21.0245, lon: 105.8412, tz: 'Asia/Ho_Chi_Minh' },
  note: '',
}

const CUR_YEAR = new Date().getFullYear()

const MONTHS = [
  [1,'1'],[2,'2'],[3,'3'],[4,'4'],
  [5,'5'],[6,'6'],[7,'7'],[8,'8'],
  [9,'9'],[10,'10'],[11,'11'],[12,'12'],
] as [number, string][]
const DAYS = Array.from({length: 31}, (_, i) => i + 1)
const YEARS = Array.from({length: 101}, (_, i) => CUR_YEAR - i)
const HOURS = Array.from({length: 24}, (_, i) => i)
const MINUTES = Array.from({length: 60}, (_, i) => i)

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.25rem',
  color: '#94a3b8',
  fontFamily: 'var(--font-vietnam)',
  fontSize: '0.75rem',
  fontWeight: 500,
}

const subLabelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.25rem',
  color: '#6b7280',
  fontFamily: 'var(--font-vietnam)',
  fontSize: '0.75rem',
}

interface Props {
  open: boolean
  title?: string
  initialData?: ProfileFormData | null
  saving?: boolean
  showSaveCheckbox?: boolean
  defaultSaveChecked?: boolean
  submitLabel?: string
  hideNote?: boolean
  showEmailField?: boolean
  twoActionMode?: boolean
  draftKey?: string
  onSave: (data: ProfileFormData, saveProfile: boolean, action?: 'free' | 'paid', email?: string) => void
  onClose: () => void
}

export default function ProfileFormModal({ open, title, initialData, saving, showSaveCheckbox, defaultSaveChecked, submitLabel, hideNote, showEmailField, twoActionMode, draftKey, onSave, onClose }: Props) {
  const [form, setForm] = useState<ProfileFormData>(initialData ?? EMPTY_PROFILE_FORM)
  const [yearMode, setYearMode] = useState<'select' | 'custom'>('select')
  const [customYearText, setCustomYearText] = useState('')
  const [yearError, setYearError] = useState('')
  const [formError, setFormError] = useState('')
  const [saveProfile, setSaveProfile] = useState(defaultSaveChecked ?? false)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')

  // Sync form when open changes — restore draft if available
  useEffect(() => {
    if (!open) return
    if (draftKey && !initialData) {
      try {
        const saved = sessionStorage.getItem(draftKey)
        if (saved) {
          const draft = JSON.parse(saved) as { form?: ProfileFormData; email?: string }
          const data = draft.form ?? EMPTY_PROFILE_FORM
          setForm(data)
          const inRange = data.dob.year >= CUR_YEAR - 100 && data.dob.year <= CUR_YEAR
          setYearMode(inRange || data.dob.year === 0 ? 'select' : 'custom')
          setCustomYearText(inRange || data.dob.year === 0 ? '' : String(data.dob.year))
          setYearError(''); setFormError(''); setEmailError('')
          setEmail(draft.email ?? '')
          setSaveProfile(defaultSaveChecked ?? false)
          return
        }
      } catch { /* ignore */ }
    }
    const data = initialData ?? EMPTY_PROFILE_FORM
    setForm(data)
    const inRange = data.dob.year >= CUR_YEAR - 100 && data.dob.year <= CUR_YEAR
    setYearMode(inRange || data.dob.year === 0 ? 'select' : 'custom')
    setCustomYearText(inRange || data.dob.year === 0 ? '' : String(data.dob.year))
    setYearError('')
    setFormError('')
    setEmailError('')
    setEmail('')
    setSaveProfile(defaultSaveChecked ?? false)
  }, [open, initialData, defaultSaveChecked, draftKey])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Save draft when closing (only for guest modal with no initialData)
  const handleClose = () => {
    if (draftKey && !initialData) {
      try {
        sessionStorage.setItem(draftKey, JSON.stringify({ form, email }))
      } catch { /* ignore */ }
    }
    onClose()
  }

  if (!open) return null

  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const validateForm = (): ProfileFormData | null => {
    setFormError(''); setYearError('')
    if (!form.ten.trim()) { setFormError('Vui lòng nhập tên'); return null }
    if (form.dob.day === 0) { setFormError('Vui lòng chọn ngày sinh'); return null }
    if (form.dob.month === 0) { setFormError('Vui lòng chọn tháng sinh'); return null }
    let finalYear = form.dob.year
    if (yearMode === 'custom') {
      const y = parseInt(customYearText, 10)
      if (!customYearText.trim() || isNaN(y) || y < -4712 || y > 5399) {
        setYearError('Năm không hợp lệ. Nhập số từ -4712 đến 5399.')
        return null
      }
      finalYear = y
    } else if (form.dob.year === 0) {
      setFormError('Vui lòng chọn năm sinh'); return null
    }
    if (!form.tob.unknown && (form.tob.hour === -1 || form.tob.minute === -1)) {
      setFormError('Vui lòng chọn giờ và phút sinh (hoặc tích "Không rõ giờ sinh")'); return null
    }
    return { ...form, dob: { ...form.dob, year: finalYear } }
  }

  const handleSubmit = () => {
    const data = validateForm()
    if (!data) return
    onSave(data, saveProfile)
  }

  const validateEmail = (): string | null => {
    if (!showEmailField) return undefined as unknown as string
    setEmailError('')
    if (!email.trim()) { setEmailError('Vui lòng nhập email để nhận báo cáo'); return null }
    if (!isValidEmail(email)) { setEmailError('Email không đúng định dạng'); return null }
    return email.trim()
  }

  const handleFree = () => {
    const data = validateForm()
    if (!data) return
    const em = validateEmail()
    if (em === null) return
    onSave(data, saveProfile, 'free', em || undefined)
  }

  const handlePaid = () => {
    const data = validateForm()
    if (!data) return
    const em = validateEmail()
    if (em === null) return
    onSave(data, saveProfile, 'paid', em || undefined)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
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
          <button onClick={handleClose} className="p-1.5 rounded-lg" style={{ color: '#6b7280', background: 'rgba(255,255,255,0.05)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 form-compact" style={{ paddingBottom: '60px' }}>

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
              <label style={labelStyle}>Ngày sinh (Dương lịch)</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label style={subLabelStyle}>Ngày</label>
                  <select value={form.dob.day === 0 ? '' : form.dob.day}
                    onChange={e => setF('dob', { ...form.dob, day: +e.target.value })}>
                    <option value="">-</option>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={subLabelStyle}>Tháng</label>
                  <select value={form.dob.month === 0 ? '' : form.dob.month}
                    onChange={e => setF('dob', { ...form.dob, month: +e.target.value })}>
                    <option value="">-</option>
                    {MONTHS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={subLabelStyle}>Năm</label>
                  {yearMode === 'select' ? (
                    <select value={form.dob.year === 0 ? '' : form.dob.year}
                      onChange={e => {
                        if (e.target.value === '__custom__') { setYearMode('custom'); setCustomYearText('') }
                        else setF('dob', { ...form.dob, year: +e.target.value })
                      }}>
                      <option value="">-</option>
                      <option value="__custom__">Năm khác...</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
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

            {/* Time */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <label style={{ ...labelStyle, marginBottom: 0 }}>Giờ sinh</label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={form.tob.unknown}
                    onChange={e => setF('tob', { ...form.tob, unknown: e.target.checked })}
                    style={{ width: '1rem', height: '1rem', padding: 0 }} />
                  <span style={{ color: '#94a3b8', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem' }}>Không rõ</span>
                </label>
              </div>
              {!form.tob.unknown && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label style={subLabelStyle}>Giờ (0–23)</label>
                    <select value={form.tob.hour === -1 ? '' : form.tob.hour}
                      onChange={e => setF('tob', { ...form.tob, hour: +e.target.value })}>
                      <option value="">-</option>
                      {HOURS.map(h => <option key={h} value={h}>{String(h).padStart(2,'0')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={subLabelStyle}>Phút</label>
                    <select value={form.tob.minute === -1 ? '' : form.tob.minute}
                      onChange={e => setF('tob', { ...form.tob, minute: +e.target.value })}>
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

          {/* Note / nickname */}
          {!hideNote && <div>
            <label style={labelStyle}>
              Biệt danh / Ghi chú{' '}
              <span style={{ color: '#4a4560', fontSize: '0.7rem', fontWeight: 400 }}>(tuỳ chọn)</span>
            </label>
            <input
              type="text"
              value={form.note || ''}
              onChange={e => setF('note', e.target.value)}
              placeholder="VD: Anh trai, bạn thân Mai, sinh năm 1990..."
              maxLength={120}
            />
          </div>}

          {showSaveCheckbox && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveProfile}
                onChange={e => setSaveProfile(e.target.checked)}
                style={{ width: '1rem', height: '1rem', padding: 0, accentColor: '#c9a84c' }}
              />
              <span style={{ color: '#94a3b8', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem' }}>
                Lưu hồ sơ vào danh sách
              </span>
            </label>
          )}

          {/* Email field (guest flow) */}
          {showEmailField && (
            <div>
              <label style={labelStyle}>
                Email nhận báo cáo PDF <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailError('') }}
                placeholder="email@example.com"
                style={{ width: '100%' }}
              />
              {emailError && (
                <p style={{ color: '#ef4444', fontSize: '0.78rem', fontFamily: 'var(--font-vietnam)', marginTop: '0.25rem' }}>⚠ {emailError}</p>
              )}
            </div>
          )}

          {formError && (
            <p style={{ color: '#ef4444', fontSize: '0.82rem', fontFamily: 'var(--font-vietnam)' }}>⚠ {formError}</p>
          )}

        </div>

        {/* Footer */}
        {twoActionMode ? (
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={handleFree}
              disabled={saving}
              className="flex-1 h-10 rounded-lg font-semibold"
              style={{ background: 'transparent', border: '1px solid rgba(200,148,63,0.35)', color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.8rem' }}
            >
              Xem miễn phí
            </button>
            <button
              onClick={handlePaid}
              disabled={saving}
              className="flex-1 h-10 rounded-lg font-semibold"
              style={{ background: 'linear-gradient(135deg, #c8943f, #f0cc78, #c8943f)', backgroundSize: '200% 200%', color: '#06060f', fontFamily: 'var(--font-vietnam)', fontSize: '0.8rem', opacity: saving ? 0.7 : 1 }}
            >
              Xuất PDF chi tiết →
            </button>
          </div>
        ) : (
          <div className="flex gap-3 px-6 pb-6">
            <button onClick={handleSubmit} disabled={saving} className="flex-1 h-9 rounded-lg font-semibold"
              style={{ background: '#c9a84c', color: '#0a0a1a', fontFamily: 'var(--font-vietnam)', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Đang lưu...' : (submitLabel ?? 'Lưu')}
            </button>
            <button onClick={handleClose} className="px-6 h-9 rounded-lg font-semibold"
              style={{ background: 'rgba(107,114,128,0.15)', color: '#94a3b8', fontFamily: 'var(--font-vietnam)' }}>
              Hủy
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
