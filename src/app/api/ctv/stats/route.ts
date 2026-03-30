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
    select: { ctvCode: true, commissionRate: true },
  })

  if (!ctv || !ctv.ctvCode) {
    return NextResponse.json({
      totalOrders: 0,
      totalRevenue: 0,
      totalCommission: 0,
      paidCommission: 0,
      pendingCommission: 0,
      commissionRate: ctv?.commissionRate || 0.1,
    })
  }

  const [totalOrders, totalRevenue, commissions, paidComm] = await Promise.all([
    prisma.order.count({
      where: { ctvCode: ctv.ctvCode, status: 'completed' },
    }),
    prisma.order.aggregate({
      where: { ctvCode: ctv.ctvCode, status: 'completed' },
      _sum: { amount: true },
    }),
    prisma.ctvCommission.aggregate({
      where: { ctvId: session.ctvId },
      _sum: { amount: true },
    }),
    prisma.ctvCommission.aggregate({
      where: { ctvId: session.ctvId, status: 'paid' },
      _sum: { amount: true },
    }),
  ])

  const totalCommission = commissions._sum.amount || 0
  const paidCommission = paidComm._sum.amount || 0

  return NextResponse.json({
    totalOrders,
    totalRevenue: totalRevenue._sum.amount || 0,
    totalCommission,
    paidCommission,
    pendingCommission: totalCommission - paidCommission,
    commissionRate: ctv.commissionRate,
  })
}
