/**
 * Rate limiting via Upstash Redis (+ in-memory fallback nếu env chưa set).
 *
 * Env vars cần thiết:
 *   UPSTASH_REDIS_REST_URL=...
 *   UPSTASH_REDIS_REST_TOKEN=...
 */

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

// ── In-memory fallback (single-instance, resets on restart) ───────────────
interface MemEntry { count: number; resetAt: number }
const memStore = new Map<string, MemEntry>()

function memAllow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = memStore.get(key)
  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

// ── Upstash REST helper ────────────────────────────────────────────────────
async function upstashAllow(key: string, limit: number, windowSec: number): Promise<boolean> {
  try {
    const pipeline = [
      ['INCR', key],
      ['EXPIRE', key, String(windowSec)],
    ]
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(pipeline),
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return true // fail open — don't block on Upstash error
    const data = (await res.json()) as [{ result: number }, unknown]
    const count = data[0]?.result ?? 0
    return count <= limit
  } catch {
    return true // fail open
  }
}

async function allow(key: string, limit: number, windowSec: number): Promise<boolean> {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    return upstashAllow(key, limit, windowSec)
  }
  return memAllow(key, limit, windowSec * 1000)
}

// ── Public limiters ────────────────────────────────────────────────────────

/** Login: 10 attempts per IP per 15 minutes */
export async function checkLoginRateLimit(ip: string): Promise<boolean> {
  return allow(`rl:login:${ip}`, 10, 15 * 60)
}

/** Recovery token: 5 attempts per IP per 10 minutes */
export async function checkRecoverRateLimit(ip: string): Promise<boolean> {
  return allow(`rl:recover:${ip}`, 5, 10 * 60)
}

/** Claim transfer: 3 attempts per IP per orderId per hour */
export async function checkClaimRateLimit(ip: string, orderId: number): Promise<boolean> {
  return allow(`rl:claim:${ip}:${orderId}`, 3, 60 * 60)
}

/** CTV Login: 5 attempts per IP per 15 minutes */
export async function checkCtvLoginRateLimit(ip: string): Promise<boolean> {
  return allow(`rl:ctv:login:${ip}`, 5, 15 * 60)
}

/** CTV Register: 3 attempts per IP per hour */
export async function checkCtvRegisterRateLimit(ip: string): Promise<boolean> {
  return allow(`rl:ctv:register:${ip}`, 3, 60 * 60)
}

/** User Register: 5 attempts per IP per hour (chống bot tạo tài khoản hàng loạt) */
export async function checkRegisterRateLimit(ip: string): Promise<boolean> {
  return allow(`rl:register:${ip}`, 5, 60 * 60)
}
