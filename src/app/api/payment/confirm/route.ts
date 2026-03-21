import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request) {
  // Bug #27 fix: auth guard — placeholder endpoint must not be publicly accessible
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    // Payment confirmation placeholder
    // When SePay/PayOS is integrated, verify payment here
    return NextResponse.json({
      success: true,
      message: 'Payment confirmed (placeholder)',
      orderId: body.orderId,
    })
  } catch (error) {
    console.error('Payment error:', error)
    return NextResponse.json({ error: 'Payment confirmation failed' }, { status: 500 })
  }
}
