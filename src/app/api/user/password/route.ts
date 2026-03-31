import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

function sha256Hash(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

async function verifyCurrentPassword(password: string, hash: string): Promise<boolean> {
  const bcryptMatch = await bcrypt.compare(password, hash)
  if (bcryptMatch) return true
  return sha256Hash(password) === hash
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin')
    const allowed = process.env.NEXT_PUBLIC_APP_URL
    if (origin && allowed && origin !== allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu mới ít nhất 6 ký tự' }, { status: 400 })
    }

    const uid = (session.user as Record<string, unknown>).uid as string
    const user = await prisma.user.findUnique({ where: { userUid: uid } })
    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 })
    }

    if (!currentPassword || !await verifyCurrentPassword(currentPassword, user.passwordHash)) {
      return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng' }, { status: 400 })
    }

    const newHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { userUid: uid },
      data: { passwordHash: newHash },
    })

    return NextResponse.json({ message: 'Đã đổi mật khẩu thành công' })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
