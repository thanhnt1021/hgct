import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { signCtvToken, setCtvCookie, hashCtvPassword } from '@/lib/ctv/auth'

// POST /api/ctv/setup — set password + CTV code for pending_setup CTVs
export async function POST(req: NextRequest) {
  try {
    const { setupToken, password, ctvCode } = await req.json()

    if (!setupToken || !password || !ctvCode) {
      return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Mật khẩu phải ít nhất 8 ký tự' }, { status: 400 })
    }

    if (!/^[a-zA-Z0-9_-]{4,20}$/.test(ctvCode)) {
      return NextResponse.json(
        { error: 'Mã CTV chỉ gồm chữ cái, số, - hoặc _, từ 4-20 ký tự' },
        { status: 400 },
      )
    }

    const ctv = await prisma.ctv.findFirst({ where: { setupToken } })
    if (!ctv) {
      return NextResponse.json({ error: 'Link thiết lập không hợp lệ hoặc đã hết hạn' }, { status: 400 })
    }

    if (ctv.status !== 'pending_setup') {
      return NextResponse.json({ error: 'Tài khoản đã được thiết lập' }, { status: 400 })
    }

    const codeExists = await prisma.ctv.findUnique({ where: { ctvCode } })
    if (codeExists) {
      return NextResponse.json({ error: 'Mã CTV đã được sử dụng, hãy chọn mã khác' }, { status: 409 })
    }

    const passwordHash = await hashCtvPassword(password)

    const updated = await prisma.ctv.update({
      where: { id: ctv.id },
      data: {
        passwordHash,
        ctvCode,
        status: 'active',
        setupToken: null, // consume — one-time use
      },
    })

    const token = await signCtvToken({
      ctvId: updated.id,
      email: updated.email,
      name: updated.name,
      ctvCode: updated.ctvCode,
      status: updated.status,
    })

    const res = NextResponse.json({
      success: true,
      ctvCode: updated.ctvCode,
      message: 'Thiết lập thành công!',
    })
    setCtvCookie(res, token)
    return res
  } catch (err) {
    console.error('[CTV setup]', err)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
