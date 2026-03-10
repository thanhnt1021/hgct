'use client'

// VISUAL ONLY — input page restyled to Celestial Sanctum design
// All form logic, routing, and data flow untouched

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import LocationPicker from '@/components/profile/LocationPicker'

const EMPTY_FORM = {
  ho: '', dem: '', ten: '', gender: 'Female',
  dob: { day: 1, month: 1, year: 1990 },
  tob: { hour: 12, minute: 0, unknown: false },
  loc: { address: 'Hà Nội, Việt Nam', lat: 21.0245, lon: 105.8412, tz: 'Asia/Ho_Chi_Minh' },
}

const MONTHS = ['1','2','3','4','5','6','7','8','9','10','11','12']
const DAYS = Array.from({length: 31}, (_, i) => String(i + 1))
const YEARS = Array.from({length: 100}, (_, i) => String(2010 - i))

// Shared label style
const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.4rem',
  color: '#8a8399',
  fontFamily: 'var(--font-vietnam)',
  fontSize: '0.62rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  
}

const subLabelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.35rem',
  color: '#4a4560',
  fontFamily: 'var(--font-vietnam)',
  fontSize: '0.58rem',
  letterSpacing: '0.04em',
  
}

function InputPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const forSynastry = searchParams.get('for') === 'synastry'
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.ten.trim()) return alert('Vui lòng nhập tên')
    setSaving(true)
    const name = [form.ho, form.dem, form.ten].filter(Boolean).join(' ')
    const data = {
      name,
      gender: form.gender,
      dob: form.dob,
      tob: { hour: form.tob.unknown ? 12 : form.tob.hour, minute: form.tob.unknown ? 0 : form.tob.minute },
      loc: form.loc,
    }

    if (forSynastry) {
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

      <div className="max-w-2xl mx-auto px-4 pt-28 pb-16">

        {/* Header */}
        <div className="text-center mb-10">
          <p className="section-eyebrow mb-4">
            {forSynastry ? 'Người thứ hai' : 'Bản đồ sao'}
          </p>
          <h1
            style={{
              color: '#f4efe6',
              fontFamily: 'var(--font-vietnam)',
              fontSize: 'clamp(1.4rem, 4vw, 1.9rem)',
              fontWeight: 700,
              letterSpacing: '0.03em',
              marginBottom: '0.6rem',
            }}
          >
            {forSynastry ? 'Thông tin người thứ hai' : 'Nhập thông tin'}
          </h1>
          <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem' }}>
            {forSynastry
              ? 'Nhập thông tin của người bạn muốn so sánh bản đồ sao'
              : 'Điền đầy đủ để tạo bản đồ sao chính xác nhất'
            }
          </p>
        </div>

        {/* Form card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(18,13,46,0.7)',
            border: '1px solid rgba(200,148,63,0.16)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="space-y-7">

            {/* Name row */}
            <div>
              <label style={labelStyle}>Họ và tên</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label style={subLabelStyle}>Họ</label>
                  <input type="text" value={form.ho} onChange={e => setF('ho', e.target.value)} placeholder="Nguyễn" />
                </div>
                <div>
                  <label style={subLabelStyle}>Đệm</label>
                  <input type="text" value={form.dem} onChange={e => setF('dem', e.target.value)} placeholder="Văn" />
                </div>
                <div>
                  <label style={subLabelStyle}>
                    Tên <span style={{ color: '#c45252' }}>*</span>
                  </label>
                  <input type="text" value={form.ten} onChange={e => setF('ten', e.target.value)} placeholder="An" />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(200,148,63,0.1)' }} />

            {/* Gender */}
            <div>
              <label style={labelStyle}>Giới tính</label>
              <div className="flex gap-3 flex-wrap">
                {[{v:'Female',l:'Nữ'},{v:'Male',l:'Nam'},{v:'Other',l:'Khác'}].map(g => (
                  <button
                    key={g.v}
                    type="button"
                    onClick={() => setF('gender', g.v)}
                    className="px-5 py-2.5 text-sm font-medium transition-all"
                    style={{
                      background: form.gender === g.v ? 'rgba(38,28,86,0.9)' : 'rgba(11,11,31,0.8)',
                      color: form.gender === g.v ? '#d9ab55' : '#8a8399',
                      border: form.gender === g.v ? '1px solid rgba(200,148,63,0.45)' : '1px solid rgba(200,148,63,0.12)',
                      borderRadius: '4px',
                      fontFamily: 'var(--font-vietnam)',
                      boxShadow: form.gender === g.v ? '0 0 16px rgba(200,148,63,0.12)' : 'none',
                    }}
                  >
                    {g.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(200,148,63,0.1)' }} />

            {/* Date of birth */}
            <div>
              <label style={labelStyle}>Ngày sinh</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label style={subLabelStyle}>Ngày</label>
                  <select value={form.dob.day} onChange={e => setF('dob', { ...form.dob, day: +e.target.value })}>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={subLabelStyle}>Tháng</label>
                  <select value={form.dob.month} onChange={e => setF('dob', { ...form.dob, month: +e.target.value })}>
                    {MONTHS.map(m => <option key={m} value={m}>Tháng {m}</option>)}
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

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(200,148,63,0.1)' }} />

            {/* Time of birth */}
            <div>
              <label style={labelStyle}>Giờ sinh</label>
              <label className="flex items-center gap-2.5 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={form.tob.unknown}
                  onChange={e => setF('tob', { ...form.tob, unknown: e.target.checked })}
                  style={{ width: 'auto', padding: 0 }}
                />
                <span style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem' }}>
                  Không rõ giờ sinh
                </span>
              </label>
              {!form.tob.unknown && (
                <div className="grid grid-cols-2 gap-3">
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

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(200,148,63,0.1)' }} />

            {/* Location */}
            <LocationPicker value={form.loc} onChange={v => setF('loc', v)} label="Nơi sinh" />

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(200,148,63,0.1)' }} />

            {/* Submit */}
            <div className="pt-1">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full py-4 font-bold text-sm tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, #c8943f 0%, #f0cc78 50%, #c8943f 100%)',
                  backgroundSize: '200% 200%',
                  color: '#06060f',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-vietnam)',
                  letterSpacing: '0.1em',
                  boxShadow: '0 4px 24px rgba(200,148,63,0.3)',
                  opacity: saving ? 0.7 : 1,
                  transition: 'opacity 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                {saving ? 'Đang xử lý...' : forSynastry ? 'Tiếp tục thanh toán →' : 'Tiếp tục →'}
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
