import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createReportJob } from '@/lib/astrology/reportProcessor'
import prisma from '@/lib/db'

// ── Route handler — returns jobId immediately ──────────────────────

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isPremium = (session?.user as any)?.isPremium === true
    const planType = (session?.user as any)?.planType as string | undefined
    const isPremiumOrLifetime = isPremium || planType === 'lifetime'

    if (!isPremiumOrLifetime) {
      return NextResponse.json(
        { error: 'Chỉ tài khoản Premium mới có thể tạo báo cáo. Vui lòng nâng cấp tài khoản.', requiresPremium: true },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { service, inputData } = body

    if (!service || !inputData) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userUid = (session?.user as any)?.uid as string | undefined
    const {
      service: svc,
      inputData: iData,
      inputDataB: iDataB,
      email: emailVal,
      profileUid: pUidA,
      profileUidB: pUidB,
      startDate: sDate,
      endDate: eDate,
    } = body as Record<string, unknown>

    // Bug #1 fix: save ALL order fields so retry/recovery can reconstruct full body
    let orderId: number | undefined
    try {
      const order = await prisma.order.create({
        data: {
          userUid: userUid ?? null,
          service: typeof svc === 'string' ? svc : service,
          profileData: (iData as object) ?? {},
          profileDataB: (iDataB as object) ?? null,
          profileUidA: typeof pUidA === 'string' ? pUidA : null,
          profileUidB: typeof pUidB === 'string' ? pUidB : null,
          startDate: typeof sDate === 'string' ? sDate : null,
          endDate: typeof eDate === 'string' ? eDate : null,
          email: typeof emailVal === 'string' ? emailVal : '',
          status: 'processing',
          paymentStatus: 'paid', // premium users don't pay per-order
        },
      })
      orderId = order.id
    } catch (err) {
      console.error('[report] Order create failed:', err)
    }

    // Bug #3 fix: use createReportJob (includes error recovery: Telegram alert + recovery email + updateJob)
    const jobId = createReportJob({
      service: typeof svc === 'string' ? svc : service,
      body,
      userUid,
      orderId,
      amount: 0,
    })

    if (orderId) {
      prisma.order.update({ where: { id: orderId }, data: { jobId } }).catch((err) =>
        console.error('[report] Order jobId link failed:', err),
      )
    }

    return NextResponse.json({ jobId })
  } catch (error) {
    console.error('Report route error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
