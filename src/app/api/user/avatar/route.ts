import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

const AVATAR_DIR = '/var/hgct/avatars'

export async function GET() {
  const session = await getServerSession(authOptions)
  const uid = (session?.user as any)?.uid
  if (!uid) return new NextResponse(null, { status: 401 })

  const filePath = path.join(AVATAR_DIR, `${uid}.jpg`)
  if (!fs.existsSync(filePath)) return new NextResponse(null, { status: 404 })

  const buffer = fs.readFileSync(filePath)
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session?.user as any)?.uid
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('avatar') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  if (file.size > 500 * 1024) return NextResponse.json({ error: 'File too large (max 500KB)' }, { status: 400 })

  if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(path.join(AVATAR_DIR, `${uid}.jpg`), buffer)

  return NextResponse.json({ success: true })
}
