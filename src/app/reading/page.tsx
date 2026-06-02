'use client'

// "Hồ sơ đã xem" — list every profile/service the user has generated content for,
// with unlock progress + a link to revisit (stored content → free to re-read).

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import StarField from '@/components/layout/StarField'
import ZodiacBackground from '@/components/layout/ZodiacBackground'
import { useAuth } from '@/contexts/AuthContext'

interface Item {
  profileUid: string
  service: string
  name: string
  serviceLabel: string
  unlockedCount: number
  totalSections: number
  createdAt: string
}

export default function MyReadingsPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [items, setItems] = useState<Item[] | null>(null)
  const [nameMap, setNameMap] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login?next=/reading')
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user) return
    fetch('/api/coin/my-readings', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setItems(d.items || []))
      .catch(() => setItems([]))
  }, [user])

  // Fallback tên cho hồ sơ cũ (essay tạo trước khi lưu name): lấy từ localStorage.
  useEffect(() => {
    if (!items) return
    const m: Record<string, string> = {}
    for (const it of items) {
      if (it.name) continue
      try {
        const raw = localStorage.getItem(`previewInput:${it.profileUid}`)
        if (raw) {
          const nm = (JSON.parse(raw)?.inputData?.name as string) || ''
          if (nm) m[it.profileUid] = nm
        }
      } catch { /* ignore */ }
    }
    setNameMap(m)
  }, [items])

  return (
    <div className="relative min-h-screen" style={{ fontFamily: 'var(--font-vietnam)' }}>
      <StarField />
      <ZodiacBackground />
      <Navbar />

      <div className="relative z-10" style={{ maxWidth: 720, margin: '0 auto', padding: '6rem 1rem 4rem' }}>
        <h1 style={{ color: '#f4efe6', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.02em' }}>
          Hồ sơ đã xem
        </h1>
        <p style={{ color: '#8a8399', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
          Các bản luận giải bạn đã tạo. Bấm để đọc lại — nội dung đã mở không tính phí lần nữa.
        </p>

        {items === null && (
          <p style={{ color: '#6b6585', fontSize: '0.9rem' }}>Đang tải…</p>
        )}

        {items !== null && items.length === 0 && (
          <div style={{ background: 'rgba(18,13,46,0.7)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '2rem 1.5rem', textAlign: 'center', backdropFilter: 'blur(8px)' }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📜</p>
            <p style={{ color: '#c9c3d6', fontSize: '0.95rem', marginBottom: '1.25rem' }}>
              Bạn chưa xem hồ sơ nào.
            </p>
            <Link href="/services" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #c8943f, #f0cc78)', color: '#06060f', fontWeight: 700, fontSize: '0.85rem', padding: '0.6rem 1.5rem', borderRadius: 6, textDecoration: 'none' }}>
              Khám phá dịch vụ →
            </Link>
          </div>
        )}

        {items !== null && items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {items.map(it => {
              const done = it.totalSections > 0 && it.unlockedCount >= it.totalSections
              return (
                <Link
                  key={`${it.profileUid}-${it.service}`}
                  href={`/reading/${it.profileUid}/${it.service}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                    background: 'rgba(18,13,46,0.7)', border: '1px solid rgba(200,148,63,0.22)',
                    borderRadius: 12, padding: '1rem 1.25rem', textDecoration: 'none', backdropFilter: 'blur(8px)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: '#f4efe6', fontSize: '1rem', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {it.name || nameMap[it.profileUid] || 'Hồ sơ (chưa đặt tên)'}
                    </p>
                    <p style={{ color: '#9b8fb5', fontSize: '0.82rem', margin: '0.2rem 0 0' }}>
                      {it.serviceLabel}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ color: done ? '#3db88a' : '#d9ab55', fontSize: '0.8rem', fontWeight: 700, margin: 0 }}>
                      {done ? '✓ Đã mở hết' : `${it.unlockedCount}/${it.totalSections} mục`}
                    </p>
                    <p style={{ color: '#6b6585', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>Đọc tiếp →</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
