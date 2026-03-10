// Block 2: Talents (ported from block2_talents.py)
import { getZodiac } from '@/lib/astrology/calculations'
import { PERSONAL_PLANETS, RULER_MAP, PLANET_NAMES_VN } from '@/lib/astrology/constants'
import { normalizeStr, findColIndex, getRowValue, formatText, lookupMatrix } from '@/lib/astrology/base'
import type { ChartData, CommonData } from './manager'

function parseKnowledge(kbTaiNang: unknown[][]) {
  const mapCung: Record<string, { uu: string; nh: string }> = {}
  const mapNt: Record<string, { tr: string; th: string }> = {}
  const mapTc: Record<string, { tr: string; th: string }> = {}
  const mapNha: Record<string, string> = {}
  const mapPNhieuGoc: Record<string, { short: string; detail: string }> = {}
  const mapChuLaSo: Record<string, string> = {}

  if (!kbTaiNang || kbTaiNang.length < 1) return { mapCung, mapNt, mapTc, mapNha, mapPNhieuGoc, mapChuLaSo }
  const h = kbTaiNang[0] as string[]
  const rows = kbTaiNang.slice(1) as string[][]

  const idxC = findColIndex(h, 'Cung')
  const idxUu = findColIndex(h, 'ƯU ĐIỂM')
  const idxNh = findColIndex(h, 'NHƯỢC ĐIỂM')
  const idxNt = findColIndex(h, 'Nguyên tố')
  const idxTrNt = findColIndex(h, 'Trội Nguyên tố')
  const idxThNt = findColIndex(h, 'Thiếu Nguyên tố')
  const idxTc = findColIndex(h, 'Tính Chất')
  const idxTrTc = findColIndex(h, 'Trội Tính Chất')
  const idxThTc = findColIndex(h, 'Thiếu Tính Chất')
  const idxNhTroi = findColIndex(h, 'NHÀ TRỘI')
  const idxLvPt = findColIndex(h, 'LĨNH VỰC PHÁT TRIỂN')
  const idxPNhieu = findColIndex(h, 'HÀNH TINH NHIỀU GÓC')
  const idxTn = findColIndex(h, 'TÀI NĂNG')
  const idxCtTn = findColIndex(h, 'CHI TIẾT TÀI NĂNG')
  const idxChu = findColIndex(h, 'CHỦ TINH AC')
  const idxCc = findColIndex(h, 'CÔNG CỤ BẨM SINH')

  for (const r of rows) {
    const vc = getRowValue(r, idxC)
    if (vc) mapCung[normalizeStr(vc)] = { uu: getRowValue(r, idxUu), nh: getRowValue(r, idxNh) }
    const vnt = getRowValue(r, idxNt)
    if (vnt) mapNt[normalizeStr(vnt)] = { tr: getRowValue(r, idxTrNt), th: getRowValue(r, idxThNt) }
    const vtc = getRowValue(r, idxTc)
    if (vtc) mapTc[normalizeStr(vtc)] = { tr: getRowValue(r, idxTrTc), th: getRowValue(r, idxThTc) }
    const vnha = getRowValue(r, idxNhTroi)
    if (vnha) mapNha[normalizeStr(vnha)] = getRowValue(r, idxLvPt)
    const vp = getRowValue(r, idxPNhieu)
    if (vp) mapPNhieuGoc[normalizeStr(vp)] = { short: getRowValue(r, idxTn), detail: getRowValue(r, idxCtTn) }
    const vchu = getRowValue(r, idxChu)
    if (vchu) mapChuLaSo[normalizeStr(vchu)] = getRowValue(r, idxCc)
  }

  return { mapCung, mapNt, mapTc, mapNha, mapPNhieuGoc, mapChuLaSo }
}

export function blockTalents(chartData: ChartData, kbTaiNang: unknown[][], kbNangKhieu: unknown[][], common: CommonData) {
  const { mapCung, mapNt, mapTc, mapNha, mapPNhieuGoc, mapChuLaSo } = parseKnowledge(kbTaiNang)

  // Unique zodiacs from Asc/Sun/Moon
  const uniqueZodiacs: { name: string; content: string }[] = []
  const seen = new Set<string>()
  for (const obj of ['Asc', 'Sun', 'Moon']) {
    const [, zName] = getZodiac(chartData.planets[obj].lon)
    if (!seen.has(zName)) {
      seen.add(zName)
      const d = mapCung[normalizeStr(zName)] || { uu: '' }
      uniqueZodiacs.push({ name: zName, content: formatText(d.uu) })
    }
  }

  // Dominants
  const dominants: { label: string; content: string }[] = []
  if (common.elDom) {
    const c = mapNt[normalizeStr(common.elDom)]?.tr || ''
    dominants.push({ label: common.elDom, content: formatText(c) })
  }
  if (common.modDom) {
    const c = mapTc[normalizeStr(common.modDom)]?.tr || ''
    dominants.push({ label: common.modDom, content: formatText(c) })
  }

  // Houses
  const mappedHouses = common.domHouses.map(([hNum]) => ({
    label: `Nhà ${hNum}`,
    content: formatText(mapNha[normalizeStr(`Nhà ${hNum}`)] || ''),
  }))

  // Tight aspects
  const tightAspects = common.tightAspects.map(asp => {
    const a = asp as { p1: string; p2: string; nameVn?: string; name_vn?: string; orbRound?: number; orb_round?: number }
    const pPerEn = PERSONAL_PLANETS.includes(a.p1) ? a.p1 : a.p2
    const pOtherEn = PERSONAL_PLANETS.includes(a.p1) ? a.p2 : a.p1
    const pPerVn = PLANET_NAMES_VN[pPerEn] || pPerEn
    const pOtherVn = PLANET_NAMES_VN[pOtherEn] || pOtherEn
    const matrixText = lookupMatrix(kbNangKhieu, pPerVn, pOtherVn)
    const p1Vn = PLANET_NAMES_VN[a.p1] || a.p1
    const p2Vn = PLANET_NAMES_VN[a.p2] || a.p2
    return {
      label: `${p1Vn} - ${p2Vn}`,
      sub: `${a.nameVn || a.name_vn || ''} ${a.orbRound ?? a.orb_round ?? 0}°`,
      content: formatText(matrixText),
    }
  })

  // Many aspects (dominant planets)
  const manyAspects = common.domPlanets.map(dp => {
    const pVn = PLANET_NAMES_VN[dp.name] || dp.name
    const d = mapPNhieuGoc[normalizeStr(pVn)] || { short: '', detail: '' }
    return {
      label: pVn,
      content: { short: formatText(d.short), detail: formatText(d.detail || d.short) },
    }
  })

  // Chart ruler
  const ascLon = chartData.angles.Asc
  const [, azName] = getZodiac(ascLon)
  const chuTinhEn = RULER_MAP[azName] || ''
  const chuTinhVn = PLANET_NAMES_VN[chuTinhEn] || chuTinhEn
  const chuLaSo = {
    label: chuTinhVn,
    content: formatText(mapChuLaSo[normalizeStr(chuTinhVn)] || ''),
  }

  // Disadvantages
  const disadvantages: { name: string; content: string }[] = []
  const seenNh = new Set<string>()
  for (const obj of ['Asc', 'Sun', 'Moon']) {
    const [, zName] = getZodiac(chartData.planets[obj].lon)
    if (!seenNh.has(zName)) {
      seenNh.add(zName)
      const d = mapCung[normalizeStr(zName)] || { nh: '' }
      disadvantages.push({ name: zName, content: formatText(d.nh) })
    }
  }

  // Missing elements/modalities
  const missing: { type: string; label: string; content: string }[] = []
  for (const w of common.elWeaks) {
    missing.push({ type: 'Nguyên tố', label: w, content: formatText(mapNt[normalizeStr(w)]?.th || '') })
  }
  for (const w of common.modWeaks) {
    missing.push({ type: 'Tính chất', label: w, content: formatText(mapTc[normalizeStr(w)]?.th || '') })
  }

  return {
    summary: { zodiacs: uniqueZodiacs, dominants, houses: mappedHouses, talents: { tight: tightAspects, many: manyAspects }, ruler: chuLaSo },
    notes: { disadvantages, missing },
  }
}
