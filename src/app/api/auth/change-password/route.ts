import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { currentPassword, newPassword } = await request.json()
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu ít nhất 6 ký tự' }, { status: 400 })
    }

    const uid = (session.user as Record<string, unknown>).uid as string
    const user = await prisma.user.findUnique({ where: { userUid: uid }, select: { passwordHash: true } })

    // Bug #19 fix: if user already has a password, require current password to change it
    if (user?.passwordHash) {
      if (!currentPassword || hashPassword(currentPassword) !== user.passwordHash) {
        return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng' }, { status: 400 })
      }
    }

    await prisma.user.update({
      where: { userUid: uid },
      data: { passwordHash: hashPassword(newPassword) },
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
