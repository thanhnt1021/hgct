'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import LocationPicker from './LocationPicker'
import { ProfileFormData, EMPTY_PROFILE_FORM } from './ProfileFormModal'

const CUR_YEAR = new Date().getFullYear()
const MONTHS = [[1,'1'],[2,'2'],[3,'3'],[4,'4'],[5,'5'],[6,'6'],[7,'7'],[8,'8'],[9,'9'],[10,'10'],[11,'11'],[12,'12']] as [number,string][]
const DAYS = Array.from({length: 31}, (_, i) => i + 1)
const YEARS = Array.from({length: 101}, (_, i) => CUR_YEAR - i)
const HOURS = Array.from({length: 24}, (_, i) => i)
const MINUTES = Array.from({length: 60}, (_, i) => i)

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '0.25rem',
  color: '#94a3b8', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', fontWeight: 500,
}
const subLabelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '0.25rem',
  color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem',
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

function PersonSection({ label, state }: {
  label: string
  state: ReturnType<typeof usePersonState>
}) {
  const { form, setF, yearMode, setYearMode, customYear, setCustomYear, yearError, setYearError, formError } = state
  return (
    <div>
      <p style={{ color: '#c9a84c', fontFamily: 'var(--font-vietnam)', fontSize: '0.7rem', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '1rem' }}>
        {label}
      </p>
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
                      style={{ color: '#6b7280', fontSize: '0.85rem', padding: '0 0.4rem', flexShrink: 0 }}>✕</button>
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
                <span style={{ color: '#94a3b8', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem' }}>Không rõ</span>
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

export default function GuestSynastryModal({
  open,
  onClose,
  onSubmit,
  initialDataA,
  initialDataB,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (dataA: ProfileFormData, dataB: ProfileFormData) => void
  initialDataA?: ProfileFormData | null
  initialDataB?: ProfileFormData | null
}) {
  const a = usePersonState()
  const b = usePersonState()

  useEffect(() => {
    if (!open) return
    if (initialDataA) a.resetWith(initialDataA)
    else a.reset()
    if (initialDataB) b.resetWith(initialDataB)
    else b.reset()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const handleSubmit = () => {
    const stateA: PersonState = { form: a.form, yearMode: a.yearMode, customYear: a.customYear, yearError: a.yearError, formError: a.formError }
    const stateB: PersonState = { form: b.form, yearMode: b.yearMode, customYear: b.customYear, yearError: b.yearError, formError: b.formError }
    const dataA = validate(stateA, a.setYearError, a.setFormError)
    if (!dataA) return
    const dataB = validate(stateB, b.setYearError, b.setFormError)
    if (!dataB) return
    onSubmit(dataA, dataB)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ maxWidth: 580, background: 'rgba(16,12,38,0.98)', border: '1px solid rgba(201,168,76,0.25)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
          <h3 className="font-bold text-lg" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>
            Thông tin của bạn và của đối phương
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: '#6b7280', background: 'rgba(255,255,255,0.05)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-8">
          <PersonSection label="── THÔNG TIN CỦA BẠN ──" state={a} />
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,148,63,0.25), transparent)' }} />
          <PersonSection label="── THÔNG TIN CỦA ĐỐI PHƯƠNG ──" state={b} />
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleSubmit}
            className="w-full h-10 rounded-lg font-semibold"
            style={{ background: '#c9a84c', color: '#0a0a1a', fontFamily: 'var(--font-vietnam)' }}
          >
            Tiếp tục →
          </button>
        </div>
      </div>
    </div>
  )
}
