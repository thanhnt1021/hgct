'use client'

// Reading client — locked catalog at mount, no auto-stream. inputData comes
// from localStorage keyed by profileUid (each profile has its own storage slot).
// Unlock click → /api/coin/unlock-section streams LLM (cache+DB) → reveal.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import StarField from '@/components/layout/StarField'
import ZodiacBackground from '@/components/layout/ZodiacBackground'
import { useAuth } from '@/contexts/AuthContext'
import { CATALOG, type CatalogSection } from '@/lib/catalog/sections'

// Parse [bold]...[/], [#rrggbb+bold]...[/] markers → JSX.
// Strips standalone [TAG] (SUBTITLE, KTLUẬN, CLOSING, etc.).
// Mirrors preview/page.tsx renderText() — same convention as existing free preview.
function renderText(text: string): React.ReactNode {
  const lastOpen = text.lastIndexOf('[')
  const lastClose = text.lastIndexOf(']')
  const safe = lastOpen > lastClose ? text.slice(0, lastOpen) : text

  const parts: React.ReactNode[] = []
  const re = /\[bold\]([\s\S]*?)\[\/\]|\[#([0-9a-fA-F]+)\+bold\]([\s\S]*?)\[\/\]|\[[^\]]*\]/g
  let last = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(safe)) !== null) {
    if (match.index > last) parts.push(safe.slice(last, match.index))
    if (match[1] !== undefined) {
      parts.push(<strong key={match.index} style={{ color: '#f4efe6' }}>{match[1]}</strong>)
    } else if (match[3] !== undefined) {
      parts.push(<strong key={match.index} style={{ color: `#${match[2]}` }}>{match[3]}</strong>)
    }
    last = match.index + match[0].length
  }
  if (last < safe.length) parts.push(safe.slice(last))
  return parts.length ? parts : safe
}

// Drop the LLM-emitted "N. Heading" + [SUBTITLE] lines (we already show those
// from CATALOG above), then trim. Returns the body string.
function stripSectionHeading(content: string): string {
  const lines = content.split('\n')
  let i = 0
  // skip "N. ..."
  if (lines[i]?.match(/^\s*\d+\.\s+/)) i++
  // skip blank lines
  while (i < lines.length && lines[i].trim() === '') i++
  // skip [SUBTITLE] ...
  if (lines[i]?.trim().startsWith('[SUBTITLE]')) i++
  while (i < lines.length && lines[i].trim() === '') i++
  return lines.slice(i).join('\n').trim()
}

interface PreviewInput {
  inputData: Record<string, unknown>
  inputDataB?: Record<string, unknown>
  startDate?: string
  endDate?: string
}

interface UnlockedMap {
  [sectionId: string]: { content: string; charged: number }
}

export default function ReadingClient({
  profileUid,
  service,
  embedded = false,
}: {
  profileUid: string
  service: string
  embedded?: boolean
}) {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [input, setInput] = useState<PreviewInput | null>(null)
  const [error, setError] = useState('')
  const [balance, setBalance] = useState<number | null>(null)
  const [unlocking, setUnlocking] = useState<string | null>(null)
  const [unlocked, setUnlocked] = useState<UnlockedMap>({})
  const [loaded, setLoaded] = useState(false)
  const [progress, setProgress] = useState(0)   // 0–100 ước tính theo thời gian
  const [elapsed, setElapsed] = useState(0)      // giây đã chờ
  const [typing, setTyping] = useState<{ id: string; chars: number } | null>(null)
  const [modalKind, setModalKind] = useState<'first' | 'bundle' | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set()) // mục đang mở đọc (mặc định đóng)
  const toggleExpanded = (id: string) => setExpanded(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const typeTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Chỉ đếm thời gian đã chờ; % thật lấy từ job (setProgress khi poll).
  const startProgress = () => {
    setProgress(2); setElapsed(0)
    if (progressTimer.current) clearInterval(progressTimer.current)
    progressTimer.current = setInterval(() => setElapsed(e => e + 1), 1000)
  }
  const stopProgress = () => {
    if (progressTimer.current) { clearInterval(progressTimer.current); progressTimer.current = null }
    setProgress(100)
  }

  // Typewriter: hiện nội dung mục vừa mở dần dần.
  const startTypewriter = (sectionId: string, content: string) => {
    if (typeTimer.current) clearInterval(typeTimer.current)
    setTyping({ id: sectionId, chars: 0 })
    const step = Math.max(12, Math.ceil(content.length / 240)) // ~xong trong ~10s
    typeTimer.current = setInterval(() => {
      setTyping(prev => {
        if (!prev || prev.id !== sectionId) return prev
        const nextChars = prev.chars + step
        if (nextChars >= content.length) {
          if (typeTimer.current) { clearInterval(typeTimer.current); typeTimer.current = null }
          return null // xong → hiện full
        }
        return { id: sectionId, chars: nextChars }
      })
    }, 40)
  }

  useEffect(() => () => {
    if (progressTimer.current) clearInterval(progressTimer.current)
    if (typeTimer.current) clearInterval(typeTimer.current)
  }, [])

  // Guest XEM ĐƯỢC màn reading (các mục khoá). Chỉ yêu cầu đăng nhập khi bấm
  // nạp xu / mở mục → điều hướng qua trang nạp xu (tự đưa về login + back).
  const topupHref = `/coin/topup?back=${encodeURIComponent(`/reading/${profileUid}/${service}`)}`

  // Read inputData from localStorage (keyed by profileUid) — guest cũng có
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(`previewInput:${profileUid}`)
      if (!raw) {
        setError('Không tìm thấy dữ liệu hồ sơ — vui lòng nhập lại thông tin.')
        setLoaded(true)
        return
      }
      const parsed = JSON.parse(raw) as PreviewInput
      setInput(parsed)
      // Pre-fill unlocks from DB
      fetch(`/api/coin/reading-list?service=${encodeURIComponent(service)}&profileUid=${encodeURIComponent(profileUid)}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(data => {
          if (data.unlocked) {
            const map: UnlockedMap = {}
            for (const u of data.unlocked) {
              map[u.sectionId] = { content: u.content, charged: 0 }
            }
            setUnlocked(map)
          }
        })
        .catch(() => {})
        .finally(() => setLoaded(true))
    } catch {
      setError('Dữ liệu không hợp lệ.')
      setLoaded(true)
    }
  }, [user, profileUid, service])

  const refreshBalance = async () => {
    try {
      const res = await fetch('/api/coin/balance', { cache: 'no-store' })
      const data = await res.json()
      setBalance(typeof data.coin === 'number' ? data.coin : 0)
    } catch { /* keep last */ }
  }
  useEffect(() => { if (user) refreshBalance() }, [user])

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
  const fetchReadingList = async (): Promise<{ sectionId: string; content: string }[]> => {
    const res = await fetch(`/api/coin/reading-list?service=${encodeURIComponent(service)}&profileUid=${encodeURIComponent(profileUid)}`, { cache: 'no-store' })
    const d = await res.json()
    return (d.unlocked || []) as { sectionId: string; content: string }[]
  }

  // Gen chạy ngầm server-side → khi quay lại tab (sau khi switch / mở app lại),
  // đồng bộ ngay nội dung đã mở + số dư (bắt kịp mục gen xong lúc ở tab khác).
  useEffect(() => {
    if (!user) return
    const sync = () => {
      if (document.visibilityState !== 'visible') return
      refreshBalance()
      fetchReadingList().then(list => {
        if (!list.length) return
        setUnlocked(prev => {
          const next = { ...prev }
          for (const u of list) if (!next[u.sectionId]) next[u.sectionId] = { content: u.content, charged: 0 }
          return next
        })
      }).catch(() => {})
    }
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('focus', sync)
    return () => { document.removeEventListener('visibilitychange', sync); window.removeEventListener('focus', sync) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profileUid, service])

  // Poll a background gen job → đẩy % THẬT (job.progress, từ số chữ stream) vào modal.
  const pollJob = async (jobId: string): Promise<'done' | 'error'> => {
    const started = Date.now()
    while (Date.now() - started < 12 * 60 * 1000) {
      await sleep(2000)
      try {
        const res = await fetch(`/api/job/${jobId}`, { cache: 'no-store' })
        if (res.ok) {
          const job = await res.json()
          if (typeof job.progress === 'number') setProgress(Math.max(2, Math.min(99, job.progress)))
          if (job.status === 'done') return 'done'
          if (job.status === 'error') return 'error'
        }
      } catch { /* keep polling */ }
    }
    return 'error'
  }

  // Unlock — KHÔNG bao giờ hiện lỗi timeout. Gen chạy ngầm (job, % thật), lỗi job thì
  // re-fire (idempotent: essay đã có → instant). Chỉ dừng-báo khi thật sự thiếu xu (402).
  type UnlockResult = { ok: true } | { insufficient: string } | { fail: true }
  const runUnlock = async (
    url: string,
    bodyObj: Record<string, unknown>,
    onSync: (data: Record<string, unknown>) => void,
    onDone: (list: { sectionId: string; content: string }[]) => void,
  ): Promise<UnlockResult> => {
    for (let attempt = 0; attempt < 3; attempt++) {
      let data: Record<string, unknown> | null = null
      try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyObj) })
        if (res.status === 402) {
          let msg = 'Không đủ xu'
          try { const e = await res.json(); msg = (e.error as string) || msg } catch { /* ignore */ }
          return { insufficient: msg }
        }
        if (res.ok) data = (await res.json()) as Record<string, unknown>
      } catch { /* network → retry */ }

      if (data?.done) { onSync(data); return { ok: true } }
      if (data?.jobId) {
        const r = await pollJob(data.jobId as string)
        if (r === 'done') { onDone(await fetchReadingList()); return { ok: true } }
        // job lỗi → vòng lặp re-fire
      }
      await sleep(2000)
    }
    return { fail: true }
  }

  const handleUnlock = async (section: CatalogSection) => {
    if (!input) return
    if (!user) { router.push(topupHref); return } // guest → nạp xu/đăng nhập trước
    const willGen = Object.keys(unlocked).length === 0 // essay chưa có → gen lần đầu (hiện modal)
    setUnlocking(section.id)
    setError('')
    if (willGen) { setModalKind('first'); startProgress() }
    try {
      let content: string | null = null
      let charged = 0
      let typed = false
      const r = await runUnlock(
        '/api/coin/unlock-section',
        { service, sectionId: section.id, inputData: input.inputData, inputDataB: input.inputDataB, startDate: input.startDate, endDate: input.endDate },
        (data) => { content = data.content as string; charged = (data.coinsCharged as number) ?? 0; typed = !data.alreadyUnlocked },
        (list) => { const f = list.find(u => u.sectionId === section.id); if (f) { content = f.content; typed = true } },
      )
      if ('insufficient' in r) { setError(r.insufficient); return }
      if (content == null) { setError('Tạo nội dung gặp sự cố, vui lòng thử lại.'); return }

      const finalContent: string = content
      setUnlocked(prev => ({ ...prev, [section.id]: { content: finalContent, charged } }))
      setExpanded(prev => new Set(prev).add(section.id)) // mở sẵn mục vừa mua
      refreshBalance()
      stopProgress()
      if (typed) startTypewriter(section.id, finalContent)
    } finally {
      stopProgress()
      setUnlocking(null)
      setModalKind(null)
    }
  }

  const handleUnlockBundle = async () => {
    if (!input) return
    if (!user) { router.push(topupHref); return } // guest → nạp xu/đăng nhập trước
    const willGen = Object.keys(unlocked).length === 0
    setUnlocking('__bundle__')
    setError('')
    if (willGen) { setModalKind('bundle'); startProgress() }
    try {
      let secs: { sectionId: string; content: string }[] | null = null
      const r = await runUnlock(
        '/api/coin/unlock-bundle',
        { service, inputData: input.inputData, inputDataB: input.inputDataB, startDate: input.startDate, endDate: input.endDate },
        (data) => { secs = data.sections as { sectionId: string; content: string }[] },
        (list) => { secs = list },
      )
      if ('insufficient' in r) { setError(r.insufficient); return }
      if (!secs) { setError('Tạo nội dung gặp sự cố, vui lòng thử lại.'); return }

      const finalSecs: { sectionId: string; content: string }[] = secs
      setUnlocked(prev => {
        const next = { ...prev }
        for (const s of finalSecs) {
          if (!next[s.sectionId]) next[s.sectionId] = { content: s.content, charged: 0 }
        }
        return next
      })
      refreshBalance()
      stopProgress()
    } finally {
      stopProgress()
      setUnlocking(null)
      setModalKind(null)
    }
  }

  const catalog = CATALOG[service]
  const sections = catalog?.sections ?? []
  const totalCost = sections.reduce((s, x) => s + x.coinPrice, 0)
  const bundlePrice = catalog?.bundlePrice
  const bundleSavings = bundlePrice != null ? totalCost - bundlePrice : 0
  const allUnlocked = sections.length > 0 && sections.every(s => unlocked[s.id])

  return (
    <div className="relative" style={embedded
      ? { fontFamily: 'var(--font-vietnam)' }
      : { fontFamily: 'var(--font-vietnam)', minHeight: '100vh', background: 'linear-gradient(180deg, #edd5b1 0%, #e3c89a 100%)' }}>
      {!embedded && <><StarField /><ZodiacBackground /><Navbar /></>}

      {/* Loading modal — only when content is actually being generated the first
          time (modalKind set). Subsequent unlocks reuse the stored essay → instant,
          no modal. */}
      {unlocking && modalKind && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(6,6,15,0.88)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
          }}
        >
          <div
            style={{
              maxWidth: 420, width: '100%', textAlign: 'center',
              background: '#063755', border: '1px solid var(--as-border-gold)',
              borderRadius: 16, padding: '2.5rem 2rem', boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
            }}
          >
            <div
              className="animate-spin"
              style={{
                width: 56, height: 56, margin: '0 auto 1.5rem', borderRadius: '50%',
                border: '3px solid rgba(200,148,63,0.2)', borderTopColor: '#f0cc78',
              }}
            />
            <h3 style={{ color: '#f0cc78', fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.7rem' }}>
              ✨ Đang tạo nội dung cho bạn…
            </h3>
            <p style={{ color: '#c9c3d6', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '1.1rem' }}>
              {unlocking === '__bundle__' ? (
                <>Đang sinh trọn bộ <strong style={{ color: '#d9ab55' }}>{catalog?.label}</strong> cho bạn.</>
              ) : (
                <>Đang sinh mục <strong style={{ color: '#d9ab55' }}>{sections.find(s => s.id === unlocking)?.title}</strong> cho bạn.</>
              )}
            </p>

            {/* Progress bar + % */}
            <div style={{ width: '100%', height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: '0.5rem' }}>
              <div
                style={{
                  width: `${progress}%`, height: '100%', borderRadius: 999,
                  background: 'var(--as-cta)',
                  transition: 'width 0.9s ease',
                }}
              />
            </div>
            <p style={{ color: '#f0cc78', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem' }}>
              {progress}%
            </p>
            <p style={{ color: '#8a8399', fontSize: '0.78rem', lineHeight: 1.6, marginBottom: modalKind === 'first' ? '0.75rem' : 0 }}>
              Đã chờ {Math.floor(elapsed / 60)}p{String(elapsed % 60).padStart(2, '0')}s
              {progress >= 90 ? (
                <> · sắp hoàn tất…</>
              ) : progress > 8 ? (() => {
                const rem = Math.round(elapsed * (100 - progress) / progress)
                return <> · còn khoảng ~{Math.floor(rem / 60)}p{String(rem % 60).padStart(2, '0')}s</>
              })() : null}
              <br />Bạn có thể chuyển tab — nội dung vẫn đang được tạo. Quay lại trang này để xem.
            </p>
            {modalKind === 'first' && (
              <p style={{ color: '#d9ab55', fontSize: '0.78rem', lineHeight: 1.6, background: 'rgba(200,148,63,0.08)', border: '1px solid rgba(200,148,63,0.2)', borderRadius: 8, padding: '0.6rem 0.75rem' }}>
                💡 Lần đầu cần chờ tạo nội dung. Từ lần sau, mở các mục khác của hồ sơ này sẽ <strong>hiện ngay</strong>, không phải chờ.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="relative z-10" style={{ maxWidth: embedded ? '100%' : 780, margin: '0 auto', padding: embedded ? 0 : '6rem 1rem 4rem' }}>

        {!embedded && (
          <Link
            href="/services"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              background: '#063755', border: '1px solid rgba(200,148,63,0.3)', color: '#d9ab55',
              borderRadius: '6px', padding: '0.5rem 1rem', fontFamily: 'var(--font-vietnam)',
              fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', marginBottom: '1.5rem',
            }}
          >
            ← Quay lại trang dịch vụ
          </Link>
        )}

        {error && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.35)', borderRadius: 12, padding: '1rem 1.25rem', color: '#fca5a5', marginBottom: '1.5rem' }}>
            ⚠ {error}
          </div>
        )}

        {catalog && (
          <>
            <h1 style={{ color: 'var(--as-text-strong)', fontSize: 'clamp(1.5rem, 4vw, 2.1rem)', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.02em', fontFamily: 'var(--font-playfair)' }}>
              {catalog.label}
            </h1>
            <p style={{ color: 'var(--as-text)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Bản luận giải đầy đủ {sections.length} mục — mở từng mục bằng xu khi bạn sẵn sàng đọc.
              {balance != null && <> Bạn đang có <strong style={{ color: 'var(--as-cta)' }}>{balance.toLocaleString('vi-VN')} xu</strong>.</>}
              {' '}<Link href={topupHref} style={{ color: 'var(--as-cta)', textDecoration: 'underline' }}>Nạp xu →</Link>
            </p>
            <p style={{ color: 'var(--as-text-muted)', fontSize: '0.72rem', marginBottom: '1.5rem', fontFamily: 'monospace' }}>
              Hồ sơ: {profileUid}
            </p>

            {bundlePrice != null && !allUnlocked && (
              <div
                style={{
                  background: '#063755',
                  border: '1px solid var(--as-border-gold)',
                  borderRadius: 12,
                  padding: '1.25rem 1.5rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <p style={{ color: '#f4efe6', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                    Mở trọn cục — {bundlePrice} xu
                  </p>
                  <p style={{ color: '#c9c3d6', fontSize: '0.8rem' }}>
                    {bundleSavings > 0 ? (
                      <>Tiết kiệm hơn so với mua lẻ.</>
                    ) : (
                      <>Mở toàn bộ một lần.</>
                    )}
                  </p>
                </div>
                <button
                  onClick={handleUnlockBundle}
                  disabled={unlocking === '__bundle__'}
                  style={{
                    background: 'var(--as-cta)',
                    color: 'var(--as-text-on-dark)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.65rem 1.5rem',
                    fontFamily: 'var(--font-vietnam)',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    letterSpacing: '0.04em',
                    cursor: unlocking === '__bundle__' ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {unlocking === '__bundle__' ? 'Đang mở…' : `Mở trọn cục (${bundlePrice} xu)`}
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {sections.map(s => {
                const u = unlocked[s.id]
                const isUnlocking = unlocking === s.id
                return (
                  <div
                    key={s.id}
                    style={{
                      background: '#063755',
                      border: `1px solid ${u ? 'rgba(200,148,63,0.4)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: 12,
                      padding: '1.25rem 1.5rem',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <div
                      onClick={u ? () => toggleExpanded(s.id) : undefined}
                      style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem', cursor: u ? 'pointer' : 'default' }}
                    >
                      <h3 style={{ color: '#f4efe6', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                        <span style={{ color: '#d9ab55', marginRight: '0.5rem' }}>{s.index}.</span>
                        {s.title}
                      </h3>
                      {u ? (
                        <span style={{ color: '#d9ab55', fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ color: '#3db88a' }}>✓ Đã mở</span>
                          <span style={{ fontSize: '0.75rem' }}>{expanded.has(s.id) ? '▲' : '▼'}</span>
                        </span>
                      ) : (
                        <span style={{ color: '#d9ab55', fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          🔒 {s.coinPrice} xu
                        </span>
                      )}
                    </div>
                    <p style={{ color: '#9b8fb5', fontSize: '0.85rem', lineHeight: 1.6, margin: 0, marginBottom: u ? '1rem' : '0.75rem' }}>
                      {s.subtitle}
                    </p>

                    {u ? (expanded.has(s.id) ? (() => {
                      const body = stripSectionHeading(u.content)
                      const isTyping = typing?.id === s.id
                      const shown = isTyping ? body.slice(0, typing!.chars) : body
                      return (
                      <div style={{ color: '#e8e0f0', fontSize: '0.97rem', lineHeight: 1.95, borderTop: '1px solid rgba(200,148,63,0.15)', paddingTop: '1.25rem' }}>
                        {shown.split(/\n\n+/).map((para, pi) => (
                          <p key={pi} style={{ margin: 0, marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                            {renderText(para)}{isTyping && pi === shown.split(/\n\n+/).length - 1 ? <span style={{ color: '#d9ab55' }}>▍</span> : null}
                          </p>
                        ))}
                        {!isTyping && u.charged > 0 && (
                          <p style={{ color: '#6b6585', fontSize: '0.75rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
                            (Đã trừ {u.charged} xu)
                          </p>
                        )}
                      </div>
                      )
                    })() : (
                      <button
                        onClick={() => toggleExpanded(s.id)}
                        style={{ background: 'rgba(200,148,63,0.1)', border: '1px solid rgba(200,148,63,0.25)', color: '#d9ab55', borderRadius: 6, padding: '0.5rem 1rem', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        ▼ Bấm để đọc nội dung
                      </button>
                    )) : (
                      <button
                        onClick={() => handleUnlock(s)}
                        disabled={isUnlocking || !loaded}
                        style={{
                          background: isUnlocking || !loaded ? 'rgba(247,236,217,0.15)' : 'var(--as-cta)',
                          color: isUnlocking || !loaded ? 'rgba(247,236,217,0.5)' : 'var(--as-text-on-dark)',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.55rem 1.25rem',
                          fontFamily: 'var(--font-vietnam)',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          cursor: isUnlocking || !loaded ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isUnlocking ? 'Đang mở… (lần đầu cần 1-3 phút sinh nội dung)' : `🔓 Mở mục (${s.coinPrice} xu)`}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <p style={{ color: 'var(--as-text-muted)', fontSize: '0.78rem', marginTop: '2rem', textAlign: 'center' }}>
              Tổng cộng nếu mở hết: {(bundlePrice ?? totalCost).toLocaleString('vi-VN')} xu · Mua thêm xu bất cứ lúc nào.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
