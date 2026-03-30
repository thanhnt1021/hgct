import { NextResponse } from 'next/server'
import { clearCtvCookie } from '@/lib/ctv/auth'

export async function POST() {
  const res = NextResponse.json({ success: true })
  clearCtvCookie(res)
  return res
}
