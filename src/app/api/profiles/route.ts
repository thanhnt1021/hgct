import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const uid = (session.user as Record<string, unknown>).uid as string
  const user = await prisma.user.findUnique({ where: { userUid: uid } })
  if (!user) {
    // Try by email/name
    const byName = await prisma.user.findUnique({ where: { username: session.user.name || '' } })
    if (!byName) return NextResponse.json({ profiles: [] })
    const profiles = await prisma.profile.findMany({ where: { userUid: byName.userUid }, orderBy: { id: 'desc' } })
    return NextResponse.json({ profiles })
  }

  const profiles = await prisma.profile.findMany({ where: { userUid: uid }, orderBy: { id: 'desc' } })
  return NextResponse.json({ profiles })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const uid = (session.user as Record<string, unknown>).uid as string
  const body = await request.json()

  const profile = await prisma.profile.create({
    data: {
      userUid: uid,
      name: body.name,
      gender: body.gender || 'Female',
      data: body.data || {},
      createdAt: new Date().toISOString(),
    },
  })

  return NextResponse.json({ profile })
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = parseInt(searchParams.get('id') || '0')

  if (id) {
    await prisma.profile.delete({ where: { id } })
  }

  return NextResponse.json({ success: true })
}
