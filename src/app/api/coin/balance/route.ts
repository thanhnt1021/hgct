import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBalance } from '@/lib/coin/service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userUid = (session?.user as { uid?: string } | undefined)?.uid
  if (!userUid) return NextResponse.json({ coin: 0, authed: false })

  const coin = await getBalance(userUid)
  return NextResponse.json({ coin, authed: true })
}
