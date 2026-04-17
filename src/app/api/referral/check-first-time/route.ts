import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// Returns { firstTime: boolean } — true if no completed orders exist for this email.
// Used by DiscountModal to decide whether to show Lucky Wheel (first-time only).
//
// Email-only check (no auth): low sensitivity — leaks only "has this email ever bought?"
// which is already observable via email receipt side-channel. Rate limit via Cloudflare.
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase() || ''
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ firstTime: true })
  }
  const count = await prisma.order.count({
    where: { email: { equals: email, mode: 'insensitive' }, status: 'completed' },
  })
  return NextResponse.json({ firstTime: count === 0 })
}
