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
    where: { userUid },
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
    },
  })

  return NextResponse.json(jobs)
}
