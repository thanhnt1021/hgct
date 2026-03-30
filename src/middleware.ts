import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  // Bug #10 fix: prefer 'host' (set by Nginx, trusted) over 'x-forwarded-host'
  // which can be spoofed by clients to bypass dashboard routing checks.
  const host = req.headers.get('host') || req.headers.get('x-forwarded-host') || ''
  const isDashboard = host.startsWith('dashboard.')
  const isDaisu = host.startsWith('daisu.')

  if (isDashboard) {
    const url = req.nextUrl.clone()
    const pathname = url.pathname

    if (pathname === '/') {
      url.pathname = '/dashboard'
    } else if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/_next') && !pathname.startsWith('/api') && !pathname.startsWith('/auth')) {
      url.pathname = `/dashboard${pathname}`
    }

    return NextResponse.rewrite(url)
  }

  if (isDaisu) {
    const url = req.nextUrl.clone()
    const pathname = url.pathname

    if (pathname === '/') {
      url.pathname = '/daisu'
    } else if (!pathname.startsWith('/daisu') && !pathname.startsWith('/_next') && !pathname.startsWith('/api')) {
      url.pathname = `/daisu${pathname}`
    }

    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
