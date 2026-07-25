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
import { getPackage, getPackageByPromoCode } from '@/lib/coin/packages'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userUid = (session?.user as { uid?: string } | undefined)?.uid
  if (!userUid) {
    return NextResponse.json({ error: 'Cần đăng nhập để nạp xu' }, { status: 401 })
  }

  let body: { packageCode?: unknown; promoCode?: unknown }
  try {
    body = (await request.json()) as { packageCode?: unknown; promoCode?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const code = typeof body.packageCode === 'string' ? body.packageCode : ''
  const enteredPromo = typeof body.promoCode === 'string' ? body.promoCode.trim() : ''

  // profileData ghi thêm khi là đơn promo (O1.4/O2.1/O2.3) — webhook đọc lại đúng field này,
  // KHÔNG tra lại DB PromoCode lúc cộng xu (tránh lệch nếu admin sửa/xoá mã giữa chừng).
  let coins: number
  let amountVnd: number
  let profileData: { packageCode: string; coins: number; promoCode?: string; amountVnd?: number }

  if (enteredPromo) {
    // Đơn dùng mã ưu đãi — bắt buộc nhập đúng mã dù đã biết packageCode (tránh bypass qua API
    // mà không qua bước nhập mã ở UI). packageCode gửi lên PHẢI khớp đúng mã đã nhập.
    const { pkg, error } = await getPackageByPromoCode(enteredPromo)
    if (!pkg || pkg.packageCode !== code.trim().toLowerCase()) {
      return NextResponse.json({ error: `Mã ưu đãi ${error ?? 'không hợp lệ'}` }, { status: 400 })
    }
    coins = pkg.coins
    amountVnd = pkg.amountVnd
    profileData = { packageCode: pkg.packageCode, coins: pkg.coins, promoCode: pkg.packageCode, amountVnd: pkg.amountVnd }
  } else {
    // Gói mua thường (COIN001-004) — KHÔNG đụng, giữ nguyên logic cũ.
    const pkg = getPackage(code)
    if (!pkg || !pkg.enabled) {
      return NextResponse.json({ error: 'Gói nạp không hợp lệ' }, { status: 400 })
    }
    coins = pkg.coins
    amountVnd = pkg.amountVnd
    profileData = { packageCode: pkg.code, coins: pkg.coins }
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
        profileData,
        email: user?.email || `${user?.username || 'user'}@local`,
        status: 'pending',
        paymentStatus: 'unpaid',
        amount: amountVnd,
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
    amount: amountVnd,
    coins,
    bankAccount: process.env.BANK_ACCOUNT_NUMBER || '',
    bankName: process.env.BANK_NAME || '',
    bankAccountName: process.env.BANK_ACCOUNT_NAME || '',
  })
}
