import { NextRequest, NextResponse } from 'next/server'
import { checkAdminToken } from '@/lib/dashboard-auth'
import { prisma } from '@/lib/db'

// GET /api/admin/ctv — list all CTVs with commission summary
export async function GET(req: NextRequest) {
  const authErr = await checkAdminToken(req)
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = 20
  const skip = (page - 1) * limit

  const [ctvs, total] = await Promise.all([
    prisma.ctv.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        commissions: {
          select: { amount: true, status: true },
        },
        _count: {
          select: { commissions: true },
        },
      },
    }),
    prisma.ctv.count(),
  ])

  const result = ctvs.map(ctv => {
    const totalComm = ctv.commissions.reduce((s, c) => s + c.amount, 0)
    const paidComm = ctv.commissions.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0)
    return {
      id: ctv.id,
      email: ctv.email,
      name: ctv.name,
      phone: ctv.phone,
      dob: ctv.dob,
      ctvCode: ctv.ctvCode,
      status: ctv.status,
      commissionRate: ctv.commissionRate,
      createdAt: ctv.createdAt,
      orderCount: ctv._count.commissions,
      totalCommission: totalComm,
      paidCommission: paidComm,
      pendingCommission: totalComm - paidComm,
    }
  })

  return NextResponse.json({ ctvs: result, total, page, totalPages: Math.ceil(total / limit) })
}

// PATCH /api/admin/ctv — update CTV status or commissionRate
export async function PATCH(req: NextRequest) {
  const authErr = await checkAdminToken(req)
  if (authErr) return authErr

  const { ctvId, status, commissionRate } = await req.json()

  if (!ctvId) {
    return NextResponse.json({ error: 'ctvId required' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}

  if (status !== undefined) {
    const validStatuses = ['pending_setup', 'active', 'disabled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    data.status = status
  }

  if (commissionRate !== undefined) {
    const rate = parseFloat(commissionRate)
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
      return NextResponse.json({ error: 'commissionRate must be 0–1' }, { status: 400 })
    }
    data.commissionRate = rate
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const updated = await prisma.ctv.update({
    where: { id: Number(ctvId) },
    data,
    select: { id: true, status: true, commissionRate: true },
  })

  return NextResponse.json({ ok: true, ctv: updated })
}
