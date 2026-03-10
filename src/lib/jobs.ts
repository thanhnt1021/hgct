// In-memory job store using global to survive module re-evaluation
// (Next.js can re-evaluate modules per route bundle — global is always shared)

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
  return job
}

export function updateJob(id: string, updates: Partial<Omit<Job, 'id' | 'createdAt'>>) {
  const job = jobs.get(id)
  if (job) Object.assign(job, updates)
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
