// Block 1: Who Am I - Personality core (ported from block1_who_am_i.py)
import { getZodiac } from '@/lib/astrology/calculations'
import { PLANET_NAMES_VN } from '@/lib/astrology/constants'
import { normalizeStr, findColIndex, getRowValue, formatText } from '@/lib/astrology/base'
import type { ChartData, CommonData } from './manager'

function parseKnowledge(kbLoi: unknown[][]) {
  const mapCung: Record<string, Record<string, string>> = {}
  const mapNt: Record<string, Record<string, string>> = {}
  const mapTc: Record<string, Record<string, string>> = {}
  const mapNha: Record<string, string> = {}

  if (!kbLoi || kbLoi.length < 1) return { mapCung, mapNt, mapTc, mapNha }
  const headers = kbLoi[0] as string[]
  const rows = kbLoi.slice(1) as string[][]

  const idxC = findColIndex(headers, 'Cung')
  const idxTr = findColIndex(headers, 'Trái')
  const idxPh = findColIndex(headers, 'Phải')
  const idxNt = findColIndex(headers, 'Nguyên tố')
  const idxTrNt = findColIndex(headers, 'Trội Nguyên tố')
  const idxThNt = findColIndex(headers, 'Thiếu Nguyên tố')
  const idxTc = findColIndex(headers, 'Tính Chất')
  const idxTrTc = findColIndex(headers, 'Trội Tính Chất')
  const idxThTc = findColIndex(headers, 'Thiếu Tính Chất')
  const idxN = findColIndex(headers, 'Nhà')
  const idxYn = findColIndex(headers, 'Ý nghĩa')
  const idxCtTr = findColIndex(headers, 'Chi tiết Trái')
  const idxCtPh = findColIndex(headers, 'Chi tiết Phải')
  const idxCtTrNt = findColIndex(headers, 'Chi tiết Trội Nguyên tố')
  const idxCtThNt = findColIndex(headers, 'Chi tiết Thiếu Nguyên tố')
  const idxCtTrTc = findColIndex(headers, 'Chi tiết Trội Tính chất')
  const idxCtThTc = findColIndex(headers, 'Chi tiết Thiếu Tính chất')

  for (const r of rows) {
    const vC = getRowValue(r, idxC)
    if (vC) {
      mapCung[normalizeStr(vC)] = {
        trai: getRowValue(r, idxTr), phai: getRowValue(r, idxPh),
        ctTrai: getRowValue(r, idxCtTr), ctPhai: getRowValue(r, idxCtPh),
      }
    }
    const vNt = getRowValue(r, idxNt)
    if (vNt) {
      mapNt[normalizeStr(vNt)] = {
        troi: getRowValue(r, idxTrNt), thieu: getRowValue(r, idxThNt),
        ctTroi: getRowValue(r, idxCtTrNt), ctThieu: getRowValue(r, idxCtThNt),
      }
    }
    const vTc = getRowValue(r, idxTc)
    if (vTc) {
      mapTc[normalizeStr(vTc)] = {
        troi: getRowValue(r, idxTrTc), thieu: getRowValue(r, idxThTc),
        ctTroi: getRowValue(r, idxCtTrTc), ctThieu: getRowValue(r, idxCtThTc),
      }
    }
    const vN = getRowValue(r, idxN)
    if (vN) mapNha[normalizeStr(vN)] = getRowValue(r, idxYn)
  }

  return { mapCung, mapNt, mapTc, mapNha }
}

export function blockWhoAmI(chartData: ChartData, kbLoi: unknown[][], common: CommonData) {
  const { mapCung, mapNt, mapTc, mapNha } = parseKnowledge(kbLoi)

  const coreData = []
  for (const obj of ['Asc', 'Sun', 'Moon']) {
    const lon = chartData.planets[obj].lon
    const [, zName] = getZodiac(lon)
    const d = mapCung[normalizeStr(zName)] || { trai: '', phai: '', ctTrai: '', ctPhai: '' }
    const pVn = PLANET_NAMES_VN[obj] || obj

    coreData.push({
      label: pVn, zodiac: zName,
      left: { short: formatText(d.trai), detail: formatText(d.ctTrai || d.trai) },
      right: { short: formatText(d.phai), detail: formatText(d.ctPhai || d.phai) },
    })
  }

  const dominants = []
  if (common.elDom) {
    const c = mapNt[normalizeStr(common.elDom)] || {}
    dominants.push({
      label: `Trội ${common.elDom}`,
      content: { short: formatText(c.troi || ''), detail: formatText(c.ctTroi || c.troi || '') },
    })
  }
  if (common.modDom) {
    const c = mapTc[normalizeStr(common.modDom)] || {}
    dominants.push({
      label: `Trội ${common.modDom}`,
      content: { short: formatText(c.troi || ''), detail: formatText(c.ctTroi || c.troi || '') },
    })
  }

  const weaks = []
  for (const w of common.elWeaks) {
    const c = mapNt[normalizeStr(w)] || {}
    weaks.push({
      label: `Thiếu ${w}`,
      content: { short: formatText(c.thieu || ''), detail: formatText(c.ctThieu || c.thieu || '') },
    })
  }
  for (const w of common.modWeaks) {
    const c = mapTc[normalizeStr(w)] || {}
    weaks.push({
      label: `Thiếu ${w}`,
      content: { short: formatText(c.thieu || ''), detail: formatText(c.ctThieu || c.thieu || '') },
    })
  }

  const mappedHouses = common.domHouses.map(([h]) => ({
    num: h,
    meaning: formatText(mapNha[normalizeStr(`Nhà ${h}`)] || '(Dữ liệu đang cập nhật)'),
  }))

  return { coreData, careerAnalysis: { dominants, weaks }, mappedHouses }
}
