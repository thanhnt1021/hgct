import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userUid = (session?.user as any)?.uid as string | undefined

  if (!userUid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const jobs = await prisma.job.findMany({
    where: { userUid, status: { not: 'cancelled' } },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      status: true,
      progress: true,
      label: true,
      result: true,
      error: true,
      service: true,
      name: true,
      email: true,
      createdAt: true,
      pdfNote: true,
      pdfExpiresAt: true,
      profileUidA: true,
      profileUidB: true,
    },
  })

  // Batch-fetch temp status for all referenced profile UIDs
  const allUids = [
    ...jobs.map(j => j.profileUidA).filter(Boolean),
    ...jobs.map(j => j.profileUidB).filter(Boolean),
  ] as string[]

  const tempMap = new Map<string, { isTemp: boolean; tempExpiry: Date | null }>()
  if (allUids.length > 0) {
    const profiles = await prisma.profile.findMany({
      where: { profileUid: { in: allUids } },
      select: { profileUid: true, isTemp: true, tempExpiry: true },
    })
    for (const p of profiles) {
      tempMap.set(p.profileUid, { isTemp: p.isTemp, tempExpiry: p.tempExpiry })
    }
  }

  const enriched = jobs.map(j => {
    const tA = j.profileUidA ? tempMap.get(j.profileUidA) : undefined
    const tB = j.profileUidB ? tempMap.get(j.profileUidB) : undefined
    return {
      ...j,
      profileTempA: tA?.isTemp ? { uid: j.profileUidA!, expiry: tA.tempExpiry?.toISOString() ?? null } : null,
      profileTempB: tB?.isTemp ? { uid: j.profileUidB!, expiry: tB.tempExpiry?.toISOString() ?? null } : null,
    }
  })

  return NextResponse.json(enriched)
}
