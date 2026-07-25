// Admin CRUD cho mã ưu đãi nạp xu (PromoCode) — phiếu P001. Chặn bằng checkAdminToken,
// đúng convention 4 route admin hiện có (config/orders/ctv/system-info), KHÔNG isAdminSession.

import { NextRequest, NextResponse } from 'next/server'
import { checkAdminToken } from '@/lib/dashboard-auth'
import prisma from '@/lib/db'

export async function GET(req: NextRequest) {
  const authErr = await checkAdminToken(req)
  if (authErr) return authErr

  const rows = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ promoCodes: rows })
}

export async function POST(req: NextRequest) {
  const authErr = await checkAdminToken(req)
  if (authErr) return authErr

  const body = await req.json()
  const { code, coins, amountVnd, label, maxRedemptions, expiresAt, note, enabled } = body as {
    code?: unknown; coins?: unknown; amountVnd?: unknown; label?: unknown
    maxRedemptions?: unknown; expiresAt?: unknown; note?: unknown; enabled?: unknown
  }

  if (typeof code !== 'string' || !code.trim()) {
    return NextResponse.json({ error: 'code required' }, { status: 400 })
  }
  const coinsNum = Number(coins)
  if (!Number.isFinite(coinsNum) || coinsNum <= 0) {
    return NextResponse.json({ error: 'coins must be > 0' }, { status: 400 })
  }
  const amountVndNum = Number(amountVnd)
  if (!Number.isFinite(amountVndNum) || amountVndNum <= 0) {
    return NextResponse.json({ error: 'amountVnd must be > 0' }, { status: 400 })
  }
  let maxRedemptionsNum: number | null = null
  if (maxRedemptions !== undefined && maxRedemptions !== null && maxRedemptions !== '') {
    maxRedemptionsNum = Number(maxRedemptions)
    if (!Number.isFinite(maxRedemptionsNum) || maxRedemptionsNum <= 0) {
      return NextResponse.json({ error: 'maxRedemptions must be null or > 0' }, { status: 400 })
    }
  }

  const existing = await prisma.promoCode.findUnique({ where: { code: code.trim().toLowerCase() } })
  if (existing) {
    return NextResponse.json({ error: 'code đã tồn tại' }, { status: 409 })
  }

  const row = await prisma.promoCode.create({
    data: {
      code: code.trim().toLowerCase(),
      coins: coinsNum,
      amountVnd: amountVndNum,
      label: typeof label === 'string' && label.trim() ? label.trim() : null,
      maxRedemptions: maxRedemptionsNum,
      expiresAt: typeof expiresAt === 'string' && expiresAt ? new Date(expiresAt) : null,
      note: typeof note === 'string' && note.trim() ? note.trim() : null,
      enabled: enabled !== undefined ? Boolean(enabled) : true,
    },
  })
  return NextResponse.json({ promoCode: row })
}

export async function PATCH(req: NextRequest) {
  const authErr = await checkAdminToken(req)
  if (authErr) return authErr

  const body = await req.json()
  const { id, code, coins, amountVnd, label, maxRedemptions, expiresAt, note, enabled } = body as {
    id?: unknown; code?: unknown; coins?: unknown; amountVnd?: unknown; label?: unknown
    maxRedemptions?: unknown; expiresAt?: unknown; note?: unknown; enabled?: unknown
  }

  const idNum = Number(id)
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}

  if (code !== undefined) {
    if (typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ error: 'code không hợp lệ' }, { status: 400 })
    }
    data.code = code.trim().toLowerCase()
  }
  if (coins !== undefined) {
    const coinsNum = Number(coins)
    if (!Number.isFinite(coinsNum) || coinsNum <= 0) {
      return NextResponse.json({ error: 'coins must be > 0' }, { status: 400 })
    }
    data.coins = coinsNum
  }
  if (amountVnd !== undefined) {
    const amountVndNum = Number(amountVnd)
    if (!Number.isFinite(amountVndNum) || amountVndNum <= 0) {
      return NextResponse.json({ error: 'amountVnd must be > 0' }, { status: 400 })
    }
    data.amountVnd = amountVndNum
  }
  if (label !== undefined) {
    data.label = typeof label === 'string' && label.trim() ? label.trim() : null
  }
  // [CN1] maxRedemptions + expiresAt phải sửa được cho MỌI mã (kể cả 3 mã cũ đang null) —
  // gửi null (chuỗi rỗng/"null") để trở về unlimited/không hạn.
  if (maxRedemptions !== undefined) {
    if (maxRedemptions === null || maxRedemptions === '') {
      data.maxRedemptions = null
    } else {
      const maxRedemptionsNum = Number(maxRedemptions)
      if (!Number.isFinite(maxRedemptionsNum) || maxRedemptionsNum <= 0) {
        return NextResponse.json({ error: 'maxRedemptions must be null or > 0' }, { status: 400 })
      }
      data.maxRedemptions = maxRedemptionsNum
    }
  }
  if (expiresAt !== undefined) {
    data.expiresAt = typeof expiresAt === 'string' && expiresAt ? new Date(expiresAt) : null
  }
  if (note !== undefined) {
    data.note = typeof note === 'string' && note.trim() ? note.trim() : null
  }
  if (enabled !== undefined) {
    data.enabled = Boolean(enabled)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'không có field nào để sửa' }, { status: 400 })
  }

  try {
    const row = await prisma.promoCode.update({ where: { id: idNum }, data })
    return NextResponse.json({ promoCode: row })
  } catch {
    return NextResponse.json({ error: 'không tìm thấy mã' }, { status: 404 })
  }
}

export async function DELETE(req: NextRequest) {
  const authErr = await checkAdminToken(req)
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const idNum = Number(searchParams.get('id'))
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  try {
    await prisma.promoCode.delete({ where: { id: idNum } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'không tìm thấy mã' }, { status: 404 })
  }
}
