import { NextResponse } from 'next/server'
import { calculateChart } from '@/lib/astrology/calculations'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { dob, tob, loc } = body

    if (!dob || !tob || !loc) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const dobStr = `${dob.day}/${dob.month}/${dob.year}`
    const tobStr = `${tob.hour}:${String(tob.minute).padStart(2, '0')}`

    const chart = calculateChart(dobStr, tobStr, loc.lat, loc.lon, loc.tz)

    if (!chart) {
      return NextResponse.json({ error: 'Chart calculation failed' }, { status: 500 })
    }

    return NextResponse.json({ chart })
  } catch (error) {
    console.error('Calculate error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
