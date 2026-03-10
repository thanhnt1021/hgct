import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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
