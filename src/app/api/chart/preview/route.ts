import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { calculateChart, getOuterPlanetCycleData } from '@/lib/astrology/calculations'
import {
  generateNatalChartSvg,
  generateSynastryTransitChartSvg,
  generateTransitChartSvg,
} from '@/lib/pdf/chartSvg'
import { decryptProfileData } from '@/lib/profileCrypto'

// Decrypt + extract chart inputs từ Profile.data (format: { dob:{day,month,year}, tob:{hour,minute}|string, loc:{lat,lon,tz} })
function toProfileData(rawData: unknown) {
  const data = decryptProfileData(rawData) as {
    dob: { day: number; month: number; year: number }
    tob: { hour: number; minute: number } | string
    loc: { lat: number; lon: number; tz: string }
  }
  const { dob, tob, loc } = data
  const dobStr = `${dob.day}/${dob.month}/${dob.year}`
  const tobStr = typeof tob === 'string' ? tob : `${tob.hour}:${String(tob.minute).padStart(2, '0')}`
  return { dobStr, tobStr, lat: loc.lat, lon: loc.lon, tz: loc.tz || 'Asia/Ho_Chi_Minh' }
}

// YYYY-MM-DD → DD/MM/YYYY
function isoToDmy(s: string): string {
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where:  { email: session.user.email },
    select: { planType: true },
  })
  if (user?.planType !== 'lifetime') {
    return NextResponse.json({ error: 'Lifetime only' }, { status: 403 })
  }

  const uid = (session.user as Record<string, unknown>).uid as string

  const body = await req.json()
  const { service, profileId, profileIdB, startDate, endDate } = body as {
    service: string; profileId: string; profileIdB?: string
    startDate?: string; endDate?: string
  }

  const profile = await prisma.profile.findFirst({
    where: { profileUid: profileId, userUid: uid },
  })
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const d = toProfileData(profile.data)
  const chart = calculateChart(d.dobStr, d.tobStr, d.lat, d.lon, d.tz)
  if (!chart) return NextResponse.json({ error: 'Chart calculation failed' }, { status: 500 })

  let svgString = ''

  if (service === 'synastry' || service === 'relationship') {
    if (!profileIdB) return NextResponse.json({ error: 'Missing profileIdB' }, { status: 400 })
    const profileB = await prisma.profile.findFirst({
      where: { profileUid: profileIdB, userUid: uid },
    })
    if (!profileB) return NextResponse.json({ error: 'Profile B not found' }, { status: 404 })
    const dB = toProfileData(profileB.data)
    const chartB = calculateChart(dB.dobStr, dB.tobStr, dB.lat, dB.lon, dB.tz)
    if (!chartB) return NextResponse.json({ error: 'Chart B failed' }, { status: 500 })
    svgString = generateSynastryTransitChartSvg(chart, chartB, null,
      { nameA: profile.name, nameB: profileB.name })

  } else if (service === 'vanhan' || service === 'transit') {
    let cycleData = null
    if (startDate && endDate) {
      cycleData = getOuterPlanetCycleData(isoToDmy(startDate), isoToDmy(endDate), d.lat, d.lon)
    }
    svgString = generateTransitChartSvg(chart, {}, cycleData)

  } else {
    // career / love → natal
    svgString = generateNatalChartSvg(chart, { name: profile.name })
  }

  return NextResponse.json({ svgString })
}
