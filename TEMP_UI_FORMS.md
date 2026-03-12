# TEMP — Birth Info Form UI Files
> Xóa sau khi dùng xong

---

## 1. `src/app/input/page.tsx`

```tsx
'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import LocationPicker from '@/components/profile/LocationPicker'
import { useAuth } from '@/contexts/AuthContext'

const EMPTY_FORM = {
  ho: '', dem: '', ten: '', gender: 'Female',
  dob: { day: 1, month: 1, year: 1990 },
  tob: { hour: 12, minute: 0, unknown: false },
  loc: { address: 'Hà Nội, Việt Nam', lat: 21.0245, lon: 105.8412, tz: 'Asia/Ho_Chi_Minh' },
  note: '',
}

const MONTHS = ['1','2','3','4','5','6','7','8','9','10','11','12']
const DAYS = Array.from({length: 31}, (_, i) => String(i + 1))
const YEARS = Array.from({length: 100}, (_, i) => String(2010 - i))

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.3rem',
  color: '#8a8399',
  fontFamily: 'var(--font-vietnam)',
  fontSize: '0.62rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
}

const subLabelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.25rem',
  color: '#4a4560',
  fontFamily: 'var(--font-vietnam)',
  fontSize: '0.58rem',
  letterSpacing: '0.04em',
}

const divider = <div style={{ height: '1px', background: 'rgba(200,148,63,0.1)' }} />

function InputPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const forSynastry = searchParams.get('for') === 'synastry'
  const forChart = searchParams.get('for') === 'chart'
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveProfile, setSaveProfile] = useState(false)

  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.ten.trim()) return alert('Vui lòng nhập tên')
    setSaving(true)
    const name = [form.ho, form.dem, form.ten].filter(Boolean).join(' ')
    const data = {
      name,
      ten: form.ten.trim(),
      gender: form.gender,
      dob: form.dob,
      tob: { hour: form.tob.unknown ? 12 : form.tob.hour, minute: form.tob.unknown ? 0 : form.tob.minute },
      loc: form.loc,
    }

    if (saveProfile && user) {
      try {
        await fetch('/api/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            gender: form.gender,
            data: {
              ho: form.ho.trim(),
              dem: form.dem.trim(),
              ten: form.ten.trim(),
              note: form.note.trim(),
              dob: form.dob,
              tob: form.tob,
              loc: form.loc,
            },
          }),
        })
      } catch { /* non-blocking */ }
    }

    if (forChart) {
      sessionStorage.setItem('chartInputData', JSON.stringify(data))
      router.push('/chart')
    } else if (forSynastry) {
      sessionStorage.setItem('inputDataB', JSON.stringify(data))
      router.push('/checkout')
    } else {
      sessionStorage.setItem('inputData', JSON.stringify(data))
      const hasService = !!sessionStorage.getItem('selectedService')
      router.push(hasService ? '/checkout' : '/services')
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#06060f' }}>
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 pt-24 pb-10">

        {/* Header — compact */}
        <div className="text-center mb-6">
          <p className="section-eyebrow mb-2">
            {forSynastry ? 'Người thứ hai' : 'Bản đồ sao'}
          </p>
          <h1
            style={{
              color: '#f4efe6',
              fontFamily: 'var(--font-vietnam)',
              fontSize: 'clamp(1.2rem, 4vw, 1.6rem)',
              fontWeight: 700,
              letterSpacing: '0.03em',
              marginBottom: '0.3rem',
            }}
          >
            {forSynastry ? 'Thông tin người thứ hai' : 'Nhập thông tin'}
          </h1>
          <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem' }}>
            {forSynastry
              ? 'Nhập thông tin của người bạn muốn so sánh bản đồ sao'
              : forChart
              ? 'Điền thông tin để xem bản đồ sao ngay'
              : 'Điền đầy đủ để tạo bản đồ sao chính xác nhất'
            }
          </p>
        </div>

        {/* Form card */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'rgba(18,13,46,0.7)',
            border: '1px solid rgba(200,148,63,0.16)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="space-y-4">

            {/* Row 1: Name + Gender side by side */}
            <div className="grid gap-3" style={{ gridTemplateColumns: '1fr auto' }}>
              {/* Name */}
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
                    <label style={subLabelStyle}>Tên <span style={{ color: '#c45252' }}>*</span></label>
                    <input type="text" value={form.ten} onChange={e => setF('ten', e.target.value)} placeholder="An" />
                  </div>
                </div>
              </div>
              {/* Gender */}
              <div style={{ width: '5.5rem' }}>
                <label style={labelStyle}>Giới tính</label>
                <select value={form.gender} onChange={e => setF('gender', e.target.value)}>
                  <option value="Female">Nữ</option>
                  <option value="Male">Nam</option>
                  <option value="Other">Khác</option>
                </select>
              </div>
            </div>

            {divider}

            {/* Row 2: Date + Time side by side */}
            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label style={labelStyle}>Ngày sinh</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <label style={subLabelStyle}>Ngày</label>
                    <select value={form.dob.day} onChange={e => setF('dob', { ...form.dob, day: +e.target.value })}>
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={subLabelStyle}>Tháng</label>
                    <select value={form.dob.month} onChange={e => setF('dob', { ...form.dob, month: +e.target.value })}>
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={subLabelStyle}>Năm</label>
                    <select value={form.dob.year} onChange={e => setF('dob', { ...form.dob, year: +e.target.value })}>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              {/* Time */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Giờ sinh</label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.tob.unknown}
                      onChange={e => setF('tob', { ...form.tob, unknown: e.target.checked })}
                      style={{ width: 'auto', padding: 0 }}
                    />
                    <span style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem' }}>
                      Không rõ
                    </span>
                  </label>
                </div>
                {!form.tob.unknown && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label style={subLabelStyle}>Giờ (0–23)</label>
                      <input type="number" min={0} max={23} value={form.tob.hour}
                        onChange={e => setF('tob', { ...form.tob, hour: +e.target.value })} />
                    </div>
                    <div>
                      <label style={subLabelStyle}>Phút</label>
                      <input type="number" min={0} max={59} value={form.tob.minute}
                        onChange={e => setF('tob', { ...form.tob, minute: +e.target.value })} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {divider}

            {/* Row 3: Location — inline 3-field */}
            <LocationPicker value={form.loc} onChange={v => setF('loc', v)} label="Nơi sinh" />

            {divider}

            {/* Row 4: Note */}
            <div>
              <label style={labelStyle}>
                Biệt danh / Ghi chú{' '}
                <span style={{ color: '#4a4560', fontSize: '0.6rem', fontWeight: 400 }}>(tuỳ chọn)</span>
              </label>
              <input
                type="text"
                value={form.note}
                onChange={e => setF('note', e.target.value)}
                placeholder="VD: Anh trai, bạn thân Mai..."
                maxLength={120}
              />
            </div>

            {/* Save profile row */}
            {user ? (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveProfile}
                  onChange={e => setSaveProfile(e.target.checked)}
                  style={{ width: 'auto', padding: 0, flexShrink: 0 }}
                />
                <span style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem' }}>
                  Lưu hồ sơ
                </span>
              </label>
            ) : (
              <p style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                <Link href="/auth/login" style={{ color: '#d9ab55' }}>Đăng nhập</Link> để lưu hồ sơ
              </p>
            )}

            {divider}

            {/* Submit */}
            <div>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full py-3.5 font-bold text-sm tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, #c8943f 0%, #f0cc78 50%, #c8943f 100%)',
                  backgroundSize: '200% 200%',
                  color: '#06060f',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-vietnam)',
                  letterSpacing: '0.1em',
                  boxShadow: '0 4px 24px rgba(200,148,63,0.3)',
                  opacity: saving ? 0.7 : 1,
                  transition: 'opacity 0.2s ease',
                }}
              >
                {saving ? 'Đang xử lý...' : forChart ? 'Xem bản đồ sao ✦' : forSynastry ? 'Tiếp tục thanh toán →' : 'Tiếp tục →'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default function InputPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#06060f' }} />}>
      <InputPageInner />
    </Suspense>
  )
}
```

---

## 2. `src/components/profile/LocationPicker.tsx`

```tsx
'use client'

// VISUAL ONLY — LocationPicker restyled to Celestial Sanctum design
// All search logic, API calls, and data flow untouched

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search } from 'lucide-react'

interface LocationResult {
  display_name: string
  short_name: string
  lat: number
  lon: number
  tz: string
  country_code: string
}

interface LocationValue {
  address: string
  lat: number
  lon: number
  tz: string
}

interface LocationPickerProps {
  value: LocationValue
  onChange: (v: LocationValue) => void
  label?: string
}

export default function LocationPicker({ value, onChange, label = 'Nơi sinh' }: LocationPickerProps) {
  const [query, setQuery] = useState(value.address || '')
  const [results, setResults] = useState<LocationResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [cc, setCc] = useState('vn')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value.address || '')
  }, [value.address])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = useCallback(async (q: string, country: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const params = new URLSearchParams({ q, cc: country })
      const res = await fetch(`/api/location/search?${params}`)
      if (res.ok) { const data = await res.json(); setResults(data); setOpen(true) }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  const handleInput = (v: string) => {
    setQuery(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(v, cc), 600)
  }

  const select = (r: LocationResult) => {
    onChange({ address: r.short_name || r.display_name.split(',')[0], lat: r.lat, lon: r.lon, tz: r.tz })
    setQuery(r.short_name || r.display_name.split(',')[0])
    setOpen(false)
    setResults([])
  }

  const COUNTRIES = [
    { code: 'vn', label: 'Việt Nam' },
    { code: 'us', label: 'Mỹ' },
    { code: 'gb', label: 'Anh' },
    { code: 'au', label: 'Úc' },
    { code: 'ca', label: 'Canada' },
    { code: 'fr', label: 'Pháp' },
    { code: 'de', label: 'Đức' },
    { code: 'jp', label: 'Nhật' },
    { code: 'kr', label: 'Hàn' },
    { code: 'sg', label: 'S.pore' },
    { code: 'th', label: 'Thái' },
    { code: '', label: 'Toàn cầu' },
  ]

  return (
    <div ref={containerRef}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: '0.4rem',
            color: '#8a8399',
            fontFamily: 'var(--font-vietnam)',
            fontSize: '0.62rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
          }}
        >
          {label}
        </label>
      )}

      {/* Single row: [Country] [Address input] [Search btn] */}
      <div ref={containerRef as React.RefObject<HTMLDivElement>} style={{ position: 'relative', display: 'flex' }}>
        {/* Country select */}
        <select
          value={cc}
          onChange={e => { setCc(e.target.value); if (query.length >= 2) search(query, e.target.value) }}
          style={{
            flexShrink: 0,
            width: '6rem',
            borderRadius: '4px 0 0 4px',
            borderRight: 'none',
            fontFamily: 'var(--font-vietnam)',
            fontSize: '0.78rem',
            paddingLeft: '0.5rem',
            paddingRight: '0.25rem',
          }}
        >
          {COUNTRIES.map(c => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>

        {/* Address text input */}
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          placeholder="Nhập tên thành phố..."
          style={{ flex: 1, borderRadius: 0, borderLeft: 'none', borderRight: 'none', minWidth: 0 }}
        />

        {/* Search button */}
        <button
          type="button"
          onClick={() => search(query, cc)}
          disabled={loading}
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: '2.75rem',
            background: 'rgba(200,148,63,0.1)',
            border: '1px solid rgba(200,148,63,0.25)',
            borderLeft: 'none',
            borderRadius: '0 4px 4px 0',
            color: '#d9ab55',
            cursor: loading ? 'default' : 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = 'rgba(200,148,63,0.2)' }}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(200,148,63,0.1)'}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 rounded-full animate-spin"
              style={{ borderColor: 'rgba(200,148,63,0.25)', borderTopColor: '#d9ab55' }} />
          ) : (
            <Search size={15} />
          )}
        </button>

        {/* Results dropdown — positioned below the full row */}
        {open && results.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              zIndex: 100,
              background: 'rgba(11,11,31,0.98)',
              border: '1px solid rgba(200,148,63,0.2)',
              borderRadius: '0.75rem',
              boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
              maxHeight: '220px',
              overflowY: 'auto',
              backdropFilter: 'blur(20px)',
            }}
          >
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => select(r)}
                className="w-full text-left px-4 py-3 text-sm transition-all"
                style={{
                  color: '#f4efe6',
                  borderBottom: i < results.length - 1 ? '1px solid rgba(200,148,63,0.07)' : 'none',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(38,28,86,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span className="font-medium" style={{ fontFamily: 'var(--font-vietnam)' }}>
                  {r.short_name}
                </span>
                <span
                  className="block truncate"
                  style={{ color: '#4a4560', fontSize: '0.75rem', fontFamily: 'var(--font-vietnam)', marginTop: '0.1rem' }}
                >
                  {r.display_name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected location info */}
      {value.lat !== 0 && (
        <p
          className="mt-1.5 text-xs"
          style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontStyle: 'italic' }}
        >
          ✦ {value.address} · {value.lat.toFixed(4)}, {value.lon.toFixed(4)} · {value.tz}
        </p>
      )}
    </div>
  )
}
```

---

## 3. `src/components/profile/ProfileFormModal.tsx`

```tsx
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

          {/* Note / nickname — optional */}
          <div>
            <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>
              Biệt danh / Ghi chú{' '}
              <span style={{ color: '#4a4560', fontSize: '0.78rem' }}>(tuỳ chọn)</span>
            </label>
            <input
              type="text"
              value={form.note || ''}
              onChange={e => setF('note', e.target.value)}
              placeholder="VD: Anh trai, bạn thân Mai, sinh năm 1990..."
              maxLength={120}
            />
          </div>

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
```

---

## 4. `src/app/my-charts/page.tsx`

```tsx
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

const MONTHS = [
  [1,'Tháng 1'],[2,'Tháng 2'],[3,'Tháng 3'],[4,'Tháng 4'],
  [5,'Tháng 5'],[6,'Tháng 6'],[7,'Tháng 7'],[8,'Tháng 8'],
  [9,'Tháng 9'],[10,'Tháng 10'],[11,'Tháng 11'],[12,'Tháng 12'],
] as [number, string][]
const DAYS = Array.from({length: 31}, (_, i) => i + 1)
const YEARS = Array.from({length: MAX_YEAR - MIN_YEAR + 1}, (_, i) => MAX_YEAR - i)
const HOURS = Array.from({length: 24}, (_, i) => i)
const MINUTES = Array.from({length: 60}, (_, i) => i)

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
  }

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login')
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
            createdAt: p.createdAt || '',
          })))
        }
      })
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false))
  }, [])

  const setF = (k: string, v: unknown) => setForm(f => f ? { ...f, [k]: v } : f)

  const openEdit = (p: Profile) => {
    const inRange = p.dob.year >= MIN_YEAR && p.dob.year <= MAX_YEAR
    setYearMode(inRange || p.dob.year === 0 ? 'select' : 'custom')
    setCustomYearText(inRange || p.dob.year === 0 ? '' : String(p.dob.year))
    setYearError('')
    setFormError('')
    setForm({ ho: p.ho, dem: p.dem, ten: p.ten, gender: p.gender, dob: p.dob, tob: p.tob, loc: p.loc })
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
    const body = { id: editingId, name, gender: form.gender, data: { dob: finalDob, tob: form.tob, loc: form.loc, ho: form.ho, dem: form.dem, ten: form.ten } }

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
    <div className="min-h-screen" style={{ background: '#0a0a1a' }}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">

        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => router.push('/profile')}
            style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem' }}
          >
            ← Hồ sơ
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>
              Danh sách Bản đồ sao
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)' }}>
              {profiles.length} hồ sơ đã lưu
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(201,168,76,0.2)', borderTopColor: '#c9a84c' }} />
          </div>
        )}

        {/* Empty state */}
        {!loading && profiles.length === 0 && (
          <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(26,21,53,0.6)', border: '1px dashed rgba(201,168,76,0.2)' }}>
            <p style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', marginBottom: '1rem' }}>
              Chưa có hồ sơ nào.
            </p>
            <button
              onClick={() => router.push('/profile')}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm"
              style={{ background: '#c9a84c', color: '#0a0a1a', fontFamily: 'var(--font-vietnam)' }}
            >
              + Thêm bản đồ sao
            </button>
          </div>
        )}

        {/* Profile list */}
        {!loading && profiles.length > 0 && (
          <div className="space-y-4">
            {profiles.map(p => (
              <div key={p.id} className="rounded-2xl overflow-hidden" style={{ background: 'rgba(26,21,53,0.6)', border: editingId === p.id ? '1px solid rgba(201,168,76,0.35)' : '1px solid rgba(201,168,76,0.12)' }}>
                {/* Row */}
                <div className="flex items-center gap-3 px-5 py-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '0.95rem' }}>{p.name}</p>
                    <p style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
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
                      style={{ color: editingId === p.id ? '#94a3b8' : '#c9a84c', background: editingId === p.id ? 'rgba(107,114,128,0.15)' : 'rgba(201,168,76,0.1)', fontFamily: 'var(--font-vietnam)' }}
                    >
                      {editingId === p.id ? 'Hủy' : 'Sửa'}
                    </button>
                    {deleteConfirm === p.id ? (
                      <>
                        <button onClick={() => handleDelete(p.id)} className="px-2.5 py-1.5 rounded-lg text-xs" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', fontFamily: 'var(--font-vietnam)' }}>Xác nhận xóa</button>
                        <button onClick={() => setDeleteConfirm(null)} className="px-2.5 py-1.5 rounded-lg text-xs" style={{ color: '#94a3b8', background: 'rgba(148,163,184,0.1)', fontFamily: 'var(--font-vietnam)' }}>Hủy</button>
                      </>
                    ) : (
                      <button onClick={() => setDeleteConfirm(p.id)} className="px-2.5 py-1.5 rounded-lg text-xs" style={{ color: '#6b7280', background: 'rgba(107,114,128,0.1)', fontFamily: 'var(--font-vietnam)' }}>Xóa</button>
                    )}
                    <button
                      onClick={() => { sessionStorage.setItem('inputData', JSON.stringify({ name: p.name, gender: p.gender, dob: p.dob, tob: { hour: p.tob.unknown ? 12 : (p.tob.hour >= 0 ? p.tob.hour : 12), minute: p.tob.unknown ? 0 : (p.tob.minute >= 0 ? p.tob.minute : 0) }, loc: p.loc })); router.push('/services') }}
                      className="px-2.5 py-1.5 rounded-lg text-xs"
                      style={{ color: '#c9a84c', background: 'rgba(61,43,94,0.5)', border: '1px solid rgba(201,168,76,0.15)', fontFamily: 'var(--font-vietnam)' }}
                    >
                      Dịch vụ
                    </button>
                    <button
                      onClick={() => router.push(`/chart?id=${p.id}`)}
                      className="px-2.5 py-1.5 rounded-lg text-xs"
                      style={{ color: '#d9ab55', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', fontFamily: 'var(--font-vietnam)' }}
                    >
                      Bản đồ ✦
                    </button>
                  </div>
                </div>

                {/* Inline edit form */}
                {editingId === p.id && form && (
                  <div className="px-5 pb-5 pt-2" style={{ borderTop: '1px solid rgba(201,168,76,0.15)' }}>
                    <div className="space-y-5">
                      {/* Name */}
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
                          {saving ? 'Đang lưu...' : 'Cập nhật hồ sơ'}
                        </button>
                        <button onClick={cancelEdit} className="px-6 py-3 rounded-xl font-semibold" style={{ background: 'rgba(107,114,128,0.15)', color: '#94a3b8' }}>
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
              style={{ background: 'rgba(201,168,76,0.1)', color: '#d9ab55', border: '1px solid rgba(201,168,76,0.2)', fontFamily: 'var(--font-vietnam)' }}
            >
              + Thêm bản đồ sao mới
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
```
