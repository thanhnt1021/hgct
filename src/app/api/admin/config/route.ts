import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdminSession } from '@/lib/dashboard-auth'
import prisma from '@/lib/db'

async function checkAdmin() {
  const session = await getServerSession(authOptions)
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function GET(req: NextRequest) {
  const authErr = await checkAdmin()
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')

  if (key) {
    const row = await prisma.config.findUnique({ where: { key } })
    return NextResponse.json({ key, value: row?.value ?? null })
  }

  const rows = await prisma.config.findMany({ orderBy: { key: 'asc' } })
  return NextResponse.json(Object.fromEntries(rows.map((r) => [r.key, r.value])))
}

export async function PUT(req: NextRequest) {
  const authErr = await checkAdmin()
  if (authErr) return authErr

  const body = await req.json()
  const { key, value } = body as { key: string; value: string }

  if (!key || value === undefined || value === null) {
    return NextResponse.json({ error: 'key and value required' }, { status: 400 })
  }

  await prisma.config.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  })

  return NextResponse.json({ ok: true, key, value })
}
