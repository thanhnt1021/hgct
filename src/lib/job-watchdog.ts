// Job Watchdog — proactive stuck job detection, runs every 2 minutes
// Complements startup sweep (which runs once) and markStuckIfNeeded (reactive, per-poll)

import prisma from './db'
import { smartRetryOrder } from './smart-retry'
import { sendAdminAlert } from './notify'
import type { Job } from './jobs'

// Per-service stuck threshold — Transit/Synastry AI generation can be silent for 15+ min
const STUCK_THRESHOLD_MS: Record<string, number> = {
  career: 12 * 60 * 1000,
  love: 12 * 60 * 1000,
  synastry: 20 * 60 * 1000,
  transit: 20 * 60 * 1000,
}
const DEFAULT_THRESHOLD_MS = 15 * 60 * 1000

function threshold(service: string): number {
  return STUCK_THRESHOLD_MS[service] ?? DEFAULT_THRESHOLD_MS
}

// Access in-memory job store via global (same pattern as jobs.ts)
declare global {
  // eslint-disable-next-line no-var
  var __hgctJobs: Map<string, Job> | undefined
}

export async function runWatchdog(): Promise<void> {
  try {
    // Find all orders currently in processing state (exclude admin-cancelled)
    const processingOrders = await prisma.order.findMany({
      where: { status: 'processing', adminCancelledAt: null },
      select: { id: true, jobId: true, service: true, email: true, profileData: true, pdfUrl: true, paymentStatus: true, createdAt: true },
    })

    if (processingOrders.length === 0) return

    const now = Date.now()

    for (const order of processingOrders) {
      // TC-L: paid order stuck in 'processing' with no job (crash between payment confirmation and job creation)
      if (!order.jobId) {
        if (order.paymentStatus === 'paid') {
          const age = now - order.createdAt.getTime()
          if (age > threshold(order.service) + 5 * 60 * 1000) {
            console.log(`[watchdog] Order ${order.id} (${order.service}) stuck processing+paid+no-job — triggering smartRetry`)
            const result = await smartRetryOrder(order.id, 'watchdog')
            if (!result.skipped) {
              const name = ((order.profileData as Record<string, unknown>)?.name as string) || ''
              const svcName: Record<string, string> = { career: 'Hướng Nghiệp', love: 'Tình Duyên', synastry: 'Cặp Đôi', transit: 'Vận Hạn' }
              const svc = svcName[order.service] || order.service
              if (result.retrying) {
                await sendAdminAlert(`⏰ <b>Watchdog: đơn #${order.id} paid+no-job — auto-retry</b>\n📦 ${svc} | ${name}`).catch(() => {})
              } else if (result.quotaExceeded) {
                await sendAdminAlert(
                  `⏰ <b>Watchdog: đơn #${order.id} paid+no-job — hết quota retry</b>\n📦 ${svc} | ${name}`,
                  [[{ text: `🔄 Admin retry #${order.id}`, callback_data: `o_retry_${order.id}` }]],
                ).catch(() => {})
              }
            }
          }
        }
        continue
      }

      const inMemJob = global.__hgctJobs?.get(order.jobId)

      // Determine if stuck
      let isStuck = false
      if (inMemJob) {
        // Job in memory — check lastActivity
        const lastSeen = inMemJob.lastActivity ?? 0
        if (lastSeen > 0 && now - lastSeen > threshold(order.service)) {
          isStuck = true
        }
      } else {
        // Job NOT in memory — orphan from before restart, sweep should have caught it
        // but just in case: check DB job createdAt
        const dbJob = await prisma.job.findUnique({
          where: { id: order.jobId },
          select: { status: true, createdAt: true, error: true },
        })
        if (dbJob && dbJob.status === 'processing') {
          const age = now - dbJob.createdAt.getTime()
          if (age > threshold(order.service) + 5 * 60 * 1000) {
            isStuck = true
          }
        }
      }

      if (!isStuck) continue

      console.log(`[watchdog] Order ${order.id} (${order.service}) stuck — triggering smartRetry`)

      // Bug #4 fix: OOM hint is in inMemJob.error, not inMemJob.result.error
      let errorHint = ''
      if (inMemJob?.error && /OOM|ENOMEM|Chromium|out of memory/i.test(inMemJob.error)) {
        errorHint = '⚠️ Có thể thiếu RAM (OOM/Chromium)'
      }

      const result = await smartRetryOrder(order.id, 'watchdog')

      if (result.skipped) continue  // already locked/retrying

      const name = ((order.profileData as Record<string, unknown>)?.name as string) || ''
      const svcName: Record<string, string> = { career: 'Hướng Nghiệp', love: 'Tình Duyên', synastry: 'Cặp Đôi', transit: 'Vận Hạn' }
      const svc = svcName[order.service] || order.service

      if (result.quotaExceeded) {
        await sendAdminAlert(
          `⏰ <b>Watchdog: đơn #${order.id} treo — hết quota retry</b>\n📦 ${svc} | ${name}\n📧 ${order.email}`,
          [[
            { text: `🔄 Admin retry #${order.id}`, callback_data: `o_retry_${order.id}` },
            { text: `📧 Email #${order.id}`, callback_data: `o_email_${order.id}` },
          ]],
        ).catch(() => {})
      } else if (result.pdfResent) {
        await sendAdminAlert(
          `⏰ <b>Watchdog: đơn #${order.id} — PDF có sẵn, đã gửi lại email</b>\n📦 ${svc} | ${name}`,
        ).catch(() => {})
      } else if (result.retrying) {
        const retryMsg = errorHint
          ? `⏰ <b>Watchdog: đơn #${order.id} treo — auto-retry</b>\n📦 ${svc} | ${name}\n${errorHint}`
          : `⏰ <b>Watchdog: đơn #${order.id} treo — auto-retry</b>\n📦 ${svc} | ${name}`
        await sendAdminAlert(retryMsg).catch(() => {})
      }
    }

    // [3.7] Check completed orders where emailSent=false and job result is old
    const completedOrders = await prisma.order.findMany({
      where: { status: 'completed', pdfUrl: { not: null } },
      select: { id: true, jobId: true, email: true, service: true, profileData: true, pdfUrl: true },
      orderBy: { id: 'desc' },
      take: 50,  // only check recent ones
    })

    for (const order of completedOrders) {
      if (!order.jobId || !order.pdfUrl) continue
      const inMemJob = global.__hgctJobs?.get(order.jobId)

      let jobResult: { emailSent?: boolean; pdfUrl?: string } | undefined
      let doneSince = 0

      if (inMemJob) {
        if (inMemJob.status !== 'done') continue
        jobResult = inMemJob.result as { emailSent?: boolean; pdfUrl?: string } | undefined
        doneSince = inMemJob.lastActivity ?? 0
      } else {
        // Bug #6 fix: DB fallback when job evicted from in-memory store (>1h)
        const dbJob = await prisma.job.findUnique({
          where: { id: order.jobId },
          select: { status: true, result: true, createdAt: true },
        })
        if (!dbJob || dbJob.status !== 'done') continue
        jobResult = dbJob.result as { emailSent?: boolean; pdfUrl?: string } | undefined
        // Job was evicted from memory (>1h) — definitely past the 5-min threshold
        doneSince = dbJob.createdAt.getTime()
      }

      if (!jobResult || jobResult.emailSent !== false) continue

      // emailSent=false and job has been done for > 5 min
      if (doneSince === 0 || now - doneSince < 5 * 60 * 1000) continue

      // Try resend email
      try {
        const { resolvePdfPath } = await import('./smart-retry')
        const filePath = resolvePdfPath(order.pdfUrl)
        if (!filePath) continue
        const fs = await import('fs')
        if (!fs.existsSync(filePath)) continue
        const pdfBuffer = fs.readFileSync(filePath)
        const profileData = order.profileData as Record<string, unknown>
        const name = (profileData?.name as string) || ''
        const { sendReportEmail } = await import('./email')
        await sendReportEmail(order.email, name, order.service, pdfBuffer)
        // Update job result in memory (only if job is still in memory store)
        if (inMemJob) inMemJob.result = { ...jobResult, emailSent: true }
        console.log(`[watchdog] Order ${order.id} — email resent (was emailSent=false)`)
      } catch (err) {
        console.error(`[watchdog] Order ${order.id} — email resend failed:`, err)
        await sendAdminAlert(
          `📧 <b>Email fail đơn #${order.id}</b>\nPDF có tại <code>/api/pdf/${order.pdfUrl.split('/').pop()?.split('?')[0]}</code>`,
        ).catch(() => {})
      }
    }
  } catch (err) {
    console.error('[watchdog] Error:', err)
  }
}
