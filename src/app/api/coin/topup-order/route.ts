// Create a SePay top-up order. Uses the same HGCT###### transferCode scheme as
// report orders so SePay's auto-matching (configured for the HGCT prefix)
// actually populates `code` on the webhook callback. The webhook then routes
// coin vs report by order.service === 'coin-topup', NOT by the prefix — orderId
// is unique across the whole Order table so there is no collision with a report
// order. (A dedicated COIN prefix was silently dropped by SePay → orders never
// auto-confirmed → top-up screen hung forever.)

import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPackage } from '@/lib/coin/packages'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userUid = (session?.user as { uid?: string } | undefined)?.uid
  if (!userUid) {
    return NextResponse.json({ error: 'Cần đăng nhập để nạp xu' }, { status: 401 })
  }

  let body: { packageCode?: unknown }
  try {
    body = (await request.json()) as { packageCode?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const code = typeof body.packageCode === 'string' ? body.packageCode : ''
  const pkg = getPackage(code)
  if (!pkg || !pkg.enabled) {
    return NextResponse.json({ error: 'Gói nạp không hợp lệ' }, { status: 400 })
  }

  // Persist the top-up as an Order so the existing SePay reconciliation works.
  // service='coin-topup' marks it for the webhook dual-mode router.
  const user = await prisma.user.findUnique({
    where: { userUid },
    select: { email: true, username: true },
  })

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userUid,
        service: 'coin-topup',
        profileData: { packageCode: pkg.code, coins: pkg.coins },
        email: user?.email || `${user?.username || 'user'}@local`,
        status: 'pending',
        paymentStatus: 'unpaid',
        amount: pkg.amountVnd,
      },
    })
    const transferCode = `HGCT${created.id.toString().padStart(6, '0')}`
    return tx.order.update({
      where: { id: created.id },
      data: { transferCode },
    })
  })

  return NextResponse.json({
    orderId: order.id,
    transferCode: order.transferCode,
    amount: pkg.amountVnd,
    coins: pkg.coins,
    bankAccount: process.env.BANK_ACCOUNT_NUMBER || '',
    bankName: process.env.BANK_NAME || '',
    bankAccountName: process.env.BANK_ACCOUNT_NAME || '',
  })
}
