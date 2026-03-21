import { NextRequest, NextResponse } from 'next/server'
import { checkAdminToken } from '@/lib/dashboard-auth'
import prisma from '@/lib/db'

export async function GET(req: NextRequest) {
  const authErr = await checkAdminToken(req)
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10))
  const status = searchParams.get('status') ?? ''
  const service = searchParams.get('service') ?? ''

  const where: any = {}
  if (status) where.status = status
  if (service) where.service = service

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        service: true,
        email: true,
        status: true,
        paymentStatus: true,
        amount: true,
        paidAt: true,
        createdAt: true,
        retryCount: true,
        jobId: true,
        pdfUrl: true,
        adminCancelledAt: true,
        claimedAt: true,
      },
    }),
  ])

  return NextResponse.json({ orders, total, page, limit })
}
