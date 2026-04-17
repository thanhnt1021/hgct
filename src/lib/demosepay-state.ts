// In-memory state cho test /demosepay flow — single container, OK.
// Resets khi container restart. TTL 10 phút.

interface Entry { amount: number; time: number; txnId?: number }
const ATTEMPTS = new Map<string, Entry>()
const TTL_MS = 10 * 60 * 1000

export function recordDemosepay(memo: string, amount: number, txnId?: number) {
  ATTEMPTS.set(memo.toUpperCase(), { amount, time: Date.now(), txnId })
}

export function checkDemosepay(memo: string): Entry | null {
  const entry = ATTEMPTS.get(memo.toUpperCase())
  if (!entry) return null
  if (Date.now() - entry.time > TTL_MS) {
    ATTEMPTS.delete(memo.toUpperCase())
    return null
  }
  return entry
}
