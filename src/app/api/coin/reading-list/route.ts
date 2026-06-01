// List unlocked sections for the current user on a given service.
// Optional profileUid filter (for multi-profile users).

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  const userUid = (session?.user as { uid?: string } | undefined)?.uid
  if (!userUid) return NextResponse.json({ unlocked: [] })

  const { searchParams } = new URL(request.url)
  const service = searchParams.get('service') || ''
  const profileUid = searchParams.get('profileUid') || undefined

  if (!service) return NextResponse.json({ error: 'Missing service' }, { status: 400 })

  const rows = await prisma.reading.findMany({
    where: { userUid, service, ...(profileUid ? { profileUid } : {}) },
    select: { sectionId: true, content: true, profileUid: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ unlocked: rows })
}
