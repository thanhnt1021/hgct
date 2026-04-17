import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const OLD_SESSION_COOKIE = '__Secure-next-auth.session-token'

export function middleware(req: NextRequest) {
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
