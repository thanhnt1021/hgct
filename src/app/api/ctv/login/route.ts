import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createHash } from 'crypto'
import { signCtvToken, setCtvCookie } from '@/lib/ctv/auth'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Vui lòng nhập email và mật khẩu' }, { status: 400 })
    }

    const ctv = await prisma.ctv.findUnique({
      where: { email: email.trim().toLowerCase() },
    })

    if (!ctv) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 })
    }

    if (ctv.status === 'disabled') {
      return NextResponse.json({ error: 'Tài khoản đã bị vô hiệu hóa' }, { status: 403 })
    }

    const valid = hashPassword(password) === ctv.passwordHash
    if (!valid) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 })
    }

    const token = await signCtvToken({
      ctvId: ctv.id,
      email: ctv.email,
      name: ctv.name,
      ctvCode: ctv.ctvCode,
      status: ctv.status,
    })

    const res = NextResponse.json({
      success: true,
      needsSetup: ctv.status === 'pending_setup',
      ctvId: ctv.id,
    })
    setCtvCookie(res, token)
    return res
  } catch (err) {
    console.error('[CTV login]', err)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
