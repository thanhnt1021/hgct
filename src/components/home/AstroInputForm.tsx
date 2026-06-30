'use client'

// S3 — Lập nhanh lá số (card navy). Tên + Nơi sinh = ô text (LocationPicker).
// Ngày sinh / Giờ sinh = ô TEXT GÕ TAY có input mask: gõ số → tự chèn "-" / ":".
//   12011994 → 12-01-1994 ·  0930 → 09:30. Chặn ký tự không phải số, backspace tự lùi dấu.
// Submit: parse + validate chuỗi (không đọc dropdown). → route /ket-qua.

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LocationPicker from '@/components/profile/LocationPicker'
import { saveChart, listCharts, personLabel, type SavedChart } from '@/lib/chartStore'
import { maskDate, maskTime, dateError, timeError } from '@/lib/dateMask'

const EMPTY = {
  ten: '',
  dateStr: '',
  timeStr: '',
  unknown: false,
  loc: { address: 'Hà Nội, Việt Nam', lat: 21.0245, lon: 105.8412, tz: 'Asia/Ho_Chi_Minh' },
}

// Input mask — chỉ giữ chữ số, tự chèn dấu, không thêm dấu đuôi (tránh kẹt khi backspace)
const lbl: React.CSSProperties = {
  display: 'block', marginBottom: '0.4rem', color: 'var(--as-gold-cream)',
  fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em',
}

export default function AstroInputForm() {
  const router = useRouter()
  const [form, setForm] = useState(EMPTY)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<SavedChart[]>([])
  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { setSaved(listCharts()) }, [])

  const handleSubmit = () => {
    setErr('')
    if (!form.ten.trim()) { setErr('Vui lòng nhập tên'); return }

    const dd = form.dateStr.replace(/\D/g, '')
    if (dd.length !== 8) { setErr('Nhập đủ Ngày sinh dạng DD-MM-YYYY'); return }
    const day = +dd.slice(0, 2), month = +dd.slice(2, 4), year = +dd.slice(4, 8)
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1) { setErr('Ngày sinh không hợp lệ (ngày 1–31, tháng 1–12)'); return }

    let hour = 12, minute = 0
    if (!form.unknown) {
      const tt = form.timeStr.replace(/\D/g, '')
      if (tt.length !== 4) { setErr('Nhập đủ Giờ sinh dạng HH:MM (hoặc tích "Không biết giờ sinh")'); return }
      hour = +tt.slice(0, 2); minute = +tt.slice(2, 4)
      if (hour > 23 || minute > 59) { setErr('Giờ sinh không hợp lệ (giờ 0–23, phút 0–59)'); return }
    }

    setSaving(true)
    const data = {
      name: form.ten.trim(), ten: form.ten.trim(), gender: 'Female',
      dob: { day, month, year },
      tob: { hour, minute, unknown: form.unknown },
      loc: form.loc,
    }
    const id = saveChart(data)
    router.push(`/ket-qua/${id}`)
  }

  return (
    <section id="lap-la-so" style={{ background: 'transparent', padding: '3rem 0' }}>
      <div className="as-form-dark max-w-2xl mx-auto px-4 sm:px-6">
        <div style={{ background: '#063755', border: '1px solid var(--as-border-gold)', borderRadius: 'var(--as-radius-lg)', padding: '1.85rem', boxShadow: '0 18px 50px rgba(6,55,85,0.35)' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-gold-cream)', fontSize: 'clamp(1.4rem,3vw,1.95rem)', fontWeight: 600, textAlign: 'center', marginBottom: '1.5rem' }}>
            Lập nhanh lá số cá nhân
          </h2>

          <div className="space-y-4">
            {/* Panel lá số đã lưu */}
            <div style={{ border: '1px solid var(--as-border-gold)', borderRadius: '10px', padding: '0.85rem 1rem' }}>
              <div className="flex items-center justify-between">
                <label style={{ ...lbl, marginBottom: 0 }}>Sử dụng lá số đã lưu</label>
                <Link href="/profile" style={{ color: 'var(--as-champagne)', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', textDecoration: 'none' }}>Quản lý tất cả →</Link>
              </div>
              <select defaultValue="" aria-label="Chọn lá số đã lưu" style={{ marginTop: '0.5rem' }}
                onChange={e => {
                  const c = saved.find(x => x.id === e.target.value)
                  if (!c) return
                  // S2 = lá số cá nhân → luôn tạo bản CORES mới (3 lõi), không mở view cũ của lá số đó
                  const newId = saveChart(c.inputData as { name?: string; ten?: string }, { view: 'cores' })
                  router.push(`/ket-qua/${newId}`)
                }}>
                <option value="">{saved.length ? 'Chọn lá số đã lưu...' : 'Chưa có lá số đã lưu'}</option>
                {saved.map(c => (
                  <option key={c.id} value={c.id}>{personLabel(c)}</option>
                ))}
              </select>
            </div>
            <p style={{ color: 'rgba(247,236,217,0.6)', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', fontStyle: 'italic' }}>hoặc nhập thông tin bên dưới.</p>

            {/* Tên */}
            <div>
              <label style={lbl}>Họ và tên <span style={{ color: '#e08a8a' }}>*</span></label>
              <input type="text" value={form.ten} onChange={e => setF('ten', e.target.value)} placeholder="Biệt danh / chữ tắt" />
            </div>

            {/* Ngày sinh — ô text mask + cảnh báo realtime */}
            <div>
              <label style={lbl}>Ngày sinh <span style={{ color: '#e08a8a' }}>*</span></label>
              <input
                type="text" inputMode="numeric" value={form.dateStr}
                onChange={e => setF('dateStr', maskDate(e.target.value))}
                placeholder="DD-MM-YYYY" maxLength={10}
                style={dateError(form.dateStr) ? { borderColor: '#e08a8a' } : undefined}
              />
              {dateError(form.dateStr) && <p style={{ color: '#f0a0a0', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', marginTop: '0.3rem' }}>⚠ {dateError(form.dateStr)}</p>}
            </div>

            {/* Giờ sinh — ô text mask + checkbox + cảnh báo realtime */}
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <label style={{ ...lbl, marginBottom: 0 }}>Giờ sinh</label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={form.unknown} onChange={e => setF('unknown', e.target.checked)} style={{ width: '1rem', height: '1rem', padding: 0 }} />
                  <span style={{ color: 'var(--as-gold-cream)', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem' }}>Không biết giờ sinh</span>
                </label>
              </div>
              {!form.unknown && (<>
                <input
                  type="text" inputMode="numeric" value={form.timeStr}
                  onChange={e => setF('timeStr', maskTime(e.target.value))}
                  placeholder="HH:MM" maxLength={5}
                  style={timeError(form.timeStr) ? { borderColor: '#e08a8a' } : undefined}
                />
                {timeError(form.timeStr) && <p style={{ color: '#f0a0a0', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', marginTop: '0.3rem' }}>⚠ {timeError(form.timeStr)}</p>}
              </>)}
            </div>

            {/* Nơi sinh */}
            <LocationPicker value={form.loc} onChange={v => setF('loc', v)} label="Nơi sinh" />

            {err && <p style={{ color: '#f0a0a0', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem' }}>⚠ {err}</p>}

            <button type="button" onClick={handleSubmit} disabled={saving} className="w-full"
              style={{ background: 'var(--as-cta)', color: 'var(--as-text-on-dark)', border: 'none', borderRadius: '999px', padding: '0.8rem', fontFamily: 'var(--font-vietnam)', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.06em', cursor: 'pointer', boxShadow: 'var(--as-shadow-glow)', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Đang xử lý...' : 'Xem lá số'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
