import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { redirect } from 'next/navigation'

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean)
  return adminEmails.includes(email)
}

export function isAdminSession(session: any): boolean {
  if (!session?.user) return false
  return session.user.planType === 'lifetime' || isAdminEmail(session.user.email)
}

export async function requireDashboardAuth() {
  const session = await getServerSession(authOptions)
  if (!isAdminSession(session)) {
    redirect('/dashboard/login')
  }
  return session!
}
