// SVG chart generation — converted from Python/Matplotlib to TypeScript/SVG
// All radii in pixels (scale = 272/11.5 ≈ 23.65 from Python polar units)
import type { ChartData } from '@/lib/astrology/calculations'
import { checkAspect } from '@/lib/astrology/calculations'
import { PLANET_SYMBOLS } from '@/lib/astrology/constants'
import { PLANET_SVGS, SIGN_SVGS } from './svgIcons'

// ── Natal radii (static) ────────────────────────────────────────────
const R_INNER_RING    = 33
const R_ASPECT        = 124
const R_MID           = 130
const R_HOUSE_NUM     = 138
const R_PLANET_LANE2  = 147   // inner lane
const R_PLANET_LANE1  = 173   // outer lane
const R_ZODIAC_INNER  = 189
const R_EL_IN         = 193
const R_EL_OUT        = 221
const R_ZODIAC_OUTER  = 225
const R_AXIS_TICK     = 229
const R_AXIS_LABEL    = 248
const R_OUTER_NATAL   = 272
const N_SIZE          = (R_OUTER_NATAL + 40) * 2  // 624
const N_CX            = N_SIZE / 2                // 312
const N_CY            = N_SIZE / 2                // 312

// ── Synastry (Cap Doi) radii ─────────────────────────────────────────
const R_ASPECT_SYN      = 95
const R_A_OUT           = 142
const R_B_OUT           = 189
const R_SYN_EL_IN       = 193
const R_SYN_EL_OUT      = 221
const R_SYN_ZOD_OUTER   = 225
const R_TRANS_TICK      = 237
const R_TRANS_TEXT      = 260
const LANE_BASE_R       = 284
const LANE_HEIGHT       = 12

// ── Colors ──────────────────────────────────────────────────────────
const EL_COLORS   = ['#e94031', '#65c846', '#eeab41', '#2341f2']
const EL_CYCLE    = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3]
const COLOR_A     = '#0033ff'
const COLOR_B     = '#ff0000'
const COLOR_TRANS = '#00cc00'

const ASP_COLORS: Record<string, string> = {
  Conjunction: '#000000', Opposition: '#ff0000', Square: '#ff0000',
  Trine: '#0033ff', Sextile: '#0033ff', Semisextile: '#00cc00', Quincunx: '#00cc00',
}
const ASP_MAX_ORB: Record<string, number> = {
  Conjunction: 8, Opposition: 8, Square: 7, Trine: 7,
  Sextile: 6, Semisextile: 3, Quincunx: 3,
}

const ASPECT_PLANETS = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto']
const SMALL_PLANETS  = new Set(['True Node','Chiron','Vertex','South Node'])
const AXIS_INDICES   = [0, 3, 6, 9]
const AXIS_LABELS: Record<number, string> = { 0: 'AC', 3: 'IC', 6: 'DC', 9: 'MC' }
const OUTER_PLANETS  = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'] as const

const SYNASTRY_ORBS: Record<string, number> = {
  Conjunction: 5, Opposition: 5, Square: 5, Trine: 5, Sextile: 3, Semisextile: 1.5, Quincunx: 1.5,
}

// ── Types ────────────────────────────────────────────────────────────
export interface OuterPlanetCycle {
  A: number; B: number; start: number; end: number; len: number
}
interface ArcEntry {
  name: string; sym: string
  start: number; end: number; len: number; A: number; B: number
  laneIdx: number
}
interface PlanetDisp {
  name: string; lon: number; dispLon: number; dispR: number
}

// ── Coordinate helpers ───────────────────────────────────────────────

function svgAngle(lon: number, asc: number): number {
  const norm = ((lon - asc) % 360 + 360) % 360
  return ((180 - norm + 360) % 360) * Math.PI / 180
}

function pol(r: number, rad: number, cx: number, cy: number) {
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

const f = (n: number) => n.toFixed(2)

/** Spindle (hình thoi thuôn) thay aspect line — orbRatio 0-1, gần exact = dày/đậm hơn */
function drawSpindle(
  lon1: number, lon2: number,
  asc: number, r: number,
  cx: number, cy: number,
  color: string,
  maxWidth = 0.15,   // fraction of r
  alpha = 0.6,
  orbRatio = 1.0,
): string {
  const p1 = pol(r, svgAngle(lon1, asc), cx, cy)
  const p2 = pol(r, svgAngle(lon2, asc), cx, cy)
  const dx = p2.x - p1.x, dy = p2.y - p1.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1) return ''
  const nx = -dy / len, ny = dx / len
  const hw = (maxWidth * r * (0.3 + 0.7 * orbRatio)) / 2
  const taper = 0.05
  const t1x = p1.x + dx * taper, t1y = p1.y + dy * taper
  const t2x = p2.x - dx * taper, t2y = p2.y - dy * taper
  const mx = (p1.x + p2.x) / 2,  my = (p1.y + p2.y) / 2
  const pts = [
    [p1.x, p1.y],
    [t1x + nx * hw, t1y + ny * hw], [mx + nx * hw, my + ny * hw], [t2x + nx * hw, t2y + ny * hw],
    [p2.x, p2.y],
    [t2x - nx * hw, t2y - ny * hw], [mx - nx * hw, my - ny * hw], [t1x - nx * hw, t1y - ny * hw],
  ].map(([vx, vy]) => `${f(vx)},${f(vy)}`).join(' ')
  return `<polygon points="${pts}" fill="${color}" stroke="black" stroke-width="0.6" opacity="${alpha}" />`
}

/** Render planet SVG icon centered at (x, y). No rotation — keeps icon upright. */
function renderPlanetIcon(name: string, x: number, y: number, size: number, fill: string): string {
  const rawSvg = PLANET_SVGS[name]
  if (!rawSvg) return ''
  const inner = rawSvg.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '').trim()
  const colored = inner.replace(/fill="[^"]*"/g, `fill="${fill}"`)
  const sc = size / 100
  return `<g transform="translate(${f(x)},${f(y)}) scale(${sc}) translate(-50,-50)">${colored}</g>`
}

/** Render zodiac sign SVG icon with radial rotation (upright pointing outward). */
function renderSignIcon(svgContent: string, x: number, y: number, size: number, fill: string, rotDeg: number): string {
  if (!svgContent) return ''
  const inner = svgContent.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '').trim()
  const colored = inner.replace(/fill="[^"]*"/g, `fill="${fill}"`)
  const sc = size / 100
  return `<g transform="translate(${f(x)},${f(y)}) rotate(${f(rotDeg)}) scale(${sc}) translate(-50,-50)">${colored}</g>`
}

/** SVG path for an annular sector (pie slice with hole). */
function sector(rOut: number, rIn: number, lonStart: number, lonEnd: number,
                asc: number, cx: number, cy: number): string {
  const a1 = svgAngle(lonStart, asc)  // higher angle (lon smaller)
  const a2 = svgAngle(lonEnd,   asc)  // lower angle (lon larger)
  const p1o = pol(rOut, a1, cx, cy); const p2o = pol(rOut, a2, cx, cy)
  const p1i = pol(rIn,  a1, cx, cy); const p2i = pol(rIn,  a2, cx, cy)
  // a1 > a2 (lon increases → angle decreases → CCW in SVG y-down → sweep=0 outer, sweep=1 inner)
  return [
    `M ${f(p1o.x)} ${f(p1o.y)}`,
    `A ${rOut} ${rOut} 0 0 0 ${f(p2o.x)} ${f(p2o.y)}`,
    `L ${f(p2i.x)} ${f(p2i.y)}`,
    `A ${rIn} ${rIn} 0 0 1 ${f(p1i.x)} ${f(p1i.y)}`,
    'Z',
  ].join(' ')
}

// ── Zodiac belt drawing (shared between natal/synastry) ──────────────

function drawZodiacBelt(asc: number, rIn: number, rOut: number,
                        cx: number, cy: number): string {
  let s = ''
  for (let i = 0; i < 12; i++) {
    // Divider line — B4: stroke black (không phải white), không có element color strip
    const sepA = svgAngle(i * 30, asc)
    const sp1  = pol(rIn,  sepA, cx, cy)
    const sp2  = pol(rOut, sepA, cx, cy)
    s += `<line x1="${f(sp1.x)}" y1="${f(sp1.y)}" x2="${f(sp2.x)}" y2="${f(sp2.y)}"
               stroke="black" stroke-width="0.5" />`
    // Zodiac icon — custom SVG icon, rotated radially
    const midA      = svgAngle(i * 30 + 15, asc)
    const mp        = pol((rIn + rOut) / 2, midA, cx, cy)
    const signColor = EL_COLORS[i % 4]
    const rotDeg    = midA * 180 / Math.PI + 90
    s += renderSignIcon(SIGN_SVGS[i], mp.x, mp.y, 20, signColor, rotDeg)
  }
  return s
}

// ── Planet position optimizer ────────────────────────────────────────

function getHouseIndex(lon: number, cusps: number[]): number {
  const pLon = ((lon % 360) + 360) % 360
  for (let i = 0; i < 12; i++) {
    const cCurr = cusps[i]
    const cNext = cusps[(i + 1) % 12]
    if (((pLon - cCurr) % 360 + 360) % 360 < ((cNext - cCurr) % 360 + 360) % 360) return i
  }
  return 0
}

/** House-based planet spread (guide §11):
 *  Groups by house → alternates outer/inner lane → forward+backward pass spreads dispLon.
 *  Tick marks use true lon; symbols use dispLon. */
function optimizePlanetPositions(
  planets: Array<{ name: string; lon: number }>,
  cusps: number[],
  lanes: [number, number],
  _asc = 0,
): PlanetDisp[] {
  const MIN_DIST = 5.0   // min degrees between planets in same lane
  const BUFFER   = 2.0   // degrees buffer from house boundary

  type Entry = { name: string; lon: number; pos: number }
  const houses: Entry[][] = Array.from({ length: 12 }, () => [])

  for (const p of planets) {
    const hIdx   = getHouseIndex(p.lon, cusps)
    const offset = ((p.lon - cusps[hIdx]) % 360 + 360) % 360
    houses[hIdx].push({ name: p.name, lon: p.lon, pos: offset })
  }

  const result: PlanetDisp[] = []

  for (let hIdx = 0; hIdx < 12; hIdx++) {
    const group = houses[hIdx].sort((a, b) => a.pos - b.pos)
    if (group.length === 0) continue

    const cusp       = cusps[hIdx]
    const houseWidth = ((cusps[(hIdx + 1) % 12] - cusp) % 360 + 360) % 360

    // Split: even index → lane[0] (outer), odd → lane[1] (inner)
    const lg: [Entry[], Entry[]] = [[], []]
    for (let i = 0; i < group.length; i++) lg[i % 2].push({ ...group[i] })

    // Forward + backward pass per lane
    for (let li = 0; li < 2; li++) {
      const items = lg[li]
      if (items.length === 0) continue
      const pos = items.map(it => it.pos)

      for (let i = 0; i < pos.length; i++) {
        if (i === 0) { if (pos[i] < BUFFER) pos[i] = BUFFER }
        else if (pos[i] < pos[i - 1] + MIN_DIST) pos[i] = pos[i - 1] + MIN_DIST
      }
      for (let i = pos.length - 1; i >= 0; i--) {
        const limit = houseWidth - BUFFER
        if (pos[i] > limit) pos[i] = limit
        if (i < pos.length - 1 && pos[i] > pos[i + 1] - MIN_DIST) pos[i] = pos[i + 1] - MIN_DIST
      }
      for (let i = 0; i < items.length; i++) items[i].pos = pos[i]
    }

    // Merge back in original group order
    const lc = [0, 0]
    for (let i = 0; i < group.length; i++) {
      const li      = i % 2
      const item    = lg[li][lc[li]++]
      const dispLon = ((cusp + item.pos) % 360 + 360) % 360
      result.push({ name: item.name, lon: item.lon, dispLon, dispR: lanes[li] })
    }
  }

  return result
}

/** Transit spread — mirrors guide §8.7: dummy 30° cusps + 1 lane + forward/backward pass.
 *  All planets in the same 30° segment are spread angularly (not split into 2 lanes).
 *  Handles 3+ clustered planets correctly; tick marks stay at true lon. */
function spreadTransit(
  planets: Array<{ name: string; lon: number }>,
  _asc: number,
  r: number,
): PlanetDisp[] {
  const MIN_DIST    = 5.0   // min degrees between symbols
  const BUFFER      = 2.0   // min degrees from dummy house boundary
  const HOUSE_WIDTH = 30.0

  // Group by dummy 30° house based on true ecliptic lon
  const houses: Array<Array<{ name: string; lon: number; pos: number }>> =
    Array.from({ length: 12 }, () => [])

  for (const p of planets) {
    const hIdx   = Math.floor(((p.lon % 360) + 360) % 360 / 30)
    const offset = ((p.lon - hIdx * 30) % 30 + 30) % 30
    houses[hIdx].push({ name: p.name, lon: p.lon, pos: offset })
  }

  const result: PlanetDisp[] = []

  for (let hIdx = 0; hIdx < 12; hIdx++) {
    const group = houses[hIdx].sort((a, b) => a.pos - b.pos)
    if (group.length === 0) continue

    const pos = group.map(it => it.pos)

    // Forward pass — push forward if too close
    for (let i = 0; i < pos.length; i++) {
      if (i === 0) { if (pos[i] < BUFFER) pos[i] = BUFFER }
      else if (pos[i] < pos[i - 1] + MIN_DIST) pos[i] = pos[i - 1] + MIN_DIST
    }
    // Backward pass — pull back if overflow boundary
    for (let i = pos.length - 1; i >= 0; i--) {
      const limit = HOUSE_WIDTH - BUFFER
      if (pos[i] > limit) pos[i] = limit
      if (i < pos.length - 1 && pos[i] > pos[i + 1] - MIN_DIST) pos[i] = pos[i + 1] - MIN_DIST
    }

    for (let i = 0; i < group.length; i++) {
      const dispLon = ((hIdx * 30 + pos[i]) % 360 + 360) % 360
      result.push({ name: group[i].name, lon: group[i].lon, dispLon, dispR: r })
    }
  }

  return result
}

// ── Cycle arc helpers ────────────────────────────────────────────────

export function checkArcCollision(
  arc1: { start: number; end: number },
  arc2: { start: number; end: number },
  buffer = 2.0,
): boolean {
  const norm = (d: number) => ((d % 360) + 360) % 360
  const isInArc = (p: number, s: number, e: number): boolean => {
    p = norm(p)
    return s <= e ? p >= s && p <= e : p >= s || p <= e
  }
  const s1b = norm(arc1.start - buffer); const e1b = norm(arc1.end + buffer)
  return (isInArc(arc2.start, s1b, e1b) || isInArc(arc2.end, s1b, e1b) ||
          isInArc(s1b, arc2.start, arc2.end) || isInArc(e1b, arc2.start, arc2.end))
}

export function allocateCycleLanes(cycleData: Record<string, OuterPlanetCycle>): ArcEntry[] {
  const entries: ArcEntry[] = Object.entries(cycleData).map(([name, d]) => ({
    name, sym: PLANET_SYMBOLS[name] ?? name.slice(0, 2),
    start: d.start, end: d.end, len: d.len, A: d.A, B: d.B, laneIdx: 0,
  }))
  entries.sort((a, b) => b.len - a.len)
  const lanes: ArcEntry[][] = []
  for (const entry of entries) {
    let assigned = -1
    for (let idx = 0; idx < lanes.length; idx++) {
      if (!lanes[idx].some(ex => checkArcCollision(entry, ex))) { assigned = idx; break }
    }
    if (assigned === -1) { lanes.push([]); assigned = lanes.length - 1 }
    lanes[assigned].push(entry)
    entry.laneIdx = assigned
  }
  return entries
}

// ── Cycle arcs drawing (shared) ─────────────────────────────────────

function drawCycleArcs(entries: ArcEntry[], asc: number, cx: number, cy: number): string {
  let s = ''
  for (const arc of entries) {
    const rLane = LANE_BASE_R + arc.laneIdx * LANE_HEIGHT

    // Arc path
    const startRad = svgAngle(arc.start, asc)
    const endRad   = svgAngle(arc.end,   asc)
    const ps = pol(rLane, startRad, cx, cy)
    const pe = pol(rLane, endRad,   cx, cy)

    // Angular span for large-arc flag
    let span = arc.end - arc.start
    if (span < 0) span += 360
    const largeArc = span > 180 ? 1 : 0

    // sweep=0 (CCW): ecliptic lon tăng → svgAngle giảm → y+sin pol() = CCW trên màn hình
    s += `<path d="M ${f(ps.x)} ${f(ps.y)} A ${rLane} ${rLane} 0 ${largeArc} 0 ${f(pe.x)} ${f(pe.y)}"
               fill="none" stroke="${COLOR_TRANS}" stroke-width="3" stroke-linecap="round" opacity="0.8" />`

    // Ticks A (start date) and B (end date)
    for (const tickLon of [arc.A, arc.B]) {
      const tickRad = svgAngle(tickLon, asc)
      const t1 = pol(rLane,     tickRad, cx, cy)
      const t2 = pol(rLane - 5, tickRad, cx, cy)
      s += `<line x1="${f(t1.x)}" y1="${f(t1.y)}" x2="${f(t2.x)}" y2="${f(t2.y)}"
                 stroke="${COLOR_TRANS}" stroke-width="0.8" />`
    }
  }
  return s
}

// ═══════════════════════════════════════════════════════════════════
// 1. NATAL CHART
// ═══════════════════════════════════════════════════════════════════

export function generateNatalChartSvg(chart: ChartData, info?: { name?: string }): string {
  const CX = N_CX, CY = N_CY
  const asc   = chart.angles.Asc
  const cusps = chart.cusps

  const p = (r: number, rad: number) => pol(r, rad, CX, CY)

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N_SIZE} ${N_SIZE}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`

  // ── Layer 1: Background rings (outer→inner, each overpaints previous)
  // R_OUTER_NATAL fill removed — để ảnh nền -02.jpg lộ ra ngoài zodiac belt
  svg += `<circle cx="${CX}" cy="${CY}" r="${R_ZODIAC_OUTER}" fill="#fffff0" />`
  svg += `<circle cx="${CX}" cy="${CY}" r="${R_ZODIAC_INNER}" fill="#ffffff" />`
  svg += `<circle cx="${CX}" cy="${CY}" r="${R_MID}" fill="#fffff0" />`

  // ── Layer 2: Inner ring (gray dotted)
  svg += `<circle cx="${CX}" cy="${CY}" r="${R_INNER_RING}" fill="none" stroke="gray" stroke-width="1.0" stroke-dasharray="3,3" />`

  // ── Layer 3: Axis lines AC/IC/DC/MC (R_INNER_RING → R_ZODIAC_INNER, lw=2.5)
  for (const i of AXIS_INDICES) {
    const a  = svgAngle(cusps[i], asc)
    const p1 = p(R_INNER_RING, a); const p2 = p(R_ZODIAC_INNER, a)
    svg += `<line x1="${f(p1.x)}" y1="${f(p1.y)}" x2="${f(p2.x)}" y2="${f(p2.y)}" stroke="black" stroke-width="2.5" />`
  }

  // ── Layer 4: Zodiac belt
  svg += drawZodiacBelt(asc, R_ZODIAC_INNER, R_ZODIAC_OUTER, CX, CY)

  // ── Layer 5: Circle borders (black 0.5) — bỏ R_OUTER_NATAL (lộ nền ảnh)
  for (const r of [R_MID, R_ZODIAC_INNER, R_ZODIAC_OUTER]) {
    svg += `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="black" stroke-width="0.5" />`
  }

  // ── Layer 6: Axis outer tick (R_ZODIAC_OUTER → R_AXIS_TICK, black lw=1.5)
  for (const i of AXIS_INDICES) {
    const a = svgAngle(cusps[i], asc)
    const p1 = p(R_ZODIAC_OUTER, a); const p2 = p(R_AXIS_TICK, a)
    svg += `<line x1="${f(p1.x)}" y1="${f(p1.y)}" x2="${f(p2.x)}" y2="${f(p2.y)}" stroke="black" stroke-width="1.5" />`
  }

  // ── Layer 7: Non-axis house cusps (R_MID → R_ZODIAC_INNER, lw=0.5)
  for (let i = 0; i < 12; i++) {
    if (AXIS_INDICES.includes(i)) continue
    const a = svgAngle(cusps[i], asc)
    const p1 = p(R_MID, a); const p2 = p(R_ZODIAC_INNER, a)
    svg += `<line x1="${f(p1.x)}" y1="${f(p1.y)}" x2="${f(p2.x)}" y2="${f(p2.y)}" stroke="black" stroke-width="0.5" />`
  }

  // ── Layer 8: Axis labels AC/IC/DC/MC
  for (const i of AXIS_INDICES) {
    const a = svgAngle(cusps[i], asc)
    const lp = p(R_AXIS_LABEL, a)
    svg += `<text x="${f(lp.x)}" y="${f(lp.y)}" text-anchor="middle" dominant-baseline="central"
               font-size="9" font-weight="700" fill="black" font-family="sans-serif"
               style="user-select:none">${AXIS_LABELS[i]}</text>`
  }

  // ── Layer 9: House numbers (gray bold, midpoint of each house)
  for (let i = 0; i < 12; i++) {
    const next  = cusps[(i + 1) % 12]
    const diff  = ((next - cusps[i]) % 360 + 360) % 360
    const midA  = svgAngle(cusps[i] + diff / 2, asc)
    const np    = p(R_HOUSE_NUM, midA)
    svg += `<text x="${f(np.x)}" y="${f(np.y)}" text-anchor="middle" dominant-baseline="central"
               font-size="8.5" font-weight="bold" fill="gray" style="user-select:none">${i + 1}</text>`
  }

  // ── Layer 10: Aspect spindles
  for (let i = 0; i < ASPECT_PLANETS.length; i++) {
    for (let j = i + 1; j < ASPECT_PLANETS.length; j++) {
      const p1n = ASPECT_PLANETS[i], p2n = ASPECT_PLANETS[j]
      if (!chart.planets[p1n] || !chart.planets[p2n]) continue
      const asp = checkAspect(chart.planets[p1n].lon, chart.planets[p2n].lon)
      if (!asp) continue
      const col      = ASP_COLORS[asp.aspect] ?? '#505070'
      const orbRatio = Math.max(0, 1 - asp.orb / (ASP_MAX_ORB[asp.aspect] ?? 5))
      svg += drawSpindle(chart.planets[p1n].lon, chart.planets[p2n].lon, asc, R_ASPECT, CX, CY, col, 0.05, 0.6, orbRatio)
    }
  }

  // ── Layers 11-12: Planets (ticks + symbols)
  const allPlanets: Array<{ name: string; lon: number }> = []
  for (const [name, pos] of Object.entries(chart.planets)) {
    if (!PLANET_SYMBOLS[name] || name === 'Asc' || name === 'MC') continue
    allPlanets.push({ name, lon: pos.lon })
  }
  const spread = optimizePlanetPositions(allPlanets, cusps, [R_PLANET_LANE1, R_PLANET_LANE2], asc)

  for (const { name, lon, dispLon, dispR } of spread) {
    const trueA = svgAngle(lon, asc)
    const dispA = svgAngle(dispLon, asc)

    // Ticks (blue) at inner and outer boundaries
    const ti1 = p(R_MID, trueA); const ti2 = p(R_MID - 7, trueA)
    svg += `<line x1="${f(ti1.x)}" y1="${f(ti1.y)}" x2="${f(ti2.x)}" y2="${f(ti2.y)}" stroke="blue" stroke-width="1.5" />`
    const to1 = p(R_ZODIAC_INNER, trueA); const to2 = p(R_ZODIAC_INNER - 7, trueA)
    svg += `<line x1="${f(to1.x)}" y1="${f(to1.y)}" x2="${f(to2.x)}" y2="${f(to2.y)}" stroke="blue" stroke-width="1.5" />`

    // Symbol (black) — custom SVG icon
    const isSmall = SMALL_PLANETS.has(name)
    const sz      = isSmall ? 11 : 13
    const sp      = p(dispR, dispA)
    svg += renderPlanetIcon(name, sp.x, sp.y, sz, 'black')

    // Retrograde marker
    if ((chart.planets[name]?.speed ?? 0) < 0) {
      const rp = p(dispR - 10, dispA)
      svg += `<text x="${f(rp.x)}" y="${f(rp.y)}" text-anchor="middle" dominant-baseline="central"
                 font-size="7" fill="#cc0000" style="user-select:none">℞</text>`
    }
  }

  // ── Center dot
  svg += `<circle cx="${CX}" cy="${CY}" r="1.5" fill="black" />`

  svg += '</svg>'
  return svg
}

// ═══════════════════════════════════════════════════════════════════
// 2. CAP DOI CHART (Synastry + Van Han Dai Han cycle arcs)
// ═══════════════════════════════════════════════════════════════════

export function generateSynastryTransitChartSvg(
  chartA: ChartData,
  chartB: ChartData,
  cycleData: Record<string, OuterPlanetCycle> | null,
  names?: { nameA?: string; nameB?: string },
): string {
  const arcEntries = cycleData ? allocateCycleLanes(cycleData) : []
  const nLanes     = arcEntries.reduce((m, e) => Math.max(m, e.laneIdx + 1), 0)
  const R_OUTER    = cycleData ? Math.max(308, LANE_BASE_R + nLanes * LANE_HEIGHT + LANE_HEIGHT) : R_AXIS_LABEL + 30
  const SIZE       = (R_OUTER + 40) * 2
  const CX = SIZE / 2, CY = SIZE / 2

  const asc    = chartA.angles.Asc
  const cuspsA = chartA.cusps
  const cuspsB = chartB.cusps

  const p = (r: number, rad: number) => pol(r, rad, CX, CY)

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`

  // ── Background rings (R_OUTER fill removed — lộ ảnh nền)
  svg += `<circle cx="${CX}" cy="${CY}" r="${R_SYN_ZOD_OUTER}" fill="#fffff0" />`
  svg += `<circle cx="${CX}" cy="${CY}" r="${R_B_OUT}" fill="#ffffff" />`
  svg += `<circle cx="${CX}" cy="${CY}" r="${R_A_OUT}" fill="#fffff0" />`
  svg += `<circle cx="${CX}" cy="${CY}" r="${R_ASPECT_SYN}" fill="#ffffff" />`

  // ── Border circles — B4: bỏ R_SYN_EL_IN, R_SYN_EL_OUT
  for (const r of [R_ASPECT_SYN, R_A_OUT, R_B_OUT, R_SYN_ZOD_OUTER]) {
    svg += `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="black" stroke-width="0.5" />`
  }
  // R_OUTER border removed — lộ ảnh nền

  // ── Zodiac belt
  svg += drawZodiacBelt(asc, R_B_OUT, R_SYN_ZOD_OUTER, CX, CY)

  // ── House cusps A (blue, R_ASPECT_SYN → R_A_OUT)
  for (let i = 0; i < 12; i++) {
    const a  = svgAngle(cuspsA[i], asc)
    const lw = AXIS_INDICES.includes(i) ? 2.5 : 0.5
    const p1 = p(R_ASPECT_SYN, a); const p2 = p(R_A_OUT, a)
    svg += `<line x1="${f(p1.x)}" y1="${f(p1.y)}" x2="${f(p2.x)}" y2="${f(p2.y)}"
                 stroke="${COLOR_A}" stroke-width="${lw}" />`
    // House number A
    const nr = p(R_ASPECT_SYN + 12, svgAngle(cuspsA[i] + 3, asc))
    svg += `<text x="${f(nr.x)}" y="${f(nr.y)}" text-anchor="middle" dominant-baseline="central"
               font-size="9" font-weight="bold" fill="${COLOR_A}" style="user-select:none">${i + 1}</text>`
  }

  // ── Axis labels A (blue, outside zodiac)
  for (const i of AXIS_INDICES) {
    const a  = svgAngle(cuspsA[i], asc)
    const lp = p(R_AXIS_LABEL, a)
    svg += `<text x="${f(lp.x)}" y="${f(lp.y)}" text-anchor="middle" dominant-baseline="central"
               font-size="8" font-weight="700" fill="${COLOR_A}" font-family="sans-serif"
               style="user-select:none">${AXIS_LABELS[i]}</text>`
  }

  // ── House cusps B (red, R_A_OUT → R_B_OUT)
  for (let i = 0; i < 12; i++) {
    const a  = svgAngle(cuspsB[i], asc)  // rotate by A's ASC
    const lw = AXIS_INDICES.includes(i) ? 2.5 : 0.5
    const p1 = p(R_A_OUT, a); const p2 = p(R_B_OUT, a)
    svg += `<line x1="${f(p1.x)}" y1="${f(p1.y)}" x2="${f(p2.x)}" y2="${f(p2.y)}"
                 stroke="${COLOR_B}" stroke-width="${lw}" />`
    // House number B
    const nr = p(R_B_OUT - 10, svgAngle(cuspsB[i] + 3, asc))
    svg += `<text x="${f(nr.x)}" y="${f(nr.y)}" text-anchor="middle" dominant-baseline="central"
               font-size="9" font-weight="bold" fill="${COLOR_B}" style="user-select:none">${i + 1}</text>`
  }

  // ── Aspect spindles A ↔ B only (cross, not internal)
  for (const pA of ASPECT_PLANETS) {
    for (const pB of ASPECT_PLANETS) {
      const lonA = chartA.planets[pA]?.lon; const lonB = chartB.planets[pB]?.lon
      if (lonA == null || lonB == null) continue
      const asp = checkAspect(lonA, lonB, SYNASTRY_ORBS)
      if (!asp) continue
      const col      = ASP_COLORS[asp.aspect] ?? '#505070'
      const maxOrb   = SYNASTRY_ORBS[asp.aspect] ?? 3
      const orbRatio = Math.max(0, 1 - asp.orb / maxOrb)
      svg += drawSpindle(lonA, lonB, asc, R_ASPECT_SYN, CX, CY, col, 0.05, 0.6, orbRatio)
    }
  }

  // ── Planets A (blue, lanes [128, 109])
  const planetsA: Array<{ name: string; lon: number }> = []
  for (const [nm, pos] of Object.entries(chartA.planets)) {
    if (!PLANET_SYMBOLS[nm] || nm === 'Asc' || nm === 'MC') continue
    planetsA.push({ name: nm, lon: pos.lon })
  }
  const spreadA = optimizePlanetPositions(planetsA, cuspsA, [128, 109], asc)
  for (const { name, lon, dispLon, dispR } of spreadA) {
    const trueA = svgAngle(lon, asc); const dispA = svgAngle(dispLon, asc)
    const t1 = p(R_ASPECT_SYN, trueA); const t2 = p(R_ASPECT_SYN + 6, trueA)
    svg += `<line x1="${f(t1.x)}" y1="${f(t1.y)}" x2="${f(t2.x)}" y2="${f(t2.y)}" stroke="${COLOR_A}" stroke-width="1.5" />`
    const sp  = p(dispR, dispA)
    const szA = SMALL_PLANETS.has(name) ? 10 : 12
    svg += renderPlanetIcon(name, sp.x, sp.y, szA, COLOR_A)
  }

  // ── Planets B (red, lanes [175, 156])
  const planetsB: Array<{ name: string; lon: number }> = []
  for (const [nm, pos] of Object.entries(chartB.planets)) {
    if (!PLANET_SYMBOLS[nm] || nm === 'Asc' || nm === 'MC') continue
    planetsB.push({ name: nm, lon: pos.lon })
  }
  const spreadB = optimizePlanetPositions(planetsB, cuspsB, [175, 156], asc)
  for (const { name, lon, dispLon, dispR } of spreadB) {
    const trueA = svgAngle(lon, asc); const dispA = svgAngle(dispLon, asc)
    const t1 = p(R_B_OUT - 6, trueA); const t2 = p(R_B_OUT, trueA)
    svg += `<line x1="${f(t1.x)}" y1="${f(t1.y)}" x2="${f(t2.x)}" y2="${f(t2.y)}" stroke="${COLOR_B}" stroke-width="1.5" />`
    const sp  = p(dispR, dispA)
    const szB = SMALL_PLANETS.has(name) ? 10 : 12
    svg += renderPlanetIcon(name, sp.x, sp.y, szB, COLOR_B)
  }

  // ── 5 transit symbols (green, from cycleData.A)
  if (cycleData) {
    const transitList = OUTER_PLANETS.filter(n => cycleData[n])
      .map(n => ({ name: n, lon: cycleData[n].A }))
    console.log('[TRANSIT SYN DEBUG]', transitList.map(p => `${p.name}:${p.lon.toFixed(2)}`).join(' '))
    const spreadT = spreadTransit(transitList, asc, R_TRANS_TEXT)
    for (const { name, lon, dispLon } of spreadT) {
      const trueA = svgAngle(lon, asc)
      const t1 = p(R_SYN_ZOD_OUTER, trueA); const t2 = p(R_TRANS_TICK, trueA)
      svg += `<line x1="${f(t1.x)}" y1="${f(t1.y)}" x2="${f(t2.x)}" y2="${f(t2.y)}" stroke="${COLOR_TRANS}" stroke-width="2.0" />`
      const sp = p(R_TRANS_TEXT, svgAngle(dispLon, asc))
      svg += renderPlanetIcon(name, sp.x, sp.y, 14, COLOR_TRANS)
    }
    // ── Cycle arcs
    svg += drawCycleArcs(arcEntries, asc, CX, CY)
  }

  svg += `<circle cx="${CX}" cy="${CY}" r="1.5" fill="black" />`
  svg += '</svg>'
  return svg
}

// ═══════════════════════════════════════════════════════════════════
// 3. VAN HAN CHART (Natal + transit overlay + optional cycle arcs)
// ═══════════════════════════════════════════════════════════════════

export function generateTransitChartSvg(
  natalChart: ChartData,
  transitPlanets: Record<string, { lon: number; speed?: number }>,
  cycleData?: Record<string, OuterPlanetCycle> | null,
  info?: { name?: string; transitDate?: string },
): string {
  const arcEntries = cycleData ? allocateCycleLanes(cycleData) : []
  const nLanes     = arcEntries.reduce((m, e) => Math.max(m, e.laneIdx + 1), 0)
  const R_OUTER    = cycleData ? Math.max(308, LANE_BASE_R + nLanes * LANE_HEIGHT + LANE_HEIGHT) : R_OUTER_NATAL
  const SIZE       = (R_OUTER + 40) * 2
  const CX = SIZE / 2, CY = SIZE / 2

  const asc   = natalChart.angles.Asc
  const cusps = natalChart.cusps

  const p = (r: number, rad: number) => pol(r, rad, CX, CY)

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`

  // ── Background (R_OUTER fill removed — lộ ảnh nền)
  svg += `<circle cx="${CX}" cy="${CY}" r="${R_ZODIAC_OUTER}" fill="#fffff0" />`
  svg += `<circle cx="${CX}" cy="${CY}" r="${R_ZODIAC_INNER}" fill="#ffffff" />`
  svg += `<circle cx="${CX}" cy="${CY}" r="${R_MID}" fill="#fffff0" />`

  svg += `<circle cx="${CX}" cy="${CY}" r="${R_INNER_RING}" fill="none" stroke="gray" stroke-width="1.0" stroke-dasharray="3,3" />`

  // Axis lines
  for (const i of AXIS_INDICES) {
    const a = svgAngle(cusps[i], asc)
    const p1 = p(R_INNER_RING, a); const p2 = p(R_ZODIAC_INNER, a)
    svg += `<line x1="${f(p1.x)}" y1="${f(p1.y)}" x2="${f(p2.x)}" y2="${f(p2.y)}" stroke="black" stroke-width="2.5" />`
  }

  // Zodiac belt
  svg += drawZodiacBelt(asc, R_ZODIAC_INNER, R_ZODIAC_OUTER, CX, CY)

  // Circle borders — bỏ R_OUTER (lộ nền ảnh)
  for (const r of [R_MID, R_ZODIAC_INNER, R_ZODIAC_OUTER]) {
    svg += `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="black" stroke-width="0.5" />`
  }

  // Axis outer tick
  for (const i of AXIS_INDICES) {
    const a = svgAngle(cusps[i], asc)
    const p1 = p(R_ZODIAC_OUTER, a); const p2 = p(R_AXIS_TICK, a)
    svg += `<line x1="${f(p1.x)}" y1="${f(p1.y)}" x2="${f(p2.x)}" y2="${f(p2.y)}" stroke="black" stroke-width="1.5" />`
  }

  // Non-axis house cusps
  for (let i = 0; i < 12; i++) {
    if (AXIS_INDICES.includes(i)) continue
    const a = svgAngle(cusps[i], asc)
    const p1 = p(R_MID, a); const p2 = p(R_ZODIAC_INNER, a)
    svg += `<line x1="${f(p1.x)}" y1="${f(p1.y)}" x2="${f(p2.x)}" y2="${f(p2.y)}" stroke="black" stroke-width="0.5" />`
  }

  // Axis labels
  for (const i of AXIS_INDICES) {
    const a = svgAngle(cusps[i], asc); const lp = p(R_AXIS_LABEL, a)
    svg += `<text x="${f(lp.x)}" y="${f(lp.y)}" text-anchor="middle" dominant-baseline="central"
               font-size="9" font-weight="700" fill="black" font-family="sans-serif"
               style="user-select:none">${AXIS_LABELS[i]}</text>`
  }

  // House numbers
  for (let i = 0; i < 12; i++) {
    const next = cusps[(i + 1) % 12]
    const diff = ((next - cusps[i]) % 360 + 360) % 360
    const np   = p(R_HOUSE_NUM, svgAngle(cusps[i] + diff / 2, asc))
    svg += `<text x="${f(np.x)}" y="${f(np.y)}" text-anchor="middle" dominant-baseline="central"
               font-size="8.5" font-weight="bold" fill="gray" style="user-select:none">${i + 1}</text>`
  }

  // Aspect spindles
  for (let i = 0; i < ASPECT_PLANETS.length; i++) {
    for (let j = i + 1; j < ASPECT_PLANETS.length; j++) {
      const p1n = ASPECT_PLANETS[i], p2n = ASPECT_PLANETS[j]
      if (!natalChart.planets[p1n] || !natalChart.planets[p2n]) continue
      const asp = checkAspect(natalChart.planets[p1n].lon, natalChart.planets[p2n].lon)
      if (!asp) continue
      const col      = ASP_COLORS[asp.aspect] ?? '#505070'
      const orbRatio = Math.max(0, 1 - asp.orb / (ASP_MAX_ORB[asp.aspect] ?? 5))
      svg += drawSpindle(natalChart.planets[p1n].lon, natalChart.planets[p2n].lon, asc, R_ASPECT, CX, CY, col, 0.05, 0.6, orbRatio)
    }
  }

  // Natal planets
  const allPlanets: Array<{ name: string; lon: number }> = []
  for (const [nm, pos] of Object.entries(natalChart.planets)) {
    if (!PLANET_SYMBOLS[nm] || nm === 'Asc' || nm === 'MC') continue
    allPlanets.push({ name: nm, lon: pos.lon })
  }
  const spread = optimizePlanetPositions(allPlanets, cusps, [R_PLANET_LANE1, R_PLANET_LANE2], asc)
  for (const { name, lon, dispLon, dispR } of spread) {
    const trueA = svgAngle(lon, asc); const dispA = svgAngle(dispLon, asc)
    const ti1 = p(R_MID, trueA); const ti2 = p(R_MID - 7, trueA)
    svg += `<line x1="${f(ti1.x)}" y1="${f(ti1.y)}" x2="${f(ti2.x)}" y2="${f(ti2.y)}" stroke="blue" stroke-width="1.5" />`
    const to1 = p(R_ZODIAC_INNER, trueA); const to2 = p(R_ZODIAC_INNER - 7, trueA)
    svg += `<line x1="${f(to1.x)}" y1="${f(to1.y)}" x2="${f(to2.x)}" y2="${f(to2.y)}" stroke="blue" stroke-width="1.5" />`
    const sp  = p(dispR, dispA)
    const szN = SMALL_PLANETS.has(name) ? 11 : 13
    svg += renderPlanetIcon(name, sp.x, sp.y, szN, 'black')
    if ((natalChart.planets[name]?.speed ?? 0) < 0) {
      const rp = p(dispR - 10, dispA)
      svg += `<text x="${f(rp.x)}" y="${f(rp.y)}" text-anchor="middle" dominant-baseline="central"
                 font-size="7" fill="#cc0000" style="user-select:none">℞</text>`
    }
  }

  // ── Transit overlay: 5 outer planets (green)
  let transitList = (Object.entries(transitPlanets) as Array<[string, { lon: number }]>)
    .filter(([, v]) => v)
    .map(([name, v]) => ({ name, lon: v.lon }))
  // Fallback: derive from cycleData.A when no explicit transitPlanets
  if (transitList.length === 0 && cycleData) {
    transitList = OUTER_PLANETS.filter(n => cycleData[n]).map(n => ({ name: n, lon: cycleData[n].A }))
  }
  if (transitList.length > 0) {
    console.log('[TRANSIT VH DEBUG]', transitList.map(p => `${p.name}:${p.lon.toFixed(2)}`).join(' '))
    const spreadT = spreadTransit(transitList, asc, R_TRANS_TEXT)
    for (const { name, lon, dispLon } of spreadT) {
      const trueA = svgAngle(lon, asc)
      const t1 = p(R_ZODIAC_OUTER, trueA); const t2 = p(R_TRANS_TICK, trueA)
      svg += `<line x1="${f(t1.x)}" y1="${f(t1.y)}" x2="${f(t2.x)}" y2="${f(t2.y)}" stroke="${COLOR_TRANS}" stroke-width="2.0" />`
      const sp = p(R_TRANS_TEXT, svgAngle(dispLon, asc))
      svg += renderPlanetIcon(name, sp.x, sp.y, 14, COLOR_TRANS)
    }
  }

  // ── Cycle arcs
  if (cycleData && arcEntries.length > 0) {
    svg += drawCycleArcs(arcEntries, asc, CX, CY)
  }

  svg += `<circle cx="${CX}" cy="${CY}" r="1.5" fill="black" />`
  svg += '</svg>'
  return svg
}
