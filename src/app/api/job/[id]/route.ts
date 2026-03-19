import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getJobFromDb, cancelJob } from '@/lib/jobs'
import prisma from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const job = await getJobFromDb(id)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  return NextResponse.json(job)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const userUid = (session?.user as Record<string, unknown>)?.uid as string | undefined
  if (!userUid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const dbJob = await prisma.job.findUnique({ where: { id }, select: { userUid: true, status: true } })
  if (!dbJob) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (dbJob.userUid !== userUid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (dbJob.status !== 'processing') return NextResponse.json({ error: 'Chỉ hủy được báo cáo đang xử lý' }, { status: 400 })

  await cancelJob(id)

  // Premium/lifetime users don't pay per-order — cancel the order so it never shows in alerts
  const planType = (session?.user as Record<string, unknown>)?.planType as string | undefined
  if (planType === 'premium' || planType === 'lifetime') {
    await prisma.order.updateMany({
      where: { jobId: id, status: { not: 'completed' } },
      data: { status: 'cancelled', adminCancelledAt: new Date() },
    })
  }

  return NextResponse.json({ ok: true })
}
