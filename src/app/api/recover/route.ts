import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { MAX_RETRIES } from '@/lib/jobs'
import { smartRetryOrder } from '@/lib/smart-retry'
import { checkRecoverRateLimit } from '@/lib/ratelimit'

export async function POST(req: NextRequest) {
  // Rate limit: 5 attempts per IP per 10 minutes
  const ip =
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  const allowed = await checkRecoverRateLimit(ip)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 10 phút.' },
      { status: 429 }
    )
  }

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

  // Already being processed
  if (order.status === 'retrying' || order.status === 'processing') {
    return NextResponse.json({
      status: 'processing',
      jobId: order.jobId,
      service: order.service,
      name: ((order.profileData as Record<string, unknown>)?.name as string) || '',
      message: 'Báo cáo đang được xử lý. Vui lòng chờ.',
    })
  }

  // Cancelled — cannot retry
  if (order.status === 'cancelled') {
    return NextResponse.json({
      error: 'Đơn hàng này đã bị hủy. Vui lòng liên hệ hỗ trợ để được giải quyết.',
    }, { status: 400 })
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

  const result = await smartRetryOrder(order.id, 'customer')

  if (result.skipped) {
    // Race condition — another request grabbed the lock
    return NextResponse.json({ status: 'processing', message: 'Báo cáo đang được xử lý.' })
  }

  if (result.quotaExceeded) {
    return NextResponse.json({
      error: `Đã thử lại ${MAX_RETRIES} lần nhưng vẫn gặp lỗi. Vui lòng liên hệ hỗ trợ.`,
      maxRetriesReached: true,
    }, { status: 429 })
  }

  if (result.pdfResent) {
    return NextResponse.json({
      status: 'completed',
      message: 'Báo cáo đã sẵn sàng! Email đã được gửi lại thành công.',
    })
  }

  // Full retry started — fetch updated order for jobId
  const updated = await prisma.order.findUnique({ where: { id: order.id }, select: { jobId: true } })
  const iData = (order.profileData as Record<string, unknown>) || {}
  const name = (iData.name as string) || ''

  console.log(`[RECOVER] Order ${order.id} re-triggered via customer token`)

  return NextResponse.json({
    status: 'retrying',
    jobId: updated?.jobId,
    name,
    service: order.service,
  })
}
