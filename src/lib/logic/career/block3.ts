// Block 3: Career Path (ported from block3_path.py)
import { getZodiac, getHouseOfPlanet } from '@/lib/astrology/calculations'
import { RULER_MAP, PLANET_NAMES_VN } from '@/lib/astrology/constants'
import { normalizeStr, findColIndex, getRowValue, formatText } from '@/lib/astrology/base'
import type { ChartData, CommonData } from './manager'

function parseKnowledge(kbMtpt: unknown[][]) {
  const mapMc: Record<string, string> = {}
  const mapPH10: Record<string, string> = {}
  const mapRulerH10Loc: Record<string, string> = {}
  const mapInteract: Record<string, Record<string, string>> = {}
  const mapRulerH6: Record<string, string> = {}
  const mapRulerH6Loc: Record<string, string> = {}

  if (!kbMtpt || kbMtpt.length < 1) return { mapMc, mapPH10, mapRulerH10Loc, mapInteract, mapRulerH6, mapRulerH6Loc }
  const h = kbMtpt[0] as string[]
  const rows = kbMtpt.slice(1) as string[][]

  const idxMc = findColIndex(h, 'ĐỈNH H10')
  const idxEn = findColIndex(h, 'NĂNG LƯỢNG SỰ NGHIỆP')
  const idxP10 = findColIndex(h, 'HÀNH TINH H10')
  const idxRo = findColIndex(h, 'VAI TRÒ SỰ NGHIỆP')
  const idxR10L = findColIndex(h, 'CHỦ TINH H10 ở nhà nào')
  const idxCw = findColIndex(h, 'SỰ NGHỆP GẮN LIỀN VỚI')
  const idxInt = findColIndex(h, 'TƯƠNG TÁC H10 với các nhà')
  const idxHrd = findColIndex(h, 'CỨNG')
  const idxSft = findColIndex(h, 'MỀM')
  const idxHrdCt = findColIndex(h, 'CỨNG CHI TIẾT')
  const idxSftCt = findColIndex(h, 'MỀM CHI TIẾT')
  const idxR6 = findColIndex(h, 'CHỦ TINH H6')
  const idxEnv = findColIndex(h, 'MÔI TRƯỜNG PHÙ HỢP')
  const idxR6L = findColIndex(h, 'CHỦ TINH H6 ở nhà nào')
  const idxWn = findColIndex(h, 'CÔNG VIỆC CẦN')

  for (const r of rows) {
    const vMc = getRowValue(r, idxMc)
    if (vMc) mapMc[normalizeStr(vMc)] = getRowValue(r, idxEn)
    const vP10 = getRowValue(r, idxP10)
    if (vP10) mapPH10[normalizeStr(vP10)] = getRowValue(r, idxRo)
    const vR10L = getRowValue(r, idxR10L)
    if (vR10L) mapRulerH10Loc[normalizeStr(vR10L)] = getRowValue(r, idxCw)
    const vInt = getRowValue(r, idxInt)
    if (vInt) mapInteract[normalizeStr(vInt)] = {
      hard: getRowValue(r, idxHrd), soft: getRowValue(r, idxSft),
      hardDetail: getRowValue(r, idxHrdCt), softDetail: getRowValue(r, idxSftCt),
    }
    const vR6 = getRowValue(r, idxR6)
    if (vR6) mapRulerH6[normalizeStr(vR6)] = getRowValue(r, idxEnv)
    const vR6L = getRowValue(r, idxR6L)
    if (vR6L) mapRulerH6Loc[normalizeStr(vR6L)] = getRowValue(r, idxWn)
  }

  return { mapMc, mapPH10, mapRulerH10Loc, mapInteract, mapRulerH6, mapRulerH6Loc }
}

export function blockPath(chartData: ChartData, kbMtpt: unknown[][], common: CommonData) {
  const { mapMc, mapPH10, mapRulerH10Loc, mapInteract, mapRulerH6, mapRulerH6Loc } = parseKnowledge(kbMtpt)

  const mcLon = chartData.angles.MC
  const [, mcZName] = getZodiac(mcLon)
  const energyTxt = mapMc[normalizeStr(mcZName)] || '(Dữ liệu đang cập nhật...)'

  // Roles
  let targetPs = common.h10Planets
  let isEl = false
  if (targetPs.length === 0) {
    targetPs = common.elevatedPlanets
    isEl = true
  }
  const roles = targetPs.map(pEn => {
    const pVn = PLANET_NAMES_VN[pEn] || pEn
    const content = mapPH10[normalizeStr(pVn)] || '(Dữ liệu đang cập nhật...)'
    return { label: isEl ? `${pVn} (Hành tinh cao nhất)` : pVn, content: formatText(content) }
  })

  // Highlight: ruler of H10
  const mcREn = RULER_MAP[mcZName]
  const pH10Ruler = mcREn ? chartData.planets[mcREn] : undefined
  let highlightTxt: string, r10Label: string
  if (pH10Ruler) {
    const r10H = getHouseOfPlanet(pH10Ruler.lon, chartData.cusps)
    highlightTxt = mapRulerH10Loc[normalizeStr(`Nhà ${r10H}`)] || '(Dữ liệu đang cập nhật...)'
    r10Label = `Chủ tinh Nhà 10 ở Nhà ${r10H}`
  } else {
    r10Label = 'Chủ tinh Nhà 10'
    highlightTxt = '(Không tìm thấy vị trí hành tinh)'
  }

  // H10 interactions
  const impacts = common.h10Interactions.map(it => {
    const i = it as { target_house?: number; targetHouse?: number; type: string }
    const tH = i.target_house ?? i.targetHouse ?? 0
    const hKey = normalizeStr(`Nhà ${tH}`)
    const data = mapInteract[hKey] || {}
    const isSoft = i.type === 'Mềm'
    const shortTxt = isSoft ? (data.soft || '(Dữ liệu đang cập nhật...)') : (data.hard || '(Dữ liệu đang cập nhật...)')
    const detailTxt = isSoft ? (data.softDetail || '') : (data.hardDetail || '')
    const labelPrefix = common.isH10Empty ? 'Chủ tinh Nhà 10' : 'Nhà 10'
    return {
      label: `${labelPrefix} ${i.type.toLowerCase()} Nhà ${tH}`,
      content: { short: formatText(shortTxt), detail: formatText(detailTxt || shortTxt) },
    }
  })

  // Environment (H6)
  const cusps = chartData.cusps
  const h6Lon = cusps.length === 13 ? cusps[6] : cusps[5]
  const [, h6Z] = getZodiac(h6Lon)
  const r6En = RULER_MAP[h6Z]
  const r6Vn = PLANET_NAMES_VN[r6En || ''] || r6En || ''
  const envTxt = mapRulerH6[normalizeStr(r6Vn)] || '(Dữ liệu đang cập nhật...)'

  const pR6 = r6En ? chartData.planets[r6En] : undefined
  let r6LocTxt: string, r6LocLbl: string
  if (pR6) {
    const r6H = getHouseOfPlanet(pR6.lon, cusps)
    r6LocTxt = mapRulerH6Loc[normalizeStr(`Nhà ${r6H}`)] || '(Dữ liệu đang cập nhật...)'
    r6LocLbl = `Chủ tinh Nhà 6 ở Nhà ${r6H}`
  } else {
    r6LocTxt = '(Không tìm thấy vị trí hành tinh)'
    r6LocLbl = 'Chủ tinh Nhà 6'
  }

  return {
    mcInfo: { zodiac: mcZName.toUpperCase(), content: formatText(energyTxt) },
    roles,
    highlight: { label: r10Label, content: formatText(highlightTxt) },
    impacts,
    isH10Empty: common.isH10Empty,
    environment: { rulerLabel: r6Vn, rulerContent: formatText(envTxt), locLabel: r6LocLbl, locContent: formatText(r6LocTxt) },
  }
}
