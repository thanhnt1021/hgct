import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import bcrypt from 'bcryptjs'

const ctvSecretValue = process.env.CTV_JWT_SECRET || process.env.NEXTAUTH_SECRET
if (!ctvSecretValue) {
  throw new Error('CTV_JWT_SECRET or NEXTAUTH_SECRET must be set')
}
const SECRET = new TextEncoder().encode(ctvSecretValue)
const COOKIE_NAME = 'ctv_token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export interface CtvSession {
  ctvId: number
  email: string
  name: string
  ctvCode: string | null
  status: string
}

export async function signCtvToken(payload: CtvSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET)
}

export async function verifyCtvToken(token: string): Promise<CtvSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as CtvSession
  } catch {
    return null
  }
}

export async function getCtvSession(): Promise<CtvSession | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null
    return await verifyCtvToken(token)
  } catch {
    return null
  }
}

export async function getCtvSessionFromReq(req: NextRequest): Promise<CtvSession | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return await verifyCtvToken(token)
}

export function setCtvCookie(res: NextResponse, token: string): void {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

/** Hash a new CTV password with bcrypt (cost 12). */
export async function hashCtvPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/**
 * Dual-mode: verify SHA256 legacy or bcrypt.
 * Returns { valid, needsRehash } — rehash = true means upgrade SHA256 → bcrypt.
 */
export async function verifyCtvPassword(
  password: string,
  stored: string,
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (/^[0-9a-f]{64}$/.test(stored)) {
    const sha256 = createHash('sha256').update(password).digest('hex')
    const valid = sha256 === stored
    return { valid, needsRehash: valid }
  }
  const valid = await bcrypt.compare(password, stored)
  return { valid, needsRehash: false }
}

export function clearCtvCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
}
