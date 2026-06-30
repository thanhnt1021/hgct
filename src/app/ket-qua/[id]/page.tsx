'use client'

// Route kết quả theo ID — /ket-qua/[id]. Lá số lưu trong browser cache (localStorage),
// link riêng cho từng người, không cần đăng nhập. PRD §5.3.b.
// Bản đồ sao (vẽ kiểu PDF) TRƯỚC + thông tin cá nhân + 3 cột lõi (free) + 4 luận giải (tốn xu).

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ReadingClient from '@/app/reading/[profileUid]/[service]/ReadingClient'
import { getChart, saveChart } from '@/lib/chartStore'

type Core = { key: string; label: string; sign: string; text: string }
type House = { house: number; label: string; score: number; text: string }
type LoveItem = { key: string; label: string; text: string }
type MoonSafety = { name: string; sign: string; text: string }
type TransitItem = { key: string; label: string; sub: string; text: string }

// view tương ứng mỗi service (khi bấm thẻ ở ket-qua chế độ cores)
const VIEW_FOR: Record<string, 'houses' | 'love' | 'synastry' | 'transit'> = {
  career: 'houses', love: 'love', synastry: 'synastry', transit: 'transit',
}
type Input = { name?: string; ten?: string; gender?: string; dob: { day: number; month: number; year: number }; tob: { hour: number; minute: number; unknown?: boolean }; loc: { address: string; lat: number; lon: number; tz: string } }

const READINGS = [
  { label: 'Sự nghiệp & Tài chính', service: 'career', price: 600, rel: false, icon: '✦', desc: 'Định hướng sự nghiệp, tối ưu tài năng và thu hút tài lộc.' },
  { label: 'Tình duyên cá nhân', service: 'love', price: 300, rel: false, icon: '❤', desc: 'Bản đồ tình cảm cá nhân: bạn yêu thế nào, cần gì và bài học tình duyên của bạn.' },
  { label: 'Mối quan hệ cặp đôi', service: 'synastry', price: 800, rel: true, icon: '☍', desc: 'So sánh hai bản đồ sao để hiểu sự kết nối, điểm hòa hợp và khác biệt giữa hai bạn.' },
  { label: 'Vận hạn', service: 'transit', price: 400, rel: false, icon: '☾', desc: 'Dự báo vận hạn, nắm bắt cơ hội và hóa giải thách thức.' },
]

const pad = (n: number) => String(n).padStart(2, '0')

// Mirror server-side profileHash() — phải ra 16 hex giống hệt để /reading lookup đúng cache+DB.
async function computeProfileUid(input: Input & { name?: string }, inputB?: Input): Promise<string> {
  const norm = (i: Input & { name?: string }) => ({
    n: i.name || i.ten || '',
    g: i.gender || '',
    d: `${i.dob.year}-${i.dob.month}-${i.dob.day}`,
    t: i.tob.unknown ? 'u' : `${i.tob.hour}:${i.tob.minute}`,
    l: `${i.loc.lat.toFixed(4)},${i.loc.lon.toFixed(4)},${i.loc.tz}`,
  })
  const payload = inputB ? [norm(input), norm(inputB)] : [norm(input)]
  const enc = new TextEncoder().encode(JSON.stringify(payload))
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

export default function KetQuaPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string
  const [input, setInput] = useState<Input | null>(null)
  const [svg, setSvg] = useState('')
  const [cores, setCores] = useState<Core[]>([])
  const [houses, setHouses] = useState<House[]>([])
  const [love, setLove] = useState<LoveItem[]>([])
  const [moonSafety, setMoonSafety] = useState<MoonSafety[]>([])
  const [transit, setTransit] = useState<TransitItem[]>([])
  const [view, setView] = useState<'cores' | 'houses' | 'love' | 'synastry' | 'transit'>('cores')
  const [inputB, setInputB] = useState<Input | null>(null)
  const [service, setService] = useState<string>('')
  const [readingUid, setReadingUid] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  // Bấm 1 trong 4 thẻ ở ket-qua (chế độ cores) → mở TRANG KET-QUA ĐẦY ĐỦ của service đó.
  // Cặp đôi cần người thứ 2 → sang trang nhập người 2 (rồi tạo ket-qua synastry).
  function goReading(service: string, rel: boolean) {
    if (!input) return
    if (rel) { window.location.href = `/ket-qua/${id}/quan-he`; return }
    const newId = saveChart(input as { name?: string; ten?: string }, { view: VIEW_FOR[service] || 'houses', service })
    window.location.href = `/ket-qua/${newId}`
  }

  useEffect(() => {
    const saved = getChart(id)
    if (!saved) { setErr('Không tìm thấy lá số này trong trình duyệt (có thể đã xoá cache).'); setLoading(false); return }
    const data = saved.inputData as Input
    const dataB = (saved.inputDataB as Input) || null
    const v = (['houses', 'love', 'synastry', 'transit'] as const).find(x => x === saved.view) || 'cores'
    setInput(data); setInputB(dataB); setView(v); setService(saved.service || '')

    // Service mode → chuẩn bị embed trang luận giải (unlock xu) ngay trong ket-qua
    if (v !== 'cores' && saved.service) {
      const a = { ...data, name: data.name || data.ten || '' }
      const b = dataB ? { ...dataB, name: dataB.name || dataB.ten || '' } : undefined
      computeProfileUid(a, b).then(uid => {
        try { localStorage.setItem(`previewInput:${uid}`, JSON.stringify(b ? { inputData: a, inputDataB: b } : { inputData: a })) } catch { /* quota */ }
        setReadingUid(uid)
      })
    }

    fetch('/api/ket-qua', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inputData: data, inputDataB: dataB, view: v }) })
      .then(r => r.json())
      .then(d => { if (d.error) setErr(d.error); else { setSvg(d.svg); setCores(d.cores || []); setHouses(d.houses || []); setLove(d.love || []); setMoonSafety(d.moonSafety || []); setTransit(d.transit || []) } })
      .catch(() => setErr('Không tải được kết quả'))
      .finally(() => setLoading(false))
  }, [id])

  const infoOf = (p: Input | null): [string, string][] => p ? [
    ['Tên', p.name || p.ten || ''],
    ['Ngày tháng năm sinh', `${pad(p.dob.day)}/${pad(p.dob.month)}/${p.dob.year}`],
    ['Giờ sinh', p.tob.unknown ? 'Không rõ' : `${pad(p.tob.hour)}:${pad(p.tob.minute)}`],
    ['Nơi sinh', p.loc.address || ''],
  ] : []

  return (
    <main className="relative min-h-screen" style={{ background: 'linear-gradient(180deg, #edd5b1 0%, #e3c89a 100%)' }}>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">

        <div className="flex items-center justify-between mb-6">
          <h1 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-text-strong)', fontSize: 'clamp(1.5rem,3vw,2.1rem)', fontWeight: 600 }}>
            {inputB ? 'Bản đồ sao kết nối' : 'Bản đồ sao của bạn'}
          </h1>
          <Link href="/#lap-la-so" style={{ fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--as-copper-deep)', border: '1px solid var(--as-border-gold)', padding: '0.45rem 1rem', borderRadius: '999px', textDecoration: 'none' }}>
            ✎ Sửa
          </Link>
        </div>

        {loading && <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-text)' }}>Đang lập bản đồ sao…</p>}
        {err && (
          <div>
            <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--danger)' }}>⚠ {err}</p>
            <Link href="/#lap-la-so" style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-cta)', fontWeight: 600 }}>← Lập lá số mới</Link>
          </div>
        )}

        {!loading && !err && (
          <>
            <div className="grid lg:grid-cols-3 gap-5 items-start">
              <div className="lg:col-span-2" style={{ background: 'var(--as-surface)', border: '1px solid var(--as-border-gold)', borderRadius: 'var(--as-radius-lg)', padding: '1rem', boxShadow: 'var(--as-shadow-card)' }}>
                <div style={{ width: '100%' }} dangerouslySetInnerHTML={{ __html: svg }} />
              </div>
              <div style={{ background: '#063755', border: '1px solid var(--as-border-gold)', borderRadius: 'var(--as-radius-lg)', padding: '1.5rem' }}>
                <h2 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-gold-cream)', fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem' }}>Thông tin cá nhân</h2>
                {(inputB ? [['Người thứ nhất', input], ['Người thứ hai', inputB]] as [string, Input][] : [['', input]] as [string, Input | null][]).map(([grp, p], gi) => (
                  <div key={gi} style={{ marginTop: gi ? '1rem' : 0, paddingTop: gi ? '1rem' : 0, borderTop: gi ? '1px solid var(--as-border-gold)' : 'none' }}>
                    {grp && <p style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-champagne)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.6rem' }}>{grp}</p>}
                    {infoOf(p).map(([k, v]) => (
                      <div key={k} style={{ marginBottom: '0.7rem' }}>
                        <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-champagne)', fontSize: '0.7rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{k}</p>
                        <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-text-on-dark)', fontSize: '0.92rem', fontWeight: 600 }}>{v || '—'}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* houses = nhà trội (mỗi nhà 1 hàng) · love = gu tình yêu (3 cục) · cores = 3 lõi */}
            {view === 'houses' ? (
              houses.length > 0 && (
                <>
                  <h2 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-text-strong)', fontSize: 'clamp(1.3rem,2.6vw,1.8rem)', fontWeight: 600, textAlign: 'center', margin: '3rem 0 1.5rem' }}>
                    Các lĩnh vực bạn quan tâm
                  </h2>
                  {/* Mỗi nhà 1 hàng full-width → bố cục đẹp dù trội bao nhiêu nhà */}
                  <div className="flex flex-col gap-4">
                    {houses.map(h => (
                      <div key={h.house} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5" style={{ background: 'var(--as-surface)', border: '1px solid var(--as-border-soft)', borderRadius: 'var(--as-radius-lg)', padding: '1.25rem 1.5rem', boxShadow: 'var(--as-shadow-card)' }}>
                        <div className="sm:w-44 shrink-0">
                          <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-gold)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Lĩnh vực nổi bật</p>
                          <h3 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-text-strong)', fontSize: '1.25rem', fontWeight: 600 }}>{h.label}</h3>
                        </div>
                        <p className="flex-1" style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-text)', fontSize: '0.9rem', lineHeight: 1.65 }}>{h.text || 'Đang cập nhật mô tả.'}</p>
                      </div>
                    ))}
                  </div>
                </>
              )
            ) : view === 'love' ? (
              love.length > 0 && (
                <>
                  <h2 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-text-strong)', fontSize: 'clamp(1.3rem,2.6vw,1.8rem)', fontWeight: 600, textAlign: 'center', margin: '3rem 0 1.5rem' }}>
                    Gu tình yêu của bạn
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {love.map(l => (
                      <div key={l.key} style={{ background: 'var(--as-surface)', border: '1px solid var(--as-border-soft)', borderRadius: 'var(--as-radius-lg)', padding: '1.5rem', boxShadow: 'var(--as-shadow-card)' }}>
                        <h3 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-text-strong)', fontSize: '1.2rem', fontWeight: 600, margin: '0 0 0.6rem' }}>{l.label}</h3>
                        <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-text)', fontSize: '0.9rem', lineHeight: 1.65 }}>{l.text || 'Đang cập nhật mô tả.'}</p>
                      </div>
                    ))}
                  </div>
                </>
              )
            ) : view === 'synastry' ? (
              moonSafety.length > 0 && (
                <>
                  <h2 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-text-strong)', fontSize: 'clamp(1.3rem,2.6vw,1.8rem)', fontWeight: 600, textAlign: 'center', margin: '3rem 0 1.5rem' }}>
                    Cảm Giác An Toàn trong Kết Nối
                  </h2>
                  {/* 2 cục 2 bên — cảm giác an toàn theo Mặt Trăng từng người */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {moonSafety.map((m, mi) => (
                      <div key={mi} style={{ background: 'var(--as-surface)', border: '1px solid var(--as-border-soft)', borderRadius: 'var(--as-radius-lg)', padding: '1.5rem', boxShadow: 'var(--as-shadow-card)' }}>
                        <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-gold)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{m.name || (mi === 0 ? 'Người thứ nhất' : 'Người thứ hai')}</p>
                        <h3 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-text-strong)', fontSize: '1.2rem', fontWeight: 600, margin: '0.2rem 0 0.6rem' }}>Mặt trăng {m.sign}</h3>
                        <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-text)', fontSize: '0.9rem', lineHeight: 1.7 }}>{m.text || 'Đang cập nhật mô tả.'}</p>
                      </div>
                    ))}
                  </div>
                </>
              )
            ) : view === 'transit' ? (
              transit.length > 0 && (
                <>
                  <h2 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-text-strong)', fontSize: 'clamp(1.3rem,2.6vw,1.8rem)', fontWeight: 600, textAlign: 'center', margin: '3rem 0 1.5rem' }}>
                    Vận hạn năm nay
                  </h2>
                  {/* 2 cục: Thách thức (Sao Thổ) + Thuận lợi (Sao Mộc) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {transit.map(t => (
                      <div key={t.key} style={{ background: 'var(--as-surface)', border: '1px solid var(--as-border-soft)', borderRadius: 'var(--as-radius-lg)', padding: '1.5rem', boxShadow: 'var(--as-shadow-card)' }}>
                        <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-gold)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t.sub}</p>
                        <h3 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-text-strong)', fontSize: '1.25rem', fontWeight: 600, margin: '0.2rem 0 0.6rem' }}>{t.label}</h3>
                        <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-text)', fontSize: '0.9rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{t.text || 'Đang cập nhật mô tả.'}</p>
                      </div>
                    ))}
                  </div>
                </>
              )
            ) : (
              <>
                <h2 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-text-strong)', fontSize: 'clamp(1.3rem,2.6vw,1.8rem)', fontWeight: 600, textAlign: 'center', margin: '3rem 0 1.5rem' }}>
                  Ba lõi tính cách của bạn
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {cores.map(c => (
                    <div key={c.key} style={{ background: 'var(--as-surface)', border: '1px solid var(--as-border-soft)', borderRadius: 'var(--as-radius-lg)', padding: '1.5rem', boxShadow: 'var(--as-shadow-card)' }}>
                      <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-gold)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{c.label}</p>
                      <h3 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-text-strong)', fontSize: '1.3rem', fontWeight: 600, margin: '0.25rem 0 0.6rem' }}>{c.sign}</h3>
                      <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-text)', fontSize: '0.9rem', lineHeight: 1.65 }}>{c.text || 'Đang cập nhật mô tả.'}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            <h2 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-text-strong)', fontSize: 'clamp(1.3rem,2.6vw,1.8rem)', fontWeight: 600, textAlign: 'center', margin: '3rem 0 1.5rem' }}>
              Luận giải chuyên sâu
            </h2>

            {/* S2 (cores) → 4 thẻ khóa chọn loại. Service mode → mở khóa xu ngay tại đây (nội dung trang /reading). */}
            {view === 'cores' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {READINGS.map(r => (
                  <button key={r.service} type="button" onClick={() => goReading(r.service, r.rel)}
                    className="text-left"
                    style={{ position: 'relative', background: '#063755', border: '1px solid var(--as-border-gold)', borderRadius: 'var(--as-radius-lg)', padding: '1.5rem', cursor: 'pointer', display: 'block', width: '100%' }}>
                    <span aria-hidden style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--as-champagne)', fontSize: '1.05rem', opacity: 0.9 }}>🔒</span>
                    <div aria-hidden style={{ fontSize: '1.5rem', color: 'var(--as-champagne)', marginBottom: '0.5rem' }}>{r.icon}</div>
                    <h3 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-gold-cream)', fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem', paddingRight: '1.5rem' }}>{r.label}</h3>
                    <p style={{ fontFamily: 'var(--font-vietnam)', color: 'rgba(247,236,217,0.8)', fontSize: '0.85rem', lineHeight: 1.55, marginBottom: '0.9rem' }}>{r.desc}</p>
                    <span style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-champagne)', fontSize: '0.82rem', fontWeight: 600, border: '1px solid var(--as-border-gold)', borderRadius: '999px', padding: '0.35rem 0.9rem', display: 'inline-block' }}>
                      🔒 từ {r.price.toLocaleString('vi-VN')} xu
                    </span>
                  </button>
                ))}
              </div>
            ) : readingUid && service ? (
              <ReadingClient profileUid={readingUid} service={service} embedded />
            ) : (
              <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-text-muted)', textAlign: 'center' }}>Đang chuẩn bị nội dung luận giải…</p>
            )}
          </>
        )}
      </div>
      <Footer />
    </main>
  )
}
