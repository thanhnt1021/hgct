// Trả danh sách gói nạp xu (server-side → giá đúng theo env COIN_TEST_PRICES).
// Client fetch cái này để hiển thị giá khớp prod (giá thật) / demo (5-10-15k).

import { NextResponse } from 'next/server'
import { COIN_PACKAGES } from '@/lib/coin/packages'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ packages: COIN_PACKAGES.filter(p => !p.hidden) })
}
