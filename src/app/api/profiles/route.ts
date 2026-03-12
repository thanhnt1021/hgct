import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { randomUUID } from 'crypto'
import { encryptProfileData, decryptProfileData } from '@/lib/profileCrypto'
import fs from 'fs'
import path from 'path'

const PDF_DIR = '/var/hgct/pdfs'

function checkOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  const allowed = process.env.NEXT_PUBLIC_APP_URL
  if (origin && allowed && origin !== allowed) return false
  return true
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const uid = (session.user as Record<string, unknown>).uid as string
  const user = await prisma.user.findUnique({ where: { userUid: uid } })
  if (!user) {
    const byName = await prisma.user.findUnique({ where: { username: session.user.name || '' } })
    if (!byName) return NextResponse.json({ profiles: [] })
    const profiles = await prisma.profile.findMany({ where: { userUid: byName.userUid }, orderBy: { id: 'desc' } })
    return NextResponse.json({ profiles: profiles.map(p => ({ ...p, data: decryptProfileData(p.data) })) })
  }

  const profiles = await prisma.profile.findMany({ where: { userUid: uid }, orderBy: { id: 'desc' } })
  return NextResponse.json({ profiles: profiles.map(p => ({ ...p, data: decryptProfileData(p.data) })) })
}

export async function POST(request: Request) {
  if (!checkOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const uid = (session.user as Record<string, unknown>).uid as string
  const body = await request.json()

  const profile = await prisma.profile.create({
    data: {
      userUid: uid,
      profileUid: randomUUID(),
      name: body.name,
      gender: body.gender || 'Female',
      data: encryptProfileData(body.data || {}) as object,
      createdAt: new Date().toISOString(),
    },
  })

  return NextResponse.json({ profile: { ...profile, data: decryptProfileData(profile.data) } })
}

export async function PUT(request: Request) {
  if (!checkOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { id, name, gender, data } = body

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const profile = await prisma.profile.update({
    where: { id: parseInt(id) },
    data: { name, gender, data: encryptProfileData(data) as object },
  })

  return NextResponse.json({ profile: { ...profile, data: decryptProfileData(profile.data) } })
}

export async function DELETE(request: Request) {
  if (!checkOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = parseInt(searchParams.get('id') || '0')

  if (id) {
    // Delete associated PDFs before deleting profile
    const profile = await prisma.profile.findUnique({ where: { id }, select: { profileUid: true } })
    if (profile?.profileUid) {
      const services = ['career', 'love', 'synastry', 'transit']
      for (const svc of services) {
        const pdfPath = path.join(PDF_DIR, `${profile.profileUid}_${svc}.pdf`)
        if (fs.existsSync(pdfPath)) {
          try { fs.unlinkSync(pdfPath) } catch {}
        }
      }
    }
    await prisma.profile.delete({ where: { id } })
  }

  return NextResponse.json({ success: true })
}
