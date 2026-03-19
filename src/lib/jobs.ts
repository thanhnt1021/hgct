// In-memory job store using global to survive module re-evaluation
// (Next.js can re-evaluate modules per route bundle — global is always shared)

import prisma from './db'
import { sendAdminAlert } from './notify'

export interface JobResult {
  pdfUrl?: string
  pdfFilename?: string
  emailSent?: boolean
  email?: string
  recoveryToken?: string  // set when job failed and order has recovery token
  autoRetry?: boolean     // true → processing page silent-redirects to /recover (first failure only)
  autoRetryJobId?: string // set by sweep when auto-retry started — processing page redirects to new job
}

export interface Job {
  id: string
  status: 'processing' | 'done' | 'error' | 'cancelled'
  progress: number   // 0–100
  label: string
  result?: JobResult
  error?: string
  createdAt: number
  lastActivity?: number  // Fix A: in-memory only — updated by updateJob, used for stuck detection
  profileUidA?: string
  profileUidB?: string
  pdfExpiresAt?: string  // ISO string — set when PDF moved to soon_delete
  pdfNote?: string       // shown in HistoryReports under report name
}

// Declare on global to ensure single instance across all Next.js route bundles
declare global {
  // eslint-disable-next-line no-var
  var __hgctJobs: Map<string, Job> | undefined
}

const jobs: Map<string, Job> = global.__hgctJobs ?? (global.__hgctJobs = new Map())

export interface JobMeta {
  userUid?: string
  service?: string
  name?: string
  email?: string
  profileUidA?: string
  profileUidB?: string
}

export function createJob(id: string, meta?: JobMeta): Job {
  const job: Job = {
    id,
    status: 'processing',
    progress: 0,
    label: 'Đang khởi tạo...',
    createdAt: Date.now(),
    lastActivity: Date.now(),
    profileUidA: meta?.profileUidA,
    profileUidB: meta?.profileUidB,
  }
  jobs.set(id, job)
  prisma.job.create({
    data: {
      id, status: 'processing', progress: 0, label: 'Đang khởi tạo...',
      userUid: meta?.userUid,
      service: meta?.service,
      name: meta?.name,
      email: meta?.email,
      profileUidA: meta?.profileUidA,
      profileUidB: meta?.profileUidB,
    }
  }).catch(console.error)
  return job
}

export function updateJob(id: string, updates: Partial<Omit<Job, 'id' | 'createdAt'>>) {
  const job = jobs.get(id)
  if (job) {
    Object.assign(job, updates)
    job.lastActivity = Date.now()  // Fix A: refresh activity timestamp on every update
  }
  const dbUpdates: Record<string, unknown> = {}
  if (updates.status !== undefined) dbUpdates.status = updates.status
  if (updates.progress !== undefined) dbUpdates.progress = updates.progress
  if (updates.label !== undefined) dbUpdates.label = updates.label
  if (updates.result !== undefined) dbUpdates.result = updates.result as object
  if (updates.error !== undefined) dbUpdates.error = updates.error
  if (updates.pdfNote !== undefined) dbUpdates.pdfNote = updates.pdfNote
  if (updates.pdfExpiresAt !== undefined) dbUpdates.pdfExpiresAt = updates.pdfExpiresAt ? new Date(updates.pdfExpiresAt) : null
  if (Object.keys(dbUpdates).length > 0) {
    prisma.job.updateMany({ where: { id }, data: dbUpdates }).catch(console.error)
  }
}

const STUCK_TIMEOUT_MS = 15 * 60 * 1000
export const STUCK_ERROR = 'Đơn hàng gặp lỗi. Vui lòng thử lại.'

// Chars dễ đọc — loại bỏ O/0/I/1 dễ nhầm
const TOKEN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function generateRecoveryToken(): string {
  return Array.from({ length: 8 }, () => TOKEN_CHARS[Math.floor(Math.random() * TOKEN_CHARS.length)]).join('')
}

function markStuckIfNeeded(job: Job): void {
  // Fix A: use lastActivity (last progress update time) instead of createdAt
  // → prevents false positives for long-running Transit/Synastry jobs that actively update progress
  const lastSeen = job.lastActivity ?? job.createdAt
  if (job.status === 'processing' && Date.now() - lastSeen > STUCK_TIMEOUT_MS) {
    job.status = 'error'
    job.label = 'Lỗi'
    job.error = STUCK_ERROR
    prisma.job.updateMany({ where: { id: job.id }, data: { status: 'error', label: 'Lỗi', error: STUCK_ERROR } }).catch(console.error)
  }
}

export async function getJobFromDb(id: string): Promise<Job | undefined> {
  const cached = jobs.get(id)
  if (cached) {
    markStuckIfNeeded(cached)
    return cached
  }
  try {
    const dbJob = await prisma.job.findUnique({ where: { id } })
    if (!dbJob) return undefined
    const job: Job = {
      id: dbJob.id,
      status: dbJob.status as Job['status'],
      progress: dbJob.progress,
      label: dbJob.label,
      result: dbJob.result as JobResult | undefined,
      error: dbJob.error ?? undefined,
      createdAt: dbJob.createdAt.getTime(),
      // lastActivity intentionally not set for DB-loaded jobs:
      // → markStuckIfNeeded falls back to createdAt (sweep already handles orphaned jobs)
      profileUidA: dbJob.profileUidA ?? undefined,
      profileUidB: dbJob.profileUidB ?? undefined,
      pdfExpiresAt: dbJob.pdfExpiresAt?.toISOString(),
      pdfNote: dbJob.pdfNote ?? undefined,
    }
    markStuckIfNeeded(job)
    jobs.set(id, job)
    return job
  } catch {
    return undefined
  }
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id)
}

export function isJobCancelled(id: string): boolean {
  return jobs.get(id)?.status === 'cancelled'
}

export async function cancelJob(id: string): Promise<void> {
  const job = jobs.get(id)
  if (job) job.status = 'cancelled'
  // Delete from DB so it never appears in history
  await prisma.job.delete({ where: { id } }).catch(() => {})
}

export const MAX_RETRIES = 3

// Startup sweep: recover orphaned jobs from previous server run
// New behavior: auto-retry immediately via smartRetryOrder instead of just marking failed
async function sweepStuckJobsOnce() {
  try {
    const processingJobs = await prisma.job.findMany({ where: { status: 'processing' } })
    let fixedCount = 0
    let autoRetried = 0
    let quotaHit = 0

    for (const dbJob of processingJobs) {
      // Skip jobs this server instance created (they're in memory)
      if (global.__hgctJobs?.has(dbJob.id)) continue

      fixedCount++

      // Find linked order
      const order = await prisma.order.findFirst({
        where: { jobId: dbJob.id },
      }).catch(() => null)

      if (!order || order.adminCancelledAt) {
        // No order or admin-cancelled — just mark job as error, no email
        await prisma.job.update({
          where: { id: dbJob.id },
          data: { status: 'error', label: 'Lỗi', error: STUCK_ERROR },
        }).catch(() => {})
        continue
      }

      const iData = (order.profileData as Record<string, unknown>) || {}
      const name = (iData.name as string) || (iData.ten as string) || ''

      // Pre-set recovery token on order (used as fallback if quota exceeded in smartRetryOrder)
      const token = generateRecoveryToken()
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: { recoveryToken: token },
        })
      } catch (err) {
        console.error(`[jobs] Sweep: failed to set recovery token for order ${order.id}:`, err)
      }

      // Mark old orphaned job as error
      await prisma.job.update({
        where: { id: dbJob.id },
        data: { status: 'error', label: 'Lỗi', error: STUCK_ERROR },
      }).catch(() => {})

      // Lazy import to avoid circular dependency
      const { smartRetryOrder } = await import('./smart-retry')
      const result = await smartRetryOrder(order.id, 'sweep')

      if (result.retrying) {
        // Get new jobId from updated order
        const updated = await prisma.order.findUnique({ where: { id: order.id }, select: { jobId: true } })
        const newJobId = updated?.jobId
        if (newJobId) {
          // Tag old job with autoRetryJobId so processing page can redirect to new job
          await prisma.job.update({
            where: { id: dbJob.id },
            data: { result: { autoRetryJobId: newJobId } },
          }).catch(() => {})
          const { sendAutoRetryEmail } = await import('./email')
          await sendAutoRetryEmail({ to: order.email, service: order.service, name, jobId: newJobId }).catch(() => {})
        }
        autoRetried++
        console.log(`[jobs] Sweep: order ${order.id} → auto-retry job ${newJobId?.slice(0, 8)}, email sent`)
      } else if (result.quotaExceeded) {
        // smartRetryOrder already sent recovery email using our pre-set token
        quotaHit++
        console.log(`[jobs] Sweep: order ${order.id} → quota exceeded, recovery email sent (token: ${token})`)
      } else if (result.pdfResent) {
        console.log(`[jobs] Sweep: order ${order.id} → PDF existed, email resent`)
      } else if (result.skipped) {
        console.log(`[jobs] Sweep: order ${order.id} → skipped (cancelled or locked by another process)`)
      }
    }

    if (fixedCount > 0) {
      const parts = []
      if (autoRetried > 0) parts.push(`${autoRetried} đơn đang tự retry`)
      if (quotaHit > 0) parts.push(`${quotaHit} đơn hết quota (đã gửi recovery email)`)
      const detail = parts.length > 0 ? `\n${parts.join(', ')}` : ''
      console.log(`[jobs] Startup sweep: fixed ${fixedCount} orphaned job(s) (${autoRetried} retried, ${quotaHit} quota)`)
      sendAdminAlert(`🔄 <b>Startup sweep: xử lý ${fixedCount} đơn bị gián đoạn</b>${detail}`).catch(() => {})
    }

    // Also clean up orders stuck in 'retrying' state (from crashed smartRetry calls)
    await sweepStuckRetryingOrders()
  } catch (err) {
    console.error('[jobs] sweepStuckJobsOnce error:', err)
  }
}

// Find orders stuck at 'retrying' without an active job → reset + auto-retry
async function sweepStuckRetryingOrders() {
  try {
    const retryingOrders = await prisma.order.findMany({ where: { status: 'retrying' } })
    if (retryingOrders.length === 0) return

    for (const order of retryingOrders) {
      // If job is in memory and still processing on THIS server instance, leave it alone
      if (order.jobId && global.__hgctJobs?.has(order.jobId)) continue

      // Check DB — if job is still processing, leave it alone
      if (order.jobId) {
        const job = await prisma.job.findUnique({
          where: { id: order.jobId },
          select: { status: true },
        }).catch(() => null)
        if (job?.status === 'processing') continue
      }

      if (order.adminCancelledAt) continue

      const iData = (order.profileData as Record<string, unknown>) || {}
      const name = (iData.name as string) || (iData.ten as string) || ''

      // Pre-set recovery token, reset to 'failed' so smartRetryOrder can lock it
      const token = generateRecoveryToken()
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'failed', recoveryToken: token },
        })
        // Mark linked job as error (best-effort)
        if (order.jobId) {
          await prisma.job.update({
            where: { id: order.jobId },
            data: { status: 'error', label: 'Lỗi', error: STUCK_ERROR },
          }).catch(() => {})
        }
      } catch (err) {
        console.error(`[jobs] Failed to reset stuck retrying order ${order.id}:`, err)
        continue
      }

      // Auto-retry
      const { smartRetryOrder } = await import('./smart-retry')
      const result = await smartRetryOrder(order.id, 'sweep')

      if (result.retrying) {
        const updated = await prisma.order.findUnique({ where: { id: order.id }, select: { jobId: true } })
        const newJobId = updated?.jobId
        if (newJobId && order.jobId) {
          // Tag old job with autoRetryJobId so processing page can redirect
          await prisma.job.update({
            where: { id: order.jobId },
            data: { result: { autoRetryJobId: newJobId } },
          }).catch(() => {})
          const { sendAutoRetryEmail } = await import('./email')
          await sendAutoRetryEmail({ to: order.email, service: order.service, name, jobId: newJobId }).catch(() => {})
        }
        console.log(`[jobs] Sweep: cleaned stuck retrying order ${order.id} → auto-retry job ${newJobId?.slice(0, 8)}`)
      } else if (result.quotaExceeded) {
        console.log(`[jobs] Sweep: cleaned stuck retrying order ${order.id} → quota exceeded, recovery email sent`)
      } else if (result.pdfResent) {
        console.log(`[jobs] Sweep: cleaned stuck retrying order ${order.id} → PDF existed, email resent`)
      } else {
        console.log(`[jobs] Sweep: cleaned stuck retrying order ${order.id} → skipped`)
      }
    }
  } catch (err) {
    console.error('[jobs] sweepStuckRetryingOrders error:', err)
  }
}

// Sweep orders that are paid but never had a job started (SePay arrived before server restart)
async function sweepPaidPendingOrders() {
  try {
    const paidPending = await prisma.order.findMany({
      where: { paymentStatus: 'paid', status: 'pending', jobId: null },
    })
    if (paidPending.length === 0) return

    // Lazy import to avoid circular dependency
    const { createReportJob } = await import('./astrology/reportProcessor')

    for (const order of paidPending) {
      try {
        const body: Record<string, unknown> = {
          service: order.service,
          inputData: order.profileData,
          email: order.email,
          name: ((order.profileData as Record<string, unknown>)?.name as string) || '',
        }
        if (order.profileUidA) body.profileUid = order.profileUidA
        if (order.profileUidB) body.profileUidB = order.profileUidB
        if (order.profileDataB) body.inputDataB = order.profileDataB
        if (order.startDate) body.startDate = order.startDate
        if (order.endDate) body.endDate = order.endDate

        await prisma.order.update({ where: { id: order.id }, data: { status: 'processing' } })

        const jobId = createReportJob({
          service: order.service,
          body,
          userUid: order.userUid || undefined,
          orderId: order.id,
          amount: order.amount ?? 0,
        })

        await prisma.order.update({ where: { id: order.id }, data: { jobId } })
        console.log(`[jobs] Sweep paid/pending: order ${order.id} → job ${jobId.slice(0, 8)}`)
      } catch (err) {
        console.error(`[jobs] Sweep paid/pending: order ${order.id} failed:`, err)
      }
    }

    sendAdminAlert(`💰 <b>Startup sweep: found ${paidPending.length} paid/pending order(s) — started jobs</b>`).catch(() => {})
  } catch (err) {
    console.error('[jobs] sweepPaidPendingOrders error:', err)
  }
}

sweepStuckJobsOnce()
sweepPaidPendingOrders()

// Clean up in-memory jobs older than 1 hour
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) jobs.delete(id)
  }
}, 15 * 60 * 1000)

// Watchdog: proactive stuck-job detection, runs every 2 minutes
// Import lazily to avoid circular dependency (watchdog imports smart-retry which imports reportProcessor)
setTimeout(() => {
  import('./job-watchdog').then(({ runWatchdog }) => {
    runWatchdog().catch(() => {})
    setInterval(() => runWatchdog().catch(() => {}), 2 * 60 * 1000)
  }).catch(() => {})
}, 30 * 1000)  // 30s delay — let server fully initialize first
