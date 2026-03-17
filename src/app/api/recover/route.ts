import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { createReportJob } from '@/lib/astrology/reportProcessor'
import { MAX_RETRIES } from '@/lib/jobs'

export async function POST(req: Request) {
  let token: string
  try {
    const body = await req.json()
    token = (body.token as string)?.toUpperCase().trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!token || token.length < 6) {
    return NextResponse.json({ error: 'Mã không hợp lệ' }, { status: 400 })
  }

  const order = await prisma.order.findUnique({ where: { recoveryToken: token } })
  if (!order) {
    return NextResponse.json({ error: 'Không tìm thấy đơn hàng với mã này. Vui lòng kiểm tra lại.' }, { status: 404 })
  }

  // Already completed
  if (order.status === 'completed') {
    return NextResponse.json({ status: 'completed', message: 'Báo cáo đã hoàn thành! Kiểm tra email để nhận file PDF.' })
  }

  // Fix E: Check retrying/processing BEFORE max retries
  // → Avoids blocking a currently-running retry with a "max retries" error
  if (order.status === 'retrying' || order.status === 'processing') {
    return NextResponse.json({
      status: 'processing',
      jobId: order.jobId,
      service: order.service,
      name: ((order.profileData as Record<string, unknown>)?.name as string) || '',
      message: 'Báo cáo đang được xử lý. Vui lòng chờ.',
    })
  }

  // Max retries exceeded
  if ((order.retryCount ?? 0) >= MAX_RETRIES) {
    return NextResponse.json({
      error: `Đã thử lại ${MAX_RETRIES} lần nhưng vẫn gặp lỗi. Vui lòng liên hệ hỗ trợ để được giải quyết.`,
      maxRetriesReached: true,
    }, { status: 429 })
  }

  if (order.status !== 'failed') {
    return NextResponse.json({ error: 'Trạng thái đơn hàng không thể khôi phục.' }, { status: 400 })
  }

  // Atomic lock: set 'retrying' only if currently 'failed'
  const updated = await prisma.order.updateMany({
    where: { id: order.id, status: 'failed' },
    data: { status: 'retrying' },
  })
  if (updated.count === 0) {
    // Race condition — another request won the lock
    return NextResponse.json({ status: 'processing', message: 'Báo cáo đang được xử lý.' })
  }

  // Reconstruct body from Order fields
  const body: Record<string, unknown> = {
    service: order.service,
    inputData: order.profileData,
    email: order.email,
  }
  if (order.profileUidA) body.profileUid = order.profileUidA
  if (order.profileUidB) body.profileUidB = order.profileUidB
  if (order.profileDataB) body.inputDataB = order.profileDataB
  if (order.startDate) body.startDate = order.startDate
  if (order.endDate) body.endDate = order.endDate

  // Fix B: Wrap createReportJob + order.update in try/catch with rollback
  // → If job creation or order update fails, reset order back to 'failed' (not stuck at 'retrying')
  let jobId: string
  try {
    jobId = createReportJob({
      service: order.service,
      body,
      userUid: order.userUid || undefined,
      orderId: order.id,
      amount: order.amount ?? 0,
    })

    // Update order: new jobId + increment retryCount + clear token (sweep will generate fresh one if this job also fails)
    await prisma.order.update({
      where: { id: order.id },
      data: {
        jobId,
        retryCount: { increment: 1 },
        recoveryToken: null,  // clear so next failure sweep generates a fresh token
      },
    })
  } catch (err) {
    // Rollback: reset to 'failed' so the next poll or manual retry can still proceed
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'failed' },
    }).catch(() => {})
    console.error(`[RECOVER] Failed to start job for order ${order.id}:`, err)
    return NextResponse.json({ error: 'Không thể khởi tạo báo cáo. Vui lòng thử lại.' }, { status: 500 })
  }

  const iData = (order.profileData as Record<string, unknown>) || {}
  const name = (iData.name as string) || ''

  console.log(`[RECOVER] Order ${order.id} re-triggered → job ${jobId} (token used: ${token}, retryCount now: ${(order.retryCount ?? 0) + 1})`)

  return NextResponse.json({
    status: 'retrying',
    jobId,
    name,
    service: order.service,
  })
}
