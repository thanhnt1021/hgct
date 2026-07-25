// Kiểm tra mã ưu đãi nạp xu — trả gói ẩn tương ứng nếu mã đúng.

import { NextResponse } from 'next/server'
import { getPackageByPromoCode } from '@/lib/coin/packages'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let body: { code?: unknown }
  try {
    body = (await request.json()) as { code?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const code = typeof body.code === 'string' ? body.code : ''
  const { pkg, error } = await getPackageByPromoCode(code)
  if (!pkg) {
    return NextResponse.json({ error: `Mã ưu đãi ${error}` }, { status: 404 })
  }

  return NextResponse.json({
    packageCode: pkg.packageCode,
    coins: pkg.coins,
    amountVnd: pkg.amountVnd,
    label: pkg.label,
  })
}
