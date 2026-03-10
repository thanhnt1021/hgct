// Relationship (synastry) manager — ported from relationship/manager.py + block1_intro.py + block2_story.py
import {
  getZodiac, getHouseOfPlanet, getDominantHousesSorted,
} from '@/lib/astrology/calculations'
import type { ChartData } from '@/lib/astrology/calculations'
import { analyzeSynastryGrid } from '@/lib/astrology/synastry'
import { CORE_PLANETS, PLANET_POINTS, PLANET_NAMES_VN } from '@/lib/astrology/constants'
import { normalizeStr, findColIndex, getRowValue, formatText } from '@/lib/astrology/base'

export type { ChartData }

// ── Types ────────────────────────────────────────────────────────────────────

export interface RelCommonData {
  dom_A: [number, number][]
  dom_B: [number, number][]
  act_A: [number, number][]
  act_B: [number, number][]
  dom_common: [number, number][]
  empty_all: number[]
  empty_sp: number[]
}

interface CoreItem {
  label: string
  zodiac: string
  content: string
}

interface HouseItem {
  label: string
  content: string
  show_detail?: boolean
}

interface VenusItem {
  label: string
  content: string
}

interface ThemeItem {
  label: string
  content: string
}

interface PersonBlock1 {
  core: CoreItem[]
  houses: HouseItem[]
  venus: VenusItem
  theme: ThemeItem
  [key: string]: unknown
}

interface ActItem {
  label: string
  content: string
  show_detail: boolean
}

interface DomCommonItem {
  label: string
  content: string
  show_detail: boolean
}

interface EmptySpItem {
  label: string
  content: string
}

export interface RelBlocks {
  block1: { A: PersonBlock1; B: PersonBlock1 }
  block2: {
    act_A: ActItem[]
    act_B: ActItem[]
    dom_common: DomCommonItem[]
    empty_all: string[]
    empty_sp: EmptySpItem[]
  }
  syn_analysis: ReturnType<typeof analyzeSynastryGrid>
  common: RelCommonData
}

// ── Common data calculation ──────────────────────────────────────────────────

function calculateCommon(chartA: ChartData, chartB: ChartData): RelCommonData {
  const domA = getDominantHousesSorted(chartA).map(d => [d.house, d.score] as [number, number])
  const domB = getDominantHousesSorted(chartB).map(d => [d.house, d.score] as [number, number])

  const sAB: Record<number, number> = {}
  const sBA: Record<number, number> = {}
  for (let h = 1; h <= 12; h++) { sAB[h] = 0; sBA[h] = 0 }
  const occ = new Set<number>()

  for (const p of CORE_PLANETS) {
    if (!(p in chartA.planets) || !(p in chartB.planets)) continue
    const pts = PLANET_POINTS[p] ?? 1
    const hB = getHouseOfPlanet(chartA.planets[p].lon, chartB.cusps)
    sAB[hB] += pts
    occ.add(hB)
    const hA = getHouseOfPlanet(chartB.planets[p].lon, chartA.cusps)
    sBA[hA] += pts
    occ.add(hA)
  }

  // Activated houses: >= 5 pts
  const actA = Object.entries(sBA)
    .map(([h, s]) => [Number(h), s] as [number, number])
    .filter(([, s]) => s >= 5)
    .sort((a, b) => b[1] - a[1])

  const actB = Object.entries(sAB)
    .map(([h, s]) => [Number(h), s] as [number, number])
    .filter(([, s]) => s >= 5)
    .sort((a, b) => b[1] - a[1])

  const domCommon = Array.from({ length: 12 }, (_, i) => i + 1)
    .map(h => [h, sAB[h] + sBA[h]] as [number, number])
    .filter(([, s]) => s >= 5)
    .sort((a, b) => b[1] - a[1])

  const emptyAll = Array.from({ length: 12 }, (_, i) => i + 1)
    .filter(h => !occ.has(h))
    .sort((a, b) => a - b)

  const domASet = new Set(domA.map(([h]) => h))
  const domBSet = new Set(domB.map(([h]) => h))
  const domUnion = new Set([...domASet, ...domBSet])
  const emptySp = emptyAll.filter(h => domUnion.has(h)).sort((a, b) => a - b)

  return { dom_A: domA, dom_B: domB, act_A: actA, act_B: actB, dom_common: domCommon, empty_all: emptyAll, empty_sp: emptySp }
}

// ── Block 1: Intro ───────────────────────────────────────────────────────────

function parseKnowledgeBlock1(kbData: unknown[][]) {
  const mapCung: Record<string, string> = {}
  const mapNha: Record<string, string> = {}
  const mapVenus: Record<string, string> = {}
  const mapTheme: Record<string, string> = {}

  if (!kbData || kbData.length < 1) return { mapCung, mapNha, mapVenus, mapTheme }

  const h = kbData[0] as string[]
  const rows = kbData.slice(1)

  const idxC = findColIndex(h, 'CUNG')
  const idxCho = findColIndex(h, 'CHO ĐI')
  const idxNt = findColIndex(h, 'NHÀ TRỘI')
  const idxNhan = findColIndex(h, 'NHẬN LẠI')
  const idxVk = findColIndex(h, 'SAO KIM')
  const idxGu = findColIndex(h, 'GU ĐỐI TÁC')
  const idxTh = findColIndex(h, 'HÀNH TINH THEME CHÍNH')
  const idxCtTh = findColIndex(h, 'CHI TIẾT HÀNH TINH THEME CHÍNH')

  for (const r of rows) {
    const row = r as string[]
    const vC = getRowValue(row, idxC)
    if (vC) mapCung[normalizeStr(vC)] = getRowValue(row, idxCho)

    const vNt = getRowValue(row, idxNt)
    if (vNt) mapNha[normalizeStr(vNt)] = getRowValue(row, idxNhan)

    const vVk = getRowValue(row, idxVk)
    if (vVk) mapVenus[normalizeStr(vVk)] = getRowValue(row, idxGu)

    const vTh = getRowValue(row, idxTh)
    if (vTh) mapTheme[normalizeStr(vTh)] = getRowValue(row, idxCtTh)
  }

  return { mapCung, mapNha, mapVenus, mapTheme }
}

function blockIntro(
  chartA: ChartData, chartB: ChartData,
  kbData: unknown[][], synAnalysis: ReturnType<typeof analyzeSynastryGrid>,
  common: RelCommonData
): { A: PersonBlock1; B: PersonBlock1 } {
  const { mapCung, mapNha, mapVenus, mapTheme } = parseKnowledgeBlock1(kbData)

  function getProfileData(chart: ChartData, domHouses: [number, number][]): Omit<PersonBlock1, 'theme'> {
    const core: CoreItem[] = []
    for (const obj of ['Asc', 'Sun', 'Moon'] as const) {
      const lon = chart.planets[obj].lon
      const [, zName] = getZodiac(lon)
      core.push({
        label: PLANET_NAMES_VN[obj] || obj,
        zodiac: zName,
        content: formatText(mapCung[normalizeStr(zName)] || '(Dữ liệu đang cập nhật...)'),
      })
    }

    const houses: HouseItem[] = []
    for (const [hNum] of domHouses) {
      const label = `Nhà ${hNum}`
      houses.push({
        label,
        content: formatText(mapNha[normalizeStr(label)] || '(Dữ liệu đang cập nhật...)'),
      })
    }

    const vLon = chart.planets.Venus.lon
    const [, vZ] = getZodiac(vLon)
    const venus: VenusItem = {
      label: `Sao Kim (${vZ})`,
      content: formatText(mapVenus[normalizeStr(vZ)] || '(Dữ liệu đang cập nhật...)'),
    }

    return { core, houses, venus }
  }

  const dataA = getProfileData(chartA, common.dom_A)
  const dataB = getProfileData(chartB, common.dom_B)

  const tAEn = synAnalysis.dominant_A || ''
  const tBEn = synAnalysis.dominant_B || ''
  const tAVn = PLANET_NAMES_VN[tAEn] || tAEn
  const tBVn = PLANET_NAMES_VN[tBEn] || tBEn

  const themeA: ThemeItem = {
    label: tAVn,
    content: formatText(mapTheme[normalizeStr(tAVn)] || '(Dữ liệu đang cập nhật...)'),
  }
  const themeB: ThemeItem = {
    label: tBVn,
    content: formatText(mapTheme[normalizeStr(tBVn)] || '(Dữ liệu đang cập nhật...)'),
  }

  return {
    A: { ...dataA, theme: themeA } as PersonBlock1,
    B: { ...dataB, theme: themeB } as PersonBlock1,
  }
}

// ── Block 2: Story ───────────────────────────────────────────────────────────

function parseKnowledgeBlock2(kbData: unknown[][]) {
  const mapAct: Record<string, string> = {}
  const mapDomCommon: Record<string, string> = {}
  const mapEmptySp: Record<string, string> = {}

  if (!kbData || kbData.length < 1) return { mapAct, mapDomCommon, mapEmptySp }

  const h = kbData[0] as string[]
  const rows = kbData.slice(1)

  const idxAct = findColIndex(h, 'NHÀ ĐƯỢC KÍCH HOẠT')
  const idxCtAct = findColIndex(h, 'CHI TIẾT NHÀ ĐƯỢC KÍCH HOẠT')
  const idxDc = findColIndex(h, 'NHÀ TRỘI CHUNG')
  const idxCtDc = findColIndex(h, 'CHI TIẾT NHÀ TRỘI CHUNG')
  const idxEs = findColIndex(h, 'NHÀ TRỐNG ĐẶC BIỆT')
  const idxCtEs = findColIndex(h, 'CHI TIẾT NHÀ TRỐNG ĐẶC BIỆT')

  for (const r of rows) {
    const row = r as string[]
    const vAct = getRowValue(row, idxAct)
    if (vAct) mapAct[normalizeStr(vAct)] = getRowValue(row, idxCtAct)

    const vDc = getRowValue(row, idxDc)
    if (vDc) mapDomCommon[normalizeStr(vDc)] = getRowValue(row, idxCtDc)

    const vEs = getRowValue(row, idxEs)
    if (vEs) mapEmptySp[normalizeStr(vEs)] = getRowValue(row, idxCtEs)
  }

  return { mapAct, mapDomCommon, mapEmptySp }
}

function blockStory(
  kbData: unknown[][],
  _synAnalysis: ReturnType<typeof analyzeSynastryGrid>,
  common: RelCommonData
) {
  const { mapAct, mapDomCommon, mapEmptySp } = parseKnowledgeBlock2(kbData)

  function mapActList(lst: [number, number][]): ActItem[] {
    const scores = [...new Set(lst.map(([, s]) => s))].sort((a, b) => b - a)
    const topScores = scores.slice(0, 2)

    return lst.map(([hNum, pts]) => {
      const label = `Nhà ${hNum}`
      const content = mapAct[normalizeStr(label)] || '(Dữ liệu đang cập nhật...)'
      const showDetail = topScores.includes(pts)
      return { label: `${label} (${pts}đ)`, content: formatText(content), show_detail: showDetail }
    })
  }

  const actA = mapActList(common.act_A)
  const actB = mapActList(common.act_B)

  // Dom common with top-2 detail logic
  const dcScores = [...new Set(common.dom_common.map(([, s]) => s))].sort((a, b) => b - a)
  const dcTopScores = dcScores.slice(0, 2)

  const domCommon: DomCommonItem[] = common.dom_common.map(([hNum, pts]) => {
    const label = `Nhà ${hNum}`
    const content = mapDomCommon[normalizeStr(label)] || '(Dữ liệu đang cập nhật...)'
    const showDetail = dcTopScores.includes(pts)
    return { label: `${label} (${pts}đ)`, content: formatText(content), show_detail: showDetail }
  })

  const emptySp: EmptySpItem[] = common.empty_sp.map(hNum => {
    const label = `Nhà ${hNum}`
    const content = mapEmptySp[normalizeStr(label)] || '(Dữ liệu đang cập nhật...)'
    return { label, content: formatText(content) }
  })

  return {
    act_A: actA,
    act_B: actB,
    dom_common: domCommon,
    empty_all: common.empty_all.map(h => `Nhà ${h}`),
    empty_sp: emptySp,
  }
}

// ── Main entry point ─────────────────────────────────────────────────────────

export function getRelationshipBlocks(
  chartA: ChartData,
  chartB: ChartData,
  kb: Record<string, unknown[][]>,
): RelBlocks {
  const kbPair = kb['love-CẶP ĐÔI'] || []
  const common = calculateCommon(chartA, chartB)
  const synAnalysis = analyzeSynastryGrid(chartA, chartB)
  const b1 = blockIntro(chartA, chartB, kbPair, synAnalysis, common)
  const b2 = blockStory(kbPair, synAnalysis, common)
  return { block1: b1, block2: b2, syn_analysis: synAnalysis, common }
}
