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
}

// Declare on global to ensure single instance across all Next.js route bundles
declare global {
  // eslint-disable-next-line no-var
  var __hgctJobs: Map<string, Job> | undefined
}

const jobs: Map<string, Job> = global.__hgctJobs ?? (global.__hgctJobs = new Map())

export function createJob(id: string): Job {
  const job: Job = {
    id,
    status: 'processing',
    progress: 0,
    label: 'Đang khởi tạo...',
    createdAt: Date.now(),
  }
  jobs.set(id, job)
  // Persist to DB (fire and forget)
  prisma.job.create({ data: { id, status: 'processing', progress: 0, label: 'Đang khởi tạo...' } }).catch(console.error)
  return job
}

export function updateJob(id: string, updates: Partial<Omit<Job, 'id' | 'createdAt'>>) {
  const job = jobs.get(id)
  if (job) Object.assign(job, updates)
  // Persist to DB (fire and forget)
  const dbUpdates: Record<string, unknown> = {}
  if (updates.status !== undefined) dbUpdates.status = updates.status
  if (updates.progress !== undefined) dbUpdates.progress = updates.progress
  if (updates.label !== undefined) dbUpdates.label = updates.label
  if (updates.result !== undefined) dbUpdates.result = updates.result as object
  if (updates.error !== undefined) dbUpdates.error = updates.error
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
