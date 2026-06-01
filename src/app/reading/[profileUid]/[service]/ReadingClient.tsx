'use client'

// Reading client — locked catalog at mount, no auto-stream. inputData comes
// from localStorage keyed by profileUid (each profile has its own storage slot).
// Unlock click → /api/coin/unlock-section streams LLM (cache+DB) → reveal.

import { useEffect, useState } from 'react'
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
}: {
  profileUid: string
  service: string
}) {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [input, setInput] = useState<PreviewInput | null>(null)
  const [error, setError] = useState('')
  const [balance, setBalance] = useState<number | null>(null)
  const [unlocking, setUnlocking] = useState<string | null>(null)
  const [unlocked, setUnlocked] = useState<UnlockedMap>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) router.push(`/auth/login?next=${encodeURIComponent(`/reading/${profileUid}/${service}`)}`)
  }, [user, isLoading, router, profileUid, service])

  // Read inputData from localStorage (keyed by profileUid)
  useEffect(() => {
    if (typeof window === 'undefined' || !user) return
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

  const handleUnlock = async (section: CatalogSection) => {
    if (!input) return
    setUnlocking(section.id)
    setError('')
    try {
      const res = await fetch('/api/coin/unlock-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service,
          sectionId: section.id,
          inputData: input.inputData,
          inputDataB: input.inputDataB,
          startDate: input.startDate,
          endDate: input.endDate,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Mở mục thất bại')
        return
      }
      setUnlocked(prev => ({ ...prev, [section.id]: { content: data.content as string, charged: data.coinsCharged as number } }))
      if (data.coinsCharged > 0) refreshBalance()
    } catch (e) {
      setError((e as Error).message || 'Lỗi kết nối')
    } finally {
      setUnlocking(null)
    }
  }

  const handleUnlockBundle = async () => {
    if (!input) return
    setUnlocking('__bundle__')
    setError('')
    try {
      const res = await fetch('/api/coin/unlock-bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service,
          inputData: input.inputData,
          inputDataB: input.inputDataB,
          startDate: input.startDate,
          endDate: input.endDate,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Mở trọn cục thất bại')
        return
      }
      setUnlocked(prev => {
        const next = { ...prev }
        for (const s of (data.sections as { sectionId: string; content: string }[])) {
          if (!next[s.sectionId]) next[s.sectionId] = { content: s.content, charged: 0 }
        }
        return next
      })
      if (data.coinsCharged > 0) refreshBalance()
    } catch (e) {
      setError((e as Error).message || 'Lỗi kết nối')
    } finally {
      setUnlocking(null)
    }
  }

  const catalog = CATALOG[service]
  const sections = catalog?.sections ?? []
  const totalCost = sections.reduce((s, x) => s + x.coinPrice, 0)
  const bundlePrice = catalog?.bundlePrice
  const bundleSavings = bundlePrice != null ? totalCost - bundlePrice : 0
  const allUnlocked = sections.length > 0 && sections.every(s => unlocked[s.id])

  return (
    <div className="relative min-h-screen" style={{ fontFamily: 'var(--font-vietnam)' }}>
      <StarField />
      <ZodiacBackground />
      <Navbar />

      <div className="relative z-10" style={{ maxWidth: 780, margin: '0 auto', padding: '6rem 1rem 4rem' }}>

        <Link
          href="/services"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(18,13,46,0.7)',
            border: '1px solid rgba(200,148,63,0.3)',
            color: '#d9ab55',
            borderRadius: '6px',
            padding: '0.5rem 1rem',
            fontFamily: 'var(--font-vietnam)',
            fontSize: '0.85rem',
            fontWeight: 600,
            textDecoration: 'none',
            marginBottom: '1.5rem',
            backdropFilter: 'blur(8px)',
          }}
        >
          ← Quay lại trang dịch vụ
        </Link>

        {error && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.35)', borderRadius: 12, padding: '1rem 1.25rem', color: '#fca5a5', marginBottom: '1.5rem' }}>
            ⚠ {error}
          </div>
        )}

        {catalog && (
          <>
            <h1 style={{ color: '#f4efe6', fontSize: 'clamp(1.5rem, 4vw, 2.1rem)', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.02em' }}>
              {catalog.label}
            </h1>
            <p style={{ color: '#8a8399', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Bản luận giải đầy đủ {sections.length} mục — mở từng mục bằng xu khi bạn sẵn sàng đọc.
              {balance != null && <> Bạn đang có <strong style={{ color: '#d9ab55' }}>{balance.toLocaleString('vi-VN')} xu</strong>.</>}
              {' '}<Link href="/coin/topup" style={{ color: '#d9ab55', textDecoration: 'underline' }}>Nạp xu →</Link>
            </p>
            <p style={{ color: '#6b6585', fontSize: '0.72rem', marginBottom: '1.5rem', fontFamily: 'monospace' }}>
              Hồ sơ: {profileUid}
            </p>

            {bundlePrice != null && !allUnlocked && (
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(200,148,63,0.12) 0%, rgba(200,148,63,0.04) 100%)',
                  border: '1px solid rgba(200,148,63,0.35)',
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
                    Mở hết {sections.length} mục một lần.
                    {bundleSavings > 0 && (
                      <> Tiết kiệm <strong style={{ color: '#d9ab55' }}>{bundleSavings} xu</strong> so với mua lẻ {totalCost} xu.</>
                    )}
                  </p>
                </div>
                <button
                  onClick={handleUnlockBundle}
                  disabled={unlocking === '__bundle__'}
                  style={{
                    background: 'linear-gradient(135deg, #c8943f, #f0cc78, #c8943f)',
                    backgroundSize: '200% 200%',
                    color: '#06060f',
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
                      background: 'rgba(18,13,46,0.7)',
                      border: `1px solid ${u ? 'rgba(200,148,63,0.4)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: 12,
                      padding: '1.25rem 1.5rem',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ color: '#f4efe6', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                        <span style={{ color: '#d9ab55', marginRight: '0.5rem' }}>{s.index}.</span>
                        {s.title}
                      </h3>
                      {!u && (
                        <span style={{ color: '#d9ab55', fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          🔒 {s.coinPrice} xu
                        </span>
                      )}
                    </div>
                    <p style={{ color: '#9b8fb5', fontSize: '0.85rem', lineHeight: 1.6, margin: 0, marginBottom: u ? '1rem' : '0.75rem' }}>
                      {s.subtitle}
                    </p>

                    {u ? (
                      <div style={{ color: '#e8e0f0', fontSize: '0.97rem', lineHeight: 1.95, borderTop: '1px solid rgba(200,148,63,0.15)', paddingTop: '1.25rem' }}>
                        {stripSectionHeading(u.content).split(/\n\n+/).map((para, pi) => (
                          <p key={pi} style={{ margin: 0, marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                            {renderText(para)}
                          </p>
                        ))}
                        {u.charged > 0 && (
                          <p style={{ color: '#6b6585', fontSize: '0.75rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
                            (Đã trừ {u.charged} xu)
                          </p>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUnlock(s)}
                        disabled={isUnlocking || !loaded}
                        style={{
                          background: isUnlocking || !loaded ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #c8943f, #f0cc78)',
                          color: isUnlocking || !loaded ? '#6b6585' : '#06060f',
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

            <p style={{ color: '#6b6585', fontSize: '0.78rem', marginTop: '2rem', textAlign: 'center' }}>
              Tổng cộng nếu mở hết: {totalCost.toLocaleString('vi-VN')} xu · Mua thêm xu bất cứ lúc nào.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
