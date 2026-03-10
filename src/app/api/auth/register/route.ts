import { NextResponse } from 'next/server'
import { createHash, randomUUID } from 'crypto'
import prisma from '@/lib/db'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name, gender, dob, tob, birthPlace } = body

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
    }

    // Check existing
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username: email.split('@')[0].toLowerCase() }] },
    })
    if (existing) {
      return NextResponse.json({ error: 'Email đã được sử dụng' }, { status: 409 })
    }

    const uid = randomUUID()
    const username = email.split('@')[0].toLowerCase()

    // Create user
    await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: hashPassword(password),
        userUid: uid,
        createdAt: new Date().toISOString(),
      },
    })

    // Create default profile
    if (name && dob) {
      await prisma.profile.create({
        data: {
          userUid: uid,
          name,
          gender: gender || 'Female',
          data: { dob, tob, loc: { address: birthPlace, lat: 21.02, lon: 105.85, tz: 'Asia/Ho_Chi_Minh' } },
          createdAt: new Date().toISOString(),
        },
      })
    }

    return NextResponse.json({ success: true, message: 'Đăng ký thành công' })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
