// smartRetryOrder — centralized retry logic for all retry triggers
// Used by: watchdog, admin bot (handleRetryOrder), customer (/api/recover)

import fs from 'fs'
import path from 'path'
import prisma from './db'
import { createReportJob, PDF_DIR } from './astrology/reportProcessor'
import { sendReportEmail, makePdfFilename } from './email'
import { MAX_RETRIES } from './jobs'
import { sendRecoveryEmail } from './email'

export type RetryTrigger = 'watchdog' | 'admin' | 'customer' | 'sweep'

export interface SmartRetryResult {
  skipped?: boolean      // already locked or not in retryable state
  pdfResent?: boolean    // PDF existed — only resent email
  retrying?: boolean     // full retry started
  quotaExceeded?: boolean
}

// Extract pdfId from pdfUrl like "/api/pdf/{pdfId}?filename=..."
export function resolvePdfPath(pdfUrl: string): string | null {
  try {
    const pathname = new URL(pdfUrl, 'http://x').pathname  // e.g. /api/pdf/abc-123
    const pdfId = pathname.split('/').pop()
    if (!pdfId) return null
    return path.join(PDF_DIR, `${pdfId}.pdf`)
  } catch {
    return null
  }
}

export async function smartRetryOrder(
  orderId: number,
  triggeredBy: RetryTrigger,
): Promise<SmartRetryResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) return { skipped: true }
  if (order.adminCancelledAt) return { skipped: true }

  // Admin bypass: reset retryCount so quota check doesn't block
  if (triggeredBy === 'admin' && order.retryCount >= MAX_RETRIES) {
    await prisma.order.update({ where: { id: orderId }, data: { retryCount: 0 } })
  }

  // Reload after potential reset
  const fresh = triggeredBy === 'admin'
    ? await prisma.order.findUnique({ where: { id: orderId } })
    : order
  if (!fresh) return { skipped: true }

  // ATOMIC LOCK: only grab orders that are in a retryable state
  const locked = await prisma.order.updateMany({
    where: { id: orderId, status: { in: ['failed', 'processing'] } },
    data: { status: 'retrying' },
  })
  if (locked.count === 0) return { skipped: true }

  // CHECK PDF: pdfUrl set + file on disk → only resend email
  if (fresh.pdfUrl) {
    const filePath = resolvePdfPath(fresh.pdfUrl)
    if (filePath && fs.existsSync(filePath)) {
      try {
        const pdfBuffer = fs.readFileSync(filePath)
        const profileData = fresh.profileData as Record<string, unknown>
        const name = (profileData?.name as string) || ''
        const profileDataB = fresh.profileDataB as Record<string, unknown> | null
        const nameB = profileDataB ? ((profileDataB?.name as string) || '') : undefined
        const filename = makePdfFilename(fresh.service, name, nameB)
        await sendReportEmail(fresh.email, name, fresh.service, pdfBuffer, nameB)
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'completed' },
        })
        console.log(`[smartRetry] Order ${orderId} — PDF existed, resent email (${triggeredBy})`)
        return { pdfResent: true }
      } catch (err) {
        console.error(`[smartRetry] Order ${orderId} — PDF exists but email resend failed:`, err)
        // Fall through to full retry
      }
    }
  }

  // QUOTA CHECK (non-admin)
  if (triggeredBy !== 'admin' && (fresh.retryCount ?? 0) >= MAX_RETRIES) {
    await prisma.order.update({ where: { id: orderId }, data: { status: 'failed' } })
    const profileData = fresh.profileData as Record<string, unknown>
    const name = (profileData?.name as string) || ''
    await sendRecoveryEmail({
      to: fresh.email,
      service: fresh.service,
      token: fresh.recoveryToken || '',
      name,
    }).catch(() => {})
    console.log(`[smartRetry] Order ${orderId} — quota exceeded (retryCount=${fresh.retryCount}), ${triggeredBy}`)
    return { quotaExceeded: true }
  }

  // FULL RETRY
  const body: Record<string, unknown> = {
    service: fresh.service,
    inputData: fresh.profileData,
    email: fresh.email,
    name: ((fresh.profileData as Record<string, unknown>)?.name as string) || '',
  }
  if (fresh.profileUidA) body.profileUid = fresh.profileUidA
  if (fresh.profileUidB) body.profileUidB = fresh.profileUidB
  if (fresh.profileDataB) body.inputDataB = fresh.profileDataB
  if (fresh.startDate) body.startDate = fresh.startDate
  if (fresh.endDate) body.endDate = fresh.endDate

  const jobId = createReportJob({
    service: fresh.service,
    body,
    userUid: fresh.userUid || undefined,
    orderId: fresh.id,
    amount: fresh.amount ?? 0,
  })

  await prisma.order.update({
    where: { id: orderId },
    data: { jobId, retryCount: { increment: 1 }, recoveryToken: null },
  })

  console.log(`[smartRetry] Order ${orderId} — full retry started, job ${jobId.slice(0, 8)} (${triggeredBy}, retryCount→${(fresh.retryCount ?? 0) + 1})`)
  return { retrying: true }
}
