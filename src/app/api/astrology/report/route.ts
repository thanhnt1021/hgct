import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createJob } from '@/lib/jobs'
import { processReport } from '@/lib/astrology/reportProcessor'
import prisma from '@/lib/db'

// ── Route handler — returns jobId immediately ──────────────────────

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isPremium = (session?.user as any)?.isPremium === true

    if (!isPremium) {
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

    const jobId = randomUUID()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userUid = (session?.user as any)?.uid as string | undefined
    const { service: svc, inputData: iData, email: emailVal, name: displayName, profileUid: pUidA, profileUidB: pUidB } = body as Record<string, unknown>
    const meta = {
      userUid: userUid || undefined,
      service: typeof svc === 'string' ? svc : undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      name: typeof displayName === 'string' ? displayName : (typeof (iData as any)?.name === 'string' ? (iData as any).name : undefined),
      email: typeof emailVal === 'string' ? emailVal : undefined,
      profileUidA: typeof pUidA === 'string' ? pUidA : undefined,
      profileUidB: typeof pUidB === 'string' ? pUidB : undefined,
    }
    createJob(jobId, meta)

    // Create order record in DB
    let orderId: number | undefined
    try {
      const order = await prisma.order.create({
        data: {
          userUid: userUid ?? null,
          service: typeof svc === 'string' ? svc : service,
          profileData: (iData as object) ?? {},
          email: typeof emailVal === 'string' ? emailVal : '',
          status: 'processing',
          paymentStatus: 'paid', // premium users don't pay per-order
          jobId: jobId,
        },
      })
      orderId = order.id
    } catch (err) {
      console.error(`[JOB ${jobId}] Order create failed:`, err)
    }

    // Fire and forget — background continues after response is sent
    processReport(jobId, body, orderId, 0).catch((err) => {
      console.error(`[JOB ${jobId}] processReport error:`, err)
    })

    return NextResponse.json({ jobId })
  } catch (error) {
    console.error('Report route error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
