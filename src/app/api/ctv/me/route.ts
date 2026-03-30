import { NextResponse } from 'next/server'
import { getCtvSession } from '@/lib/ctv/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getCtvSession()
  if (!session) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }

  const ctv = await prisma.ctv.findUnique({
    where: { id: session.ctvId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      dob: true,
      ctvCode: true,
      status: true,
      commissionRate: true,
      createdAt: true,
    },
  })

  if (!ctv) {
    return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 })
  }

  return NextResponse.json({ ctv })
}
