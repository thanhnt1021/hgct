import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

// Đã tải xong (23/10/2026) — nội dung xoá theo yêu cầu, giữ nguyên route + cơ chế chặn
// (hentaiikidd-only, xem middleware.ts) để dùng lại khi cần xin thêm thông tin.
export async function GET() {
  const session = await getServerSession(authOptions)
  const username = (session?.user as { username?: string } | undefined)?.username
  if (username !== 'hentaiikidd') {
    return new NextResponse('Not found', { status: 404 })
  }

  return new NextResponse('(trống — báo phiên VPS khi cần nội dung lại)', {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
