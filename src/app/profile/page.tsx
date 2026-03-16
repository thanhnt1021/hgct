'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Menu, X } from 'lucide-react'

interface SidebarAvatarProps { user: { image?: string; isPremium: boolean; planType?: string; username: string }; avatarVersion: number }
function SidebarAvatar({ user, avatarVersion }: SidebarAvatarProps) {
  const [showCustom, setShowCustom] = useState(true)
  const [showGoogle, setShowGoogle] = useState(false)
  useEffect(() => { setShowCustom(true); setShowGoogle(false) }, [avatarVersion])
  const borderColor = user.planType === 'lifetime' ? 'rgba(255,215,100,0.5)' : user.isPremium ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.1)'
  const style = { width: 36, height: 36, borderRadius: '50%', border: `1px solid ${borderColor}`, flexShrink: 0 as const }
  if (showCustom) return <img src={`/api/user/avatar?v=${avatarVersion}`} alt="avatar" style={{ ...style, objectFit: 'cover' }} referrerPolicy="no-referrer" onError={() => { setShowCustom(false); setShowGoogle(!!user.image) }} />
  if (showGoogle && user.image) return <img src={user.image} alt="avatar" style={{ ...style, objectFit: 'cover' }} referrerPolicy="no-referrer" onError={() => setShowGoogle(false)} />
  return <div style={{ ...style, background: user.isPremium ? 'rgba(201,168,76,0.12)' : 'rgba(61,43,94,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: '1rem' }}>{user.isPremium ? '✦' : '○'}</span></div>
}
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
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlTab = (searchParams.get('tab') || 'info') as TabId

  const [activeTab, setActiveTab] = useState<TabId>(urlTab)
  const [displayTen, setDisplayTen] = useState('')
  const [avatarVersion, setAvatarVersion] = useState(Date.now())
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { setActiveTab(urlTab) }, [urlTab])

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login')
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user) return
    fetch('/api/user/account', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then((data: { mainChartData?: Record<string, string> | null } | null) => {
        setDisplayTen(data?.mainChartData?.ten?.trim() || '')
      })
      .catch(() => {})
  }, [user?.uid])

  useEffect(() => {
    const onChartUpdated = (e: Event) => {
      setDisplayTen((e as CustomEvent).detail?.ten?.trim() ?? '')
    }
    const onAvatarUpdated = () => setAvatarVersion(Date.now())
    window.addEventListener('chart:updated', onChartUpdated)
    window.addEventListener('avatar:updated', onAvatarUpdated)
    return () => {
      window.removeEventListener('chart:updated', onChartUpdated)
      window.removeEventListener('avatar:updated', onAvatarUpdated)
    }
  }, [])

  // Close sidebar when tab changes on mobile
  useEffect(() => { setSidebarOpen(false) }, [activeTab])

  if (isLoading || !user) return null

  const handleTabClick = (id: TabId) => {
    setActiveTab(id)
    setSidebarOpen(false)
    router.replace(`/profile?tab=${id}`, { scroll: false })
  }

  const tab = activeTab
  const planLabel = user.planType === 'lifetime' ? 'Lifetime ★' : user.planType === 'cao_cap' ? 'Cao cấp ✦' : user.isPremium ? 'Tiêu chuẩn ✦' : 'Miễn phí'

  const sidebarContent = (
    <>
      {/* User badge */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <SidebarAvatar user={user} avatarVersion={avatarVersion} />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>
              {displayTen || user.username}
            </p>
            <p className="text-xs" style={{ color: user.isPremium ? '#d9ab55' : '#6b7280', fontFamily: 'var(--font-vietnam)' }}>
              {planLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-4 mb-3" style={{ height: 1, background: 'rgba(201,168,76,0.06)' }} />

      <nav className="px-3 flex-1 space-y-0.5">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => handleTabClick(id)}
            className="w-full flex items-center gap-3 rounded-xl text-sm"
            style={{
              background: tab === id ? 'rgba(201,168,76,0.07)' : 'transparent',
              color: tab === id ? '#d9ab55' : '#6b7280',
              borderLeft: `2px solid ${tab === id ? '#c9a84c' : 'transparent'}`,
              fontFamily: 'var(--font-vietnam)',
              fontWeight: tab === id ? 600 : 400,
              padding: '0.625rem 0.75rem 0.625rem 0.625rem',
              textAlign: 'left',
              minHeight: 44,
              transition: 'background 0.1s, color 0.1s',
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>

      {/* Link to services */}
      <div className="px-3 mt-3">
        <div className="mx-1 mb-3" style={{ height: 1, background: 'rgba(201,168,76,0.06)' }} />
        <Link
          href="/services"
          className="w-full flex items-center gap-3 rounded-xl text-sm"
          style={{
            color: '#6b7280',
            padding: '0.625rem 0.75rem',
            fontFamily: 'var(--font-vietnam)',
            minHeight: 44,
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#d9ab55'; e.currentTarget.style.background = 'rgba(201,168,76,0.07)' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.background = 'transparent' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Đặt báo cáo
        </Link>
      </div>

      {/* Spacer + Logout */}
      <div className="flex-1" />
      <div className="px-3 pb-5">
        <div className="mx-1 mb-3" style={{ height: 1, background: 'rgba(201,168,76,0.06)' }} />
        <button
          onClick={() => { logout(); router.push('/') }}
          className="w-full flex items-center gap-3 rounded-xl text-sm"
          style={{
            background: 'transparent',
            color: '#6b7280',
            padding: '0.625rem 0.75rem',
            fontFamily: 'var(--font-vietnam)',
            textAlign: 'left',
            minHeight: 44,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#c45252')}
          onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Đăng xuất
        </button>
      </div>
    </>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a' }}>
      <Navbar />

      {/* ── Mobile header strip (hamburger + current tab) ── */}
      <div
        className="md:hidden fixed left-0 right-0 z-30 flex items-center gap-3 px-3"
        style={{ top: 64, height: 44, background: '#06060f', borderBottom: '1px solid rgba(201,168,76,0.07)' }}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          style={{ color: '#9090a8', padding: '8px', minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Mở menu"
        >
          <Menu size={20} />
        </button>
        <span style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', fontWeight: 600 }}>
          {TABS.find(t => t.id === tab)?.label}
        </span>
      </div>

      {/* ── Mobile backdrop ── */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main layout row ── */}
      <div className="flex justify-center" style={{ paddingTop: 64, minHeight: 'calc(100vh - 64px)' }}>
        <div className="flex w-full max-w-7xl">

        {/* ── Sidebar ── */}
        <aside
          className={`
            fixed md:sticky
            top-0 md:top-16
            left-0
            h-full md:h-[calc(100vh-64px)]
            flex-shrink-0 flex flex-col
            z-50 md:z-auto
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
          style={{
            width: 248,
            background: '#06060f',
            borderRight: '1px solid rgba(201,168,76,0.08)',
            overflowY: 'auto',
          }}
        >
          {/* Mobile: close button row */}
          <div className="md:hidden flex items-center justify-between px-4 pt-4 pb-2">
            <span style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', letterSpacing: '0.06em' }}>MENU</span>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{ color: '#6b7280', padding: '6px', minWidth: 32, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Đóng menu"
            >
              <X size={18} />
            </button>
          </div>

          {sidebarContent}
        </aside>

        {/* ── Content ── */}
        <main className="flex-1 overflow-x-hidden min-w-0 px-4 md:px-8 pb-16 pt-12 md:pt-8">
          {tab === 'info'    && <ProfileInfo />}
          {tab === 'charts'  && <ChartList />}
          {tab === 'history' && <HistoryReports />}
          {tab === 'plans'   && <SubscriptionPlans />}
        </main>

        </div>{/* end max-w-7xl */}
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
