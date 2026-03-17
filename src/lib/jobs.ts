// In-memory job store using global to survive module re-evaluation
// (Next.js can re-evaluate modules per route bundle — global is always shared)

import prisma from './db'
import { sendRecoveryEmail } from './email'

export interface JobResult {
  pdfUrl?: string
  pdfFilename?: string
  emailSent?: boolean
  email?: string
  recoveryToken?: string  // set when job failed and order has recovery token
}

export interface Job {
  id: string
  status: 'processing' | 'done' | 'error' | 'cancelled'
  progress: number   // 0–100
  label: string
  result?: JobResult
  error?: string
  createdAt: number
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
  if (job) Object.assign(job, updates)
  const dbUpdates: Record<string, unknown> = {}
  if (updates.status !== undefined) dbUpdates.status = updates.status
  if (updates.progress !== undefined) dbUpdates.progress = updates.progress
  if (updates.label !== undefined) dbUpdates.label = updates.label
  if (updates.result !== undefined) dbUpdates.result = updates.result as object
  if (updates.error !== undefined) dbUpdates.error = updates.error
  if (updates.pdfNote !== undefined) dbUpdates.pdfNote = updates.pdfNote
  if (updates.pdfExpiresAt !== undefined) dbUpdates.pdfExpiresAt = updates.pdfExpiresAt ? new Date(updates.pdfExpiresAt) : null
  if (Object.keys(dbUpdates).length > 0) {
    prisma.job.update({ where: { id }, data: dbUpdates }).catch(console.error)
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
  if (job.status === 'processing' && Date.now() - job.createdAt > STUCK_TIMEOUT_MS) {
    job.status = 'error'
    job.label = 'Lỗi'
    job.error = STUCK_ERROR
    prisma.job.update({ where: { id: job.id }, data: { status: 'error', label: 'Lỗi', error: STUCK_ERROR } }).catch(console.error)
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

// Startup sweep: recover orphaned jobs from previous server run
// Logic: jobs in DB with status='processing' NOT in in-memory map → from previous run → mark failed + recovery token
async function sweepStuckJobsOnce() {
  try {
    const processingJobs = await prisma.job.findMany({ where: { status: 'processing' } })
    let fixedCount = 0

    for (const dbJob of processingJobs) {
      // Skip jobs this server instance created (they're in memory)
      if (global.__hgctJobs?.has(dbJob.id)) continue

      // Mark orphaned job as error
      await prisma.job.update({
        where: { id: dbJob.id },
        data: { status: 'error', label: 'Lỗi', error: STUCK_ERROR },
      }).catch(() => {})
      fixedCount++

      // Find linked order and generate recovery token
      const order = await prisma.order.findFirst({
        where: { jobId: dbJob.id },
      }).catch(() => null)

      if (!order || order.recoveryToken) continue // no order or already has token

      const token = generateRecoveryToken()
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'failed', recoveryToken: token },
        })
        // Extract name from profileData (inputData)
        const iData = (order.profileData as Record<string, unknown>) || {}
        const name = (iData.name as string) || (iData.ten as string) || ''
        await sendRecoveryEmail({ to: order.email, service: order.service, token, name })
        console.log(`[jobs] Startup sweep: recovery email sent for order ${order.id} (token: ${token})`)
      } catch (err) {
        console.error(`[jobs] Recovery token/email failed for order ${order.id}:`, err)
      }
    }

    if (fixedCount > 0) console.log(`[jobs] Startup sweep: fixed ${fixedCount} orphaned job(s)`)
  } catch (err) {
    console.error('[jobs] sweepStuckJobsOnce error:', err)
  }
}

sweepStuckJobsOnce()

// Clean up in-memory jobs older than 1 hour
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) jobs.delete(id)
  }
}, 15 * 60 * 1000)
