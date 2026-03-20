'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const NAV_ITEMS = [
  { href: '/dashboard/operations', label: 'Vận Hành', icon: '⚙️' },
  { href: '/dashboard/pricing',    label: 'Giá',      icon: '💰' },
  { href: '/dashboard/content',    label: 'Nội Dung', icon: '✏️' },
  { href: '/dashboard/orders',     label: 'Đơn Hàng', icon: '📦' },
  { href: '/dashboard/deploy',     label: 'Deploy',   icon: '🚀' },
  { href: '/dashboard/settings',   label: 'Hệ Thống', icon: '🔧' },
]

export default function DashboardShell({ children, userEmail }: { children: React.ReactNode; userEmail?: string }) {
  const pathname = usePathname()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0d0d1a', color: '#e8e0f0' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: '#0a0a16',
        borderRight: '1px solid rgba(201,168,76,0.12)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
      }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
          <div style={{ fontSize: '0.7rem', color: '#c9a84c', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>
            Admin
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f0e8d0', fontFamily: 'var(--font-cinzel)' }}>
            HGCT Dashboard
          </div>
          {userEmail && (
            <div style={{ fontSize: '0.7rem', color: '#6b6585', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userEmail}
            </div>
          )}
        </div>

        <nav style={{ flex: 1, padding: '16px 0' }}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 20px',
                  fontSize: '0.85rem',
                  color: isActive ? '#c9a84c' : '#a09ab8',
                  background: isActive ? 'rgba(201,168,76,0.08)' : 'transparent',
                  borderLeft: isActive ? '2px solid #c9a84c' : '2px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(201,168,76,0.08)' }}>
          <button
            onClick={() => signOut({ callbackUrl: '/dashboard/login' })}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'rgba(255,80,80,0.08)',
              border: '1px solid rgba(255,80,80,0.2)',
              borderRadius: 6,
              color: '#f08080',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
