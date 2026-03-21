import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import prisma from '@/lib/db'
import { runOrderCheck } from '@/lib/orderCheck'

const CRON_SECRET = process.env.CRON_SECRET || ''

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  const expected = `Bearer ${CRON_SECRET}`
  // Bug #21 fix: use timingSafeEqual to prevent timing-based secret enumeration
  const keyMatch = CRON_SECRET.length > 0
    && authHeader.length === expected.length
    && timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
  if (!keyMatch) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const force = searchParams.get('force') === 'true'

  if (!force) {
    // Check if enough time has passed since last run
    const [intervalCfg, lastRunCfg] = await Promise.all([
      prisma.config.findUnique({ where: { key: 'order_check_interval' } }),
      prisma.config.findUnique({ where: { key: 'order_check_last_run' } }),
    ])
    const intervalMs = parseInt(intervalCfg?.value ?? '15', 10) * 60 * 1000
    const lastRun = lastRunCfg?.value ? new Date(lastRunCfg.value) : null
    const now = new Date()
    if (lastRun && now.getTime() - lastRun.getTime() < intervalMs) {
      return NextResponse.json({ ok: true, skipped: true })
    }
  }

  // Update last run timestamp
  await prisma.config.upsert({
    where: { key: 'order_check_last_run' },
    update: { value: new Date().toISOString() },
    create: { key: 'order_check_last_run', value: new Date().toISOString() },
  })

  await runOrderCheck()
  return NextResponse.json({ ok: true })
}
