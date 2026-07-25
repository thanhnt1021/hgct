import { requireDashboardAuth } from '@/lib/dashboard-auth'
import DashboardShell from '@/components/dashboard/DashboardShell'

export const metadata = { title: 'HGCT Dashboard', icons: { icon: '/dashboard-icon.svg' } }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireDashboardAuth()
  const userEmail = (session.user as any)?.email ?? ''

  return (
    <DashboardShell userEmail={userEmail}>
      {children}
    </DashboardShell>
  )
}
