import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const SECRET = new TextEncoder().encode(
  process.env.CTV_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'ctv-fallback-secret'
)
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

export function clearCtvCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
}
