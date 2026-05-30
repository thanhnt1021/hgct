/**
 * Cloudflare Turnstile token verification.
 *
 * Flow:
 *   1. Frontend mounts invisible widget → gets token (auto-renewed).
 *   2. Frontend attaches `cfTurnstileToken` field to every POST body.
 *   3. Backend calls verifyTurnstileToken(token, ip) → must return success
 *      before doing any expensive work (AI, PDF, email).
 *
 * Env:
 *   CF_TURNSTILE_SECRET_KEY   (server-only, never expose to client)
 *
 * Fail-CLOSED policy: if secret not configured OR siteverify fails,
 * the request is rejected. No silent bypass.
 */

const TURNSTILE_SECRET = process.env.CF_TURNSTILE_SECRET_KEY || ''
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export interface TurnstileResult {
  success: boolean
  reason?: string
}

export async function verifyTurnstileToken(
  token: string,
  ip: string,
): Promise<TurnstileResult> {
  if (!TURNSTILE_SECRET) {
    console.warn('[turnstile] CF_TURNSTILE_SECRET_KEY not set — failing closed')
    return { success: false, reason: 'server-misconfigured' }
  }
  if (!token || typeof token !== 'string') {
    return { success: false, reason: 'missing-token' }
  }
  if (token.length < 10 || token.length > 2048) {
    return { success: false, reason: 'invalid-token-format' }
  }

  try {
    const form = new URLSearchParams()
    form.append('secret', TURNSTILE_SECRET)
    form.append('response', token)
    if (ip) form.append('remoteip', ip)

    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      return { success: false, reason: `siteverify-http-${res.status}` }
    }
    const data = (await res.json()) as {
      success: boolean
      'error-codes'?: string[]
    }
    if (!data.success) {
      return {
        success: false,
        reason: (data['error-codes'] || []).join(',') || 'denied',
      }
    }
    return { success: true }
  } catch (err) {
    console.warn('[turnstile] verify exception:', (err as Error).message)
    return { success: false, reason: 'verify-exception' }
  }
}

/**
 * Extract client IP from request headers.
 * Priority: cf-connecting-ip > x-real-ip > x-forwarded-for (first).
 * nginx in front sets x-real-ip to $http_cf_connecting_ip.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    ''
  )
}
