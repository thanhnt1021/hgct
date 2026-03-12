import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  const uid = (session.user as any).uid
  if (!uid) return NextResponse.json({ error: 'Session không hợp lệ' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { userUid: uid },
    select: { mainChartData: true, email: true, reportEmail: true },
  })
  return NextResponse.json({
    mainChartData: user?.mainChartData ?? null,
    accountEmail: user?.email ?? null,
    reportEmail: user?.reportEmail ?? null,
  })
}

export async function PUT(request: Request) {
  const origin = request.headers.get('origin')
  const allowed = process.env.NEXT_PUBLIC_APP_URL
  if (origin && allowed && origin !== allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  const uid = (session.user as any).uid
  if (!uid) return NextResponse.json({ error: 'Session không hợp lệ' }, { status: 401 })

  const body = await request.json()
  const updates: Record<string, unknown> = {}

  if ('reportEmail' in body) {
    const { reportEmail } = body
    if (!reportEmail || !reportEmail.includes('@') || !reportEmail.includes('.')) {
      return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 })
    }
    updates.reportEmail = reportEmail.trim().toLowerCase()
  }

  if ('accountEmail' in body) {
    const { accountEmail } = body
    if (!accountEmail || !accountEmail.includes('@') || !accountEmail.includes('.')) {
      return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 })
    }
    // Chỉ cho phép set khi chưa có email
    const currentUser = await prisma.user.findUnique({ where: { userUid: uid }, select: { email: true } })
    if (currentUser?.email) {
      return NextResponse.json({ error: 'Email tài khoản đã được đặt, không thể thay đổi' }, { status: 400 })
    }
    const normalizedEmail = accountEmail.trim().toLowerCase()
    // Kiểm tra unique
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json({ error: 'Email này đã được dùng bởi tài khoản khác' }, { status: 400 })
    }
    updates.email = normalizedEmail
  }

  if ('mainChartData' in body) {
    updates.mainChartData = body.mainChartData
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Không có gì để cập nhật' }, { status: 400 })
  }

  await prisma.user.update({ where: { userUid: uid }, data: updates })
  return NextResponse.json({ success: true })
}
