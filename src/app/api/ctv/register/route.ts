import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createHash, randomBytes } from 'crypto'
import { checkCtvRegisterRateLimit } from '@/lib/ratelimit'

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown'
    const allowed = await checkCtvRegisterRateLimit(ip)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' },
        { status: 429 },
      )
    }

    const { name, phone, email, dob } = await req.json()

    if (!name || !phone || !email) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Normalize 409 → 200 to prevent email enumeration
    const existing = await prisma.ctv.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Đăng ký thành công! Hãy kiểm tra hướng dẫn tiếp theo.',
      })
    }

    const setupToken = randomBytes(32).toString('hex')
    const tempHash = createHash('sha256').update(randomBytes(16).toString('hex')).digest('hex')

    const ctv = await prisma.ctv.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        email: normalizedEmail,
        dob: dob || null,
        passwordHash: tempHash,
        status: 'pending_setup',
        setupToken,
      },
    })

    console.log(`[CTV register] New CTV id=${ctv.id} email=${normalizedEmail}`)

    return NextResponse.json({
      success: true,
      setupToken,
      message: 'Đăng ký thành công! Hãy kiểm tra hướng dẫn tiếp theo.',
    })
  } catch (err) {
    console.error('[CTV register]', err)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
