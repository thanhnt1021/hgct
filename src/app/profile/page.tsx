'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/layout/Navbar'
import ProfileInfo from '@/components/profile/ProfileInfo'
import ChartList from '@/components/profile/ChartList'
import HistoryReports from '@/components/profile/HistoryReports'
import SubscriptionPlans from '@/components/profile/SubscriptionPlans'
import { User, Star, FileText, Crown } from 'lucide-react'

const TABS = [
  { id: 'info',    label: 'Thông tin cá nhân',  Icon: User },
  { id: 'charts',  label: 'Bản đồ sao',          Icon: Star },
  { id: 'history', label: 'Lịch sử & Báo cáo',  Icon: FileText },
  { id: 'plans',   label: 'Gói dịch vụ',          Icon: Crown },
] as const

type TabId = typeof TABS[number]['id']

function ProfileContent() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = (searchParams.get('tab') || 'info') as TabId

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login')
  }, [user, isLoading, router])

  if (isLoading || !user) return null

  const setTab = (id: TabId) => router.push(`/profile?tab=${id}`, { scroll: false })

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a' }}>
      <Navbar />

      {/* ── Mobile top tab bar (hidden on md+) ── */}
      <div
        className="md:hidden fixed left-0 right-0 z-30 overflow-x-auto"
        style={{ top: 64, background: '#06060f', borderBottom: '1px solid rgba(201,168,76,0.1)' }}
      >
        <div style={{ display: 'flex', minWidth: 'max-content' }}>
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap transition-colors"
              style={{
                color: tab === id ? '#d9ab55' : '#6b7280',
                borderBottom: `2px solid ${tab === id ? '#c9a84c' : 'transparent'}`,
                fontFamily: 'var(--font-vietnam)',
                fontWeight: tab === id ? 600 : 400,
                background: 'transparent',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Desktop layout: sidebar + content ── */}
      <div
        style={{
          display: 'flex',
          paddingTop: 64,        // navbar height
          minHeight: 'calc(100vh - 0px)',
        }}
      >
        {/* Sidebar (desktop only) */}
        <aside
          className="hidden md:flex flex-col flex-shrink-0"
          style={{
            width: 248,
            position: 'sticky',
            top: 64,
            height: 'calc(100vh - 64px)',
            background: '#06060f',
            borderRight: '1px solid rgba(201,168,76,0.08)',
            overflowY: 'auto',
          }}
        >
          {/* User badge */}
          <div className="px-5 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: user.isPremium ? 'rgba(201,168,76,0.12)' : 'rgba(61,43,94,0.5)', border: `1px solid ${user.isPremium ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.1)'}` }}>
                <span style={{ fontSize: '1rem' }}>{user.isPremium ? '✦' : '○'}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>
                  {user.username}
                </p>
                <p className="text-xs" style={{ color: user.isPremium ? '#d9ab55' : '#6b7280', fontFamily: 'var(--font-vietnam)' }}>
                  {user.isPremium ? 'Premium' : 'Miễn phí'}
                </p>
              </div>
            </div>
          </div>

          <div className="mx-4 mb-4" style={{ height: 1, background: 'rgba(201,168,76,0.06)' }} />

          {/* Nav items */}
          <nav className="px-3 flex-1 space-y-0.5">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
                style={{
                  background: tab === id ? 'rgba(201,168,76,0.07)' : 'transparent',
                  color: tab === id ? '#d9ab55' : '#6b7280',
                  borderLeft: `2px solid ${tab === id ? '#c9a84c' : 'transparent'}`,
                  fontFamily: 'var(--font-vietnam)',
                  fontWeight: tab === id ? 600 : 400,
                  paddingLeft: tab === id ? '0.625rem' : '0.75rem',
                  textAlign: 'left',
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content area */}
        <main
          className="flex-1 overflow-x-hidden"
          style={{ minWidth: 0 }}
        >
          {/* Mobile: extra top padding for the tab bar */}
          <div
            className="md:pt-0 pt-12"  // pt-12 accounts for mobile tab bar (~48px)
            style={{ padding: '2rem 1.5rem 4rem', maxWidth: 780 }}
          >
            {tab === 'info'    && <ProfileInfo />}
            {tab === 'charts'  && <ChartList />}
            {tab === 'history' && <HistoryReports />}
            {tab === 'plans'   && <SubscriptionPlans />}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileContent />
    </Suspense>
  )
}
