import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const uid = (session.user as any).uid
  if (!uid) return NextResponse.json({ error: 'Session không hợp lệ' }, { status: 401 })

  const { email } = await request.json()

  if (!email || !email.includes('@') || !email.includes('.')) {
    return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 })
  }

  const normalized = email.trim().toLowerCase()

  const existing = await prisma.user.findUnique({ where: { email: normalized } })
  if (existing && existing.userUid !== uid) {
    return NextResponse.json({ error: 'Email này đã được sử dụng bởi tài khoản khác' }, { status: 409 })
  }

  await prisma.user.update({ where: { userUid: uid }, data: { email: normalized } })

  return NextResponse.json({ success: true })
}
