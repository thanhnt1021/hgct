// localStorage-based job history tracker
// Key: hgct-history-{username}

export interface HistoryEntry {
  jobId: string
  service: 'career' | 'love' | 'synastry' | 'transit'
  name: string   // display name (e.g. "Nguyễn Văn A" or "A & B")
  email: string
  createdAt: string // ISO string
}

const key = (username: string) => `hgct-history-${username}`

export function saveJobToHistory(username: string, entry: HistoryEntry) {
  if (typeof window === 'undefined' || !username) return
  try {
    const existing = getJobHistory(username)
    // Prepend, keep latest 100
    const updated = [entry, ...existing.filter(e => e.jobId !== entry.jobId)].slice(0, 100)
    localStorage.setItem(key(username), JSON.stringify(updated))
  } catch { /* quota exceeded etc */ }
}

export function getJobHistory(username: string): HistoryEntry[] {
  if (typeof window === 'undefined' || !username) return []
  try {
    const raw = localStorage.getItem(key(username))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
