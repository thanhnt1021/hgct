import { NextResponse } from 'next/server'
import { calculateChart, getZodiac, getHouseOfPlanet, checkAspect, getDominantHousesSorted } from '@/lib/astrology/calculations'
import {
  PLANET_SYMBOLS, PLANET_NAMES_VN, ZODIAC_SYMBOLS, ZODIAC_MATRIX,
  PLANET_POINTS, RULER_MAP, ASPECTS_DEF,
} from '@/lib/astrology/constants'

// Planet table: no AC, MC, South Node
const DISPLAY_ORDER = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
  'Uranus', 'Neptune', 'Pluto', 'True Node', 'Chiron', 'Vertex',
]

// Aspect grid: 10 core + True Node + Chiron + Vertex + Asc + MC (15 objects for section 3)
const GRID_OBJECTS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
  'Uranus', 'Neptune', 'Pluto', 'True Node', 'Chiron', 'Vertex', 'Asc', 'MC',
]

// Wheel aspect lines: ONLY 10 CORE_PLANETS (no True Node/Chiron/Vertex/AC/MC)
const WHEEL_ASPECT_OBJECTS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
  'Uranus', 'Neptune', 'Pluto',
]

// Dominant planets + tightest aspect scope
const CORE_PLANETS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
  'Uranus', 'Neptune', 'Pluto',
]
const PERSONAL_PLANETS = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'])
const CORE_SET = new Set(CORE_PLANETS)

function orbRound(orb: number): number {
  const intPart = Math.floor(orb)
  const minutes = (orb - intPart) * 60
  return minutes <= 30 ? intPart : intPart + 1
}

type AspectEntry = Record<string, unknown>

function buildAspects(objects: string[], ap: Record<string, { lon: number; speed?: number }>): AspectEntry[] {
  const out: AspectEntry[] = []
  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      const p1 = objects[i], p2 = objects[j]
      if (!ap[p1] || !ap[p2]) continue
      const a = checkAspect(ap[p1].lon, ap[p2].lon)
      if (!a) continue
      out.push({
        p1, p2,
        p1Symbol: PLANET_SYMBOLS[p1] || p1,
        p2Symbol: PLANET_SYMBOLS[p2] || p2,
        p1NameVn: PLANET_NAMES_VN[p1] || p1,
        p2NameVn: PLANET_NAMES_VN[p2] || p2,
        aspect: a.aspect, nameVn: a.name_vn, symbol: a.symbol,
        orb: a.orb, type: a.type,
        color: ASPECTS_DEF[a.aspect]?.color || '#808080',
      })
    }
  }
  out.sort((a, b) => (a.orb as number) - (b.orb as number))
  return out
}

export async function POST(request: Request) {
  try {
    const { inputData } = await request.json()
    const { dob, tob, loc, name } = inputData as {
      name: string
      dob: { day: number; month: number; year: number }
      tob: { hour: number; minute: number }
      loc: { lat: number; lon: number; tz: string }
    }

    const dobStr = `${dob.day}/${dob.month}/${dob.year}`
    const tobStr = `${tob.hour}:${String(tob.minute).padStart(2, '0')}`
    const chart = calculateChart(dobStr, tobStr, loc.lat, loc.lon, loc.tz)
    if (!chart) return NextResponse.json({ error: 'Không thể tính toán bản đồ sao' }, { status: 400 })

    const snLon = ((chart.planets['True Node'].lon + 180) % 360 + 360) % 360
    chart.planets['South Node'] = { lon: snLon }

    const ap = chart.planets

    // ── Planet table ──────────────────────────────────────────────────
    const planets = DISPLAY_ORDER.map(pName => {
      const p = ap[pName]
      if (!p) return null
      const [sIdx, sName, sCode, degInSign] = getZodiac(p.lon)
      return {
        name: pName, nameVn: PLANET_NAMES_VN[pName] || pName,
        symbol: PLANET_SYMBOLS[pName] || pName, lon: p.lon,
        sign: sName, signCode: sCode, signSymbol: ZODIAC_SYMBOLS[sIdx],
        signIdx: sIdx, degInSign, house: getHouseOfPlanet(p.lon, chart.cusps),
        isRetro: (p.speed ?? 0) < 0,
      }
    }).filter(Boolean)

    // ── House cusps ───────────────────────────────────────────────────
    const cusps = chart.cusps.map((lon, i) => {
      const [sIdx, sName, sCode, degInSign] = getZodiac(lon)
      const ruler = RULER_MAP[sName] || ''
      return {
        house: i + 1, lon, sign: sName, signCode: sCode,
        signSymbol: ZODIAC_SYMBOLS[sIdx], signIdx: sIdx, degInSign,
        ruler, rulerSymbol: PLANET_SYMBOLS[ruler] || '',
      }
    })

    // ── Grid aspects (10 core + AC + MC, all types) ───────────────────
    const aspects = buildAspects(GRID_OBJECTS, ap)

    // ── Wheel aspects (10 core + True Node + SN + Chiron + Vertex) ────
    const wheelAspects = buildAspects(WHEEL_ASPECT_OBJECTS, ap)

    // ── Element × Modality ────────────────────────────────────────────
    const elementMatrix = Array.from({ length: 4 }, () => [0, 0, 0])
    for (const [obj, pts] of Object.entries(PLANET_POINTS)) {
      if (ap[obj]) {
        const zIdx = Math.floor(((ap[obj].lon % 360) + 360) % 360 / 30)
        const [r, c] = ZODIAC_MATRIX[zIdx]
        elementMatrix[r][c] += pts
      }
    }
    const elScores = elementMatrix.map(row => row.reduce((a, b) => a + b, 0))
    const modScores = [0, 1, 2].map(c => elementMatrix.reduce((s, row) => s + row[c], 0))

    // ── Core aspects: 10 CORE_PLANETS, Major only, orb < 10 ──────────
    const coreAspects = wheelAspects.filter(a =>
      CORE_SET.has(a.p1 as string) &&
      CORE_SET.has(a.p2 as string) &&
      (a.type as string) !== 'Minor'
    )

    // ── Dominant planets — funnel filter ──────────────────────────────
    type PAspect = { partner: string; partnerSymbol: string; partnerNameVn: string; aspect: string; aspSymbol: string; aspNameVn: string; orb: number; type: string }
    const stats: Record<string, { count: number; tight: number; loose: number; totalOrbFloor: number; totalOrb: number; aspects: PAspect[] }> = {}
    for (const p of CORE_PLANETS) stats[p] = { count: 0, tight: 0, loose: 0, totalOrbFloor: 0, totalOrb: 0, aspects: [] }

    for (const a of coreAspects) {
      const orb = a.orb as number
      const p1 = a.p1 as string, p2 = a.p2 as string
      for (const [me, partner] of [[p1, p2], [p2, p1]] as [string, string][]) {
        stats[me].count++
        if (orb < 1.0) stats[me].tight++
        if (orb > 6.5) stats[me].loose++
        stats[me].totalOrbFloor += Math.floor(orb)
        stats[me].totalOrb += orb
        stats[me].aspects.push({
          partner, partnerSymbol: PLANET_SYMBOLS[partner] || partner,
          partnerNameVn: PLANET_NAMES_VN[partner] || partner,
          aspect: a.aspect as string, aspSymbol: a.symbol as string,
          aspNameVn: a.nameVn as string, orb, type: a.type as string,
        })
      }
    }

    // Filter to max-count planets
    const maxCount = Math.max(...CORE_PLANETS.map(p => stats[p].count))
    let candidates = CORE_PLANETS.filter(p => stats[p].count === maxCount && stats[p].count > 0)

    // Tie-break: find global min orb_round across tied group's aspects, keep only planets with that min orb
    if (candidates.length > 1) {
      const minO = Math.min(...candidates.flatMap(p => stats[p].aspects.map(a => orbRound(a.orb))))
      const withMinO = candidates.filter(p => stats[p].aspects.some(a => orbRound(a.orb) === minO))
      if (withMinO.length > 0) candidates = withMinO
    }

    // Sort by total orb_round ascending
    candidates.sort((a, b) => {
      const totalA = stats[a].aspects.reduce((s, asp) => s + orbRound(asp.orb), 0)
      const totalB = stats[b].aspects.reduce((s, asp) => s + orbRound(asp.orb), 0)
      return totalA - totalB
    })

    const dominantPlanets = candidates.map(name => ({
      name, nameVn: PLANET_NAMES_VN[name] || name,
      symbol: PLANET_SYMBOLS[name] || name,
      count: stats[name].count,
      aspects: stats[name].aspects.sort((a, b) => a.orb - b.orb),
    }))

    // ── Dominant Houses ────────────────────────────────────────────
    const domHouses = getDominantHousesSorted(chart)

    // ── Tightest aspects — orb_round method ──────────────────────────
    let minOrbRound = Infinity
    for (const a of coreAspects) {
      const r = orbRound(a.orb as number)
      if (r < minOrbRound) minOrbRound = r
    }
    const tightestAspects = coreAspects.length > 0
      ? coreAspects
          .filter(a => orbRound(a.orb as number) === minOrbRound)
          .sort((a, b) => (a.orb as number) - (b.orb as number))
      : []

    return NextResponse.json({
      name, chartInfo: chart.info,
      planets, cusps, aspects, wheelAspects,
      elementMatrix, elScores, modScores,
      dominantPlanets, tightestAspects, domHouses,
      rawPlanets: Object.fromEntries(
        Object.entries(ap).map(([k, v]) => [k, { lon: v.lon, speed: v.speed }])
      ),
      rawCusps: chart.cusps, angles: chart.angles,
    })
  } catch (err) {
    console.error('[Chart API]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
