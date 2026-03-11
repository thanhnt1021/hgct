// Love manager — ported from /root/mo/app/logic/love/{block1_overview,block2_h7,manager}.py
// Fixed: all column name mismatches vs actual DB headers
import {
  getZodiac, getHouseOfPlanet,
  analyzeHouseInteractions, getDominantHousesSorted,
} from '@/lib/astrology/calculations'
import type { ChartData } from '@/lib/astrology/calculations'
import { CORE_PLANETS, RULER_MAP, PLANET_NAMES_VN } from '@/lib/astrology/constants'
import { normalizeStr, findColIndex, getRowValue, formatText } from '@/lib/astrology/base'

export type { ChartData }

export interface LoveCommonData {
  domHouses: [number, number][]
  h7Planets: string[]
  h7Interactions: { target_house: number; type: string; label: string }[]
  isH7Empty: boolean
}

function calculateCommon(chartData: ChartData): LoveCommonData {
  const domHouses = getDominantHousesSorted(chartData).map(d => [d.house, d.score] as [number, number])
  const cusps = chartData.cusps
  const pPos = chartData.planets

  const h7Planets = CORE_PLANETS.filter(p => p in pPos && getHouseOfPlanet(pPos[p].lon, cusps) === 7)

  let h7Interactions: { target_house: number; type: string; label: string }[]
  let isH7Empty: boolean

  if (h7Planets.length > 0) {
    h7Interactions = analyzeHouseInteractions(chartData, h7Planets, 7, false)
    isH7Empty = false
  } else {
    const h7Lon = cusps.length === 13 ? cusps[7] : cusps[6]
    const [, h7Z] = getZodiac(h7Lon)
    const ruler = RULER_MAP[h7Z]
    h7Interactions = analyzeHouseInteractions(chartData, ruler ? [ruler] : [], 7, true)
    isH7Empty = true
  }

  return { domHouses, h7Planets, h7Interactions, isH7Empty }
}

// ─── Block 1: Overview — FIXED column names ─────────────────────

function parseKbTongQuan(kbData: unknown[][]) {
  // Actual DB headers (from Google Sheets):
  // ['CUNG ', ' CHO ĐI ', 'ĐIỂM YẾU', '', 'ĐỈNH H5 NHÀ NÀO', ' CHO ĐI ', '',
  //  'NHÀ TRỘI', 'NHẬN LẠI', '', 'SAO KIM', 'GU ĐỐI TÁC', '', 'MOON CUNG NÀO', 'AN TOÀN']
  const mapCung: Record<string, Record<string, string>> = {}
  const mapNhaTroi: Record<string, string> = {}
  const mapVenus: Record<string, string> = {}
  const mapMoon: Record<string, string> = {}

  if (!kbData || kbData.length < 1) return { mapCung, mapNhaTroi, mapVenus, mapMoon }

  const headers = kbData[0] as string[]
  const rows = kbData.slice(1) as string[][]

  // FIXED: correct column names matching actual DB headers
  const idxCung  = findColIndex(headers, 'CUNG')            // idx 0: "CUNG "
  const idxCho   = findColIndex(headers, 'CHO ĐI')          // idx 1: " CHO ĐI " (first occurrence)
  const idxYeu   = findColIndex(headers, 'điểm yếu')        // idx 2: "ĐIỂM YẾU"
  const idxNt    = findColIndex(headers, 'Nhà trội')        // idx 7: "NHÀ TRỘI" → value = "NHÀ 1"
  const idxNhan  = findColIndex(headers, 'Nhận lại')        // idx 8: "NHẬN LẠI" → content
  const idxVk    = findColIndex(headers, 'Sao kim')         // idx 10: "SAO KIM"
  const idxGu    = findColIndex(headers, 'Gu đối tác')      // idx 11: "GU ĐỐI TÁC"
  const idxMn    = findColIndex(headers, 'Moon Cung nào')   // idx 13: "MOON CUNG NÀO"
  const idxAt    = findColIndex(headers, 'An toàn')         // idx 14: "AN TOÀN"

  for (const r of rows) {
    // Map zodiac → { cho, yeu } (Asc/Sun/Moon love style)
    const vCung = getRowValue(r, idxCung)
    if (vCung) {
      mapCung[normalizeStr(vCung)] = {
        cho: getRowValue(r, idxCho),
        yeu: getRowValue(r, idxYeu),
      }
    }

    // Map house name ("NHÀ 1") → content (dominant house attraction)
    const vNt = getRowValue(r, idxNt)
    if (vNt) mapNhaTroi[normalizeStr(vNt)] = getRowValue(r, idxNhan)

    // Map Venus zodiac → gu đối tác
    const vVk = getRowValue(r, idxVk)
    if (vVk) mapVenus[normalizeStr(vVk)] = getRowValue(r, idxGu)

    // Map Moon zodiac → an toàn
    const vMn = getRowValue(r, idxMn)
    if (vMn) mapMoon[normalizeStr(vMn)] = getRowValue(r, idxAt)
  }

  return { mapCung, mapNhaTroi, mapVenus, mapMoon }
}

function blockOverview(chartData: ChartData, kbData: unknown[][], common: LoveCommonData) {
  const { mapCung, mapNhaTroi, mapVenus, mapMoon } = parseKbTongQuan(kbData)
  const pPos = chartData.planets

  // Core: Asc/Sun/Moon → cho đi + điểm yếu
  const coreData = []
  for (const obj of ['Asc', 'Sun', 'Moon']) {
    const lon = pPos[obj].lon
    const [, zName] = getZodiac(lon)
    const d = mapCung[normalizeStr(zName)] || { cho: '', yeu: '' }
    coreData.push({
      label: PLANET_NAMES_VN[obj] || obj,
      zodiac: zName,
      cho: formatText(d.cho),
      yeu: formatText(d.yeu),
    })
  }

  // Attraction: dom houses → nhận lại
  const attraction = []
  for (const [h] of common.domHouses) {
    const key = normalizeStr(`Nhà ${h}`)
    const content = mapNhaTroi[key] || ''
    if (content) attraction.push({ label: `Nhà ${h}`, content: formatText(content) })
  }

  // Venus gu
  const venusLon = pPos['Venus']?.lon
  let venusGu = ''
  if (venusLon !== undefined) {
    const [, venusZ] = getZodiac(venusLon)
    venusGu = formatText(mapVenus[normalizeStr(venusZ)] || '')
  }

  // Moon an toàn
  const moonLon = pPos['Moon']?.lon
  let moonAnToan = ''
  if (moonLon !== undefined) {
    const [, moonZ] = getZodiac(moonLon)
    moonAnToan = formatText(mapMoon[normalizeStr(moonZ)] || '')
  }

  return { coreData, attraction, venusGu, moonAnToan }
}

// ─── Block 2: H7 Details — FIXED column names + interaction content ──

function parseKbH7(kbData: unknown[][]) {
  // Actual DB headers:
  // ['ĐỈNH NHÀ 7', 'NĂNG LƯỢNG', '', 'HÀNH TINH TRONG NHÀ 7', 'VAI TRÒ', '',
  //  'CHỦ TINH NHÀ 7 Ở NHÀ', 'GẶP Ở ĐÂU', '', 'TƯƠNG TÁC H7 VỚI CÁC NHÀ', 'CỨNG', 'MỀM']
  const mapZodiac: Record<string, string> = {}     // H7 zodiac → energy
  const mapPlanet: Record<string, string> = {}     // planet VN name → role in H7
  const mapRuler: Record<string, string> = {}      // "Nhà X" → meeting location
  const mapInteract: Record<string, { hard: string; soft: string }> = {} // "Nhà X" → {hard, soft}

  if (!kbData || kbData.length < 1) return { mapZodiac, mapPlanet, mapRuler, mapInteract }

  const headers = kbData[0] as string[]
  const rows = kbData.slice(1) as string[][]

  // FIXED: correct column names matching actual DB headers
  const idxH7Z   = findColIndex(headers, 'Đỉnh nhà 7')              // idx 0
  const idxNl    = findColIndex(headers, 'Năng lượng')               // idx 1
  const idxPlan  = findColIndex(headers, 'Hành tinh trong nhà 7')    // idx 3
  const idxRole  = findColIndex(headers, 'Vai trò')                  // idx 4
  const idxRulH  = findColIndex(headers, 'Chủ tinh nhà 7 ở nhà')    // idx 6
  const idxGap   = findColIndex(headers, 'Gặp ở đâu')               // idx 7
  const idxInt   = findColIndex(headers, 'Tương tác H7 với các nhà') // idx 9
  const idxHard  = findColIndex(headers, 'cứng')                     // idx 10
  const idxSoft  = findColIndex(headers, 'mềm')                      // idx 11

  for (const r of rows) {
    // H7 zodiac → energy
    const vZ = getRowValue(r, idxH7Z)
    if (vZ) mapZodiac[normalizeStr(vZ)] = getRowValue(r, idxNl)

    // Planet VN name → role in H7
    const vP = getRowValue(r, idxPlan)
    if (vP) mapPlanet[normalizeStr(vP)] = getRowValue(r, idxRole)

    // "NHÀ X" → meeting location text
    const vRulH = getRowValue(r, idxRulH)
    if (vRulH) mapRuler[normalizeStr(vRulH)] = getRowValue(r, idxGap)

    // "NHÀ X" → { hard, soft } interaction content
    const vInt = getRowValue(r, idxInt)
    if (vInt) mapInteract[normalizeStr(vInt)] = {
      hard: getRowValue(r, idxHard),
      soft: getRowValue(r, idxSoft),
    }
  }

  return { mapZodiac, mapPlanet, mapRuler, mapInteract }
}

function blockH7Detail(chartData: ChartData, kbData: unknown[][], common: LoveCommonData) {
  const { mapZodiac, mapPlanet, mapRuler, mapInteract } = parseKbH7(kbData)
  const pPos = chartData.planets
  const cusps = chartData.cusps

  // H7 zodiac + energy
  const h7Lon = cusps.length === 13 ? cusps[7] : cusps[6]
  const [, h7Zodiac] = getZodiac(h7Lon)
  const peak = {
    zodiac: h7Zodiac,
    energy: formatText(mapZodiac[normalizeStr(h7Zodiac)] || ''),
  }

  // Planets in H7 → roles (or use ruler if empty)
  const h7PlanetsToUse = common.isH7Empty
    ? (() => { const r = RULER_MAP[h7Zodiac]; return r ? [r] : [] })()
    : common.h7Planets

  const roles = h7PlanetsToUse.map(p => {
    const pVn = PLANET_NAMES_VN[p] || p
    const label = common.isH7Empty ? `${pVn} (Chủ tinh Nhà 7)` : pVn
    const content = mapPlanet[normalizeStr(pVn)] || ''
    return { planet: p, label, content: formatText(content) }
  })

  // H7 ruler location → where to meet partner
  // Key = "NHÀ X" (house number string), NOT planet name
  const ruler = RULER_MAP[h7Zodiac]
  let meeting = { rulerPlanet: '', rulerLabel: '', rulerHouse: 0, content: '' }
  if (ruler && ruler in pPos) {
    const rulerHouse = getHouseOfPlanet(pPos[ruler].lon, cusps)
    const rulerVn = PLANET_NAMES_VN[ruler] || ruler
    const locationContent = mapRuler[normalizeStr(`Nhà ${rulerHouse}`)] || ''
    meeting = {
      rulerPlanet: ruler,
      rulerLabel: rulerVn,
      rulerHouse,
      content: formatText(locationContent),
    }
  }

  // H7 interactions with other houses — enriched with KB content
  const interactions = common.h7Interactions.map(it => {
    const hKey = normalizeStr(`Nhà ${it.target_house}`)
    const kbData = mapInteract[hKey] || { hard: '', soft: '' }
    const content = it.type === 'Mềm' ? kbData.soft : kbData.hard
    const prefix = common.isH7Empty ? 'Chủ tinh Nhà 7' : 'Nhà 7'
    return {
      target_house: it.target_house,
      type: it.type,
      label: `${prefix} ${it.type} Nhà ${it.target_house}`,
      content: formatText(content),
    }
  })

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
