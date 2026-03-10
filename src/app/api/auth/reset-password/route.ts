import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import prisma from '@/lib/db'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

// POST: step 1 — find user, return token
// POST with token+newPassword: step 2 — set new password
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { identifier, token, newPassword } = body

    // Step 2: set new password with token
    if (token && newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Mật khẩu ít nhất 6 ký tự' }, { status: 400 })
      }
      const user = await prisma.user.findFirst({
        where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
      })
      if (!user) {
        return NextResponse.json({ error: 'Link đặt lại đã hết hạn, vui lòng thử lại' }, { status: 400 })
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(newPassword), resetToken: null, resetTokenExpiry: null },
      })
      return NextResponse.json({ success: true })
    }

    // Step 1: find user by email or username
    if (!identifier) {
      return NextResponse.json({ error: 'Vui lòng nhập email hoặc tên đăng nhập' }, { status: 400 })
    }
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier.toLowerCase() },
        ],
      },
    })
    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản với thông tin này' }, { status: 404 })
    }
    // Generate token valid 15 minutes
    const resetToken = randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000)
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    })
    return NextResponse.json({ found: true, token: resetToken, username: user.username })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
