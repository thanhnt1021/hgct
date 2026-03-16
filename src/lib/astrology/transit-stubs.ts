// eslint-disable-next-line @typescript-eslint/no-require-imports
const swe = require('swisseph')
import path from 'path'
import { PLANET_IDS, ASPECTS_DEF, OUTER_PLANETS } from './constants'
import type { ChartData } from './calculations'

// Set ephemeris path (safe to call multiple times)
const EPHE_PATH = path.join(process.cwd(), 'ephe')
swe.swe_set_ephe_path(EPHE_PATH)

// ─── Interfaces ───────────────────────────────────────────────────

export interface HouseTransitPeriod {
  planet: string
  house: number
  startDate: string
  endDate: string
  retrograde: boolean
}

export interface ExactAspectHit {
  transitPlanet: string
  natalPlanet: string
  aspect: string
  exactDate: string
  transitLon: number
  natalLon: number
}

export interface AspectPeriod {
  transitPlanet: string
  natalPlanet: string
  aspect: string
  startDate: string
  endDate: string
  exactHits: ExactAspectHit[]
}

export interface OuterPlanetCycleEntry {
  startDate: string
  endDate: string
  house: number
  retrograde?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Signed difference between two angles, result in [-180, 180].
 */
function difdeg2n(a: number, b: number): number {
  let d = a - b
  while (d > 180) d -= 360
  while (d < -180) d += 360
  return d
}

/**
 * Get planet longitude at given Julian day.
 * Handles South Node (True Node + 180°) and Vertex (from houses).
 */
function getPlanetLon(jd: number, planetName: string, lat: number, lon: number): number {
  if (planetName === 'South Node') {
    const res = swe.swe_calc_ut(jd, swe.SE_TRUE_NODE, swe.SEFLG_SWIEPH)
    return ((res.longitude + 180) % 360 + 360) % 360
  }
  if (planetName === 'Vertex') {
    const houseRes = swe.swe_houses(jd, lat, lon, 'P')
    return houseRes.vertex ?? 0
  }
  if (planetName in PLANET_IDS) {
    const res = swe.swe_calc_ut(jd, PLANET_IDS[planetName], swe.SEFLG_SWIEPH)
    return res.longitude
  }
  return 0.0
}

/**
 * Determine which house (1-12) a longitude falls in given 0-indexed cusps array.
 */
function getHouseOfLon(lon: number, cusps: number[]): number {
  const pLon = ((lon % 360) + 360) % 360
  // cusps is 0-indexed: cusps[0] = cusp of house 1
  for (let i = 0; i < 12; i++) {
    const cCurr = cusps[i]
    const cNext = cusps[(i + 1) % 12]
    const distP = ((pLon - cCurr) % 360 + 360) % 360
    const sizeH = ((cNext - cCurr) % 360 + 360) % 360
    if (distP < sizeH) return i + 1
  }
  return 1
}

/**
 * Format a Julian day value as YYYY-MM-DD string.
 */
function jdToDateStr(jd: number): string {
  const r = swe.swe_revjul(jd, swe.SE_GREG_CAL)
  const y = r.year
  const m = String(r.month).padStart(2, '0')
  const d = String(Math.floor(r.day)).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Parse an ISO date string YYYY-MM-DD to a Julian day number (at noon).
 */
function dateStrToJd(dateStr: string, hour = 12.0): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return swe.swe_julday(y, m, d, hour, swe.SE_GREG_CAL)
}

// ─── scanHouseTransitsInRange ─────────────────────────────────────

/**
 * Scan when a transit planet passes through each natal house within a date range.
 * Steps day-by-day (at noon), tracks house changes and whether planet is retrograde.
 * Returns an array of periods, potentially split by retrograde motion.
 */
export function scanHouseTransitsInRange(
  planet: string,
  natalChart: ChartData,
  startDate: string,
  endDate: string,
): HouseTransitPeriod[] {
  const intervals: HouseTransitPeriod[] = []

  const lat = natalChart.meta.lat
  const lon = natalChart.meta.lon
  // cusps is 0-indexed array of 12 elements
  const cusps = natalChart.cusps.length === 13 ? natalChart.cusps.slice(1) : [...natalChart.cusps]

  const jdStart = dateStrToJd(startDate, 12.0)
  const jdEnd = dateStrToJd(endDate, 12.0)

  let currentHouse = -1
  let currentStart = jdStart
  let currentRetrograde = false

  for (let jd = jdStart; jd <= jdEnd + 0.5; jd += 1.0) {
    const actualJd = Math.min(jd, jdEnd)
    const planetLon = getPlanetLon(actualJd, planet, lat, lon)
    const house = getHouseOfLon(planetLon, cusps)

    // Determine retrograde: check longitudeSpeed if available
    let isRetrograde = false
    if (planet !== 'South Node' && planet !== 'Vertex' && planet in PLANET_IDS) {
      const res = swe.swe_calc_ut(actualJd, PLANET_IDS[planet], swe.SEFLG_SWIEPH | swe.SEFLG_SPEED)
      isRetrograde = (res.longitudeSpeed ?? 0) < 0
    }

    if (currentHouse === -1) {
      // First day
      currentHouse = house
      currentStart = actualJd
      currentRetrograde = isRetrograde
    } else if (house !== currentHouse || isRetrograde !== currentRetrograde) {
      // House changed or retrograde status changed — close the current period
      intervals.push({
        planet,
        house: currentHouse,
        startDate: jdToDateStr(currentStart),
        endDate: jdToDateStr(actualJd - 1),
        retrograde: currentRetrograde,
      })
      currentHouse = house
      currentStart = actualJd
      currentRetrograde = isRetrograde
    }

    if (actualJd >= jdEnd) break
  }

  // Close the final period
  if (currentHouse !== -1) {
    intervals.push({
      planet,
      house: currentHouse,
      startDate: jdToDateStr(currentStart),
      endDate: endDate,
      retrograde: currentRetrograde,
    })
  }

  return intervals
}

// ─── findExactAspectTimes ─────────────────────────────────────────

/**
 * Find exact dates when a transit planet forms aspects to a natal planet longitude.
 * Scans using adaptive step sizes, then bisects to find the exact zero-crossing.
 */
export function findExactAspectTimes(
  transitPlanet: string,
  natalPlanet: string,
  natalLon: number,
  startDate: string,
  endDate: string,
  aspects?: string[],
): ExactAspectHit[] {
  const results: ExactAspectHit[] = []

  // Step size depends on planet speed
  let step: number
  if (['Moon', 'Vertex'].includes(transitPlanet)) step = 0.02
  else if (['Sun', 'Mercury', 'Venus', 'Mars'].includes(transitPlanet)) step = 0.1
  else step = 1.0

  const jdStart = dateStrToJd(startDate, 0.0)
  const jdEnd = dateStrToJd(endDate, 0.0)

  // Which aspects to check
  const aspectsToCheck = aspects ?? Object.keys(ASPECTS_DEF)

  // For each aspect, scan for zero-crossings using target-point approach.
  // Instead of |difdeg2n| - angle (fails for Conjunction/Opposition where the
  // value touches 0 but never crosses), compute difdeg2n(transitLon, targetPoint)
  // which naturally crosses zero when the transit planet reaches the target.
  for (const aspectName of aspectsToCheck) {
    if (!(aspectName in ASPECTS_DEF)) continue
    const targetAngle = ASPECTS_DEF[aspectName].angle

    // Target longitudes where the aspect is exact:
    // Conjunction(0°)/Opposition(180°) → single target point
    // Others → two target points (natalLon ± angle)
    const targetPoints: number[] = [((natalLon + targetAngle) % 360 + 360) % 360]
    if (targetAngle !== 0 && targetAngle !== 180) {
      targetPoints.push(((natalLon - targetAngle) % 360 + 360) % 360)
    }

    for (const tp of targetPoints) {
      const getSignedOrb = (jd: number): number => {
        const lon = getPlanetLon(jd, transitPlanet, 0, 0)
        return difdeg2n(lon, tp)
      }

      let prevOrb = getSignedOrb(jdStart)
      let jd = jdStart + step

      while (jd <= jdEnd) {
        const currOrb = getSignedOrb(jd)

        // Zero crossing (exact aspect crossing)
        if (prevOrb * currOrb <= 0 && Math.abs(prevOrb) < 10 && Math.abs(currOrb) < 10) {
          // Bisect to find exact crossing
          let lo = jd - step
          let hi = jd
          for (let iter = 0; iter < 30; iter++) {
            const mid = (lo + hi) / 2
            if (getSignedOrb(lo) * getSignedOrb(mid) <= 0) hi = mid
            else lo = mid
          }
          const exactJd = (lo + hi) / 2
          const exactLon = getPlanetLon(exactJd, transitPlanet, 0, 0)

          results.push({
            transitPlanet,
            natalPlanet,
            aspect: aspectName,
            exactDate: jdToDateStr(exactJd),
            transitLon: exactLon,
            natalLon,
          })
        }

        prevOrb = currOrb
        jd += step
      }
    }
  }

  // Sort by date
  results.sort((a, b) => a.exactDate.localeCompare(b.exactDate))

  return results
}

// ─── findAspectPeriods ───────────────────────────────────────────

/**
 * Find aspect periods (matching mo's find_exact_aspect_times approach).
 * A period = continuous interval where orb < ORB_THRESHOLD degrees.
 * Each period contains zero or more exact hits.
 * This matches mo's two-layer detection: period boundaries + exact hits.
 */
const PERIOD_ORB_THRESHOLD = 3.0

function getOrbStrict(
  jd: number,
  transitPlanet: string,
  natalLon: number,
  targetAngle: number,
): number {
  const pos = getPlanetLon(jd, transitPlanet, 0, 0)
  const dist = Math.abs(difdeg2n(pos, natalLon))
  return Math.abs(dist - targetAngle)
}

function findBoundaryStrict(
  jdStart: number,
  jdEnd: number,
  transitPlanet: string,
  natalLon: number,
  targetAngle: number,
): number {
  let lo = jdStart
  let hi = jdEnd
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    const midOrb = getOrbStrict(mid, transitPlanet, natalLon, targetAngle)
    const loOrb = getOrbStrict(lo, transitPlanet, natalLon, targetAngle)
    if (midOrb < PERIOD_ORB_THRESHOLD) {
      if (loOrb >= PERIOD_ORB_THRESHOLD) hi = mid
      else lo = mid
    } else {
      if (loOrb < PERIOD_ORB_THRESHOLD) hi = mid
      else lo = mid
    }
  }
  return (lo + hi) / 2
}

function findHitsInPeriod(
  jdStart: number,
  jdEnd: number,
  transitPlanet: string,
  natalLon: number,
  targetAngle: number,
): number[] {
  const hits: number[] = []

  // Target points for zero-crossing detection
  const t1 = ((natalLon + targetAngle) % 360 + 360) % 360
  const t2 = ((natalLon - targetAngle) % 360 + 360) % 360

  // Pick the closer target point
  const posStart = getPlanetLon(jdStart, transitPlanet, 0, 0)
  const activeTarget =
    Math.abs(difdeg2n(posStart, t1)) < Math.abs(difdeg2n(posStart, t2)) ? t1 : t2

  const steps = 200
  const stepSize = (jdEnd - jdStart) / steps

  for (let i = 0; i < steps; i++) {
    const t1jd = jdStart + i * stepSize
    const t2jd = jdStart + (i + 1) * stepSize
    const r1 = difdeg2n(getPlanetLon(t1jd, transitPlanet, 0, 0), activeTarget)
    const r2 = difdeg2n(getPlanetLon(t2jd, transitPlanet, 0, 0), activeTarget)

    if (r1 * r2 <= 0) {
      // Bisect
      let lo = t1jd
      let hi = t2jd
      for (let iter = 0; iter < 30; iter++) {
        const mid = (lo + hi) / 2
        const rm = difdeg2n(getPlanetLon(mid, transitPlanet, 0, 0), activeTarget)
        if (r1 * rm <= 0) hi = mid
        else lo = mid
      }
      hits.push((lo + hi) / 2)
    }
  }

  return hits
}

export function findAspectPeriods(
  transitPlanet: string,
  natalPlanet: string,
  natalLon: number,
  startDate: string,
  endDate: string,
  aspects?: string[],
): AspectPeriod[] {
  const results: AspectPeriod[] = []

  // Step size depends on planet speed
  let step: number
  if (['Moon', 'Vertex'].includes(transitPlanet)) step = 0.02
  else if (['Sun', 'Mercury', 'Venus', 'Mars'].includes(transitPlanet)) step = 0.1
  else step = 1.0

  const jdStart = dateStrToJd(startDate, 0.0)
  const jdEnd = dateStrToJd(endDate, 0.0) + 20.0 // Extra margin like mo

  const aspectsToCheck = aspects ?? Object.keys(ASPECTS_DEF)

  for (const aspectName of aspectsToCheck) {
    if (!(aspectName in ASPECTS_DEF)) continue
    const targetAngle = ASPECTS_DEF[aspectName].angle

    let jd = jdStart

    while (jd < jdEnd && results.length < 50) {
      if (getOrbStrict(jd, transitPlanet, natalLon, targetAngle) < PERIOD_ORB_THRESHOLD) {
        // Found a period — walk back to find start
        let jdBack = jd
        while (getOrbStrict(jdBack, transitPlanet, natalLon, targetAngle) < PERIOD_ORB_THRESHOLD) {
          jdBack -= step
        }
        const periodStartJd = findBoundaryStrict(jdBack, jdBack + step, transitPlanet, natalLon, targetAngle)

        // Walk forward to find end
        let jdFwd = jd
        while (jdFwd < jdEnd && getOrbStrict(jdFwd, transitPlanet, natalLon, targetAngle) < PERIOD_ORB_THRESHOLD) {
          jdFwd += step
        }
        const periodEndJd = findBoundaryStrict(jdFwd - step, jdFwd, transitPlanet, natalLon, targetAngle)

        // Find exact hits within the period
        const hitJds = findHitsInPeriod(periodStartJd, periodEndJd, transitPlanet, natalLon, targetAngle)
        const exactHits: ExactAspectHit[] = hitJds.map((hJd) => ({
          transitPlanet,
          natalPlanet,
          aspect: aspectName,
          exactDate: jdToDateStr(hJd),
          transitLon: getPlanetLon(hJd, transitPlanet, 0, 0),
          natalLon,
        }))

        results.push({
          transitPlanet,
          natalPlanet,
          aspect: aspectName,
          startDate: jdToDateStr(periodStartJd),
          endDate: jdToDateStr(periodEndJd),
          exactHits,
        })

        // Skip past this period
        jd = periodEndJd + step / 2
      } else {
        jd += step
      }
    }
  }

  // Sort by start date
  results.sort((a, b) => a.startDate.localeCompare(b.startDate))

  return results
}

// ─── getOuterPlanetCycleData ──────────────────────────────────────

/**
 * Get the full cycle data for outer planets transiting through natal houses.
 * Calls scanHouseTransitsInRange for each outer planet, then merges consecutive
 * periods in the same house (retrograde-split periods).
 */
export function getOuterPlanetCycleData(
  planet: string,
  natalChart: ChartData,
  startDate: string,
  endDate: string,
): OuterPlanetCycleEntry[] {
  // Validate the planet is actually an outer planet
  if (!OUTER_PLANETS.includes(planet)) {
    return []
  }

  // Get all raw periods for this planet
  const rawPeriods = scanHouseTransitsInRange(planet, natalChart, startDate, endDate)

  if (rawPeriods.length === 0) return []

  // Merge consecutive periods in the same house (retrograde splits)
  const merged: OuterPlanetCycleEntry[] = []
  let current: OuterPlanetCycleEntry = {
    startDate: rawPeriods[0].startDate,
    endDate: rawPeriods[0].endDate,
    house: rawPeriods[0].house,
    retrograde: rawPeriods[0].retrograde,
  }

  for (let i = 1; i < rawPeriods.length; i++) {
    const period = rawPeriods[i]
    if (period.house === current.house) {
      // Same house — extend the current merged period
      current.endDate = period.endDate
      // Mark as having retrograde if any sub-period was retrograde
      if (period.retrograde) current.retrograde = true
    } else {
      // Different house — push current and start new
      merged.push(current)
      current = {
        startDate: period.startDate,
        endDate: period.endDate,
        house: period.house,
        retrograde: period.retrograde,
      }
    }
  }
  merged.push(current)

  return merged
}
