// eslint-disable-next-line @typescript-eslint/no-require-imports
const swe = require('swisseph')
import path from 'path'
import {
  ZODIAC_NAMES, ZODIAC_CODES, ASPECTS_DEF, PLANET_IDS, RULER_MAP,
  CORE_PLANETS, PLANET_POINTS, ZODIAC_MATRIX
} from './constants'

// Set ephemeris path
const EPHE_PATH = path.join(process.cwd(), 'ephe')
swe.swe_set_ephe_path(EPHE_PATH)

// ─── Types ───────────────────────────────────────────────────────

export interface PlanetPos {
  lon: number
  lat?: number
  speed?: number
}

export interface ChartData {
  jd: number
  cusps: number[]
  angles: { Asc: number; MC: number }
  planets: Record<string, PlanetPos>
  meta: { lat: number; lon: number; tz: string }
  info: {
    local_time: string
    ut_time: string
    lst: string
    lat_lon: string
    house_sys: string
  }
}

export interface AspectResult {
  aspect: string
  name_vn: string
  orb: number
  orb_round: number
  type: 'Hard' | 'Soft' | 'Minor'
  symbol: string
}

// ─── Utils ───────────────────────────────────────────────────────

export function getZodiac(lon: number): [number, string, string, number] {
  lon = ((lon % 360) + 360) % 360
  const idx = Math.floor(lon / 30)
  const degInSign = lon % 30
  return [idx, ZODIAC_NAMES[idx], ZODIAC_CODES[idx], degInSign]
}

export function getHouseOfPlanet(planetLon: number, cusps: number[]): number {
  const pLon = ((planetLon % 360) + 360) % 360
  const realCusps = cusps.length === 13 ? cusps.slice(1) : [...cusps]
  for (let i = 0; i < 12; i++) {
    const cCurr = realCusps[i]
    const cNext = realCusps[(i + 1) % 12]
    const distP = ((pLon - cCurr) % 360 + 360) % 360
    const sizeH = ((cNext - cCurr) % 360 + 360) % 360
    if (distP < sizeH) return i + 1
  }
  return 1
}

function roundOrb(orbVal: number): number {
  return Math.round(orbVal)
}

export function checkAspect(p1Lon: number, p2Lon: number, customOrbs?: Record<string, number>): AspectResult | null {
  let diff = Math.abs(p1Lon - p2Lon)
  if (diff > 180) diff = 360 - diff

  for (const [aspName, aspData] of Object.entries(ASPECTS_DEF)) {
    let limit = aspData.orb
    if (customOrbs && aspName in customOrbs) limit = customOrbs[aspName]
    if (Math.abs(diff - aspData.angle) <= limit) {
      const rawOrb = Math.abs(diff - aspData.angle)
      if (rawOrb >= 10.0) return null
      return {
        aspect: aspName,
        name_vn: aspData.name_vn,
        orb: rawOrb,
        orb_round: roundOrb(rawOrb),
        type: aspData.type,
        symbol: aspData.symbol,
      }
    }
  }
  return null
}

// ─── Vietnam Historical Timezone ─────────────────────────────────

export function isCoordInVietnam(lat: number, lon: number): boolean {
  return lat >= 8.0 && lat <= 24.0 && lon >= 102.0 && lon <= 110.0
}

export function getVietnamHistoricalOffset(year: number, month: number, day: number, lat: number, lon: number): number {
  const ymd = year * 10000 + month * 100 + day
  if (ymd < 19060701) return lon / 15.0
  if (ymd >= 19060701 && ymd <= 19110430) return 7.1083
  if (ymd >= 19110501 && ymd <= 19421231) return 7.0
  if (ymd >= 19430101 && ymd <= 19450313) return 8.0
  if (ymd >= 19450314 && ymd <= 19450901) return 9.0
  if (ymd >= 19450902 && ymd < 19750613) return lat >= 17.0 ? 7.0 : 8.0
  return 7.0
}

function toDms(deg: number, isLat: boolean): string {
  const direction = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W')
  const adeg = Math.abs(deg)
  const d = Math.floor(adeg)
  const m = Math.floor((adeg - d) * 60)
  return `${d}°${m}'${direction}`
}

// ─── Chart Calculation ───────────────────────────────────────────

export function calculateChart(
  dobStr: string, tobStr: string,
  lat: number, lon: number,
  tzStr?: string, manualOffset?: number | null
): ChartData | null {
  try {
    // Parse date: DD/MM/YYYY HH:MM
    const parts = dobStr.split('/')
    const timeParts = tobStr.split(':')
    const day = parseInt(parts[0])
    const month = parseInt(parts[1])
    const year = parseInt(parts[2])
    const hour = parseInt(timeParts[0])
    const minute = parseInt(timeParts[1])

    let finalOffset: number

    if (manualOffset != null && String(manualOffset).trim() !== '') {
      finalOffset = typeof manualOffset === 'number' ? manualOffset : parseFloat(String(manualOffset))
      if (isNaN(finalOffset)) {
        finalOffset = getVietnamHistoricalOffset(year, month, day, lat, lon)
      }
    } else if (isCoordInVietnam(lat, lon)) {
      finalOffset = getVietnamHistoricalOffset(year, month, day, lat, lon)
    } else {
      // For non-Vietnam, default to provided tz or UTC
      // Simple approach: use tz string to determine offset
      // In production, use a proper timezone library
      finalOffset = tzStr === 'Asia/Ho_Chi_Minh' ? 7.0 : 0.0
    }

    // Convert to UTC
    const totalHours = hour + minute / 60.0 - finalOffset
    const utcDay = day + Math.floor(totalHours / 24)
    const utcHour = ((totalHours % 24) + 24) % 24

    // Julian day
    const jd = swe.swe_julday(year, month, utcDay, utcHour, swe.SE_GREG_CAL)

    // Sidereal time
    const gstResult = swe.swe_sidtime(jd)
    const gst = typeof gstResult === 'object' ? gstResult.siderialTime : gstResult
    const lstHours = (((gst * 15 + lon) % 360) + 360) % 360 / 15.0
    const hLst = Math.floor(lstHours)
    const mLst = Math.floor((lstHours - hLst) * 60)
    const lstStr = `${String(hLst).padStart(2, '0')}:${String(mLst).padStart(2, '0')}`

    const utcDateStr = `${String(utcDay).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
    const utcTimeStr = `${String(Math.floor(utcHour)).padStart(2, '0')}:${String(Math.floor((utcHour % 1) * 60)).padStart(2, '0')}`

    const technicalInfo = {
      local_time: `${dobStr} ${tobStr} (GMT${finalOffset >= 0 ? '+' : ''}${finalOffset})`,
      ut_time: `${utcDateStr} ${utcTimeStr}`,
      lst: lstStr,
      lat_lon: `${toDms(lat, true)}, ${toDms(lon, false)}`,
      house_sys: 'Placidus system',
    }

    // Houses - swisseph node uses string 'P' for Placidus
    const houseResult = swe.swe_houses(jd, lat, lon, 'P')
    const cusps: number[] = []
    for (let i = 0; i < 12; i++) {
      cusps.push(houseResult.house[i])
    }

    // Planets
    const planets: Record<string, PlanetPos> = {}
    for (const [pName, pId] of Object.entries(PLANET_IDS)) {
      const res = swe.swe_calc_ut(jd, pId, swe.SEFLG_SWIEPH | swe.SEFLG_SPEED)
      planets[pName] = {
        lon: res.longitude,
        lat: res.latitude,
        speed: res.longitudeSpeed,
      }
    }

    // Add angles
    const ascLon = houseResult.ascendant ?? cusps[0]
    const mcLon = houseResult.mc ?? cusps[9]
    const vertexLon = houseResult.vertex ?? 0

    planets.Vertex = { lon: vertexLon }
    planets.Asc = { lon: ascLon }
    planets.MC = { lon: mcLon }

    return {
      jd,
      cusps,
      angles: { Asc: ascLon, MC: mcLon },
      planets,
      meta: { lat, lon, tz: tzStr || '' },
      info: technicalInfo,
    }
  } catch (e) {
    console.error('[CORE ERROR] calculateChart failed:', e)
    return null
  }
}

// ─── Helper Functions ────────────────────────────────────────────

export function isInHouseZone(lon: number, cuspStart: number, cuspEnd: number): boolean {
  lon = ((lon % 360) + 360) % 360
  if (cuspStart < cuspEnd) return lon >= cuspStart && lon < cuspEnd
  return lon >= cuspStart || lon < cuspEnd
}

export function getNatalPlanetNearCusp(chart: ChartData, houseNum: number): string | null {
  const cusps = chart.cusps.length === 13 ? chart.cusps.slice(1) : chart.cusps
  const cStart = cusps[houseNum - 1]
  const cEnd = cusps[houseNum % 12]
  let bestP: string | null = null
  let minDist = 999.0
  for (const [pName, info] of Object.entries(chart.planets)) {
    if (!CORE_PLANETS.includes(pName)) continue
    if (isInHouseZone(info.lon, cStart, cEnd)) {
      const dist = ((info.lon - cStart) % 360 + 360) % 360
      if (dist < minDist) {
        minDist = dist
        bestP = pName
      }
    }
  }
  return bestP
}

export function getHouseRulerPlanet(chart: ChartData, houseNum: number): string | undefined {
  const cusps = chart.cusps.length === 13 ? chart.cusps.slice(1) : chart.cusps
  const cLon = cusps[houseNum - 1]
  const [, zName] = getZodiac(cLon)
  return RULER_MAP[zName]
}

export function getElevatedPlanets(chartData: ChartData): string[] {
  const acLon = chartData.angles.Asc
  const planetHeights: { name: string; height: number }[] = []

  for (const pName of CORE_PLANETS) {
    if (pName in chartData.planets) {
      const lon = chartData.planets[pName].lon
      const wheelAngleDeg = ((180 + (lon - acLon)) % 360 + 360) % 360
      const height = Math.sin(wheelAngleDeg * Math.PI / 180)
      planetHeights.push({ name: pName, height })
    }
  }
  if (!planetHeights.length) return []
  planetHeights.sort((a, b) => b.height - a.height)
  const maxH = planetHeights[0].height
  return planetHeights.filter(p => Math.abs(p.height - maxH) < 1e-10).map(p => p.name)
}

export function analyzeHouseInteractions(
  chartData: ChartData, sourcePlanets: string[],
  sourceHouseNum: number, isRuler = false
): { target_house: number; type: string; label: string }[] {
  const results: Record<number, { soft: number; hard: number }> = {}
  const cusps = chartData.cusps
  const allPlanets = chartData.planets
  const prefix = isRuler ? `Chủ tinh Nhà ${sourceHouseNum}` : `Nhà ${sourceHouseNum}`
  if (!sourcePlanets.length) return []

  for (const pSrc of sourcePlanets) {
    if (!(pSrc in allPlanets)) continue
    const srcLon = allPlanets[pSrc].lon
    const srcHouse = getHouseOfPlanet(srcLon, cusps)
    for (const pTarget of CORE_PLANETS) {
      if (pSrc === pTarget || !(pTarget in allPlanets)) continue
      const targetLon = allPlanets[pTarget].lon
      const targetHouse = getHouseOfPlanet(targetLon, cusps)
      if (srcHouse === targetHouse) continue
      const asp = checkAspect(srcLon, targetLon)
      if (!asp) continue
      if (!results[targetHouse]) results[targetHouse] = { soft: 0, hard: 0 }
      if (['Conjunction', 'Sextile', 'Trine'].includes(asp.aspect)) results[targetHouse].soft++
      else if (['Square', 'Opposition'].includes(asp.aspect)) results[targetHouse].hard++
    }
  }

  const final: { target_house: number; type: string; label: string }[] = []
  for (const hNum of Object.keys(results).map(Number).sort((a, b) => a - b)) {
    const { soft: s, hard: h } = results[hNum]
    if (s === h) continue
    const interactionType = s > h ? 'Mềm' : 'Cứng'
    final.push({ target_house: hNum, type: interactionType, label: `${prefix} ${interactionType} Nhà ${hNum}` })
  }
  return final
}

// ─── Dominant Calculations ───────────────────────────────────────

export function getDominantPlanetsLogic(chartData: ChartData): { name: string; count: number }[] {
  const counts: Record<string, number> = {}
  const pPos = chartData.planets

  for (let i = 0; i < CORE_PLANETS.length; i++) {
    for (let j = i + 1; j < CORE_PLANETS.length; j++) {
      const p1 = CORE_PLANETS[i]
      const p2 = CORE_PLANETS[j]
      if (!(p1 in pPos) || !(p2 in pPos)) continue
      const asp = checkAspect(pPos[p1].lon, pPos[p2].lon)
      if (asp && asp.type !== 'Minor') {
        counts[p1] = (counts[p1] || 0) + 1
        counts[p2] = (counts[p2] || 0) + 1
      }
    }
  }

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

export function getDominantHousesSorted(chartData: ChartData): { house: number; score: number }[] {
  const scores: Record<number, number> = {}
  const cusps = chartData.cusps

  for (const [pName, pts] of Object.entries(PLANET_POINTS)) {
    if (pName === 'Asc') continue
    if (!(pName in chartData.planets)) continue
    const lon = chartData.planets[pName].lon
    const h = getHouseOfPlanet(lon, cusps)
    scores[h] = (scores[h] || 0) + pts
  }

  return Object.entries(scores)
    .map(([h, score]) => ({ house: parseInt(h), score }))
    .filter(({ score }) => score >= 4)
    .sort((a, b) => b.score - a.score)
}

// ─── Element/Modality Matrix ─────────────────────────────────────

export function calculateElementMatrix(chartData: ChartData): {
  elDom: string | null; elWeaks: string[]; modDom: string | null; modWeaks: string[]
  elScores: number[]; modScores: number[]
} {
  const scoresMatrix = Array.from({ length: 4 }, () => [0, 0, 0])
  const pPos = chartData.planets

  for (const [obj, pts] of Object.entries(PLANET_POINTS)) {
    if (obj in pPos) {
      const zIdx = Math.floor(pPos[obj].lon / 30) % 12
      const [r, c] = ZODIAC_MATRIX[zIdx]
      scoresMatrix[r][c] += pts
    }
  }

  const elLabels = ['Lửa', 'Đất', 'Khí', 'Nước']
  const modLabels = ['Tiên phong', 'Kiên định', 'Linh hoạt']

  const elScores = scoresMatrix.map(row => row.reduce((a, b) => a + b, 0))
  const modScores = [0, 1, 2].map(c => scoresMatrix.reduce((sum, row) => sum + row[c], 0))

  function getDt(scores: number[], labels: string[]): [string | null, string[]] {
    const sorted = scores.map((v, i) => ({ i, v })).sort((a, b) => b.v - a.v)
    const dom = sorted.length > 1 && sorted[0].v - sorted[1].v >= 3 ? labels[sorted[0].i] : null
    const weaks = scores.map((v, i) => v <= 2 ? labels[i] : null).filter(Boolean) as string[]
    return [dom, weaks]
  }

  const [elDom, elWeaks] = getDt(elScores, elLabels)
  const [modDom, modWeaks] = getDt(modScores, modLabels)

  return { elDom, elWeaks, modDom, modWeaks, elScores, modScores }
}
