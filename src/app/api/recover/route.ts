import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { createReportJob } from '@/lib/astrology/reportProcessor'

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

  // Already retrying / processing by another request
  if (order.status === 'retrying' || order.status === 'processing') {
    return NextResponse.json({
      status: 'processing',
      jobId: order.jobId,
      message: 'Báo cáo đang được xử lý. Vui lòng chờ.',
    })
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

  // Create new job
  const jobId = createReportJob({
    service: order.service,
    body,
    userUid: order.userUid || undefined,
    orderId: order.id,
  })

  // Update order with new jobId (best-effort)
  await prisma.order.update({ where: { id: order.id }, data: { jobId } }).catch(console.error)

  const iData = (order.profileData as Record<string, unknown>) || {}
  const name = (iData.name as string) || ''

  console.log(`[RECOVER] Order ${order.id} re-triggered → job ${jobId} (token: ${token})`)

  return NextResponse.json({
    status: 'retrying',
    jobId,
    name,
    service: order.service,
  })
}
