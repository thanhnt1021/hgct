import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import prisma from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { checkRegisterRateLimit } from '@/lib/ratelimit'
import { getClientIp } from '@/lib/turnstile'

export async function POST(request: Request) {
  try {
    // Rate limit theo IP — chống bot tạo tài khoản hàng loạt.
    const ip = getClientIp(request)
    if (!(await checkRegisterRateLimit(ip))) {
      return NextResponse.json(
        { error: 'Bạn đã thử đăng ký quá nhiều lần. Vui lòng thử lại sau ít phút.' },
        { status: 429 },
      )
    }

    const body = await request.json()
    const { username, email, password } = body as Record<string, unknown>

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
    }

    const cleanUsername = String(username).trim().toLowerCase()
    const cleanEmail = String(email).trim().toLowerCase()

    if (!/^[a-z0-9_.]{3,30}$/.test(cleanUsername)) {
      return NextResponse.json({ error: 'Tên đăng nhập 3–30 ký tự, chỉ gồm chữ thường, số, "_" hoặc "."' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 })
    }
    if (String(password).length < 6) {
      return NextResponse.json({ error: 'Mật khẩu tối thiểu 6 ký tự' }, { status: 400 })
    }

    // Check trùng email / username
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: cleanEmail }, { username: cleanUsername }] },
    })
    if (existing) {
      return NextResponse.json({ error: 'Tên đăng nhập hoặc email đã được sử dụng' }, { status: 409 })
    }

    await prisma.user.create({
      data: {
        username: cleanUsername,
        email: cleanEmail,
        passwordHash: await hashPassword(String(password)), // bcrypt (khớp auth.ts)
        userUid: randomUUID(),
        createdAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({ success: true, message: 'Đăng ký thành công' })
  } catch (error) {
    console.error('[register] error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
