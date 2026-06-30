'use client'

// Modal nhập thông tin riêng theo từng service (mở từ 4 nút ở S1 hero).
// Người 1 luôn nhập; Tình yêu/Mối quan hệ nhập thêm người 2.
// Submit → saveChart(view:'houses', service, inputDataB?) → /ket-qua/{id} (hiện nhà trội).

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import LocationPicker from '@/components/profile/LocationPicker'
import { saveChart, listCharts, personLabel, type SavedChart } from '@/lib/chartStore'
import { maskDate, maskTime, dateError, timeError } from '@/lib/dateMask'

export type ServiceDef = { service: string; title: string; needsTwo: boolean }

const warnStyle: React.CSSProperties = { color: '#f0a0a0', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', marginTop: '0.3rem' }

type PersonForm = { ten: string; dateStr: string; timeStr: string; unknown: boolean; loc: { address: string; lat: number; lon: number; tz: string } }
const emptyPerson = (): PersonForm => ({ ten: '', dateStr: '', timeStr: '', unknown: false, loc: { address: 'Hà Nội, Việt Nam', lat: 21.0245, lon: 105.8412, tz: 'Asia/Ho_Chi_Minh' } })

function toData(f: PersonForm): { ok: true; data: Record<string, unknown> } | { ok: false; err: string } {
  if (!f.ten.trim()) return { ok: false, err: 'Vui lòng nhập tên' }
  const dd = f.dateStr.replace(/\D/g, '')
  if (dd.length !== 8) return { ok: false, err: 'Nhập đủ Ngày sinh DD-MM-YYYY' }
  const day = +dd.slice(0, 2), month = +dd.slice(2, 4), year = +dd.slice(4, 8)
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1) return { ok: false, err: 'Ngày sinh không hợp lệ' }
  let hour = 12, minute = 0
  if (!f.unknown) {
    const tt = f.timeStr.replace(/\D/g, '')
    if (tt.length !== 4) return { ok: false, err: 'Nhập đủ Giờ sinh HH:MM hoặc tích "Không biết"' }
    hour = +tt.slice(0, 2); minute = +tt.slice(2, 4)
    if (hour > 23 || minute > 59) return { ok: false, err: 'Giờ sinh không hợp lệ' }
  }
  return { ok: true, data: { name: f.ten.trim(), ten: f.ten.trim(), gender: 'Female', dob: { day, month, year }, tob: { hour, minute, unknown: f.unknown }, loc: f.loc } }
}

const lbl: React.CSSProperties = { display: 'block', marginBottom: '0.4rem', color: 'var(--as-gold-cream)', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', fontWeight: 600 }

function PersonFields({ f, set, onForm, prefix, saved }: { f: PersonForm; set: (k: keyof PersonForm, v: unknown) => void; onForm: (pf: PersonForm) => void; prefix?: string; saved: SavedChart[] }) {
  const dErr = dateError(f.dateStr)
  const tErr = f.unknown ? '' : timeError(f.timeStr)
  return (
    <div className="space-y-4">
      {prefix && <p style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-champagne)', fontSize: '1rem', fontWeight: 600 }}>{prefix}</p>}
      {/* Lá số đã lưu — có ở MỌI người */}
      <div>
        <div className="flex items-center justify-between">
          <label style={lbl}>Sử dụng lá số đã lưu</label>
          <Link href="/profile" style={{ color: 'var(--as-champagne)', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', textDecoration: 'none' }}>Quản lý lá số →</Link>
        </div>
        <select defaultValue="" aria-label="Chọn lá số đã lưu"
          onChange={e => { const s = saved.find(x => x.id === e.target.value); if (s) onForm(fillFromSaved(s)) }}>
          <option value="">{saved.length ? 'Chọn lá số đã lưu...' : 'Chưa có lá số đã lưu'}</option>
          {saved.map(c => <option key={c.id} value={c.id}>{personLabel(c)}</option>)}
        </select>
      </div>
      <div>
        <label style={lbl}>Họ và tên <span style={{ color: '#e08a8a' }}>*</span></label>
        <input type="text" value={f.ten} onChange={e => set('ten', e.target.value)} placeholder="Biệt danh / chữ tắt" />
      </div>
      <div>
        <label style={lbl}>Ngày sinh <span style={{ color: '#e08a8a' }}>*</span></label>
        <input type="text" inputMode="numeric" value={f.dateStr} onChange={e => set('dateStr', maskDate(e.target.value))} placeholder="DD-MM-YYYY" maxLength={10}
          style={dErr ? { borderColor: '#e08a8a' } : undefined} />
        {dErr && <p style={warnStyle}>⚠ {dErr}</p>}
      </div>
      <div>
        <div className="flex items-center gap-3 mb-1.5">
          <label style={{ ...lbl, marginBottom: 0 }}>Giờ sinh</label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={f.unknown} onChange={e => set('unknown', e.target.checked)} style={{ width: '1rem', height: '1rem', padding: 0 }} />
            <span style={{ color: 'var(--as-gold-cream)', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem' }}>Không biết giờ sinh</span>
          </label>
        </div>
        {!f.unknown && <>
          <input type="text" inputMode="numeric" value={f.timeStr} onChange={e => set('timeStr', maskTime(e.target.value))} placeholder="HH:MM" maxLength={5}
            style={tErr ? { borderColor: '#e08a8a' } : undefined} />
          {tErr && <p style={warnStyle}>⚠ {tErr}</p>}
        </>}
      </div>
      <LocationPicker value={f.loc} onChange={v => set('loc', v)} label="Nơi sinh" />
    </div>
  )
}

// Đổ dữ liệu lá số đã lưu (inputData) vào form người 1
function fillFromSaved(saved: SavedChart): PersonForm {
  const d = saved.inputData as { ten?: string; name?: string; dob?: { day: number; month: number; year: number }; tob?: { hour: number; minute: number; unknown?: boolean }; loc?: { address: string; lat: number; lon: number; tz: string } }
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    ten: d.ten || d.name || '',
    dateStr: d.dob ? `${pad(d.dob.day)}-${pad(d.dob.month)}-${d.dob.year}` : '',
    timeStr: d.tob && !d.tob.unknown ? `${pad(d.tob.hour)}:${pad(d.tob.minute)}` : '',
    unknown: !!d.tob?.unknown,
    loc: d.loc || emptyPerson().loc,
  }
}

export default function AstroServiceModal({ def, onClose }: { def: ServiceDef; onClose: () => void }) {
  const router = useRouter()
  const [a, setA] = useState<PersonForm>(emptyPerson())
  const [b, setB] = useState<PersonForm>(emptyPerson())
  const [saved, setSaved] = useState<SavedChart[]>([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const setAk = (k: keyof PersonForm, v: unknown) => setA(s => ({ ...s, [k]: v }))
  const setBk = (k: keyof PersonForm, v: unknown) => setB(s => ({ ...s, [k]: v }))

  useEffect(() => { setSaved(listCharts()) }, [])

  const submit = () => {
    setErr('')
    const ra = toData(a)
    if (!ra.ok) { setErr(ra.err); return }
    let inputDataB: Record<string, unknown> | undefined
    if (def.needsTwo) {
      const rb = toData(b)
      if (!rb.ok) { setErr('Người thứ hai: ' + rb.err); return }
      inputDataB = rb.data
    }
    setBusy(true)
    // Tình duyên → gu tình yêu (love); Cặp đôi → an toàn kết nối (synastry); còn lại → nhà trội (houses)
    const view = def.service === 'love' ? 'love' : def.service === 'synastry' ? 'synastry' : def.service === 'transit' ? 'transit' : 'houses'
    const id = saveChart(ra.data as { name?: string; ten?: string }, { view, service: def.service, inputDataB })
    router.push(`/ket-qua/${id}`)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(22,54,83,0.5)' }}
      onClick={onClose}
    >
      <div
        className="as-form-dark w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ background: '#063755', border: '1px solid var(--as-border-gold)', borderRadius: 'var(--as-radius-lg)', padding: '1.75rem', boxShadow: '0 18px 50px rgba(22,54,83,0.45)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4 gap-3">
          <h2 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-gold-cream)', fontSize: 'clamp(1.25rem,3vw,1.7rem)', fontWeight: 600 }}>{def.title}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng"
            style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '999px', border: '1px solid var(--as-border-gold)', color: 'var(--as-gold-cream)', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}>✕</button>
        </div>

        <PersonFields f={a} set={setAk} onForm={setA} saved={saved} prefix={def.needsTwo ? 'Người thứ nhất (bạn)' : undefined} />

        {def.needsTwo && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--as-border-gold)' }}>
            <PersonFields f={b} set={setBk} onForm={setB} saved={saved} prefix="Người thứ hai" />
          </div>
        )}

        {err && <p style={{ color: '#f0a0a0', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem', marginTop: '1rem' }}>⚠ {err}</p>}

        <button type="button" onClick={submit} disabled={busy} className="w-full"
          style={{ marginTop: '1.5rem', background: 'var(--as-cta)', color: 'var(--as-text-on-dark)', border: 'none', borderRadius: '999px', padding: '0.8rem', fontFamily: 'var(--font-vietnam)', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', boxShadow: 'var(--as-shadow-glow)', opacity: busy ? 0.7 : 1 }}>
          {busy ? 'Đang xử lý...' : 'Xem bản đồ sao'}
        </button>
      </div>
    </div>
  )
}
