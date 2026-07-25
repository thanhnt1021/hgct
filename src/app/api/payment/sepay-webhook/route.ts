import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import prisma from '@/lib/db'
import { createReportJob } from '@/lib/astrology/reportProcessor'
import { sendUnderpaymentAlert, sendPaymentReceivedNotification, sendUnmatchedPaymentAlert, sendAdminAlert } from '@/lib/notify'
import { recordDemosepay } from '@/lib/demosepay-state'
import { addCoin } from '@/lib/coin/service'
import { getPackage } from '@/lib/coin/packages'

export const dynamic = 'force-dynamic'

// Always respond 200 to SePay — errors are logged internally
// (non-200 causes SePay to retry Fibonacci up to 7 times over 5 hours)
const OK = () => NextResponse.json({ success: true })

export async function POST(request: Request) {
  try {
    // 1. Verify API key from SePay
    // Bug #11 fix: use timingSafeEqual to prevent timing-attack enumeration of API key
    const authHeader = request.headers.get('Authorization') || ''
    const expectedKey = `Apikey ${process.env.SEPAY_API_KEY || ''}`
    if (!process.env.SEPAY_API_KEY) {
      console.warn('[sepay-webhook] SEPAY_API_KEY not set')
      return NextResponse.json({ success: false }, { status: 401 })
    }
    const aBytes = Buffer.from(authHeader)
    const eBytes = Buffer.from(expectedKey)
    const keyMatch = aBytes.length === eBytes.length && timingSafeEqual(aBytes, eBytes)
    if (!keyMatch) {
      console.warn('[sepay-webhook] Unauthorized — bad API key')
      return NextResponse.json({ success: false }, { status: 401 })
    }

    // 2. Parse body
    const payload = await request.json()
    const {
      id: txnId,
      code,
      transferType,
      transferAmount,
      content,
    } = payload as {
      id: number
      code: string | null
      transferType: string
      transferAmount: number
      content: string
      gateway: string
      transactionDate: string
      referenceCode: string
      accountNumber: string
    }

    console.log(`[sepay-webhook] txnId=${txnId} code=${code} type=${transferType} amount=${transferAmount} content=${content}`)

    // 3. Only process incoming transfers
    if (transferType !== 'in') {
      return OK()
    }

    // 3b. /demosepay test flow — short-circuit before order lookup.
    // Format: HGCT999XXX (HGCT + 999 + 3 digits). 999xxx far above real orderID range.
    // Also accept legacy DEMOSEPAY prefix for backward compat.
    const demoMatch = (code && (/^HGCT999\d+$/i.test(code) || /^DEMOSEPAY/i.test(code))) ? code
      : (content && (content.match(/HGCT999\d+/i)?.[0] || content.match(/DEMOSEPAY\d*/i)?.[0])) || null
    if (demoMatch) {
      recordDemosepay(demoMatch, transferAmount, txnId)
      sendUnmatchedPaymentAlert({ txnId, code: demoMatch, amount: transferAmount }).catch(() => {})
      console.log(`[sepay-webhook] demosepay test — memo=${demoMatch} amount=${transferAmount}`)
      return OK()
    }

    // 4. Must have a payment code
    if (!code) {
      console.log('[sepay-webhook] No code — ignoring')
      return OK()
    }

    // 5. Deduplication — check if this transaction was already processed
    const existing = await prisma.order.findFirst({ where: { sepayTxnId: txnId } })
    if (existing) {
      console.log(`[sepay-webhook] Duplicate txnId=${txnId} — already processed`)
      return OK()
    }

    // 6. Find matching unpaid order
    const order = await prisma.order.findFirst({
      where: { transferCode: code, paymentStatus: 'unpaid' },
    })
    if (!order) {
      console.warn(`[sepay-webhook] No unpaid order for code=${code}`)
      sendUnmatchedPaymentAlert({ txnId, code, amount: transferAmount }).catch(() => {})
      return OK()
    }

    // 7. Verify amount (allow overpayment; block if < 90% of expected, alert if 90–99%)
    if (order.amount && transferAmount < order.amount) {
      const minThreshold = Math.floor(order.amount * 0.9)
      if (transferAmount < minThreshold) {
        // Hard block: too far under — do not process; admin must handle manually
        console.warn(
          `[sepay-webhook] Underpayment blocked: got ${transferAmount}, expected ${order.amount} (threshold ${minThreshold}) for order=${order.id}`,
        )
        sendUnderpaymentAlert({
          orderId: order.id,
          transferCode: code,
          expected: order.amount,
          received: transferAmount,
        }).catch(() => {})
        return OK()
      }
      // Between 90–99%: alert admin but still process
      console.warn(
        `[sepay-webhook] Minor underpayment: got ${transferAmount}, expected ${order.amount} for order=${order.id}`,
      )
      sendUnderpaymentAlert({
        orderId: order.id,
        transferCode: code,
        expected: order.amount,
        received: transferAmount,
      }).catch(() => {})
    }

    // 8a. Dual-mode router — COIN top-up vs legacy HGCT (PDF/email) order
    if (order.service === 'coin-topup') {
      // [O2.1] promoCode có → đơn dùng mã ưu đãi: KHÔNG gọi getPackage() (entry PROMO đã bỏ
      // khỏi COIN_PACKAGES), lấy coins/label từ profileData đã chốt lúc tạo đơn (B5). Đơn gói
      // thường: GIỮ NGUYÊN getPackage(pd.packageCode) như cũ (không đụng nhánh gói thường).
      const pd = order.profileData as { packageCode?: string; coins?: number; promoCode?: string; amountVnd?: number }
      const pkg = pd?.promoCode
        ? { coins: pd.coins ?? 0, code: pd.promoCode, label: `Ưu đãi mã ${pd.promoCode}` }
        : (pd?.packageCode ? getPackage(pd.packageCode) : null)
      if (!pkg || !order.userUid) {
        console.warn(`[sepay-webhook] coin-topup misconfigured: order=${order.id} pkg=${pd?.packageCode} user=${order.userUid}`)
        sendUnmatchedPaymentAlert({ txnId, code, amount: transferAmount }).catch(() => {})
        return OK()
      }

      let overCap: { code: string; redeemedCount: number; maxRedemptions: number } | null = null
      try {
        await prisma.$transaction(async (tx) => {
          const locked = await tx.order.updateMany({
            where: { id: order.id, paymentStatus: 'unpaid' },
            data: {
              paymentStatus: 'paid',
              paidAt: new Date(),
              sepayTxnId: txnId,
              status: 'completed',
            },
          })
          if (locked.count === 0) {
            // Already processed by a concurrent webhook — abort
            throw new Error('already-paid')
          }
          await addCoin({
            userUid: order.userUid!,
            amount: pkg.coins,
            reason: `topup-${pkg.code}`,
            refType: 'topup',
            refId: String(order.id),
            tx,
          })
          // [QĐ5] Increment redeemedCount atomic tại thời điểm thanh toán thành công (KHÔNG
          // phải lúc tạo đơn) — idempotent nhờ guard locked.count ở trên. Vượt cap tại đây
          // (race hiếm) → vẫn cộng xu (tiền đã nhận), chỉ alert admin, không nuốt tiền khách.
          if (pd.promoCode) {
            const updated = await tx.promoCode.update({
              where: { code: pd.promoCode },
              data: { redeemedCount: { increment: 1 } },
            })
            if (updated.maxRedemptions != null && updated.redeemedCount > updated.maxRedemptions) {
              overCap = { code: pd.promoCode, redeemedCount: updated.redeemedCount, maxRedemptions: updated.maxRedemptions }
            }
          }
        })
      } catch (e) {
        if ((e as Error).message === 'already-paid') {
          console.log(`[sepay-webhook] coin-topup ${order.id} already processed — skip`)
          return OK()
        }
        throw e
      }

      if (overCap) {
        const c = overCap as { code: string; redeemedCount: number; maxRedemptions: number }
        console.warn(`[sepay-webhook] promo code over cap: ${c.code} redeemedCount=${c.redeemedCount} maxRedemptions=${c.maxRedemptions}`)
        sendAdminAlert(`⚠️ Mã ưu đãi "${c.code}" đã VƯỢT cap (${c.redeemedCount}/${c.maxRedemptions}) — đơn ${order.id} vẫn được cộng xu vì đã nhận tiền.`).catch(() => {})
      }

      console.log(`[sepay-webhook] coin-topup ${order.id} → +${pkg.coins} xu for user ${order.userUid}`)
      sendPaymentReceivedNotification({
        orderId: order.id,
        service: 'coin-topup',
        name: pkg.label,
        email: order.email,
        amount: order.amount ?? transferAmount,
        transferCode: code,
      }).catch(() => {})
      return OK()
    }

    // 8. Mark order as paid — Bug #17 fix: atomic lock via updateMany to prevent duplicate job creation
    // on concurrent webhook calls (SePay may retry if it gets a timeout before receiving 200)
    const locked = await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: 'unpaid' },
      data: {
        paymentStatus: 'paid',
        paidAt: new Date(),
        sepayTxnId: txnId,
        status: 'processing',
      },
    })
    if (locked.count === 0) {
      console.log(`[sepay-webhook] Order ${order.id} already marked paid — skipping duplicate job creation`)
      return OK()
    }

    // 9. Build body and start report job via createReportJob (includes full error recovery)
    const body: Record<string, unknown> = {
      service: order.service,
      inputData: order.profileData,
      email: order.email,
      name: (() => {
        const pd = order.profileData as Record<string, unknown>
        return pd?.name || ''
      })(),
      profileUid: order.profileUidA ?? undefined,
      profileUidB: order.profileUidB ?? undefined,
      inputDataB: order.profileDataB ?? undefined,
      startDate: order.startDate ?? undefined,
      endDate: order.endDate ?? undefined,
    }

    const jobId = createReportJob({
      service: order.service,
      body,
      userUid: order.userUid ?? undefined,
      orderId: order.id,
      amount: order.amount ?? 0,
    })

    // Update order with jobId
    await prisma.order.update({
      where: { id: order.id },
      data: { jobId },
    })

    console.log(`[sepay-webhook] Order ${order.id} paid — started job ${jobId}`)

    // Notify admin: payment received
    const profileData = order.profileData as Record<string, unknown>
    sendPaymentReceivedNotification({
      orderId: order.id,
      service: order.service,
      name: (profileData?.name as string) || '',
      email: order.email,
      amount: order.amount ?? transferAmount,
      transferCode: code,
    }).catch(() => {})

    return OK()
  } catch (err) {
    console.error('[sepay-webhook] Unexpected error:', err)
    // Still return 200 so SePay doesn't retry
    return OK()
  }
}
