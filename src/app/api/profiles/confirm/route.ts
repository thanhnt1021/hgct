import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

// POST { profileUids: string[] } — upgrade temp profiles to permanent
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userUid = (session.user as any).uid as string
  const body = await request.json()
  const profileUids: string[] = Array.isArray(body.profileUids) ? body.profileUids : []

  if (profileUids.length === 0) {
    return NextResponse.json({ error: 'No profileUids provided' }, { status: 400 })
  }

  // Only allow upgrading profiles owned by this user
  await prisma.profile.updateMany({
    where: {
      profileUid: { in: profileUids },
      userUid,
      isTemp: true,
    },
    data: {
      isTemp: false,
      tempExpiry: null,
    },
  })

  return NextResponse.json({ success: true })
}
