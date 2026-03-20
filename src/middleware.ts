import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
  const isDashboard = host.startsWith('dashboard.')

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

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
