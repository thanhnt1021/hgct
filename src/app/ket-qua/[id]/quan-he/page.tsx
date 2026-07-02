'use client'

// Người thứ 2 cho Mối quan hệ cặp đôi (service synastry).
// Người A lấy từ chartStore theo id; nhập người B + chọn dạng → tính combined profileUid
// + lưu previewInput{inputData, inputDataB} → /reading/[uid]/[service]. PRD: Mối quan hệ/Cặp đôi.

import { useState, useEffect } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import LocationPicker from '@/components/profile/LocationPicker'
import Link from 'next/link'
import { getChart, saveChart, listCharts, listCouples, coupleLabel, personLabel, type SavedChart } from '@/lib/chartStore'
import { maskDate, maskTime, dateError, timeError } from '@/lib/dateMask'
import { useParams } from 'next/navigation'

const pad2 = (n: number) => String(n).padStart(2, '0')

type PInput = { name?: string; ten?: string; gender?: string; dob: { day: number; month: number; year: number }; tob: { hour: number; minute: number; unknown?: boolean }; loc: { address: string; lat: number; lon: number; tz: string } }

const lbl: React.CSSProperties = { display: 'block', marginBottom: '0.4rem', color: 'var(--as-gold-cream)', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', fontWeight: 600 }

export default function QuanHePage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string
  const [personA, setPersonA] = useState<PInput | null>(null)
  const service = 'synastry'  // Mối quan hệ cặp đôi → Cặp đôi (bỏ các loại relations cũ)
  const [form, setForm] = useState({ ten: '', dateStr: '', timeStr: '', unknown: false, loc: { address: 'Hà Nội, Việt Nam', lat: 21.0245, lon: 105.8412, tz: 'Asia/Ho_Chi_Minh' } })
  const [saved, setSaved] = useState<SavedChart[]>([])
  const [couples, setCouples] = useState<SavedChart[]>([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    const sv = getChart(id)
    if (sv) setPersonA(sv.inputData as PInput)
    else setErr('Không tìm thấy lá số người thứ nhất (có thể đã xoá cache).')
    const refresh = () => { setSaved(listCharts()); setCouples(listCouples()) }
    refresh()
    // Khi AuthContext sync xong lá số từ DB → nạp lại danh sách (cặp đôi đã lưu ở thiết bị khác cũng hiện).
    window.addEventListener('charts-synced', refresh)
    return () => window.removeEventListener('charts-synced', refresh)
  }, [id])

  const pickSaved = (sid: string) => {
    const s = saved.find(x => x.id === sid); if (!s) return
    const d = s.inputData as PInput
    setForm({ ten: d.ten || d.name || '', dateStr: d.dob ? `${pad2(d.dob.day)}-${pad2(d.dob.month)}-${d.dob.year}` : '', timeStr: d.tob && !d.tob.unknown ? `${pad2(d.tob.hour)}:${pad2(d.tob.minute)}` : '', unknown: !!d.tob?.unknown, loc: d.loc })
  }

  const submit = async () => {
    setErr('')
    if (!personA) { setErr('Thiếu lá số người thứ nhất'); return }
    if (!form.ten.trim()) { setErr('Nhập tên người thứ hai'); return }
    const dd = form.dateStr.replace(/\D/g, '')
    if (dd.length !== 8) { setErr('Nhập đủ Ngày sinh DD-MM-YYYY'); return }
    const day = +dd.slice(0, 2), month = +dd.slice(2, 4), year = +dd.slice(4, 8)
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1) { setErr('Ngày sinh không hợp lệ'); return }
    let hour = 12, minute = 0
    if (!form.unknown) {
      const tt = form.timeStr.replace(/\D/g, '')
      if (tt.length !== 4) { setErr('Nhập đủ Giờ sinh HH:MM hoặc tích "Không biết"'); return }
      hour = +tt.slice(0, 2); minute = +tt.slice(2, 4)
      if (hour > 23 || minute > 59) { setErr('Giờ sinh không hợp lệ'); return }
    }
    setBusy(true)
    const inputDataB: PInput = { name: form.ten.trim(), ten: form.ten.trim(), gender: 'Female', dob: { day, month, year }, tob: { hour, minute, unknown: form.unknown }, loc: form.loc }
    const a: PInput = { ...personA, name: personA.name || personA.ten || '' }
    // Tạo trang ket-qua synastry mới (bản đồ kết nối + an toàn + mở khóa xu)
    const newId = saveChart(a as { name?: string; ten?: string }, { view: 'synastry', service, inputDataB })
    window.location.href = `/ket-qua/${newId}`
  }

  return (
    <main className="relative min-h-screen" style={{ background: 'linear-gradient(180deg, #edd5b1 0%, #e3c89a 100%)' }}>
      <Navbar />
      <div className="as-form-dark max-w-2xl mx-auto px-4 sm:px-6 pt-24 pb-12">
        <div style={{ background: '#063755', border: '1px solid var(--as-border-gold)', borderRadius: 'var(--as-radius-lg)', padding: '1.85rem', boxShadow: '0 18px 50px rgba(22,54,83,0.35)' }}>
          <h1 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-gold-cream)', fontSize: 'clamp(1.4rem,3vw,1.95rem)', fontWeight: 600, textAlign: 'center', marginBottom: '1.5rem' }}>
            Mối quan hệ cặp đôi, Người thứ hai
          </h1>

          {/* Cặp đôi đã lưu → mở lại thẳng kết quả (giữ nội dung đã mua, không tính phí lại) */}
          {couples.length > 0 && (
            <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--as-border-gold)' }}>
              <label style={lbl}>Xem lại cặp đôi đã lưu</label>
              <div className="flex flex-col gap-2">
                {couples.map(c => (
                  <button key={c.id} type="button" onClick={() => { window.location.href = `/ket-qua/${c.id}` }}
                    className="text-left w-full"
                    style={{ background: 'rgba(247,236,217,0.06)', border: '1px solid var(--as-border-gold)', borderRadius: 'var(--as-radius-md)', padding: '0.7rem 0.9rem', cursor: 'pointer', color: 'var(--as-gold-cream)', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', fontWeight: 600 }}>
                    ☍ {coupleLabel(c)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label style={lbl}>Sử dụng lá số đã lưu (người 2)</label>
                <Link href="/profile" style={{ color: 'var(--as-champagne)', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', textDecoration: 'none' }}>Quản lý lá số →</Link>
              </div>
              <select defaultValue="" aria-label="Chọn lá số đã lưu" onChange={e => pickSaved(e.target.value)} style={{ marginBottom: '1rem' }}>
                <option value="">{saved.length ? 'Chọn lá số đã lưu...' : 'Chưa có lá số đã lưu'}</option>
                {saved.map(c => <option key={c.id} value={c.id}>{personLabel(c)}</option>)}
              </select>
              <label style={lbl}>Họ và tên người thứ hai <span style={{ color: '#e08a8a' }}>*</span></label>
              <input type="text" value={form.ten} onChange={e => setF('ten', e.target.value)} placeholder="Biệt danh / chữ tắt" />
            </div>
            <div>
              <label style={lbl}>Ngày sinh <span style={{ color: '#e08a8a' }}>*</span></label>
              <input type="text" inputMode="numeric" value={form.dateStr} onChange={e => setF('dateStr', maskDate(e.target.value))} placeholder="DD-MM-YYYY" maxLength={10}
                style={dateError(form.dateStr) ? { borderColor: '#e08a8a' } : undefined} />
              {dateError(form.dateStr) && <p style={{ color: '#f0a0a0', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', marginTop: '0.3rem' }}>⚠ {dateError(form.dateStr)}</p>}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <label style={{ ...lbl, marginBottom: 0 }}>Giờ sinh</label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={form.unknown} onChange={e => setF('unknown', e.target.checked)} style={{ width: '1rem', height: '1rem', padding: 0 }} />
                  <span style={{ color: 'var(--as-gold-cream)', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem' }}>Không biết giờ sinh</span>
                </label>
              </div>
              {!form.unknown && (<>
                <input type="text" inputMode="numeric" value={form.timeStr} onChange={e => setF('timeStr', maskTime(e.target.value))} placeholder="HH:MM" maxLength={5}
                  style={timeError(form.timeStr) ? { borderColor: '#e08a8a' } : undefined} />
                {timeError(form.timeStr) && <p style={{ color: '#f0a0a0', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', marginTop: '0.3rem' }}>⚠ {timeError(form.timeStr)}</p>}
              </>)}
            </div>
            <LocationPicker value={form.loc} onChange={v => setF('loc', v)} label="Nơi sinh" />
            {err && <p style={{ color: '#f0a0a0', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem' }}>⚠ {err}</p>}
            <button type="button" onClick={submit} disabled={busy} className="w-full"
              style={{ background: 'var(--as-cta)', color: 'var(--as-text-on-dark)', border: 'none', borderRadius: '999px', padding: '0.8rem', fontFamily: 'var(--font-vietnam)', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', boxShadow: 'var(--as-shadow-glow)', opacity: busy ? 0.7 : 1 }}>
              {busy ? 'Đang xử lý...' : 'Xem luận giải mối quan hệ'}
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
