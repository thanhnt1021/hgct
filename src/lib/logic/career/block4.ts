// Block 4: Finance (ported from block4_finance.py)
import { getZodiac, getHouseOfPlanet, checkAspect } from '@/lib/astrology/calculations'
import { CORE_PLANETS, RULER_MAP, PLANET_NAMES_VN } from '@/lib/astrology/constants'
import { normalizeStr, findColIndex, getRowValue, formatText } from '@/lib/astrology/base'
import type { ChartData, CommonData } from './manager'

function parseKnowledge(kbFinance: unknown[][]) {
  const mapH2Zodiac: Record<string, string> = {}
  const mapH2Planets: Record<string, string> = {}
  const mapRulerH2Loc: Record<string, string> = {}
  const mapH8Zodiac: Record<string, string> = {}
  const mapRulerH8Loc: Record<string, string> = {}
  const mapInteractH2: Record<string, Record<string, string>> = {}

  if (!kbFinance || kbFinance.length < 1) return { mapH2Zodiac, mapH2Planets, mapRulerH2Loc, mapH8Zodiac, mapRulerH8Loc, mapInteractH2 }
  const h = kbFinance[0] as string[]
  const rows = kbFinance.slice(1) as string[][]

  const idxH2Z = findColIndex(h, 'ĐỈNH H2')
  const idxHow = findColIndex(h, 'CÁCH KIẾM TIỀN')
  const idxH2P = findColIndex(h, 'HÀNH TINH H2')
  const idxEn = findColIndex(h, 'NĂNG LƯỢNG KIẾM TIỀN')
  const idxR2L = findColIndex(h, 'CHỦ TINH H2 ở nhà nào')
  const idxFld = findColIndex(h, 'LĨNH VỰC GIÚP BẠN TẠO RA TIỀN')
  const idxH8Z = findColIndex(h, 'ĐỈNH H8')
  const idxInv = findColIndex(h, 'PHONG CÁCH ĐẦU TƯ')
  const idxR8L = findColIndex(h, 'CHỦ TINH H8 ở nhà nào')
  const idxInvFld = findColIndex(h, 'LĨNH VỰC BẠN NÊN ĐẦU TƯ')
  const idxH2Int = findColIndex(h, 'TƯƠNG TÁC H2 với các nhà')
  const idxH2Hrd = findColIndex(h, 'CỨNG')
  const idxH2Sft = findColIndex(h, 'MỀM')
  const idxH2HrdCt = findColIndex(h, 'CỨNG CHI TIẾT')
  const idxH2SftCt = findColIndex(h, 'MỀM CHI TIẾT')

  for (const r of rows) {
    const vH2Z = getRowValue(r, idxH2Z)
    if (vH2Z) mapH2Zodiac[normalizeStr(vH2Z)] = getRowValue(r, idxHow)
    const vH2P = getRowValue(r, idxH2P)
    if (vH2P) mapH2Planets[normalizeStr(vH2P)] = getRowValue(r, idxEn)
    const vR2L = getRowValue(r, idxR2L)
    if (vR2L) mapRulerH2Loc[normalizeStr(vR2L)] = getRowValue(r, idxFld)
    const vH8Z = getRowValue(r, idxH8Z)
    if (vH8Z) mapH8Zodiac[normalizeStr(vH8Z)] = getRowValue(r, idxInv)
    const vR8L = getRowValue(r, idxR8L)
    if (vR8L) mapRulerH8Loc[normalizeStr(vR8L)] = getRowValue(r, idxInvFld)
    const vH2Int = getRowValue(r, idxH2Int)
    if (vH2Int) mapInteractH2[normalizeStr(vH2Int)] = {
      hard: getRowValue(r, idxH2Hrd), soft: getRowValue(r, idxH2Sft),
      hardDetail: getRowValue(r, idxH2HrdCt), softDetail: getRowValue(r, idxH2SftCt),
    }
  }

  return { mapH2Zodiac, mapH2Planets, mapRulerH2Loc, mapH8Zodiac, mapRulerH8Loc, mapInteractH2 }
}

export function blockFinance(chartData: ChartData, kbFinance: unknown[][], kbMoneyCode: unknown[][], common: CommonData) {
  const { mapH2Zodiac, mapH2Planets, mapRulerH2Loc, mapH8Zodiac, mapRulerH8Loc, mapInteractH2 } = parseKnowledge(kbFinance)
  const cusps = chartData.cusps
  const planets = chartData.planets

  // H2 zodiac
  const h2Lon = cusps.length === 13 ? cusps[2] : cusps[1]
  const [, h2ZName] = getZodiac(h2Lon)
  const howToEarn = mapH2Zodiac[normalizeStr(h2ZName)] || '(Dữ liệu đang cập nhật...)'

  // Planets in H2
  let pInH2 = CORE_PLANETS.filter(p => p in planets && getHouseOfPlanet(planets[p].lon, cusps) === 2)
  let usingRulerLabel = false
  if (pInH2.length === 0) {
    const rulerEn = RULER_MAP[h2ZName]
    pInH2 = rulerEn ? [rulerEn] : []
    usingRulerLabel = true
  }

  const energyList = pInH2.map(pEn => {
    const pVn = PLANET_NAMES_VN[pEn] || pEn
    const displayLabel = usingRulerLabel ? `${pVn} (CHỦ TINH NHÀ 2)` : pVn
    const content = mapH2Planets[normalizeStr(pVn)] || '(Dữ liệu đang cập nhật...)'
    return { label: displayLabel, content: formatText(content) }
  })

  // Ruler H2 location
  const r2En = RULER_MAP[h2ZName]
  let mainField: string, mainFieldLabel: string
  if (r2En && r2En in planets) {
    const r2House = getHouseOfPlanet(planets[r2En].lon, cusps)
    mainField = mapRulerH2Loc[normalizeStr(`Nhà ${r2House}`)] || '(Dữ liệu đang cập nhật...)'
    mainFieldLabel = `Chủ tinh Nhà 2 ở Nhà ${r2House}`
  } else {
    mainField = '(Không tìm thấy vị trí hành tinh chủ)'
    mainFieldLabel = 'Chủ tinh Nhà 2'
  }

  // H2 interactions
  const h2Impacts = (common.h2Interactions || []).map(it => {
    const i = it as { target_house?: number; targetHouse?: number; type: string; label?: string }
    const tH = i.target_house ?? i.targetHouse ?? 0
    const hKey = normalizeStr(`Nhà ${tH}`)
    const data = mapInteractH2[hKey] || {}
    const isSoft = i.type === 'Mềm'
    const shortTxt = isSoft ? (data.soft || '(Dữ liệu đang cập nhật...)') : (data.hard || '(Dữ liệu đang cập nhật...)')
    const detailTxt = isSoft ? (data.softDetail || '') : (data.hardDetail || '')
    return {
      label: i.label || `Nhà 2 ${i.type.toLowerCase()} Nhà ${tH}`,
      content: { short: formatText(shortTxt), detail: formatText(detailTxt || shortTxt) },
    }
  })

  // H8 investment
  const h8Lon = cusps.length === 13 ? cusps[8] : cusps[7]
  const [, h8ZName] = getZodiac(h8Lon)
  const investStyle = mapH8Zodiac[normalizeStr(h8ZName)] || '(Dữ liệu đang cập nhật...)'

  const r8En = RULER_MAP[h8ZName]
  let investField: string, investFieldLabel: string
  if (r8En && r8En in planets) {
    const r8House = getHouseOfPlanet(planets[r8En].lon, cusps)
    investField = mapRulerH8Loc[normalizeStr(`Nhà ${r8House}`)] || '(Dữ liệu đang cập nhật...)'
    investFieldLabel = `Chủ tinh Nhà 8 ở Nhà ${r8House}`
  } else {
    investField = '(Không tìm thấy vị trí hành tinh chủ)'
    investFieldLabel = 'Chủ tinh Nhà 8'
  }

  // Favorable signs
  const favSigns: string[] = []
  if (planets.Venus) {
    const vH = getHouseOfPlanet(planets.Venus.lon, cusps)
    if (vH === 2 || vH === 8) favSigns.push(`Sao Kim ở Nhà ${vH}`)
  }
  if (planets.Jupiter) {
    const jH = getHouseOfPlanet(planets.Jupiter.lon, cusps)
    if (jH === 2 || jH === 8) favSigns.push(`Sao Mộc ở Nhà ${jH}`)
  }

  for (const targetH of [2, 8]) {
    const ps = CORE_PLANETS.filter(p => p in planets && getHouseOfPlanet(planets[p].lon, cusps) === targetH)
    if (ps.length === 0) continue
    if (ps.length > 1) favSigns.push(`Nhà ${targetH} có nhiều hành tinh (Trùng nhau)`)

    let allSoft = true
    let hasAspects = false
    for (const p of ps) {
      for (const pOther of CORE_PLANETS) {
        if (p === pOther || !(pOther in planets)) continue
        const asp = checkAspect(planets[p].lon, planets[pOther].lon)
        if (asp) {
          hasAspects = true
          if (asp.type === 'Hard') { allSoft = false; break }
        }
      }
      if (!allSoft) break
    }
    if (hasAspects && allSoft) favSigns.push(`Nhà ${targetH} có nhiều góc Mềm`)
  }

  // Money notes (Venus soft aspects)
  const moneyNotes: { label: string; content: string }[] = []
  if (planets.Venus && kbMoneyCode && kbMoneyCode.length > 1) {
    const headers = kbMoneyCode[0] as string[]
    let venusRowData: string[] | null = null
    for (const row of kbMoneyCode.slice(1)) {
      const r = row as string[]
      if (r && normalizeStr(String(r[0])) === normalizeStr('Sao Kim')) {
        venusRowData = r
        break
      }
    }
    if (venusRowData) {
      for (let i = 1; i < headers.length; i++) {
        const pHeaderVn = String(headers[i]).trim()
        if (!pHeaderVn) continue
        let pOtherEn: string | null = null
        for (const [enKey, vnName] of Object.entries(PLANET_NAMES_VN)) {
          if (vnName.toLowerCase() === pHeaderVn.toLowerCase()) { pOtherEn = enKey; break }
        }
        if (pOtherEn && pOtherEn in planets) {
          const asp = checkAspect(planets.Venus.lon, planets[pOtherEn].lon)
          if (asp && (asp.type === 'Soft' || asp.aspect === 'Conjunction')) {
            if (i < venusRowData.length) {
              const contentNote = String(venusRowData[i]).trim()
              if (contentNote) {
                moneyNotes.push({ label: `Góc Mềm: Sao Kim - ${pHeaderVn}`, content: formatText(contentNote) })
              }
            }
          }
        }
      }
    }
  }

  return {
    section1: { earnHow: { label: h2ZName, content: formatText(howToEarn) }, energies: energyList },
    section2: { label: mainFieldLabel, content: formatText(mainField) },
    h2Impacts,
    section3: { style: { label: h8ZName, content: formatText(investStyle) }, field: { label: investFieldLabel, content: formatText(investField) } },
    favSigns,
    moneyNotes,
  }
}
