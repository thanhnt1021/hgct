import { NextRequest, NextResponse } from 'next/server'
import { checkAdminToken } from '@/lib/dashboard-auth'
import prisma from '@/lib/db'

export async function GET(req: NextRequest) {
  const authErr = await checkAdminToken(req)
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

// Bug #12: allowed config keys with value type validation
const ALLOWED_CONFIG_KEYS = new Set([
  'site_mode',
  'price_career', 'price_love', 'price_synastry', 'price_transit',
  'service_price',
  'hero_subtitle', 'hero_cta_text', 'cta_body', 'cta_button_text',
  'service_career_name', 'service_career_desc',
  'service_love_name', 'service_love_desc',
  'service_synastry_name', 'service_synastry_desc',
  'service_transit_name', 'service_transit_desc',
  'order_check_interval',
])

const NUMERIC_KEYS = new Set([
  'price_career', 'price_love', 'price_synastry', 'price_transit',
  'service_price', 'order_check_interval',
])

export async function PUT(req: NextRequest) {
  const authErr = await checkAdminToken(req)
  if (authErr) return authErr

  const body = await req.json()
  const { key, value } = body as { key: string; value: string }

  if (!key || value === undefined || value === null) {
    return NextResponse.json({ error: 'key and value required' }, { status: 400 })
  }

  // Bug #12 fix: reject unknown keys to prevent arbitrary config injection
  if (!ALLOWED_CONFIG_KEYS.has(key)) {
    return NextResponse.json({ error: `Unknown config key: ${key}` }, { status: 400 })
  }

  // Bug #12 fix: validate numeric keys are valid positive numbers
  if (NUMERIC_KEYS.has(key)) {
    const num = Number(value)
    if (!Number.isFinite(num) || num < 0) {
      return NextResponse.json({ error: `${key} must be a non-negative number` }, { status: 400 })
    }
  }

  await prisma.config.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  })

  return NextResponse.json({ ok: true, key, value })
}
