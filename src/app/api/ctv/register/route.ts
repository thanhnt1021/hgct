import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createHash, randomBytes } from 'crypto'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    const { name, phone, email, dob } = await req.json()

    if (!name || !phone || !email) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 })
    }

    // Check duplicate email
    const existing = await prisma.ctv.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email đã được đăng ký' }, { status: 409 })
    }

    // Create CTV with a temporary random password (will be set during setup)
    const tempHash = hashPassword(randomBytes(16).toString('hex'))

    const ctv = await prisma.ctv.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        dob: dob || null,
        passwordHash: tempHash,
        status: 'pending_setup',
      },
    })

    return NextResponse.json({
      success: true,
      ctvId: ctv.id,
      message: 'Đăng ký thành công! Hãy kiểm tra hướng dẫn tiếp theo.',
    })
  } catch (err) {
    console.error('[CTV register]', err)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
