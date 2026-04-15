import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// Flat discounted price when referral code is valid (VND)
const REFERRAL_PRICE = 99000

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false })
    }

    const key = `referral_code_${code.trim().toUpperCase()}`
    const row = await prisma.config.findUnique({ where: { key } })

    if (!row || row.value !== 'active') {
      return NextResponse.json({ valid: false })
    }

    return NextResponse.json({ valid: true, flatPrice: REFERRAL_PRICE })
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 })
  }
}
