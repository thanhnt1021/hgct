'use client'

import { useMemo } from 'react'

const SIZE = 640
const CX = SIZE / 2, CY = SIZE / 2   // = 320

// Radii — outside in
const R_OUTER      = 272   // outer edge of sign ring
const R_AXIS_TIP   = 287   // axis lines extend beyond sign ring to here
const R_AXIS_LABEL = 300   // AC / DC / IC / MC label text
const R_ZODIAC     = 241   // inner edge of sign ring / outer edge of planet zone
const R_PLANET     = 204   // lane 1 (outermost glyph track)
const R_PLANET_ALT = 184   // lane 2
const R_PLANET_ALT2= 164   // lane 3
const R_HOUSE_IN   = 148   // inner planet zone boundary / outer house-number area
const R_ASPECT     = 112   // aspect line endpoint + inner tick mark radius

const R_HOUSE_NUM  = Math.round((R_HOUSE_IN + R_ASPECT) / 2)  // ≈ 130
const TICK_LEN     = 7     // both tick marks are exactly this length

const LANE_RADII   = [R_PLANET, R_PLANET_ALT, R_PLANET_ALT2]
const COLLISION_DEG = 8    // angular threshold for same-lane collision

const ZODIAC_SYMS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓']
const SIGN_EL = [0,1,2,3,0,1,2,3,0,1,2,3]

const EL_BG  = ['rgba(200,70,40,0.14)','rgba(70,150,50,0.11)','rgba(200,150,40,0.11)','rgba(40,70,200,0.13)']
const EL_CLR = ['#d06040','#58a840','#c8a030','#4060c8']
const EL_STR = ['rgba(200,70,40,0.35)','rgba(70,150,50,0.3)','rgba(200,150,40,0.3)','rgba(40,70,200,0.35)']

const ASP_CLR: Record<string, string> = {
  Conjunction: '#d9ab55',
  Trine: '#5578d4', Sextile: '#55b870',
  Square: '#c84545', Opposition: '#b84060',
  Semisextile: '#00cc00', Quincunx: '#00cc00',
}
const ASP_W: Record<string, number> = {
  Conjunction: 1.5, Trine: 1.2, Sextile: 1.0, Square: 1.2, Opposition: 1.5,
  Semisextile: 0.6, Quincunx: 0.6,
}
const ASP_DASH: Record<string, string | undefined> = { Semisextile: '3,3', Quincunx: '3,3' }

const AXIS_LABELS: Record<number, string> = { 0: 'AC', 3: 'IC', 6: 'DC', 9: 'MC' }

// Planets rendered as glyphs on the wheel
const WHEEL_PLANETS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
  'Uranus', 'Neptune', 'Pluto', 'True Node', 'South Node', 'Chiron', 'Vertex',
]

function svgAngle(lon: number, asc: number): number {
  return ((180 + asc - lon) % 360 + 360) % 360
}

function pol(r: number, deg: number) {
  const rad = deg * Math.PI / 180
  return { x: +(CX + r * Math.cos(rad)).toFixed(2), y: +(CY + r * Math.sin(rad)).toFixed(2) }
}

function sector(rO: number, rI: number, lon1: number, lon2: number, asc: number) {
  const a1 = svgAngle(lon1, asc), a2 = svgAngle(lon2, asc)
  const o1 = pol(rO, a1), o2 = pol(rO, a2)
  const i2 = pol(rI, a2), i1 = pol(rI, a1)
  return `M${o1.x},${o1.y} A${rO},${rO} 0 0 0 ${o2.x},${o2.y} L${i2.x},${i2.y} A${rI},${rI} 0 0 1 ${i1.x},${i1.y}Z`
}

// Multi-lane collision detection (3 lanes)
function spreadPlanets(
  names: string[],
  lons: Record<string, number>,
  asc: number,
): { name: string; r: number; angle: number }[] {
  const sorted = names
    .filter(n => lons[n] !== undefined)
    .map(n => ({ name: n, angle: svgAngle(lons[n], asc) }))
    .sort((a, b) => a.angle - b.angle)

  const placed: { angle: number; r: number }[] = []
  const result: { name: string; r: number; angle: number }[] = []

  for (const p of sorted) {
    let lane = 0
    while (lane < LANE_RADII.length) {
      const r = LANE_RADII[lane]
      const collision = placed.some(prev => {
        if (prev.r !== r) return false
        let diff = Math.abs(p.angle - prev.angle)
        if (diff > 180) diff = 360 - diff
        return diff < COLLISION_DEG
      })
      if (!collision) break
      lane++
    }
    const finalR = LANE_RADII[Math.min(lane, LANE_RADII.length - 1)]
    placed.push({ angle: p.angle, r: finalR })
    result.push({ name: p.name, r: finalR, angle: p.angle })
  }
  return result
}

export interface NatalWheelProps {
  rawPlanets: Record<string, { lon: number; speed?: number }>
  rawCusps: number[]
  angles: { Asc: number; MC: number }
  wheelAspects: Array<{ p1: string; p2: string; aspect: string; type: string }>
  planetSymbols: Record<string, string>
}

export default function NatalWheel({ rawPlanets, rawCusps, angles, wheelAspects, planetSymbols }: NatalWheelProps) {
  const asc = angles.Asc

  const pLons = useMemo(() => {
    const m: Record<string, number> = {}
    for (const n of WHEEL_PLANETS) {
      if (rawPlanets[n] !== undefined) m[n] = rawPlanets[n].lon
    }
    return m
  }, [rawPlanets])

  const spreadP = useMemo(
    () => spreadPlanets(WHEEL_PLANETS.filter(n => pLons[n] !== undefined), pLons, asc),
    [pLons, asc]
  )

  const houseMids = useMemo(() => rawCusps.map((lon, i) => {
    const next = rawCusps[(i + 1) % 12]
    const diff = ((next - lon) % 360 + 360) % 360
    return svgAngle(lon + diff / 2, asc)
  }), [rawCusps, asc])

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width="100%"
      style={{ maxWidth: SIZE, display: 'block', margin: '0 auto' }}
    >
      {/* ── Background ── */}
      <circle cx={CX} cy={CY} r={R_AXIS_LABEL + 18} fill="#07071a" />

      {/* ── [1d] Axis lines UNDER zodiac belt (drawn first = lowest layer) ── */}
      {rawCusps.map((lon, i) => {
        if (!(i === 0 || i === 3 || i === 6 || i === 9)) return null
        const a = svgAngle(lon, asc)
        const outer = pol(R_AXIS_TIP, a)
        return (
          <line key={`axis-${i}`}
            x1={CX} y1={CY}
            x2={outer.x} y2={outer.y}
            stroke="rgba(200,148,63,0.55)" strokeWidth="1.2"
          />
        )
      })}

      {/* ── Zodiac belt — colored by element (paints OVER axis through sign ring) ── */}
      {Array.from({ length: 12 }, (_, i) => (
        <path key={`zb-${i}`}
          d={sector(R_OUTER, R_ZODIAC, i * 30, (i + 1) * 30, asc)}
          fill={EL_BG[SIGN_EL[i]]}
          stroke={EL_STR[SIGN_EL[i]]}
          strokeWidth="0.4"
        />
      ))}

      {/* ── Zodiac sign glyphs ── */}
      {Array.from({ length: 12 }, (_, i) => {
        const p = pol((R_OUTER + R_ZODIAC) / 2, svgAngle(i * 30 + 15, asc))
        return (
          <text key={`zg-${i}`} x={p.x} y={p.y}
            textAnchor="middle" dominantBaseline="central"
            fontSize="13" fill={EL_CLR[SIGN_EL[i]]}
            style={{ userSelect: 'none', fontFamily: 'serif' }}
          >
            {ZODIAC_SYMS[i]}
          </text>
        )
      })}

      {/* ── 10° tick marks on inner sign ring edge ── */}
      {Array.from({ length: 36 }, (_, i) => {
        const tickLen = i % 3 === 0 ? 8 : 4
        const a = svgAngle(i * 10, asc)
        const outer = pol(R_ZODIAC, a)
        const inner = pol(R_ZODIAC - tickLen, a)
        return (
          <line key={`dtick-${i}`}
            x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
            stroke="rgba(200,148,63,0.2)" strokeWidth="0.5"
          />
        )
      })}

      {/* ── Circle borders ── */}
      <circle cx={CX} cy={CY} r={R_OUTER}    fill="none" stroke="rgba(200,148,63,0.45)" strokeWidth="1.5"/>
      <circle cx={CX} cy={CY} r={R_ZODIAC}   fill="none" stroke="rgba(200,148,63,0.28)" strokeWidth="0.8"/>
      <circle cx={CX} cy={CY} r={R_HOUSE_IN} fill="none" stroke="rgba(200,148,63,0.2)"  strokeWidth="0.7"/>
      <circle cx={CX} cy={CY} r={R_ASPECT}   fill="rgba(10,8,30,0.55)" stroke="rgba(200,148,63,0.12)" strokeWidth="0.6"/>

      {/* ── Non-axis house cusp lines (inside planet zone only) ── */}
      {rawCusps.map((lon, i) => {
        if (i === 0 || i === 3 || i === 6 || i === 9) return null
        const a = svgAngle(lon, asc)
        const inner = pol(R_HOUSE_IN, a)
        const outer = pol(R_ZODIAC, a)
        return (
          <line key={`cusp-${i}`}
            x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
            stroke="rgba(200,148,63,0.22)" strokeWidth="0.6"
            strokeDasharray="4,3"
          />
        )
      })}

      {/* ── AC / IC / DC / MC labels beyond sign ring ── */}
      {([0, 3, 6, 9] as const).map(i => {
        const a = svgAngle(rawCusps[i], asc)
        const p = pol(R_AXIS_LABEL, a)
        return (
          <text key={`axlbl-${i}`} x={p.x} y={p.y}
            textAnchor="middle" dominantBaseline="central"
            fontSize="9" fontWeight={700} fill="#d9ab55"
            style={{ userSelect: 'none', fontFamily: 'sans-serif', letterSpacing: '0.04em' }}
          >
            {AXIS_LABELS[i]}
          </text>
        )
      })}

      {/* ── House numbers (close to center) ── */}
      {houseMids.map((angle, i) => {
        const p = pol(R_HOUSE_NUM, angle)
        return (
          <text key={`hn-${i}`} x={p.x} y={p.y}
            textAnchor="middle" dominantBaseline="central"
            fontSize="8.5" fill="rgba(200,148,63,0.5)"
            style={{ userSelect: 'none' }}
          >
            {i + 1}
          </text>
        )
      })}

      {/* ── [1c] Planet tick marks — outer (at sign ring) + inner (at aspect circle), equal length ── */}
      {spreadP.map(({ angle }) => {
        const outerA = pol(R_ZODIAC, angle)
        const outerB = pol(R_ZODIAC - TICK_LEN, angle)
        const innerA = pol(R_ASPECT, angle)
        const innerB = pol(R_ASPECT + TICK_LEN, angle)
        return (
          <g key={`tick-${angle}`}>
            <line x1={outerA.x} y1={outerA.y} x2={outerB.x} y2={outerB.y}
              stroke="rgba(200,148,63,0.5)" strokeWidth="0.8"/>
            <line x1={innerA.x} y1={innerA.y} x2={innerB.x} y2={innerB.y}
              stroke="rgba(200,148,63,0.5)" strokeWidth="0.8"/>
          </g>
        )
      })}

      {/* ── [1a+1b] Aspect lines: ALL types, NO AC/MC ── */}
      {wheelAspects.map((asp, idx) => {
        if (!rawPlanets[asp.p1]?.lon || !rawPlanets[asp.p2]?.lon) return null
        const pa = pol(R_ASPECT, svgAngle(rawPlanets[asp.p1].lon, asc))
        const pb = pol(R_ASPECT, svgAngle(rawPlanets[asp.p2].lon, asc))
        const isMinor = asp.type === 'Minor'
        return (
          <line key={`asp-${idx}`}
            x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
            stroke={ASP_CLR[asp.aspect] || '#505070'}
            strokeWidth={ASP_W[asp.aspect] || 0.7}
            strokeOpacity={isMinor ? '0.4' : '0.5'}
            strokeDasharray={ASP_DASH[asp.aspect]}
          />
        )
      })}

      {/* ── Planet symbols — no background circle per 1d ── */}
      {spreadP.map(({ name, r, angle }) => {
        const p = pol(r, angle)
        const sym = planetSymbols[name] || name.slice(0, 2)
        const isRetro = (rawPlanets[name]?.speed ?? 0) < 0
        const isSpecial = name === 'True Node' || name === 'South Node' || name === 'Chiron' || name === 'Vertex'
        return (
          <g key={`pl-${name}`}>
            <text x={p.x} y={p.y}
              textAnchor="middle" dominantBaseline="central"
              fontSize={isSpecial ? '9' : '12'}
              fontWeight={isSpecial ? 600 : 400}
              fill={isSpecial ? '#7a7490' : '#d9ab55'}
              style={{ userSelect: 'none', fontFamily: 'serif' }}
            >
              {sym}
            </text>
            {isRetro && (
              <text x={p.x + 10} y={p.y - 8} fontSize="7" fill="#c45252" style={{ userSelect: 'none' }}>℞</text>
            )}
          </g>
        )
      })}

      {/* ── Center dot ── */}
      <circle cx={CX} cy={CY} r="3" fill="rgba(200,148,63,0.4)" />
    </svg>
  )
}
