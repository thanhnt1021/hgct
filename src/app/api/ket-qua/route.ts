import { NextResponse } from 'next/server'
import { calculateChart, getZodiac, getDominantHousesSorted, getOuterPlanetCycleData } from '@/lib/astrology/calculations'
import { generateNatalChartSvg, generateSynastryTransitChartSvg, generateTransitChartSvg } from '@/lib/pdf/chartSvg'
import { getKnowledgeFromDB } from '@/lib/astrology/knowledge'
import { getVanHanBlocks } from '@/lib/logic/vanhan/manager'
import { normalizeStr, findColIndex, getRowValue } from '@/lib/astrology/base'

// POST /api/ket-qua — PUBLIC. Trả về CẢ:
//  - cores: 3 lõi (Cung mọc/Mặt trời/Mặt trăng) — dùng khi vào từ form chung S2.
//  - houses: các nhà trội (score≥4) — dùng khi vào từ nút service S1.
// Trang ket-qua chọn hiển thị cái nào theo chế độ của lá số đã lưu.

const CORE_LABELS: Record<string, string> = { Sun: 'Mặt trời', Moon: 'Mặt trăng', Asc: 'Cung mọc' }
const pad = (n: number) => String(n).padStart(2, '0')

// 3 lõi: CUNG LÕI → MẶT TRỜI / MẶT TRĂNG / CUNG MỌC
function parseLoiCols(kbLoi: unknown[][]): Record<string, { Sun: string; Moon: string; Asc: string }> {
  const map: Record<string, { Sun: string; Moon: string; Asc: string }> = {}
  if (!kbLoi || kbLoi.length < 1) return map
  const headers = kbLoi[0] as string[]
  const iCung = findColIndex(headers, 'CUNG LÕI')
  const iSun = findColIndex(headers, 'MẶT TRỜI')
  const iMoon = findColIndex(headers, 'MẶT TRĂNG')
  const iAsc = findColIndex(headers, 'CUNG MỌC')
  if (iCung < 0) return map
  for (const r of kbLoi.slice(1) as string[][]) {
    const vC = getRowValue(r, iCung)
    if (vC) map[normalizeStr(vC)] = { Sun: getRowValue(r, iSun), Moon: getRowValue(r, iMoon), Asc: getRowValue(r, iAsc) }
  }
  return map
}

// Nhà trội: NHÀ (NHÀ 1..12) → "Ý NGHĨA NHÀ TRỘI AI"
function parseHouseMeanings(kbLoi: unknown[][]): Record<number, string> {
  const map: Record<number, string> = {}
  if (!kbLoi || kbLoi.length < 1) return map
  const headers = kbLoi[0] as string[]
  const iNha = findColIndex(headers, 'NHÀ')
  const iText = findColIndex(headers, 'Ý NGHĨA NHÀ TRỘI AI')
  if (iNha < 0 || iText < 0) return map
  for (const r of kbLoi.slice(1) as string[][]) {
    const num = parseInt(String(getRowValue(r, iNha)).replace(/\D/g, ''), 10)
    if (num >= 1 && num <= 12) map[num] = (getRowValue(r, iText) || '').trim()
  }
  return map
}

// Cảm giác an toàn theo Mặt Trăng: MOON CUNG NÀO → AI MOON AN TOÀN
function parseMoonSafety(kbTq: unknown[][]): Record<string, string> {
  const map: Record<string, string> = {}
  if (!kbTq || kbTq.length < 1) return map
  const headers = kbTq[0] as string[]
  const iMoon = findColIndex(headers, 'MOON CUNG NÀO')
  const iText = findColIndex(headers, 'AI MOON AN TOÀN')
  if (iMoon < 0 || iText < 0) return map
  for (const r of kbTq.slice(1) as string[][]) {
    const v = getRowValue(r, iMoon)
    if (v) map[normalizeStr(v)] = (getRowValue(r, iText) || '').trim()
  }
  return map
}

// Gu tình yêu theo Sao Kim: SAO KIM → 3 cột AI (GU-THÍCH NGƯỜI / BỊ HÚT BỞI VIBE / KHÔNG THÍCH NGƯỜI)
function parseLoveByVenus(kbTq: unknown[][]): Record<string, { guthich: string; vibe: string; khong: string }> {
  const map: Record<string, { guthich: string; vibe: string; khong: string }> = {}
  if (!kbTq || kbTq.length < 1) return map
  const headers = kbTq[0] as string[]
  const iKim = findColIndex(headers, 'SAO KIM')
  const iGT = findColIndex(headers, 'AI GU-THÍCH NGƯỜI')
  const iVibe = findColIndex(headers, 'AI BỊ HÚT BỞI VIBE')
  const iKhong = findColIndex(headers, 'AI KHÔNG THÍCH NGƯỜI')
  if (iKim < 0) return map
  for (const r of kbTq.slice(1) as string[][]) {
    const vKim = getRowValue(r, iKim)
    if (vKim) map[normalizeStr(vKim)] = { guthich: getRowValue(r, iGT), vibe: getRowValue(r, iVibe), khong: getRowValue(r, iKhong) }
  }
  return map
}

// Nội dung vận hạn theo cột sheet thật: VẬN HẠN SAO MỘC/THỔ (NHÀ 1..12) → CHI TIẾT. Map theo số nhà.
function parseVanHanContent(kbVh: unknown[][]): { jupiter: Record<number, string>; saturn: Record<number, string> } {
  const jupiter: Record<number, string> = {}, saturn: Record<number, string> = {}
  if (!kbVh || kbVh.length < 1) return { jupiter, saturn }
  const headers = kbVh[0] as string[]
  const iMoc = findColIndex(headers, 'VẬN HẠN SAO MỘC'), iMocCt = findColIndex(headers, 'CHI TIẾT VẬN HẠN SAO MỘC')
  const iTho = findColIndex(headers, 'VẬN HẠN SAO THỔ'), iThoCt = findColIndex(headers, 'CHI TIẾT VẬN HẠN SAO THỔ')
  for (const r of kbVh.slice(1) as string[][]) {
    if (iMoc >= 0) { const n = parseInt(String(getRowValue(r, iMoc)).replace(/\D/g, ''), 10); if (n >= 1 && n <= 12) jupiter[n] = (getRowValue(r, iMocCt) || '').trim() }
    if (iTho >= 0) { const n = parseInt(String(getRowValue(r, iTho)).replace(/\D/g, ''), 10); if (n >= 1 && n <= 12) saturn[n] = (getRowValue(r, iThoCt) || '').trim() }
  }
  return { jupiter, saturn }
}

function chartFromInput(d: { dob: { day: number; month: number; year: number }; tob?: { hour?: number; minute?: number }; loc: { lat: number; lon: number; tz: string } }) {
  const dobStr = `${pad(d.dob.day)}/${pad(d.dob.month)}/${d.dob.year}`
  const tobStr = `${pad(d.tob?.hour ?? 12)}:${pad(d.tob?.minute ?? 0)}`
  return calculateChart(dobStr, tobStr, d.loc.lat, d.loc.lon, d.loc.tz)
}

// Khoảng vận hạn = hôm nay → +365 ngày (ISO YYYY-MM-DD) — KHỚP reportProcessor (bản PDF cũ).
function transitRange(): { startISO: string; endISO: string } {
  return {
    startISO: new Date().toISOString().split('T')[0],
    endISO: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
  }
}

export async function POST(req: Request) {
  try {
    const { inputData, inputDataB, view } = await req.json()
    if (!inputData?.dob || !inputData?.loc) {
      return NextResponse.json({ error: 'Thiếu thông tin đầu vào' }, { status: 400 })
    }
    const { name } = inputData
    const { startISO, endISO } = transitRange()

    const chart = chartFromInput(inputData)
    if (!chart) return NextResponse.json({ error: 'Không tính được bản đồ sao' }, { status: 422 })

    const chartB = inputDataB?.dob && inputDataB?.loc ? chartFromInput(inputDataB) : null
    const kb = await getKnowledgeFromDB()

    // 3 lõi (rẻ, luôn tính — dùng cho S2 cores)
    const kbLoi = (kb['LÕI TÍNH CÁCH'] as unknown[][]) || []
    const loiMap = parseLoiCols(kbLoi)
    const cores = (['Asc', 'Sun', 'Moon'] as const).map(obj => {
      const lon = obj === 'Asc' ? chart.angles.Asc : chart.planets[obj]?.lon ?? 0
      const [, zName] = getZodiac(lon)
      return { key: obj, label: CORE_LABELS[obj], sign: zName, text: (loiMap[normalizeStr(zName)]?.[obj] || '').trim() }
    })

    // ── Chỉ tính phần NẶNG theo đúng view; mỗi phần bọc try/catch để 1 cái lỗi không kéo sập cả trang ──
    let svg = ''
    let houses: unknown[] = [], love: unknown[] = [], moonSafety: unknown[] = [], transit: unknown[] = []
    let venusSign = ''

    // SVG bản đồ sao
    try {
      if (chartB) svg = generateSynastryTransitChartSvg(chart, chartB, null)
      else if (view === 'transit') {
        const dVN = (iso: string) => { const x = new Date(iso); return `${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()}` }
        const cycleData = getOuterPlanetCycleData(dVN(startISO), dVN(endISO), inputData.loc.lat, inputData.loc.lon)
        svg = generateTransitChartSvg(chart, {}, cycleData, { name })
      } else svg = generateNatalChartSvg(chart, { name })
    } catch { svg = generateNatalChartSvg(chart, { name }) }

    if (view === 'houses') {
      try {
        const houseMeanings = parseHouseMeanings(kbLoi)
        houses = getDominantHousesSorted(chart).map(({ house, score }) => ({ house, label: `Nhà ${house}`, score, text: houseMeanings[house] || '' }))
      } catch { /* để rỗng */ }
    } else if (view === 'love') {
      try {
        const loveMap = parseLoveByVenus((kb['love-TỔNG QUAN'] as unknown[][]) || [])
        const [, vs] = getZodiac(chart.planets['Venus']?.lon ?? 0); venusSign = vs
        const lv = loveMap[normalizeStr(vs)]
        if (lv) love = [
          { key: 'guthich', label: 'Gu & người bạn thích', text: lv.guthich },
          { key: 'vibe', label: 'Vibe khiến bạn rung động', text: lv.vibe },
          { key: 'khong', label: 'Kiểu người không hợp', text: lv.khong },
        ]
      } catch { /* để rỗng */ }
    } else if (view === 'synastry') {
      try {
        const moonMap = parseMoonSafety((kb['love-TỔNG QUAN'] as unknown[][]) || [])
        const moonOf = (c: typeof chart, nm?: string) => { const [, mSign] = getZodiac(c!.planets['Moon']?.lon ?? 0); return { name: nm || '', sign: mSign, text: moonMap[normalizeStr(mSign)] || '' } }
        moonSafety = chartB ? [moonOf(chart, name), moonOf(chartB, inputDataB?.name || inputDataB?.ten)] : [moonOf(chart, name)]
      } catch { /* để rỗng */ }
    } else if (view === 'transit') {
      try {
        const vh = getVanHanBlocks(chart, startISO, endISO, kb)
        const hOf = (planet: string) => vh.block1.transitTable.find(t => t.planet === planet)?.endHouse || 0
        const sHouse = hOf('Saturn'), jHouse = hOf('Jupiter')
        const vhContent = parseVanHanContent((kb['VẬN HẠN'] as unknown[][]) || [])
        transit = [
          { key: 'thachthuc', label: 'Thách thức', sub: `Sao Thổ · Nhà ${sHouse}`, text: sHouse ? (vhContent.saturn[sHouse] || '') : '' },
          { key: 'thuanloi', label: 'Thuận lợi', sub: `Sao Mộc · Nhà ${jHouse}`, text: jHouse ? (vhContent.jupiter[jHouse] || '') : '' },
        ]
      } catch { /* để rỗng */ }
    }

    return NextResponse.json({ svg, cores, houses, venusSign, love, moonSafety, transit })
  } catch (e) {
    return NextResponse.json({ error: 'Lỗi xử lý', detail: String(e) }, { status: 500 })
  }
}
