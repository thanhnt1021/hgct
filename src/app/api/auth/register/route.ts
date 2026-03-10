import { NextResponse } from 'next/server'
import { createHash, randomUUID } from 'crypto'
import prisma from '@/lib/db'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, name, email, password } = body

    if (!username || !name || !email || !password) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
    }

    const cleanUsername = username.trim().toLowerCase()

    // Check existing
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username: cleanUsername }] },
    })
    if (existing) {
      return NextResponse.json({ error: 'Tên đăng nhập hoặc email đã được sử dụng' }, { status: 409 })
    }

    const uid = randomUUID()

    // Create user
    await prisma.user.create({
      data: {
        username: cleanUsername,
        email,
        passwordHash: hashPassword(password),
        userUid: uid,
        createdAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({ success: true, message: 'Đăng ký thành công' })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
