import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { randomBytes } from 'crypto'
import { signCtvToken, setCtvCookie, verifyCtvPassword, hashCtvPassword } from '@/lib/ctv/auth'
import { checkCtvLoginRateLimit } from '@/lib/ratelimit'

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown'
    const allowed = await checkCtvLoginRateLimit(ip)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Quá nhiều lần thử. Vui lòng đợi 15 phút.' },
        { status: 429 },
      )
    }

    const { email, password } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Vui lòng nhập email' }, { status: 400 })
    }

    const ctv = await prisma.ctv.findUnique({
      where: { email: email.trim().toLowerCase() },
    })

    // Generic error — do not reveal whether email exists
    if (!ctv) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 })
    }

    if (ctv.status === 'disabled') {
      return NextResponse.json({ error: 'Tài khoản đã bị vô hiệu hóa' }, { status: 403 })
    }

    // pending_setup: generate/return setupToken — never expose ctvId+email
    if (ctv.status === 'pending_setup') {
      let token = ctv.setupToken
      if (!token) {
        token = randomBytes(32).toString('hex')
        await prisma.ctv.update({ where: { id: ctv.id }, data: { setupToken: token } })
      }
      return NextResponse.json({ success: true, needsSetup: true, setupToken: token })
    }

    if (!password) {
      return NextResponse.json({ error: 'Vui lòng nhập mật khẩu' }, { status: 400 })
    }

    const { valid, needsRehash } = await verifyCtvPassword(password, ctv.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 })
    }

    // Silent rehash: upgrade SHA256 → bcrypt12
    if (needsRehash) {
      const newHash = await hashCtvPassword(password)
      await prisma.ctv.update({ where: { id: ctv.id }, data: { passwordHash: newHash } })
    }

    const jwtToken = await signCtvToken({
      ctvId: ctv.id,
      email: ctv.email,
      name: ctv.name,
      ctvCode: ctv.ctvCode,
      status: ctv.status,
    })

    const res = NextResponse.json({ success: true, needsSetup: false })
    setCtvCookie(res, jwtToken)
    return res
  } catch (err) {
    console.error('[CTV login]', err)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
