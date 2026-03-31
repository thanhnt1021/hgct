import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import prisma from '@/lib/db'
import { sendRetentionEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

// Flag to enable/disable retention emails
const RETENTION_EMAIL_ENABLED = true

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET || ''
  const expected = `Bearer ${secret}`
  const keyMatch =
    secret.length > 0 &&
    authHeader.length === expected.length &&
    timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
  if (!keyMatch) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  // 8-day cutoff: don't send to orders older than 8 days
  const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)

  // Find completed orders from 7-8 days ago with no retention email sent
  const orders = await prisma.order.findMany({
    where: {
      status: 'completed',
      paidAt: { gte: eightDaysAgo, lte: sevenDaysAgo },
      retentionEmailSentAt: null,
      adminCancelledAt: null,
    },
    select: {
      id: true,
      email: true,
      service: true,
      profileData: true,
      jobId: true,
    },
  })

  const results = { sent: 0, skipped: 0, errors: [] as string[] }

  for (const order of orders) {
    try {
      // Mark first — prevents duplicate sends if cron runs twice
      await prisma.order.update({
        where: { id: order.id },
        data: { retentionEmailSentAt: now },
      })

      if (!RETENTION_EMAIL_ENABLED) {
        results.skipped++
        continue
      }

      const pd = order.profileData as Record<string, unknown>
      const name = (pd?.name as string) || ''

      await sendRetentionEmail({
        to: order.email,
        service: order.service,
        name,
        pdfJobId: order.jobId ?? undefined,
      })

      results.sent++
      console.log(`[CRON retention] Sent to order #${order.id} (${order.email})`)
    } catch (err) {
      results.errors.push(`order #${order.id}: ${err}`)
    }
  }

  console.log('[CRON retention]', JSON.stringify(results))
  return NextResponse.json({ ok: true, ...results })
}
