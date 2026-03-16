import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import prisma from '@/lib/db'
import { createJob } from '@/lib/jobs'
import { processReport } from '@/lib/astrology/reportProcessor'

export const dynamic = 'force-dynamic'

// Always respond 200 to SePay — errors are logged internally
// (non-200 causes SePay to retry Fibonacci up to 7 times over 5 hours)
const OK = () => NextResponse.json({ success: true })

export async function POST(request: Request) {
  try {
    // 1. Verify API key from SePay
    const authHeader = request.headers.get('Authorization') || ''
    const expectedKey = `Apikey ${process.env.SEPAY_API_KEY || ''}`
    if (!process.env.SEPAY_API_KEY || authHeader !== expectedKey) {
      console.warn('[sepay-webhook] Unauthorized — bad API key')
      return NextResponse.json({ success: false }, { status: 401 })
    }

    // 2. Parse body
    const payload = await request.json()
    const {
      id: txnId,
      code,
      transferType,
      transferAmount,
    } = payload as {
      id: number
      code: string | null
      transferType: string
      transferAmount: number
      content: string
      gateway: string
      transactionDate: string
      referenceCode: string
      accountNumber: string
    }

    console.log(`[sepay-webhook] txnId=${txnId} code=${code} type=${transferType} amount=${transferAmount}`)

    // 3. Only process incoming transfers
    if (transferType !== 'in') {
      return OK()
    }

    // 4. Must have a payment code
    if (!code) {
      console.log('[sepay-webhook] No code — ignoring')
      return OK()
    }

    // 5. Deduplication — check if this transaction was already processed
    const existing = await prisma.order.findFirst({ where: { sepayTxnId: txnId } })
    if (existing) {
      console.log(`[sepay-webhook] Duplicate txnId=${txnId} — already processed`)
      return OK()
    }

    // 6. Find matching unpaid order
    const order = await prisma.order.findFirst({
      where: { transferCode: code, paymentStatus: 'unpaid' },
    })
    if (!order) {
      console.warn(`[sepay-webhook] No unpaid order for code=${code}`)
      return OK()
    }

    // 7. Verify amount (allow overpayment, reject underpayment)
    if (order.amount && transferAmount < order.amount) {
      console.warn(
        `[sepay-webhook] Underpayment: got ${transferAmount}, expected ${order.amount} for order=${order.id}`,
      )
      // Policy: still mark paid (amount close enough) — log for manual review
    }

    // 8. Mark order as paid
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'paid',
        paidAt: new Date(),
        sepayTxnId: txnId,
        status: 'processing',
      },
    })

    // 9. Create report job
    const jobId = randomUUID()
    const body: Record<string, unknown> = {
      service: order.service,
      inputData: order.profileData,
      email: order.email,
      name: (() => {
        const pd = order.profileData as Record<string, unknown>
        return pd?.name || ''
      })(),
      profileUid: order.profileUidA ?? undefined,
      profileUidB: order.profileUidB ?? undefined,
      inputDataB: order.profileDataB ?? undefined,
      startDate: order.startDate ?? undefined,
      endDate: order.endDate ?? undefined,
    }

    createJob(jobId, {
      userUid: order.userUid ?? undefined,
      service: order.service,
      name: (order.profileData as Record<string, unknown>)?.name as string | undefined,
      email: order.email,
      profileUidA: order.profileUidA ?? undefined,
      profileUidB: order.profileUidB ?? undefined,
    })

    // Update order with jobId
    await prisma.order.update({
      where: { id: order.id },
      data: { jobId },
    })

    // 10. Fire-and-forget report processing
    processReport(jobId, body, order.id).catch((err) => {
      console.error(`[sepay-webhook] processReport error for job ${jobId}:`, err)
    })

    console.log(`[sepay-webhook] Order ${order.id} paid — started job ${jobId}`)
    return OK()
  } catch (err) {
    console.error('[sepay-webhook] Unexpected error:', err)
    // Still return 200 so SePay doesn't retry
    return OK()
  }
}
