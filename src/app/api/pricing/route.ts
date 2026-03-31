import { NextRequest, NextResponse } from 'next/server'
import { getPrice } from '@/lib/pricing'

// GET /api/pricing?service=career — public endpoint to get service base price
export async function GET(req: NextRequest) {
  const service = req.nextUrl.searchParams.get('service')
  if (!service) return NextResponse.json({ error: 'missing service' }, { status: 400 })
  const price = await getPrice(service)
  return NextResponse.json({ price })
}
