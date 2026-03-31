import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { sendCustomerClaimAlert } from '@/lib/notify'
import { checkClaimRateLimit } from '@/lib/ratelimit'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderId, amount, transferContent } = body as {
      orderId: number
      amount?: number
      transferContent?: string
    }

    if (!orderId || typeof orderId !== 'number') {
      return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 })
    }

    // Rate limit: 3 claims per IP per orderId per hour
    const ip =
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown'
    const allowed = await checkClaimRateLimit(ip, orderId)
    if (!allowed) {
      return NextResponse.json({ success: true }) // Silent 200 — don't reveal throttle
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, transferCode: true, paymentStatus: true, status: true },
    })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Save claim info — even if already paid (duplicate claim is harmless)
    await prisma.order.update({
      where: { id: orderId },
      data: {
        claimedAt: new Date(),
        claimInfo: {
          amount: amount ?? null,
          transferContent: transferContent ?? null,
          submittedAt: new Date().toISOString(),
        },
      },
    })

    // Alert admin (fire-and-forget)
    sendCustomerClaimAlert({
      orderId,
      transferCode: order.transferCode || '',
      claimedAmount: amount,
      transferContent,
    }).catch(() => {})

    console.log(`[claim-transfer] Order ${orderId} claimed — amount=${amount}, content=${transferContent}`)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[claim-transfer] Error:', err)
    // Always 200 to client — claim is best-effort
    return NextResponse.json({ success: true })
  }
}
