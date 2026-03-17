import {
  checkAspect, getZodiac, getHouseOfPlanet, getElevatedPlanets,
  analyzeHouseInteractions, getDominantPlanetsLogic, getDominantHousesSorted,
} from '@/lib/astrology/calculations'
import type { ChartData } from '@/lib/astrology/calculations'
import {
  CORE_PLANETS, PERSONAL_PLANETS, PLANET_POINTS, ZODIAC_MATRIX, RULER_MAP
} from '@/lib/astrology/constants'
import { blockWhoAmI } from './block1'
import { blockTalents } from './block2'
import { blockPath } from './block3'
import { blockFinance } from './block4'

export type { ChartData }

export interface CommonData {
  elDom: string | null
  elWeaks: string[]
  modDom: string | null
  modWeaks: string[]
  domHouses: [number, number][]
  domPlanets: { name: string; totalOrb: number }[]
  tightAspects: Record<string, unknown>[]
  h10Planets: string[]
  elevatedPlanets: string[]
  h10Interactions: Record<string, unknown>[]
  isH10Empty: boolean
  h2Planets: string[]
  h2Interactions: Record<string, unknown>[]
  isH2Empty: boolean
}

function calculateCommon(chartData: ChartData): CommonData {
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
  const modScores = [0, 1, 2].map(i => scoresMatrix.reduce((acc, row) => acc + row[i], 0))

  function getDT(scores: number[], labels: string[]): { dom: string | null; weaks: string[] } {
    const sorted = scores.map((s, i) => ({ i, s })).sort((a, b) => b.s - a.s)
    const dom = sorted.length > 1 && (sorted[0].s - sorted[1].s) >= 3 ? labels[sorted[0].i] : null
    const weaks = scores.map((v, i) => v <= 2 ? labels[i] : '').filter(Boolean)
    return { dom, weaks }
  }

  const { dom: elDom, weaks: elWeaks } = getDT(elScores, elLabels)
  const { dom: modDom, weaks: modWeaks } = getDT(modScores, modLabels)

  const domHouses = getDominantHousesSorted(chartData).map(d => [d.house, d.score] as [number, number])
  const domPlanets = getDominantPlanetsLogic(chartData)

  // Tight aspects
  const tempAsps: Record<string, unknown>[] = []
  let minOrb = 999
  for (let i = 0; i < CORE_PLANETS.length; i++) {
    for (let j = i + 1; j < CORE_PLANETS.length; j++) {
      const p1 = CORE_PLANETS[i], p2 = CORE_PLANETS[j]
      if (!PERSONAL_PLANETS.includes(p1) && !PERSONAL_PLANETS.includes(p2)) continue
      if (p1 in pPos && p2 in pPos) {
        const asp = checkAspect(pPos[p1].lon, pPos[p2].lon)
        if (asp && asp.type !== 'Minor') {
          tempAsps.push({ ...asp, p1, p2 })
          if (asp.orb_round < minOrb) minOrb = asp.orb_round
        }
      }
    }
  }
  const tightAspects = tempAsps.filter(a => (a as { orb_round: number }).orb_round === minOrb)

  // H10
  const cusps = chartData.cusps
  const h10Planets = CORE_PLANETS.filter(p => p in pPos && getHouseOfPlanet(pPos[p].lon, cusps) === 10)

  let h10Interactions: Record<string, unknown>[]
  let isH10Empty: boolean
  if (h10Planets.length > 0) {
    h10Interactions = analyzeHouseInteractions(chartData, h10Planets, 10, false)
    isH10Empty = false
  } else {
    const [, mcZ] = getZodiac(chartData.angles.MC)
    const ruler = RULER_MAP[mcZ]
    h10Interactions = analyzeHouseInteractions(chartData, ruler ? [ruler] : [], 10, true)
    isH10Empty = true
  }

  // H2
  const h2Planets = CORE_PLANETS.filter(p => p in pPos && getHouseOfPlanet(pPos[p].lon, cusps) === 2)
  let h2Interactions: Record<string, unknown>[]
  let isH2Empty: boolean
  if (h2Planets.length > 0) {
    h2Interactions = analyzeHouseInteractions(chartData, h2Planets, 2, false)
    isH2Empty = false
  } else {
    const h2Lon = cusps.length === 13 ? cusps[2] : cusps[1]
    const [, h2Z] = getZodiac(h2Lon)
    const ruler = RULER_MAP[h2Z]
    h2Interactions = analyzeHouseInteractions(chartData, ruler ? [ruler] : [], 2, true)
    isH2Empty = true
  }

  return {
    elDom, elWeaks, modDom, modWeaks,
    domHouses, domPlanets, tightAspects,
    h10Planets, elevatedPlanets: getElevatedPlanets(chartData),
    h10Interactions, isH10Empty,
    h2Planets, h2Interactions, isH2Empty,
  }
}

export function getCareerBlocks(
  chartData: ChartData,
  kb: Record<string, unknown[][]>,
  userNotes?: Record<string, string>
) {
  const common = calculateCommon(chartData)
  const kbLoi = kb['LÕI TÍNH CÁCH'] || []
  const kbTaiNang = kb['TÀI NĂNG NỔI BẬT'] || []
  const kbNangKhieu = kb['code-NĂNGKHIẾU'] || []
  const kbMtpt = kb['SỰ NGHIỆP - MTPT'] || []
  const kbFinance = kb['TIỀN BẠC - TÀI CHÍNH'] || []
  const kbMoneyCode = kb['code-TIỀN'] || []

  const b1 = blockWhoAmI(chartData, kbLoi, common)
  const b2 = blockTalents(chartData, kbTaiNang, kbNangKhieu, common)
  const b3 = blockPath(chartData, kbMtpt, common)
  const b4 = blockFinance(chartData, kbFinance, kbMoneyCode, common)

  return { block1: b1, block2: b2, block3: b3, block4: b4 }
}
