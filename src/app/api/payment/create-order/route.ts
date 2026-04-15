import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { getPrice } from '@/lib/pricing'

export const dynamic = 'force-dynamic'

const VALID_SERVICES = ['career', 'love', 'synastry', 'transit']

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { service, inputData, email, inputDataB, profileUidA, profileUidB, startDate, endDate, ctvCode, referralCode, wheelDiscountPct } =
      body as {
        service: string
        inputData: Record<string, unknown>
        email: string
        inputDataB?: Record<string, unknown>
        profileUidA?: string
        profileUidB?: string
        startDate?: string
        endDate?: string
        ctvCode?: string
        referralCode?: string
        wheelDiscountPct?: number
      }

    if (!service || !inputData || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!VALID_SERVICES.includes(service)) {
      return NextResponse.json({ error: 'Invalid service' }, { status: 400 })
    }

    // Idempotency check — return existing order if key already used
    const idemKey = request.headers.get('x-idempotency-key')?.trim() || null
    if (idemKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey: idemKey },
        select: { id: true, transferCode: true, amount: true },
      })
      if (existing) {
        return NextResponse.json({
          orderId: existing.id,
          transferCode: existing.transferCode,
          amount: existing.amount ?? 0,
          bankAccount: process.env.BANK_ACCOUNT_NUMBER || '',
          bankName: process.env.BANK_NAME || '',
          bankAccountName: process.env.BANK_ACCOUNT_NAME || '',
        })
      }
    }

    const paymentBase = await getPrice(service)
    let amount = paymentBase
    let appliedDiscountPct = 0
    // Display base prices (shown as "giá gốc" / before-discount on QR page)
    const DISPLAY_BASE: Record<string, number> = {
      career: 199000, love: 199000, transit: 199000, synastry: 269000,
    }
    let displayOriginalAmount = paymentBase  // overridden below for wheel/referral

    // Priority 1: referral code → flat 99k
    if (referralCode) {
      const key = `referral_code_${referralCode.trim().toUpperCase()}`
      const row = await prisma.config.findUnique({ where: { key } })
      if (row && row.value === 'active') {
        amount = 99000
        displayOriginalAmount = DISPLAY_BASE[service] ?? paymentBase
        appliedDiscountPct = Math.round((1 - amount / displayOriginalAmount) * 100)
      }
    }
    // Priority 2: wheel discount % (server validates allowed list)
    else if (wheelDiscountPct !== undefined) {
      const ALLOWED_PCTS = [5, 10, 15, 18, 20, 25, 28, 30]
      // Exact price table: [career/love/transit base=199k, synastry base=269k]
      const BASE_PRICES: Record<string, Record<number, number>> = {
        career:  { 5:189000, 10:179000, 15:169000, 18:163000, 20:159000, 25:149000, 28:143000, 30:139000 },
        love:    { 5:189000, 10:179000, 15:169000, 18:163000, 20:159000, 25:149000, 28:143000, 30:139000 },
        transit: { 5:189000, 10:179000, 15:169000, 18:163000, 20:159000, 25:149000, 28:143000, 30:139000 },
        synastry:{ 5:255000, 10:242000, 15:229000, 18:221000, 20:215000, 25:202000, 28:194000, 30:188000 },
      }
      if (ALLOWED_PCTS.includes(wheelDiscountPct) && BASE_PRICES[service]?.[wheelDiscountPct]) {
        amount = BASE_PRICES[service][wheelDiscountPct]
        displayOriginalAmount = DISPLAY_BASE[service] ?? paymentBase
        appliedDiscountPct = wheelDiscountPct
      }
    }
    // Priority 3: CTV code (legacy)
    else if (ctvCode) {
      const ctv = await prisma.ctv.findUnique({
        where: { ctvCode: ctvCode.trim().toUpperCase() },
        select: { commissionRate: true, status: true },
      })
      if (ctv && ctv.status === 'active') {
        appliedDiscountPct = Math.round(ctv.commissionRate * 100)
        amount = Math.round(paymentBase * (1 - ctv.commissionRate))
        displayOriginalAmount = paymentBase
      }
    }

    const session = await getServerSession(authOptions)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userUid = (session?.user as any)?.uid as string | undefined

    // Atomic: create order + set transferCode in one transaction
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userUid: userUid ?? null,
          service,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          profileData: inputData as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          profileDataB: (inputDataB ?? null) as any,
          profileUidA: profileUidA ?? null,
          profileUidB: profileUidB ?? null,
          startDate: startDate ?? null,
          endDate: endDate ?? null,
          email,
          status: 'pending',
          paymentStatus: 'unpaid',
          amount,
          ctvCode: ctvCode || null,
          idempotencyKey: idemKey || undefined,
        },
      })
      // Generate transferCode from orderId: HGCT + 6-digit padded ID
      const transferCode = `HGCT${created.id.toString().padStart(6, '0')}`
      return tx.order.update({ where: { id: created.id }, data: { transferCode } })
    })

    return NextResponse.json({
      orderId: order.id,
      transferCode: order.transferCode,
      amount,
      ...(appliedDiscountPct > 0 ? {
        originalAmount: displayOriginalAmount,
        discountPct: appliedDiscountPct,
      } : {}),
      bankAccount: process.env.BANK_ACCOUNT_NUMBER || '',
      bankName: process.env.BANK_NAME || '',
      bankAccountName: process.env.BANK_ACCOUNT_NAME || '',
    })
  } catch (error) {
    console.error('[create-order] Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
