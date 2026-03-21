import { NextRequest, NextResponse } from 'next/server'
import { checkAdminToken } from '@/lib/dashboard-auth'
import prisma from '@/lib/db'
import os from 'os'

export async function GET(req: NextRequest) {
  const authErr = await checkAdminToken(req)
  if (authErr) return authErr

  const [orderCount, jobCount, userCount] = await Promise.all([
    prisma.order.count(),
    prisma.job.count(),
    prisma.user.count(),
  ])

  const uptimeSec = process.uptime()
  const uptimeMin = Math.floor(uptimeSec / 60)
  const uptimeHrs = Math.floor(uptimeMin / 60)
  const uptimeDisplay = uptimeHrs > 0
    ? `${uptimeHrs}h ${uptimeMin % 60}m`
    : `${uptimeMin}m`

  const memUsed = process.memoryUsage()
  const heapMB = Math.round(memUsed.heapUsed / 1024 / 1024)
  const rssMB = Math.round(memUsed.rss / 1024 / 1024)
  const totalMemMB = Math.round(os.totalmem() / 1024 / 1024)
  const freeMemMB = Math.round(os.freemem() / 1024 / 1024)

  return NextResponse.json({
    uptime: uptimeDisplay,
    heapMB,
    rssMB,
    totalMemMB,
    freeMemMB,
    nodeVersion: process.version,
    platform: process.platform,
    orderCount,
    jobCount,
    userCount,
    env: process.env.NODE_ENV,
  })
}
