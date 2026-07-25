'use client'

// [F4 — V4] Route MỚI — view "3 lõi cơ bản" + 4 thẻ luận giải khoá xu (format giống hệt
// /ket-qua/[id] chế độ "cores") cho profile ĐÃ LƯU trong DB (không phải lá số tạm trong
// localStorage như /ket-qua/[id] — xem A-F4.d Task 0). Sửa sau phản hồi Chủ nhà: bản đầu
// thiếu 4 thẻ khoá — /ket-qua/[id]:258-278 xác nhận format mới LUÔN có "Luận giải chuyên sâu".
// Bảo mật: KHÔNG có API riêng nhận profileUid — dùng lại GET /api/profiles (chỉ trả hồ sơ
// của chính user đăng nhập) rồi lọc theo profileUid ở client, tránh IDOR đoán UID người khác.
// readingUid = profileHash(inputData) — PHẢI khác profileUid (random UUID của bảng profiles) vì
// /reading/[profileUid]/[service] + Reading/unlock DB key theo hash này (src/lib/essay/key.ts),
// không phải UUID lưu hồ sơ — xem computeProfileUid, mirror y hệt /ket-qua/[id]:38-50.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useAuth } from '@/contexts/AuthContext'

type Core = { key: string; label: string; sign: string; text: string }
type Input = { name?: string; gender?: string; dob: { day: number; month: number; year: number }; tob: { hour: number; minute: number; unknown?: boolean }; loc: { address: string; lat: number; lon: number; tz: string } }

const pad = (n: number) => String(n).padStart(2, '0')

const READINGS = [
  { label: 'Sự nghiệp & Tài chính', service: 'career', price: 600, rel: false, icon: '✦', desc: 'Định hướng sự nghiệp, tối ưu tài năng và thu hút tài lộc.' },
  { label: 'Tình duyên cá nhân', service: 'love', price: 300, rel: false, icon: '❤', desc: 'Bản đồ tình cảm cá nhân: bạn yêu thế nào, cần gì và bài học tình duyên của bạn.' },
  { label: 'Mối quan hệ cặp đôi', service: 'synastry', price: 800, rel: true, icon: '☍', desc: 'So sánh hai bản đồ sao để hiểu sự kết nối, điểm hòa hợp và khác biệt giữa hai bạn.' },
  { label: 'Vận hạn', service: 'transit', price: 400, rel: false, icon: '☾', desc: 'Dự báo vận hạn, nắm bắt cơ hội và hóa giải thách thức.' },
]

// Mirror server-side profileHash() (src/lib/essay/key.ts) — phải ra 16 hex giống hệt để
// /reading/[profileUid]/[service] lookup đúng cache/DB unlock. Copy y hệt /ket-qua/[id]:38-50.
async function computeProfileUid(input: Input & { name?: string }): Promise<string> {
  const norm = (i: Input & { name?: string }) => ({
    n: i.name || '',
    g: i.gender || '',
    d: `${i.dob.year}-${i.dob.month}-${i.dob.day}`,
    t: i.tob.unknown ? 'u' : `${i.tob.hour}:${i.tob.minute}`,
    l: `${i.loc.lat.toFixed(4)},${i.loc.lon.toFixed(4)},${i.loc.tz}`,
  })
  const enc = new TextEncoder().encode(JSON.stringify([norm(input)]))
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

export default function KetQuaProfilePage() {
  const params = useParams<{ profileUid: string }>()
  const profileUid = params?.profileUid as string
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  const [input, setInput] = useState<Input | null>(null)
  const [svg, setSvg] = useState('')
  const [cores, setCores] = useState<Core[]>([])
  const [readingUid, setReadingUid] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  // Bấm 1 trong 4 thẻ khoá → mở trang luận giải (unlock xu) đúng service đó.
  // Cặp đôi cần người thứ 2 → sang luồng nhập input có sẵn (?for=synastry), không unlock trực tiếp.
  function goReading(service: string, rel: boolean) {
    if (rel) { router.push('/input?for=synastry'); return }
    if (!readingUid) return
    router.push(`/reading/${readingUid}/${service}`)
  }

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push(`/auth/login?next=${encodeURIComponent(`/ket-qua/profile/${profileUid}`)}`); return }

    fetch('/api/profiles', { cache: 'no-store' })
      .then(r => r.json())
      .then(async (data: { profiles?: any[] }) => {
        const p = data.profiles?.find(x => x.profileUid === profileUid)
        if (!p) { setErr('Không tìm thấy hồ sơ này (có thể đã bị xoá).'); setLoading(false); return }

        const d = p.data || {}
        const inputData: Input = {
          name: p.name,
          gender: p.gender || 'Female',
          dob: d.dob || { day: 0, month: 0, year: 0 },
          tob: d.tob || { hour: -1, minute: -1, unknown: false },
          loc: d.loc || { address: 'Hà Nội', lat: 21.02, lon: 105.84, tz: 'Asia/Ho_Chi_Minh' },
        }
        setInput(inputData)

        // Hash ổn định (không phải UUID profiles.profileUid) để /reading lookup đúng cache/DB —
        // seed localStorage previewInput giống hệt /ket-qua/[id]:91-93 để ReadingClient đọc được.
        computeProfileUid(inputData).then(uid => {
          try { localStorage.setItem(`previewInput:${uid}`, JSON.stringify({ inputData })) } catch { /* quota */ }
          setReadingUid(uid)
        })

        const res = await fetch('/api/ket-qua', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputData, view: 'cores' }),
        })
        const rd = await res.json()
        if (rd.error) setErr(rd.error)
        else { setSvg(rd.svg); setCores(rd.cores || []) }
        setLoading(false)
      })
      .catch(() => { setErr('Không tải được kết quả'); setLoading(false) })
  }, [profileUid, user, authLoading, router])

  const infoOf = (p: Input | null): [string, string][] => p ? [
    ['Tên', p.name || ''],
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
            Bản đồ sao của bạn
          </h1>
          <Link href="/profile?tab=charts" style={{ fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--as-copper-deep)', border: '1px solid var(--as-border-gold)', padding: '0.45rem 1rem', borderRadius: '999px', textDecoration: 'none' }}>
            ← Danh sách bản đồ sao
          </Link>
        </div>

        {(authLoading || loading) && <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-text)' }}>Đang lập bản đồ sao…</p>}
        {!loading && err && (
          <div>
            <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--danger)' }}>⚠ {err}</p>
            <Link href="/profile?tab=charts" style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-cta)', fontWeight: 600 }}>← Về danh sách bản đồ sao</Link>
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
                {infoOf(input).map(([k, v]) => (
                  <div key={k} style={{ marginBottom: '0.7rem' }}>
                    <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-champagne)', fontSize: '0.7rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{k}</p>
                    <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-text-on-dark)', fontSize: '0.92rem', fontWeight: 600 }}>{v || '—'}</p>
                  </div>
                ))}
              </div>
            </div>

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

            <h2 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-text-strong)', fontSize: 'clamp(1.3rem,2.6vw,1.8rem)', fontWeight: 600, textAlign: 'center', margin: '3rem 0 1.5rem' }}>
              Luận giải chuyên sâu
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {READINGS.map(r => (
                <button key={r.service} type="button" onClick={() => goReading(r.service, r.rel)}
                  disabled={!r.rel && !readingUid}
                  className="text-left"
                  style={{ position: 'relative', background: '#063755', border: '1px solid var(--as-border-gold)', borderRadius: 'var(--as-radius-lg)', padding: '1.5rem', cursor: (!r.rel && !readingUid) ? 'wait' : 'pointer', display: 'block', width: '100%' }}>
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
          </>
        )}
      </div>
      <Footer />
    </main>
  )
}
