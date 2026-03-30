import { NextRequest, NextResponse } from 'next/server'
import { getCtvSession } from '@/lib/ctv/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getCtvSession()
  if (!session) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }

  if (!session.ctvCode) {
    return NextResponse.json({ orders: [], total: 0, totalCommission: 0 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = 20
  const skip = (page - 1) * limit

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: {
        ctvCode: session.ctvCode,
        status: 'completed',
      },
      include: {
        ctvCommission: {
          select: { amount: true, status: true, paidAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({
      where: {
        ctvCode: session.ctvCode,
        status: 'completed',
      },
    }),
  ])

  const totalCommission = await prisma.ctvCommission.aggregate({
    where: {
      ctvId: session.ctvId,
    },
    _sum: { amount: true },
  })

  const paidCommission = await prisma.ctvCommission.aggregate({
    where: {
      ctvId: session.ctvId,
      status: 'paid',
    },
    _sum: { amount: true },
  })

  return NextResponse.json({
    orders: orders.map(o => ({
      id: o.id,
      service: o.service,
      email: o.email,
      amount: o.amount,
      createdAt: o.createdAt,
      commission: o.ctvCommission
        ? {
            amount: o.ctvCommission.amount,
            status: o.ctvCommission.status,
            paidAt: o.ctvCommission.paidAt,
          }
        : null,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
    totalCommission: totalCommission._sum.amount || 0,
    paidCommission: paidCommission._sum.amount || 0,
    pendingCommission: (totalCommission._sum.amount || 0) - (paidCommission._sum.amount || 0),
  })
}
