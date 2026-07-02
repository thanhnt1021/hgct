// Lá số đã lưu của user (đăng nhập). Đồng bộ DB dùng chung → hiện ở mọi thiết bị/origin.
// Khách chưa đăng nhập → 401, client bỏ qua (chỉ dùng localStorage).
//   GET    → danh sách lá số của user (để client gộp vào localStorage)
//   POST   → upsert 1 lá số theo (userUid, chartKey)
//   DELETE → xoá 1 lá số theo chartKey (?key=... hoặc body {chartKey})

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

async function uid(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  return (session?.user as { uid?: string } | undefined)?.uid ?? null
}

export async function GET() {
  const userUid = await uid()
  if (!userUid) return NextResponse.json({ items: [] }, { status: 401 })
  const rows = await prisma.savedChart.findMany({
    where: { userUid },
    orderBy: { savedAt: 'desc' },
    select: { chartKey: true, name: true, view: true, service: true, inputData: true, inputDataB: true, savedAt: true },
  })
  const items = rows.map(r => ({
    chartKey: r.chartKey,
    name: r.name,
    view: r.view ?? undefined,
    service: r.service ?? undefined,
    inputData: r.inputData,
    inputDataB: r.inputDataB ?? undefined,
    savedAt: r.savedAt.getTime(),
  }))
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const userUid = await uid()
  if (!userUid) return NextResponse.json({ ok: false }, { status: 401 })
  let body: {
    chartKey?: string; name?: string; view?: string; service?: string
    inputData?: unknown; inputDataB?: unknown; savedAt?: number
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const chartKey = (body.chartKey || '').trim()
  if (!chartKey || !body.inputData) return NextResponse.json({ error: 'thiếu chartKey/inputData' }, { status: 400 })

  const savedAt = typeof body.savedAt === 'number' ? new Date(body.savedAt) : new Date()
  // Json nullable: dùng Prisma.DbNull cho NULL (không nhận plain null).
  const data = {
    name: (body.name || 'Lá số').slice(0, 200),
    view: body.view ?? null,
    service: body.service ?? null,
    inputData: body.inputData as Prisma.InputJsonValue,
    inputDataB: body.inputDataB == null ? Prisma.DbNull : (body.inputDataB as Prisma.InputJsonValue),
    savedAt,
  }
  // Last-write-wins: mỗi lần lưu là ý định mới nhất của user trên thiết bị đó.
  await prisma.savedChart.upsert({
    where: { userUid_chartKey: { userUid, chartKey } },
    update: data,
    create: { userUid, chartKey, ...data },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const userUid = await uid()
  if (!userUid) return NextResponse.json({ ok: false }, { status: 401 })
  const url = new URL(req.url)
  let chartKey = url.searchParams.get('key') || ''
  if (!chartKey) { try { chartKey = (await req.json())?.chartKey || '' } catch { /* no body */ } }
  if (!chartKey) return NextResponse.json({ error: 'thiếu chartKey' }, { status: 400 })
  await prisma.savedChart.deleteMany({ where: { userUid, chartKey } })
  return NextResponse.json({ ok: true })
}
