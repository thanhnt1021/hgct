// List the profiles/services the user has generated content for ("Hồ sơ đã xem"),
// with how many sections they've unlocked. Source = essays (one row per
// user+profile+service), enriched with reading counts.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { getCatalog } from '@/lib/catalog/sections'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userUid = (session?.user as { uid?: string } | undefined)?.uid
  if (!userUid) return NextResponse.json({ items: [] })

  const essays = await prisma.essay.findMany({
    where: { userUid },
    select: { profileUid: true, service: true, name: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  const counts = await prisma.reading.groupBy({
    by: ['profileUid', 'service'],
    where: { userUid },
    _count: { _all: true },
  })
  const countMap = new Map<string, number>()
  for (const c of counts) countMap.set(`${c.profileUid}|${c.service}`, c._count._all)

  const items = essays.map(e => {
    const cat = getCatalog(e.service)
    return {
      profileUid: e.profileUid,
      service: e.service,
      name: e.name || '',
      serviceLabel: cat?.label || e.service,
      unlockedCount: countMap.get(`${e.profileUid}|${e.service}`) || 0,
      totalSections: cat?.sections.length || 0,
      createdAt: e.createdAt,
    }
  })

  return NextResponse.json({ items })
}
