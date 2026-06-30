'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import LocationPicker from './LocationPicker'
import { ProfileFormData, EMPTY_PROFILE_FORM } from './ProfileFormModal'
import { PDF_EMAIL_ENABLED } from '@/lib/feature-flags'

type SavedProfile = { id: string; name: string; data: ProfileFormData }

const CUR_YEAR = new Date().getFullYear()
const MONTHS = [[1,'1'],[2,'2'],[3,'3'],[4,'4'],[5,'5'],[6,'6'],[7,'7'],[8,'8'],[9,'9'],[10,'10'],[11,'11'],[12,'12']] as [number,string][]
const DAYS = Array.from({length: 31}, (_, i) => i + 1)
const YEARS = Array.from({length: 101}, (_, i) => CUR_YEAR - i)
const HOURS = Array.from({length: 24}, (_, i) => i)
const MINUTES = Array.from({length: 60}, (_, i) => i)

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '0.25rem',
  color: 'var(--as-text-strong)', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', fontWeight: 500,
}
const subLabelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '0.25rem',
  color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem',
}

interface PersonState {
  form: ProfileFormData
  yearMode: 'select' | 'custom'
  customYear: string
  yearError: string
  formError: string
}

function usePersonState() {
  const [form, setForm] = useState<ProfileFormData>(EMPTY_PROFILE_FORM)
  const [yearMode, setYearMode] = useState<'select' | 'custom'>('select')
  const [customYear, setCustomYear] = useState('')
  const [yearError, setYearError] = useState('')
  const [formError, setFormError] = useState('')
  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const reset = () => {
    setForm(EMPTY_PROFILE_FORM); setYearMode('select'); setCustomYear(''); setYearError(''); setFormError('')
  }
  const resetWith = (data: ProfileFormData) => {
    setForm(data)
    const inRange = data.dob.year >= CUR_YEAR - 100 && data.dob.year <= CUR_YEAR
    setYearMode(inRange || data.dob.year === 0 ? 'select' : 'custom')
    setCustomYear(inRange || data.dob.year === 0 ? '' : String(data.dob.year))
    setYearError(''); setFormError('')
  }
  return { form, setF, yearMode, setYearMode, customYear, setCustomYear, yearError, setYearError, formError, setFormError, reset, resetWith }
}

function validate(p: PersonState, setYearError: (s: string) => void, setFormError: (s: string) => void): ProfileFormData | null {
  setFormError(''); setYearError('')
  if (!p.form.ten.trim()) { setFormError('Vui lòng nhập tên'); return null }
  if (p.form.dob.day === 0) { setFormError('Vui lòng chọn ngày sinh'); return null }
  if (p.form.dob.month === 0) { setFormError('Vui lòng chọn tháng sinh'); return null }
  let finalYear = p.form.dob.year
  if (p.yearMode === 'custom') {
    const y = parseInt(p.customYear, 10)
    if (!p.customYear.trim() || isNaN(y) || y < -4712 || y > 5399) {
      setYearError('Năm không hợp lệ. Nhập số từ -4712 đến 5399.'); return null
    }
    finalYear = y
  } else if (p.form.dob.year === 0) {
    setFormError('Vui lòng chọn năm sinh'); return null
  }
  if (!p.form.tob.unknown && (p.form.tob.hour === -1 || p.form.tob.minute === -1)) {
    setFormError('Vui lòng chọn giờ sinh (hoặc tích "Không rõ")'); return null
  }
  return { ...p.form, dob: { ...p.form.dob, year: finalYear } }
}

function PersonSection({ label, state, savedProfiles }: {
  label: string
  state: ReturnType<typeof usePersonState>
  savedProfiles?: SavedProfile[]
}) {
  const { form, setF, yearMode, setYearMode, customYear, setCustomYear, yearError, setYearError, formError } = state
  return (
    <div>
      <p style={{ color: 'var(--as-text-strong)', fontFamily: 'var(--font-playfair)', fontSize: '0.7rem', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '1rem' }}>
        {label}
      </p>
      {savedProfiles && savedProfiles.length > 0 && (
        <div style={{ marginBottom: '0.85rem' }}>
          <label style={labelStyle}>Chọn hồ sơ đã lưu</label>
          <select
            defaultValue=""
            onChange={e => { const p = savedProfiles.find(x => x.id === e.target.value); if (p) state.resetWith(p.data) }}
            style={{ width: '100%' }}
          >
            <option value="">— Nhập hồ sơ mới —</option>
            {savedProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}
      <div className="space-y-4 form-compact">
        {/* Row 1: Name + Gender */}
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

        {/* Row 2: Date + Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label style={labelStyle}>Ngày sinh (Dương lịch)</label>
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
                  <select value={form.dob.year === 0 ? '' : form.dob.year} onChange={e => {
                    if (e.target.value === '__custom__') { setYearMode('custom'); setCustomYear('') }
                    else setF('dob', { ...form.dob, year: +e.target.value })
                  }}>
                    <option value="">-</option>
                    <option value="__custom__">Năm khác...</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                ) : (
                  <div className="flex gap-1">
                    <input type="text" value={customYear}
                      onChange={e => { setCustomYear(e.target.value); setYearError('') }}
                      placeholder="VD: 1850" style={{ flex: 1, minWidth: 0 }} />
                    <button type="button"
                      onClick={() => { setYearMode('select'); setCustomYear(''); setF('dob', { ...form.dob, year: 0 }); setYearError('') }}
                      style={{ color: 'var(--as-text-muted)', fontSize: '0.85rem', padding: '0 0.4rem', flexShrink: 0 }}>✕</button>
                  </div>
                )}
                {yearError && <p style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '0.2rem' }}>{yearError}</p>}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-2">
              <label style={{ ...labelStyle, marginBottom: 0 }}>Giờ sinh</label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={form.tob.unknown}
                  onChange={e => setF('tob', { ...form.tob, unknown: e.target.checked })}
                  style={{ width: '1rem', height: '1rem', padding: 0 }} />
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

        {formError && (
          <p style={{ color: '#ef4444', fontSize: '0.82rem', fontFamily: 'var(--font-vietnam)' }}>⚠ {formError}</p>
        )}
      </div>
    </div>
  )
}

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export default function GuestSynastryModal({
  open,
  onClose,
  onSubmit,
  initialDataA,
  initialDataB,
  draftKey,
  savedProfiles,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (dataA: ProfileFormData, dataB: ProfileFormData, action?: 'free' | 'paid' | 'reading', email?: string) => void
  initialDataA?: ProfileFormData | null
  initialDataB?: ProfileFormData | null
  draftKey?: string
  savedProfiles?: SavedProfile[]
}) {
  const a = usePersonState()
  const b = usePersonState()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')

  useEffect(() => {
    if (!open) return
    if (draftKey && !initialDataA && !initialDataB) {
      try {
        const saved = sessionStorage.getItem(draftKey)
        if (saved) {
          const draft = JSON.parse(saved) as { formA?: ProfileFormData; formB?: ProfileFormData; email?: string }
          if (draft.formA) a.resetWith(draft.formA); else a.reset()
          if (draft.formB) b.resetWith(draft.formB); else b.reset()
          setEmail(draft.email ?? '')
          setEmailError('')
          return
        }
      } catch { /* ignore */ }
    }
    if (initialDataA) a.resetWith(initialDataA)
    else a.reset()
    if (initialDataB) b.resetWith(initialDataB)
    else b.reset()
    setEmail('')
    setEmailError('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleClose = () => {
    if (draftKey && !initialDataA && !initialDataB) {
      try {
        sessionStorage.setItem(draftKey, JSON.stringify({ formA: a.form, formB: b.form, email }))
      } catch { /* ignore */ }
    }
    onClose()
  }

  if (!open) return null

  const validateBoth = (): [ProfileFormData, ProfileFormData] | null => {
    const stateA: PersonState = { form: a.form, yearMode: a.yearMode, customYear: a.customYear, yearError: a.yearError, formError: a.formError }
    const stateB: PersonState = { form: b.form, yearMode: b.yearMode, customYear: b.customYear, yearError: b.yearError, formError: b.formError }
    const dataA = validate(stateA, a.setYearError, a.setFormError)
    if (!dataA) return null
    const dataB = validate(stateB, b.setYearError, b.setFormError)
    if (!dataB) return null
    return [dataA, dataB]
  }

  const validateEmail = (): string | null => {
    setEmailError('')
    if (!email.trim()) { setEmailError('Vui lòng nhập email để nhận báo cáo'); return null }
    if (!isValidEmail(email)) { setEmailError('Email không đúng định dạng'); return null }
    return email.trim()
  }

  const handleFree = () => {
    const data = validateBoth()
    if (!data) return
    const em = validateEmail()
    if (em === null) return
    onSubmit(data[0], data[1], 'free', em)
  }

  const handlePaid = () => {
    const data = validateBoth()
    if (!data) return
    const em = validateEmail()
    if (em === null) return
    onSubmit(data[0], data[1], 'paid', em)
  }

  // Coin/stream flow — không cần email, 1 nút Hoàn Thành.
  const handleReading = () => {
    const data = validateBoth()
    if (!data) return
    onSubmit(data[0], data[1], 'reading')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(22,54,83,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        className="w-full max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ maxWidth: 580, background: 'var(--as-surface-raised)', border: '1px solid var(--as-border-gold)', boxShadow: 'var(--as-shadow-card)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--as-border-gold)' }}>
          <h3 className="font-bold text-lg" style={{ color: 'var(--as-text-strong)', fontFamily: 'var(--font-playfair)' }}>
            Thông tin của bạn và của đối phương
          </h3>
          <button onClick={handleClose} className="p-1.5 rounded-lg" style={{ color: 'var(--as-text-strong)', background: 'transparent', border: '1px solid var(--as-border-gold)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-8 as-form" style={{ paddingBottom: '60px' }}>
          <PersonSection label="── THÔNG TIN CỦA BẠN ──" state={a} savedProfiles={savedProfiles} />
          <div style={{ height: '1px', background: 'var(--as-border-gold)' }} />
          <PersonSection label="── THÔNG TIN CỦA ĐỐI PHƯƠNG ──" state={b} savedProfiles={savedProfiles} />

          {/* Email field — chỉ ở flow PDF cũ */}
          {PDF_EMAIL_ENABLED && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--as-text-strong)', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', fontWeight: 500 }}>
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
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          {PDF_EMAIL_ENABLED ? (
            <div className="flex gap-3">
              <button
                onClick={handleFree}
                className="flex-1 h-10 rounded-lg font-semibold"
                style={{ background: 'transparent', border: '1px solid var(--as-border-gold)', color: 'var(--as-text-strong)', fontFamily: 'var(--font-vietnam)', fontSize: '0.8rem' }}
              >
                Xem miễn phí
              </button>
              <button
                onClick={handlePaid}
                className="flex-1 h-10 rounded-lg font-semibold"
                style={{ background: 'var(--as-cta)', color: 'var(--as-text-on-dark)', fontFamily: 'var(--font-vietnam)', fontSize: '0.8rem' }}
              >
                Xuất PDF chi tiết →
              </button>
            </div>
          ) : (
            <button
              onClick={handleReading}
              className="w-full h-11 rounded-lg font-bold tracking-wider"
              style={{ background: 'var(--as-cta)', color: 'var(--as-text-on-dark)', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem', letterSpacing: '0.06em', boxShadow: 'var(--as-shadow-card)' }}
            >
              Hoàn Thành →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
