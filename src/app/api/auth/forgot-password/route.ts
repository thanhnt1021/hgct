import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // Don't reveal if email exists
      return NextResponse.json({ success: true })
    }

    // TODO: Send actual password reset email via nodemailer
    // For now, just acknowledge
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
