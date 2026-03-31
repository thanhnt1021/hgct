import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkLoginRateLimit } from '@/lib/ratelimit'
import { NextRequest, NextResponse } from 'next/server'

const handler = NextAuth(authOptions)

export { handler as GET }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function POST(req: NextRequest, context: any) {
  // Rate limit credentials login endpoint only
  const url = new URL(req.url)
  if (url.pathname.endsWith('/callback/credentials')) {
    const ip =
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown'
    const allowed = await checkLoginRateLimit(ip)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Quá nhiều lần thử đăng nhập. Vui lòng đợi 15 phút.' },
        { status: 429 }
      )
    }
  }
  return handler(req, context)
}
