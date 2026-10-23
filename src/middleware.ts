import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const OLD_SESSION_COOKIE = '__Secure-next-auth.session-token'
// [F4 — V3] Phải khớp CHÍNH XÁC tên cookie thật trong src/lib/auth.ts:66-68 (có hậu tố -v2
// ở production) — KHÔNG lấy theo pattern cũ ở dashboard-auth.ts (thiếu -v2, có vẻ là bug
// tồn tại từ trước, xem Discoveries P002).
const SESSION_COOKIE = process.env.NODE_ENV === 'production'
  ? '__Secure-next-auth.session-token-v2'
  : 'next-auth.session-token'

export async function middleware(req: NextRequest) {
  // Bug #10 fix: prefer 'host' (set by Nginx, trusted) over 'x-forwarded-host'
  // which can be spoofed by clients to bypass dashboard routing checks.
  const host = req.headers.get('host') || req.headers.get('x-forwarded-host') || ''
  const isDashboard = host.startsWith('dashboard.')
  const isDaisu = host.startsWith('daisu.')
  const isPlaceholder = host.startsWith('admin.') || host.startsWith('mo.')

  if (isPlaceholder) {
    const url = req.nextUrl.clone()
    const pathname = url.pathname

    if (!pathname.startsWith('/coming-soon') && !pathname.startsWith('/_next') && !pathname.startsWith('/api')) {
      url.pathname = '/coming-soon'
    }

    return NextResponse.rewrite(url)
  }

  if (isDashboard) {
    const url = req.nextUrl.clone()
    const pathname = url.pathname

    // NextAuth signIn page defaults to /auth/login — redirect dashboard users to /dashboard/login.
    if (pathname.startsWith('/auth/')) {
      url.pathname = '/dashboard/login'
      return NextResponse.rewrite(url)
    }

    if (pathname === '/') {
      url.pathname = '/dashboard/operations'
    } else if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/_next') && !pathname.startsWith('/api')) {
      url.pathname = `/dashboard${pathname}`
    }

    return NextResponse.rewrite(url)
  }

  if (isDaisu) {
    const url = req.nextUrl.clone()
    const pathname = url.pathname

    // NextAuth signIn page defaults to /auth/login — redirect daisu users to /daisu/login.
    if (pathname.startsWith('/auth/')) {
      url.pathname = '/daisu/login'
      return NextResponse.rewrite(url)
    }

    if (pathname === '/') {
      url.pathname = '/daisu'
    } else if (!pathname.startsWith('/daisu') && !pathname.startsWith('/_next') && !pathname.startsWith('/api')) {
      url.pathname = `/daisu${pathname}`
    }

    return NextResponse.rewrite(url)
  }

  // [F4 — V3, AC-F4.4] /chart bị chặn VÔ ĐIỀU KIỆN cho TẤT CẢ — kể cả guest chưa login —
  // NGOẠI TRỪ đúng username 'hentaiikidd'. Chặn ở middleware (server-side) để tránh flash
  // nội dung trước khi redirect, và để chặn được cả deep-link trực tiếp.
  // /migration-notes dùng CHUNG rule này — trang chứa secret thật, chặn sớm nhất có thể.
  if (req.nextUrl.pathname === '/chart' || req.nextUrl.pathname === '/migration-notes') {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, cookieName: SESSION_COOKIE })
    const username = (token as { username?: string } | null)?.username
    if (username !== 'hentaiikidd') {
      const url = req.nextUrl.clone()
      url.pathname = '/profile'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  const res = NextResponse.next()

  // One-time migration: clear old session cookie (v1 name) that conflicts with v2.
  // Runs on every non-static request until the old cookie is gone from the browser.
  if (req.cookies.has(OLD_SESSION_COOKIE)) {
    const clearOpts = 'Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax'
    res.headers.append('Set-Cookie', `${OLD_SESSION_COOKIE}=; ${clearOpts}`)
    res.headers.append('Set-Cookie', `${OLD_SESSION_COOKIE}=; Domain=.hatgiongchiemtinh.com; ${clearOpts}`)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
