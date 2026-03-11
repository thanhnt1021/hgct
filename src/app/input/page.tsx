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
  marginBottom: '0.5rem',
  color: '#8a8399',
  fontFamily: 'var(--font-vietnam)',
  fontSize: '0.75rem',
  fontWeight: 500,
  letterSpacing: '0.06em',
}

const subLabelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.25rem',
  color: '#4a4560',
  fontFamily: 'var(--font-vietnam)',
  fontSize: '0.75rem',
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

        {/* Header */}
        <div className="text-center mb-8">
          <p className="section-eyebrow mb-2">
            {forSynastry ? 'Người thứ hai' : 'Bản đồ sao'}
          </p>
          <h1
            style={{
              color: '#f4efe6',
              fontFamily: 'var(--font-vietnam)',
              fontSize: '1.5rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
              marginBottom: '0.3rem',
            }}
          >
            {forSynastry ? 'Thông tin người thứ hai' : 'Nhập thông tin'}
          </h1>
          <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem' }}>
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
          className="rounded-2xl p-5 sm:p-6"
          style={{
            background: 'rgba(18,13,46,0.7)',
            border: '1px solid rgba(200,148,63,0.16)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="space-y-4 form-compact">

            {/* Row 1: Name + Gender side by side */}
            <div className="grid gap-3 items-end" style={{ gridTemplateColumns: '1fr auto' }}>
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

            {/* Row 2: Date + Time — responsive stack on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Date */}
              <div>
                <label style={labelStyle}>Ngày sinh</label>
                <div className="grid grid-cols-3 gap-2">
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
                      style={{ width: '1rem', height: '1rem', padding: 0 }}
                    />
                    <span style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem' }}>
                      Không rõ
                    </span>
                  </label>
                </div>
                {!form.tob.unknown && (
                  <div className="grid grid-cols-2 gap-2">
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

            {/* Row 3: Location */}
            <LocationPicker value={form.loc} onChange={v => setF('loc', v)} label="Nơi sinh" />

            {divider}

            {/* Row 4: Note */}
            <div>
              <label style={labelStyle}>
                Biệt danh / Ghi chú{' '}
                <span style={{ color: '#4a4560', fontSize: '0.65rem', fontWeight: 400 }}>(tuỳ chọn)</span>
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
                  style={{ width: '1rem', height: '1rem', padding: 0, flexShrink: 0 }}
                />
                <span style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem' }}>
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
                className="w-full h-9 font-bold text-sm tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, #c8943f 0%, #f0cc78 50%, #c8943f 100%)',
                  backgroundSize: '200% 200%',
                  color: '#06060f',
                  borderRadius: '0.5rem',
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
