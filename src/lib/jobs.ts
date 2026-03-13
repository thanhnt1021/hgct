// In-memory job store using global to survive module re-evaluation
// (Next.js can re-evaluate modules per route bundle — global is always shared)

import prisma from './db'

export interface JobResult {
  pdfUrl?: string
  pdfFilename?: string
  emailSent?: boolean
  email?: string
}

export interface Job {
  id: string
  status: 'processing' | 'done' | 'error'
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

export async function getJobFromDb(id: string): Promise<Job | undefined> {
  const cached = jobs.get(id)
  if (cached) return cached
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
    jobs.set(id, job)
    return job
  } catch {
    return undefined
  }
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id)
}

// Clean up jobs older than 1 hour
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) jobs.delete(id)
  }
}, 15 * 60 * 1000)
