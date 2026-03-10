// Love manager (ported from love/manager.py)
import {
  getZodiac, getHouseOfPlanet, checkAspect,
  analyzeHouseInteractions, getDominantHousesSorted,
  getHouseRulerPlanet,
} from '@/lib/astrology/calculations'
import type { ChartData } from '@/lib/astrology/calculations'
import { CORE_PLANETS, RULER_MAP, PLANET_NAMES_VN } from '@/lib/astrology/constants'
import { normalizeStr, findColIndex, getRowValue, formatText, lookupMatrix } from '@/lib/astrology/base'

export type { ChartData }

export interface LoveCommonData {
  domHouses: [number, number][]
  h7Planets: string[]
  h7Interactions: Record<string, unknown>[]
  isH7Empty: boolean
}

function calculateCommon(chartData: ChartData): LoveCommonData {
  const domHouses = getDominantHousesSorted(chartData).map(d => [d.house, d.score] as [number, number])
  const cusps = chartData.cusps
  const pPos = chartData.planets

  // House 7 planets
  const h7Planets = CORE_PLANETS.filter(p => p in pPos && getHouseOfPlanet(pPos[p].lon, cusps) === 7)

  let h7Interactions: Record<string, unknown>[]
  let isH7Empty: boolean

  if (h7Planets.length > 0) {
    h7Interactions = analyzeHouseInteractions(chartData, h7Planets, 7, false)
    isH7Empty = false
  } else {
    // Use ruler of H7 cusp
    const h7Lon = cusps.length === 13 ? cusps[7] : cusps[6]
    const [, h7Z] = getZodiac(h7Lon)
    const ruler = RULER_MAP[h7Z]
    h7Interactions = analyzeHouseInteractions(chartData, ruler ? [ruler] : [], 7, true)
    isH7Empty = true
  }

  return { domHouses, h7Planets, h7Interactions, isH7Empty }
}

// ─── Knowledge parsing for Block 1 (Tổng Quan) ─────────────────

function parseKbTongQuan(kbData: unknown[][]) {
  const mapCung: Record<string, Record<string, string>> = {}
  const mapNhaTroi: Record<string, string> = {}
  const mapVenus: Record<string, string> = {}
  const mapMoon: Record<string, string> = {}

  if (!kbData || kbData.length < 1) return { mapCung, mapNhaTroi, mapVenus, mapMoon }

  const headers = kbData[0] as string[]
  const rows = kbData.slice(1) as string[][]

  const idxCung = findColIndex(headers, 'Cung')
  const idxCho = findColIndex(headers, 'Cho')
  const idxYeu = findColIndex(headers, 'Yêu')
  const idxNha = findColIndex(headers, 'Nhà')
  const idxNhaTroi = findColIndex(headers, 'Nhà trội')
  const idxVenus = findColIndex(headers, 'Venus')
  const idxGu = findColIndex(headers, 'Gu')
  const idxMoon = findColIndex(headers, 'Moon')
  const idxAnToan = findColIndex(headers, 'An toàn')

  for (const r of rows) {
    const vCung = getRowValue(r, idxCung)
    if (vCung) {
      mapCung[normalizeStr(vCung)] = {
        cho: getRowValue(r, idxCho),
        yeu: getRowValue(r, idxYeu),
      }
    }
    const vNha = getRowValue(r, idxNha)
    if (vNha) {
      mapNhaTroi[normalizeStr(vNha)] = getRowValue(r, idxNhaTroi)
    }
    const vVenus = getRowValue(r, idxVenus)
    if (vVenus) {
      mapVenus[normalizeStr(vVenus)] = getRowValue(r, idxGu)
    }
    const vMoon = getRowValue(r, idxMoon)
    if (vMoon) {
      mapMoon[normalizeStr(vMoon)] = getRowValue(r, idxAnToan)
    }
  }

  return { mapCung, mapNhaTroi, mapVenus, mapMoon }
}

// ─── Knowledge parsing for Block 2 (Chi Tiết H7) ───────────────

function parseKbH7(kbData: unknown[][]) {
  const mapCung: Record<string, Record<string, string>> = {}
  const mapPlanet: Record<string, string> = {}
  const mapRuler: Record<string, string> = {}

  if (!kbData || kbData.length < 1) return { mapCung, mapPlanet, mapRuler }

  const headers = kbData[0] as string[]
  const rows = kbData.slice(1) as string[][]

  const idxCung = findColIndex(headers, 'Cung')
  const idxEnergy = findColIndex(headers, 'Năng lượng')
  const idxPlanet = findColIndex(headers, 'Hành tinh')
  const idxRole = findColIndex(headers, 'Vai trò')
  const idxRuler = findColIndex(headers, 'Chủ tinh')
  const idxLocation = findColIndex(headers, 'Vị trí')

  for (const r of rows) {
    const vCung = getRowValue(r, idxCung)
    if (vCung) {
      mapCung[normalizeStr(vCung)] = {
        energy: getRowValue(r, idxEnergy),
      }
    }
    const vPlanet = getRowValue(r, idxPlanet)
    if (vPlanet) {
      mapPlanet[normalizeStr(vPlanet)] = getRowValue(r, idxRole)
    }
    const vRuler = getRowValue(r, idxRuler)
    if (vRuler) {
      mapRuler[normalizeStr(vRuler)] = getRowValue(r, idxLocation)
    }
  }

  return { mapCung, mapPlanet, mapRuler }
}

// ─── Block 1: Overview (Tổng Quan) ─────────────────────────────

function blockOverview(chartData: ChartData, kbData: unknown[][], common: LoveCommonData) {
  const { mapCung, mapNhaTroi, mapVenus, mapMoon } = parseKbTongQuan(kbData)
  const pPos = chartData.planets

  // Core: Asc/Sun/Moon zodiac + cho/yeu
  const coreData = []
  for (const obj of ['Asc', 'Sun', 'Moon']) {
    const lon = pPos[obj].lon
    const [, zName] = getZodiac(lon)
    const d = mapCung[normalizeStr(zName)] || { cho: '', yeu: '' }
    const pVn = PLANET_NAMES_VN[obj] || obj

    coreData.push({
      label: pVn,
      zodiac: zName,
      cho: formatText(d.cho),
      yeu: formatText(d.yeu),
    })
  }

  // Attraction: dom houses + venus gu
  const attraction = []
  for (const [h] of common.domHouses) {
    const key = normalizeStr(`Nhà ${h}`)
    const content = mapNhaTroi[key] || ''
    if (content) {
      attraction.push({
        label: `Nhà ${h} trội`,
        content: formatText(content),
      })
    }
  }

  // Venus gu (taste/preference)
  const venusLon = pPos['Venus']?.lon
  let venusGu = ''
  if (venusLon !== undefined) {
    const [, venusZ] = getZodiac(venusLon)
    venusGu = formatText(mapVenus[normalizeStr(venusZ)] || '')
  }

  // Needs: Moon an_toan (safety/security)
  const moonLon = pPos['Moon']?.lon
  let moonAnToan = ''
  if (moonLon !== undefined) {
    const [, moonZ] = getZodiac(moonLon)
    moonAnToan = formatText(mapMoon[normalizeStr(moonZ)] || '')
  }

  return {
    coreData,
    attraction,
    venusGu,
    moonAnToan,
  }
}

// ─── Block 2: House 7 Details (Chi Tiết H7) ────────────────────

function blockH7Detail(chartData: ChartData, kbData: unknown[][], common: LoveCommonData) {
  const { mapCung, mapPlanet, mapRuler } = parseKbH7(kbData)
  const pPos = chartData.planets
  const cusps = chartData.cusps

  // Peak: H7 zodiac + energy
  const h7Lon = cusps.length === 13 ? cusps[7] : cusps[6]
  const [, h7Zodiac] = getZodiac(h7Lon)
  const h7Data = mapCung[normalizeStr(h7Zodiac)] || { energy: '' }

  const peak = {
    zodiac: h7Zodiac,
    energy: formatText(h7Data.energy),
  }

  // Roles: planets in H7
  const roles = common.h7Planets.map(p => {
    const pVn = PLANET_NAMES_VN[p] || p
    const role = mapPlanet[normalizeStr(p)] || ''
    return {
      planet: p,
      label: pVn,
      content: formatText(role),
    }
  })

  // Meeting: ruler of H7 location
  const ruler = RULER_MAP[h7Zodiac]
  let meeting = { rulerPlanet: '', rulerLabel: '', rulerHouse: 0, content: '' }
  if (ruler && ruler in pPos) {
    const rulerHouse = getHouseOfPlanet(pPos[ruler].lon, cusps)
    const rulerVn = PLANET_NAMES_VN[ruler] || ruler
    const locationContent = mapRuler[normalizeStr(ruler)] || ''
    meeting = {
      rulerPlanet: ruler,
      rulerLabel: rulerVn,
      rulerHouse,
      content: formatText(locationContent),
    }
  }

  // Interactions
  const interactions = common.h7Interactions

  return {
    peak,
    roles,
    meeting,
    interactions,
    isH7Empty: common.isH7Empty,
  }
}

// ─── Main export ────────────────────────────────────────────────

export function getLoveBlocks(
  chartData: ChartData,
  kb: Record<string, unknown[][]>,
) {
  const common = calculateCommon(chartData)
  const kbTongQuan = kb['love-TỔNG QUAN'] || []
  const kbH7 = kb['love-CHI TIẾT H7'] || []

  const b1 = blockOverview(chartData, kbTongQuan, common)
  const b2 = blockH7Detail(chartData, kbH7, common)

  return { block1: b1, block2: b2 }
}
