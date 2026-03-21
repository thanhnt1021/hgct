import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import { authOptions } from './auth'
import { redirect } from 'next/navigation'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_COOKIE_NAME = process.env.NODE_ENV === 'production'
  ? '__Secure-next-auth.session-token'
  : 'next-auth.session-token'

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean)
  return adminEmails.includes(email)
}

export function isAdminToken(token: any): boolean {
  if (!token) return false
  return token.planType === 'lifetime' || isAdminEmail(token.email as string)
}

export function isAdminSession(session: any): boolean {
  if (!session?.user) return false
  return session.user.planType === 'lifetime' || isAdminEmail(session.user.email)
}

// For API Route Handlers — reads JWT directly, works cross-subdomain
export async function checkAdminToken(req: NextRequest): Promise<NextResponse | null> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: ADMIN_COOKIE_NAME,
  })
  if (!isAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

// For Server Components — uses getServerSession (cookies() from next/headers)
export async function requireDashboardAuth() {
  const session = await getServerSession(authOptions)
  if (!isAdminSession(session)) {
    redirect('/dashboard/login')
  }
  return session!
}
