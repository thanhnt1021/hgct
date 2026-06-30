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
    const { email, password } = body as Record<string, unknown>

    // Chỉ cần email + mật khẩu (không còn username).
    if (!email || !password) {
      return NextResponse.json({ error: 'Thiếu email hoặc mật khẩu' }, { status: 400 })
    }

    const cleanEmail = String(email).trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 })
    }
    if (String(password).length < 6) {
      return NextResponse.json({ error: 'Mật khẩu tối thiểu 6 ký tự' }, { status: 400 })
    }

    // Email đã dùng?
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } })
    if (existing) {
      return NextResponse.json({ error: 'Email đã được sử dụng' }, { status: 409 })
    }

    // DB vẫn cần username (unique) → tự suy ra từ email + đảm bảo duy nhất.
    let base = cleanEmail.split('@')[0].replace(/[^a-z0-9_.]/g, '')
    if (base.length < 3) base = `user${base}`
    base = base.slice(0, 24)
    let username = base
    let n = 0
    while (await prisma.user.findUnique({ where: { username } })) { n += 1; username = `${base}${n}` }

    await prisma.user.create({
      data: {
        username,
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
