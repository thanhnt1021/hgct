import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')

    if (!orderId || isNaN(Number(orderId))) {
      return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      select: {
        paymentStatus: true,
        jobId: true,
        status: true,
        service: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({
      paymentStatus: order.paymentStatus,
      jobId: order.jobId,
      status: order.status,
      service: order.service,
    })
  } catch (error) {
    console.error('[payment/status] Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
