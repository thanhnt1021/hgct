import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/ctv/verify-code?code=xxx — public endpoint to verify a CTV code at checkout
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.json({ valid: false })
  }

  const ctv = await prisma.ctv.findUnique({
    where: { ctvCode: code },
    select: { id: true, name: true, status: true, commissionRate: true },
  })

  if (!ctv || ctv.status !== 'active') {
    return NextResponse.json({ valid: false })
  }

  return NextResponse.json({
    valid: true,
    name: ctv.name,
    discountPct: Math.round((ctv.commissionRate ?? 0.10) * 100),
  })
}
