import { NextResponse } from 'next/server'
import { checkDemosepay } from '@/lib/demosepay-state'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const memo = url.searchParams.get('memo')
  if (!memo) return NextResponse.json({ received: false, error: 'missing memo' }, { status: 400 })
  const entry = checkDemosepay(memo)
  return NextResponse.json({
    received: !!entry,
    amount: entry?.amount ?? null,
    txnId: entry?.txnId ?? null,
  })
}
