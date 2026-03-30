// Relationship prompt builder, ported from relationship/essay_pdf.py
// Steps: build_relationship_brief → format_brief_for_prompt → build prompt → sanitize output
import fs from 'fs'
import path from 'path'
import { getZodiac, getHouseOfPlanet, checkAspect } from '@/lib/astrology/calculations'
import type { ChartData, AspectResult } from '@/lib/astrology/calculations'
import { PLANET_NAMES_VN, ZODIAC_NAMES } from '@/lib/astrology/constants'
import type { RelBlocks } from './manager'

// ── Constants ────────────────────────────────────────────────────────────────

const OPPOSITE_SIGN: Record<string, string> = {}
for (let i = 0; i < ZODIAC_NAMES.length; i++) {
  OPPOSITE_SIGN[ZODIAC_NAMES[i]] = ZODIAC_NAMES[(i + 6) % 12]
}

const ANGLE_LABEL: Record<string, string> = {
  Conjunction: '0°', Sextile: '60°', Square: '90°',
  Trine: '120°', Opposition: '180°',
}

const DUYEN_SO_HOUSES = new Set([4, 7, 8])

const H58_EFFECT: Record<string, string> = {
  'Mars_5': 'kích thích cảm xúc sôi nổi, bị hút mạnh về thể chất và đam mê',
  'Mars_8': 'lực hút mãnh liệt, gắn kết sâu, dễ nghiện đối phương',
  'Venus_5': 'dễ rung động tự nhiên, cảm giác yêu nhẹ nhàng lãng mạn',
  'Venus_8': 'yêu sâu, cần sự thân mật, khó buông bỏ',
  'Moon_5': 'dễ cảm thấy thơ mộng, yêu thích sự hiện diện của đối phương',
  'Moon_8': 'gắn kết cảm xúc rất sâu, bản năng bảo vệ nhau',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(text: string): string {
  if (!text) return ''
  let t = String(text)
  t = t.replace(/<br\s*\/?>/gi, ' ')
  t = t.replace(/<[^>]+>/g, '')
  t = t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  return t.split(/\s+/).join(' ').trim()
}

function loadPromptTemplate(name: string): string {
  const promptPath = path.join(process.cwd(), 'src', 'prompts', `${name}.txt`)
  return fs.readFileSync(promptPath, 'utf-8')
}

function aspLabel(asp: AspectResult | null): string {
  if (!asp || asp.type === 'Minor') return 'Không có góc'
  const typeVn = asp.type === 'Soft' ? 'Góc Mềm' : 'Góc Cứng'
  const angle = ANGLE_LABEL[asp.aspect] || '?'
  return `${typeVn} / ${asp.name_vn} (${angle})`
}

function aspType(asp: AspectResult | null): 'soft' | 'hard' | null {
  if (!asp || asp.type === 'Minor') return null
  return asp.type === 'Soft' ? 'soft' : 'hard'
}

// ── Profile type ─────────────────────────────────────────────────────────────

interface Profile {
  name: string
  fullName?: string
  onlyName?: string
  gender?: string
  dob: { day: string; month: string; year: string }
}

// ── Brief types ──────────────────────────────────────────────────────────────

interface NhaTrongItem {
  nha: number
  chu: string
  content: string
  dom_content?: string  // nhà trội theme của CHỦ_NHÀ_TRỐNG (điều họ coi trọng)
}

interface DuyenSoData {
  houses: number[]
  items: { house: number; content: string }[]
}

interface RelBrief {
  meta: {
    name_A: string; name_B: string
    full_name_A: string; full_name_B: string
    title_A: string; title_B: string
    pronoun_A: string; pronoun_B: string
    gender_note: string
    dob_A: string; dob_B: string
    core_signs_A: string; core_signs_B: string
    _alias_A?: string; _alias_B?: string
  }
  personal_A: {
    planets: string
    dom_houses: string
    dom_houses_full: string
    b1_text: string
  }
  personal_B: {
    planets: string
    dom_houses: string
    dom_houses_full: string
    b1_text: string
  }
  synastry: {
    theme_A: string; theme_B: string
    acc: string | null
  }
  muc1: {
    act_A: string; act_B: string
  }
  muc2: {
    doi_dinh: { data: string } | null
    kim_hoa: { data: string } | null
    kim_moon: { data: string } | null
    pluto: { data: string } | null
    nha_5_8: { data: string } | null
    duyen_so: DuyenSoData | null
  }
  muc4: {
    hoa_hop: {
      dom_common: string
      dom_personal_common: string | null
      kim_thuy_mem: string | null
      kim_hoa_mem: string | null
      kim_moon_mem: string | null
    }
    xung_dot: {
      kim_thuy_cung: string | null
      kim_hoa_cung: string | null
      kim_moon_cung: string | null
      nha_trong: NhaTrongItem[]
    }
  }
  muc5: {
    tho_moon: string | null
    tho_kim: string | null
    tho_thuy: string | null
    tho_hoa: string | null
    nha_trong: NhaTrongItem[]
  }
  muc6: {
    n_empty_sp: number
    assessment: string
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  STEP 1: buildRelationshipBrief
// ══════════════════════════════════════════════════════════════════════════════

export function buildRelationshipBrief(
  chartA: ChartData, chartB: ChartData,
  relBlocks: RelBlocks,
  profileA: Profile, profileB: Profile,
): RelBrief {

  // ── Chart helpers ──────────────────────────────────────────────────────────

  function getZ(chart: ChartData, key: string): string {
    const [, z] = getZodiac(chart.planets[key].lon)
    return z
  }

  function getH(chart: ChartData, key: string): number {
    return getHouseOfPlanet(chart.planets[key].lon, chart.cusps)
  }

  function has(chart: ChartData, key: string): boolean {
    return key in chart.planets
  }

  function getAsp(c1: ChartData, p1: string, c2: ChartData, p2: string): AspectResult | null {
    if (!has(c1, p1) || !has(c2, p2)) return null
    return checkAspect(c1.planets[p1].lon, c2.planets[p2].lon)
  }

  function twoWayRaw(p1: string, p2: string): [AspectResult | null, AspectResult | null] {
    return [getAsp(chartA, p1, chartB, p2), getAsp(chartB, p1, chartA, p2)]
  }

  function twoWayText(p1: string, p2: string, label1: string, label2: string): string | null {
    const [aAB, aBA] = twoWayRaw(p1, p2)
    const lAB = aspLabel(aAB)
    const lBA = aspLabel(aBA)
    const lines: string[] = []
    if (lAB !== 'Không có góc') lines.push(`  ${label1} của ${nameA} → ${label2} của ${nameB}: ${lAB}`)
    if (lBA !== 'Không có góc') lines.push(`  ${label1} của ${nameB} → ${label2} của ${nameA}: ${lBA}`)
    return lines.length ? lines.join('\n') : null
  }

  function twoWayTextFiltered(p1: string, p2: string, label1: string, label2: string, onlyType: 'soft' | 'hard'): string | null {
    const [aAB, aBA] = twoWayRaw(p1, p2)
    const lines: string[] = []
    if (aspType(aAB) === onlyType) lines.push(`  ${label1} của ${nameA} → ${label2} của ${nameB}: ${aspLabel(aAB)}`)
    if (aspType(aBA) === onlyType) lines.push(`  ${label1} của ${nameB} → ${label2} của ${nameA}: ${aspLabel(aBA)}`)
    return lines.length ? lines.join('\n') : null
  }

  function twoWayHasType(p1: string, p2: string, wanted: Set<string>): boolean {
    const [aAB, aBA] = twoWayRaw(p1, p2)
    const tAB = aspType(aAB)
    const tBA = aspType(aBA)
    return (tAB !== null && wanted.has(tAB)) || (tBA !== null && wanted.has(tBA))
  }

  function dob(p: Profile): string {
    const d = p.dob || {} as Record<string, string>
    return `${d.day || '?'}/${d.month || '?'}/${d.year || '?'}`
  }

  // ── Gender & pronoun ───────────────────────────────────────────────────────

  const genderA = profileA.gender || 'Female'
  const genderB = profileB.gender || 'Female'
  const nameA = profileA.onlyName || profileA.name || 'A'
  const nameB = profileB.onlyName || profileB.name || 'B'
  const fullNameA = profileA.fullName || profileA.name || nameA
  const fullNameB = profileB.fullName || profileB.name || nameB
  const isMaleFemale = new Set([genderA, genderB]).has('Male') && new Set([genderA, genderB]).has('Female') && genderA !== genderB

  const titleA = 'Bạn', titleB = 'Bạn', pronounA = 'bạn', pronounB = 'bạn'

  const isMale = (g: string) => g === 'Male'
  const [nameMale, nameFemale] = isMaleFemale
    ? (isMale(genderA) ? [nameA, nameB] : [nameB, nameA])
    : [nameA, nameB]
  const genderNote = isMaleFemale
    ? `Cặp Nam-Nữ: bạn ${nameMale} là nam, bạn ${nameFemale} là nữ. Khi viết "Điều mỗi người mang đến" và "Vai trò mỗi người": thêm giới tính vào ngoặc đơn sau tên và dùng "giúp" thay "mang đến cho" — ví dụ: "Bạn ${nameMale} (nam) giúp bạn ${nameFemale} (nữ) – Cụm". Xưng hô thống nhất là "bạn".`
    : 'Cặp đồng giới / không xác định giới: luận linh hoạt theo năng lượng hành tinh, KHÔNG thêm giới tính hay gán vai trò, dùng "mang đến cho" khi viết về ảnh hưởng 2 chiều.'

  // ── Planet position lines ──────────────────────────────────────────────────

  function planetLines(chart: ChartData): string {
    const keys: [string, string][] = [
      ['Asc', 'Cung Mọc (AC)'], ['Sun', 'Mặt Trời'], ['Moon', 'Mặt Trăng'],
      ['Venus', 'Sao Kim'], ['Mars', 'Sao Hỏa'], ['Mercury', 'Sao Thủy'],
      ['Saturn', 'Sao Thổ'], ['Pluto', 'Diêm Vương'],
    ]
    const lines: string[] = []
    for (const [key, label] of keys) {
      if (!has(chart, key)) continue
      const z = getZ(chart, key)
      if (key === 'Asc') {
        lines.push(`  ${label}: ${z}`)
      } else {
        lines.push(`  ${label}: ${z}, Nhà ${getH(chart, key)}`)
      }
    }
    return lines.join('\n')
  }

  // ── Core signs summary ─────────────────────────────────────────────────────

  function coreSigns(chart: ChartData, name: string): string {
    const parts: string[] = []
    for (const [key, label] of [['Asc', 'AC'], ['Sun', 'Sun'], ['Moon', 'Moon']] as const) {
      if (has(chart, key)) parts.push(`${label} ${getZ(chart, key)}`)
    }
    return `  ${name}: ${parts.join(', ')}`
  }

  const coreSignsA = coreSigns(chartA, nameA)
  const coreSignsB = coreSigns(chartB, nameB)

  // ── Block data ─────────────────────────────────────────────────────────────

  const b1 = relBlocks.block1 || {} as RelBlocks['block1']
  const b2 = relBlocks.block2 || {} as RelBlocks['block2']
  const syn = relBlocks.syn_analysis || {} as RelBlocks['syn_analysis']

  function extractHouseThemes(contentHtml: string): string {
    const text = stripHtml(contentHtml)
    const m = text.match(/không thể hời hợt[:\s]+(.+?)(?:\n|Bạn cần|$)/is)
    if (m) {
      const topics = m[1].trim().replace(/\.$/, '')
      return topics.replace(/\s+/g, ' ')
    }
    return text.split('\n')[0].trim().substring(0, 120)
  }

  function fmtPersonB1(personData: Record<string, unknown>): string {
    const lines: string[] = []
    const core = (personData.core || []) as Record<string, string>[]
    for (const c of core) {
      const t = stripHtml(c.content || '')
      if (t) lines.push(`  - ${c.label || ''} (${c.zodiac || ''}): ${t}`)
    }

    const houses = (personData.houses || []) as Record<string, string>[]
    if (houses.length) {
      const houseParts: string[] = []
      for (const h of houses) {
        const label = h.label || ''
        const themes = extractHouseThemes(h.content || '')
        if (label && themes) houseParts.push(`${label}: ${themes}`)
      }
      if (houseParts.length) lines.push(`  Nhà trội: ${houseParts.join(' | ')}`)
    }

    const v = (personData.venus || {}) as Record<string, string>
    const vt = stripHtml(v.content || '')
    if (vt) lines.push(`  - ${v.label || ''}: ${vt}`)

    const th = (personData.theme || {}) as Record<string, string>
    const tt = stripHtml(th.content || '')
    if (tt) lines.push(`  - Theme năng lượng (${th.label || ''}): ${tt}`)

    return lines.join('\n') || '  N/A'
  }

  // Dominant houses
  const common = relBlocks.common || {} as RelBlocks['common']
  const domA = common.dom_A || []
  const domB = common.dom_B || []
  const domAStr = domA.slice(0, 5).map(([h, pts]) => `Nhà ${h} (${pts}đ)`).join(', ') || 'Không có'
  const domBStr = domB.slice(0, 5).map(([h, pts]) => `Nhà ${h} (${pts}đ)`).join(', ') || 'Không có'
  const domAAllSet = new Set(domA.map(([h]) => h))
  const domBAllSet = new Set(domB.map(([h]) => h))
  const domPersonalCommon = [...domAAllSet].filter(h => domBAllSet.has(h)).sort((a, b) => a - b)

  // Theme
  const themeAVn = PLANET_NAMES_VN[syn.dominant_A || ''] || syn.dominant_A || 'N/A'
  const themeBVn = PLANET_NAMES_VN[syn.dominant_B || ''] || syn.dominant_B || 'N/A'
  const acc = syn.accompanying
  let accText: string | null = null
  if (acc) {
    const accName = PLANET_NAMES_VN[acc.name || ''] || acc.name || ''
    const accOwner = acc.owner === 'A' ? nameA : nameB
    accText = `${accName} của ${accOwner}`
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  MUC 2
  // ══════════════════════════════════════════════════════════════════════════

  // --- 2.1 Opposite signs ---
  const oppLines: string[] = []
  for (const [key, label] of [['Asc', 'AC'], ['Sun', 'Mặt Trời'], ['Moon', 'Mặt Trăng']] as const) {
    if (has(chartA, key) && has(chartB, key)) {
      const zA = getZ(chartA, key)
      const zB = getZ(chartB, key)
      if (OPPOSITE_SIGN[zA] === zB) {
        oppLines.push(`  ${label}: ${nameA} ở ${zA} ↔ ${nameB} ở ${zB} (cặp đối đỉnh)`)
      }
    }
  }
  const muc2DoiDinh = oppLines.length ? { data: oppLines.join('\n') } : null

  // --- 2.2 Venus-Mars ---
  const kimHoaText = twoWayText('Venus', 'Mars', 'Sao Kim', 'Sao Hỏa')
  const muc2KimHoa = kimHoaText ? { data: kimHoaText } : null

  // --- 2.3 Venus-Moon ---
  const kimMoonText = twoWayText('Venus', 'Moon', 'Sao Kim', 'Mặt Trăng')
  const muc2KimMoon = kimMoonText ? { data: kimMoonText } : null

  // --- 2.4 Pluto ---
  const plutoKimText = twoWayText('Pluto', 'Venus', 'Diêm Vương', 'Sao Kim')
  const plutoMoonText = twoWayText('Pluto', 'Moon', 'Diêm Vương', 'Mặt Trăng')
  const plutoParts = [plutoKimText, plutoMoonText].filter(Boolean) as string[]
  const muc2Pluto = plutoParts.length ? { data: plutoParts.join('\n') } : null

  // --- 2.5 Houses 5 & 8 ---
  const h5h8Lines: string[] = []
  for (const [pname, pvn] of [['Venus', 'Sao Kim'], ['Mars', 'Sao Hỏa'], ['Moon', 'Mặt Trăng']] as const) {
    if (has(chartA, pname)) {
      const h = getHouseOfPlanet(chartA.planets[pname].lon, chartB.cusps)
      if (h === 5 || h === 8) {
        const effect = H58_EFFECT[`${pname}_${h}`] || ''
        h5h8Lines.push(`  ${pvn} của ${nameA} rơi vào Nhà ${h} của ${nameB} → ${nameB} (chủ nhà) cảm thấy: ${effect}`)
      }
    }
    if (has(chartB, pname)) {
      const h = getHouseOfPlanet(chartB.planets[pname].lon, chartA.cusps)
      if (h === 5 || h === 8) {
        const effect = H58_EFFECT[`${pname}_${h}`] || ''
        h5h8Lines.push(`  ${pvn} của ${nameB} rơi vào Nhà ${h} của ${nameA} → ${nameA} (chủ nhà) cảm thấy: ${effect}`)
      }
    }
  }
  const muc2Nha58 = h5h8Lines.length ? { data: h5h8Lines.join('\n') } : null

  // --- 2.6 Duyen so ---
  const duyenSoItems: { house: number; content: string }[] = []
  const domCommonList = b2.dom_common || []
  for (const x of domCommonList) {
    const lbl = x.label || ''
    const m = lbl.match(/Nhà\s*(\d+)/)
    if (!m) continue
    const hNum = parseInt(m[1])
    if (DUYEN_SO_HOUSES.has(hNum)) {
      const ct = stripHtml(x.content || '')
      duyenSoItems.push({ house: hNum, content: ct })
    }
  }
  const muc2DuyenSo: DuyenSoData | null = duyenSoItems.length
    ? { houses: duyenSoItems.map(i => i.house), items: duyenSoItems }
    : null

  // ══════════════════════════════════════════════════════════════════════════
  //  MUC 1: Activated houses
  // ══════════════════════════════════════════════════════════════════════════

  function fmtAct(actList: { label: string; content: string }[]): string {
    if (!actList || !actList.length) return '  (Không có nhà nổi bật)'
    const lines = actList
      .filter(item => stripHtml(item.content || ''))
      .map(item => `  - ${item.label}: ${stripHtml(item.content)}`)
    return lines.join('\n') || '  (Không có nhà nổi bật)'
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  MUC 4: Harmony & Conflict
  // ══════════════════════════════════════════════════════════════════════════

  // Harmony
  const domCommonText = domCommonList
    .filter(x => stripHtml(x.content || ''))
    .map(x => `  - ${x.label}: ${stripHtml(x.content)}`)
    .join('\n') || '  Không có nhà trội chung nổi bật'

  const domPersonalCommonStr = domPersonalCommon.length
    ? domPersonalCommon.map(h => `Nhà ${h}`).join(', ')
    : null

  // Venus-Mercury soft (for harmony Muc 4)
  const kimThuyMem = twoWayHasType('Venus', 'Mercury', new Set(['soft']))
    ? twoWayTextFiltered('Venus', 'Mercury', 'Sao Kim', 'Sao Thủy', 'soft')
    : null

  // Venus-Mars soft
  const kimHoaMem = twoWayHasType('Venus', 'Mars', new Set(['soft']))
    ? twoWayTextFiltered('Venus', 'Mars', 'Sao Kim', 'Sao Hỏa', 'soft')
    : null

  // Venus-Moon soft
  const kimMoonMem = twoWayHasType('Venus', 'Moon', new Set(['soft']))
    ? twoWayTextFiltered('Venus', 'Moon', 'Sao Kim', 'Mặt Trăng', 'soft')
    : null

  // Conflict: Venus-Mercury hard
  const kimThuyCung = twoWayHasType('Venus', 'Mercury', new Set(['hard']))
    ? twoWayTextFiltered('Venus', 'Mercury', 'Sao Kim', 'Sao Thủy', 'hard')
    : null

  // Conflict: Venus-Mars hard
  const kimHoaCung = twoWayHasType('Venus', 'Mars', new Set(['hard']))
    ? twoWayTextFiltered('Venus', 'Mars', 'Sao Kim', 'Sao Hỏa', 'hard')
    : null

  // Conflict: Venus-Moon hard
  const kimMoonCung = twoWayHasType('Venus', 'Moon', new Set(['hard']))
    ? twoWayTextFiltered('Venus', 'Moon', 'Sao Kim', 'Mặt Trăng', 'hard')
    : null

  // Helper: lấy theme nhà trội của 1 người từ b1 data
  function getDomHouseContent(personData: Record<string, unknown>, hNum: number): string {
    const houses = (personData.houses || []) as Record<string, string>[]
    for (const h of houses) {
      const lbl = h.label || ''
      const m = lbl.match(/Nh[aà]\s*(\d+)/i)
      if (m && parseInt(m[1]) === hNum) {
        return extractHouseThemes(h.content || '')
      }
    }
    return ''
  }

  // Empty special houses
  const emptySp = b2.empty_sp || []
  const nhaTrongItems: NhaTrongItem[] = []
  for (const x of emptySp) {
    const lbl = x.label || ''
    const ct = stripHtml(x.content || '')
    let hNum: number | null = null
    try {
      hNum = parseInt(lbl.replace('Nhà ', '').trim())
    } catch {
      hNum = null
    }
    if (hNum !== null && !isNaN(hNum)) {
      const inA = domAAllSet.has(hNum)
      const inB = domBAllSet.has(hNum)
      let owner: string
      if (inA && inB) owner = `${nameA} và ${nameB}`
      else if (inA) owner = nameA
      else if (inB) owner = nameB
      else owner = '?'
      // Lấy theme nhà trội của CHỦ_NHÀ_TRỐNG
      let domContent = ''
      if (inA && !inB) domContent = getDomHouseContent(b1.A || {}, hNum)
      else if (inB && !inA) domContent = getDomHouseContent(b1.B || {}, hNum)
      else if (inA && inB) domContent = getDomHouseContent(b1.A || {}, hNum) || getDomHouseContent(b1.B || {}, hNum)
      nhaTrongItems.push({
        nha: hNum,
        chu: owner,
        content: (ct && ct !== '(Dữ liệu đang cập nhật...)') ? ct : '',
        dom_content: domContent || undefined,
      })
    }
  }
  const nEmptySp = emptySp.length

  // ══════════════════════════════════════════════════════════════════════════
  //  MUC 5: Saturn lessons
  // ══════════════════════════════════════════════════════════════════════════

  const thoMoon = twoWayText('Saturn', 'Moon', 'Sao Thổ', 'Mặt Trăng')
  const thoKim = twoWayText('Saturn', 'Venus', 'Sao Thổ', 'Sao Kim')
  const thoThuy = twoWayText('Saturn', 'Mercury', 'Sao Thổ', 'Sao Thủy')
  const thoHoa = twoWayText('Saturn', 'Mars', 'Sao Thổ', 'Sao Hỏa')

  // ══════════════════════════════════════════════════════════════════════════
  //  Assemble brief
  // ══════════════════════════════════════════════════════════════════════════

  return {
    meta: {
      name_A: nameA, name_B: nameB,
      full_name_A: fullNameA, full_name_B: fullNameB,
      title_A: titleA, title_B: titleB,
      pronoun_A: pronounA, pronoun_B: pronounB,
      gender_note: genderNote,
      dob_A: dob(profileA), dob_B: dob(profileB),
      core_signs_A: coreSignsA, core_signs_B: coreSignsB,
    },
    personal_A: {
      planets: planetLines(chartA),
      dom_houses: domAStr,
      dom_houses_full: [...domAAllSet].sort((a, b) => a - b).map(h => `Nhà ${h}`).join(', ') || 'Không có',
      b1_text: fmtPersonB1(b1.A || {}),
    },
    personal_B: {
      planets: planetLines(chartB),
      dom_houses: domBStr,
      dom_houses_full: [...domBAllSet].sort((a, b) => a - b).map(h => `Nhà ${h}`).join(', ') || 'Không có',
      b1_text: fmtPersonB1(b1.B || {}),
    },
    synastry: {
      theme_A: themeAVn, theme_B: themeBVn,
      acc: accText,
    },
    muc1: {
      act_A: fmtAct(b2.act_A || []),
      act_B: fmtAct(b2.act_B || []),
    },
    muc2: {
      doi_dinh: muc2DoiDinh,
      kim_hoa: muc2KimHoa,
      kim_moon: muc2KimMoon,
      pluto: muc2Pluto,
      nha_5_8: muc2Nha58,
      duyen_so: muc2DuyenSo,
    },
    muc4: {
      hoa_hop: {
        dom_common: domCommonText,
        dom_personal_common: domPersonalCommonStr,
        kim_thuy_mem: kimThuyMem,
        kim_hoa_mem: kimHoaMem,
        kim_moon_mem: kimMoonMem,
      },
      xung_dot: {
        kim_thuy_cung: kimThuyCung,
        kim_hoa_cung: kimHoaCung,
        kim_moon_cung: kimMoonCung,
        nha_trong: nhaTrongItems,
      },
    },
    muc5: {
      tho_moon: thoMoon,
      tho_kim: thoKim,
      tho_thuy: thoThuy,
      tho_hoa: thoHoa,
      nha_trong: nhaTrongItems,
    },
    muc6: {
      n_empty_sp: nEmptySp,
      assessment: nEmptySp >= 3 ? 'nhiều thách thức và bài học' : 'mức độ hòa hợp cao',
    },
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  STEP 2: formatBriefForPrompt
// ══════════════════════════════════════════════════════════════════════════════

export function formatBriefForPrompt(brief: RelBrief): string {
  const m = brief.meta
  const realNameA = m.name_A
  const realNameB = m.name_B
  const aliasA = 'Nhân Vật A'
  const aliasB = 'Nhân Vật B'
  m._alias_A = aliasA
  m._alias_B = aliasB
  const nameA = aliasA
  const nameB = aliasB

  function mask(text: string): string {
    if (!text) return text
    return text.replace(new RegExp(escapeRegex(realNameA), 'g'), aliasA)
      .replace(new RegExp(escapeRegex(realNameB), 'g'), aliasB)
  }

  const lines: string[] = []
  const L = (s: string) => lines.push(s)

  L('=== DỮ LIỆU ĐÃ TÍNH TOÁN / BẢN ĐỒ MỐI QUAN HỆ ===\n')
  L(`NGƯỜI THỨ NHẤT: ${nameA.toUpperCase()} / Gọi là: ${m.title_A}`)
  L(`NGƯỜI THỨ HAI:  ${nameB.toUpperCase()} / Gọi là: ${m.title_B}\n`)

  // Personal chart A
  L('─'.repeat(60))
  L(`BẢN ĐỒ SAO: ${nameA.toUpperCase()}`)
  L('─'.repeat(60))
  L(brief.personal_A.planets)
  L(`Nhà trội cá nhân của ${nameA}: ${brief.personal_A.dom_houses}`)
  L(`\nPhân tích tính cách & mô hình quan hệ của ${nameA}:`)
  L(brief.personal_A.b1_text)

  // Personal chart B
  L(`\n${'─'.repeat(60)}`)
  L(`BẢN ĐỒ SAO: ${nameB.toUpperCase()}`)
  L('─'.repeat(60))
  L(brief.personal_B.planets)
  L(`Nhà trội cá nhân của ${nameB}: ${brief.personal_B.dom_houses}`)
  L(`\nPhân tích tính cách & mô hình quan hệ của ${nameB}:`)
  L(brief.personal_B.b1_text)

  // Synastry
  L(`\n${'─'.repeat(60)}`)
  L('SYNASTRY: TƯƠNG TÁC NĂNG LƯỢNG HAI BẢN ĐỒ')
  L('─'.repeat(60))
  const syn = brief.synastry
  L(`Theme chủ đạo của ${nameA}: ${syn.theme_A}`)
  L(`Theme chủ đạo của ${nameB}: ${syn.theme_B}`)
  if (syn.acc) L(`Hành tinh kèm: ${syn.acc}`)

  // Muc 1: Activated houses
  L('\nNHÀ ĐƯỢC KÍCH HOẠT:')
  L(`Nhà của ${nameA} được ${nameB} kích hoạt:`)
  L(brief.muc1.act_A)
  L(`\nNhà của ${nameB} được ${nameA} kích hoạt:`)
  L(brief.muc1.act_B)

  // Muc 2
  L(`\n${'═'.repeat(60)}`)
  L('MỤC 2 / TIẾNG GỌI TRÁI TIM')
  L('Kết quả tính toán / DANH SÁCH ĐÓNG, chỉ viết mục có VIẾT:')
  L('═'.repeat(60))

  const muc2 = brief.muc2

  function briefSection(name: string, data: { data: string } | null, extraNote = '') {
    if (data === null) {
      L(`\n  ${name}: → KHÔNG VIẾT (không có dữ liệu)`)
    } else {
      L(`\n  ${name}: → VIẾT`)
      if (data.data) L(`  Dữ liệu:\n${data.data}`)
      if (extraNote) L(`  ${extraNote}`)
    }
  }

  briefSection('Cặp cung đối đỉnh', muc2.doi_dinh)
  briefSection('Sao Kim – Sao Hỏa', muc2.kim_hoa)
  briefSection('Sao Kim – Mặt Trăng', muc2.kim_moon)
  briefSection('Pluto aspects', muc2.pluto)
  briefSection('Nhà 5 và Nhà 8', muc2.nha_5_8)

  // Duyen so
  const ds = muc2.duyen_so
  if (ds === null) {
    L('\n  Duyên số: → KHÔNG VIẾT (không có nhà 4/7/8 trong nhà trội chung)')
  } else {
    const houseList = ds.houses.join(', ')
    L('\n  Duyên số: → VIẾT')
    L(`  Danh sách nhà duyên số (ĐÓNG / CHỈ CÓ ${ds.houses.length} nhà): Nhà ${houseList}`)
    for (const item of ds.items) {
      L(`  - Nhà ${item.house}: ${item.content.substring(0, 300)}`)
    }
    L('  HẾT DANH SÁCH DUYÊN SỐ. KHÔNG CÓ NHÀ NÀO KHÁC.')
  }

  L('\n  === HẾT MỤC 2 ===')

  // Muc 4
  L(`\n${'═'.repeat(60)}`)
  L('MỤC 4 / CHUYỆN ĐÔI MÌNH')
  L('═'.repeat(60))

  const hh = brief.muc4.hoa_hop
  const pA = brief.personal_A
  const pB = brief.personal_B

  // Loi tinh cach hoa hop, always write
  L("\n  Tiểu mục 'Lõi tính cách hòa hợp': → VIẾT (luôn viết)")
  L('  Dữ liệu AC/Sun/Moon:')
  L(brief.meta.core_signs_A)
  L(brief.meta.core_signs_B)
  L('  (Luận điểm đồng điệu, bổ trợ từ lõi tính cách của 2 người)')

  // Dom personal common, conditional
  if (hh.dom_personal_common) {
    L('\n  Hòa hợp / Nhà trội cá nhân trùng nhau: → VIẾT')
    L(`  ${nameA} trội riêng: ${pA.dom_houses_full}`)
    L(`  ${nameB} trội riêng: ${pB.dom_houses_full}`)
    L(`  Nhà trùng: ${hh.dom_personal_common}`)
    L(`  (Cả ${nameA} và ${nameB} đều trội → cùng quan tâm lĩnh vực đó)`)
  } else {
    L('\n  Nhà trội cá nhân trùng nhau: → KHÔNG VIẾT (không trùng)')
  }

  briefSection('Hòa hợp / Kim-Thủy góc mềm', hh.kim_thuy_mem ? { data: hh.kim_thuy_mem } : null)
  briefSection('Hòa hợp / Kim-Hỏa góc mềm', hh.kim_hoa_mem ? { data: hh.kim_hoa_mem } : null)
  briefSection('Hòa hợp / Kim-Mặt Trăng góc mềm', hh.kim_moon_mem ? { data: hh.kim_moon_mem } : null)

  const xd = brief.muc4.xung_dot

  // Loi tinh cach xung dot, always write
  L("\n  Tiểu mục 'Lõi tính cách xung đột': → VIẾT (luôn viết)")
  L('  Dữ liệu AC/Sun/Moon (dùng lại dữ liệu đã cung cấp ở Hòa hợp):')
  L(brief.meta.core_signs_A)
  L(brief.meta.core_signs_B)
  L('  (Luận điểm xung đột tiềm ẩn từ lõi tính cách)')

  // Nha trong
  const nhaTrong = xd.nha_trong
  if (nhaTrong.length) {
    L(`\n  Nhà trống cần chú ý: → VIẾT (${nhaTrong.length} nhà)`)
    for (const nt of nhaTrong) {
      L(`  - Nhà ${nt.nha} → CHỦ_NHÀ_TRỐNG: ${nt.chu}`)
      if (nt.dom_content) L(`    Người này coi trọng: ${nt.dom_content.substring(0, 150)}`)
      if (nt.content) L(`    Nhà trống synastry: ${nt.content.substring(0, 200)}`)
    }
  } else {
    L('\n  Nhà trống cần chú ý: → KHÔNG VIẾT (không có)')
  }

  briefSection('Xung đột / Kim-Thủy góc cứng', xd.kim_thuy_cung ? { data: xd.kim_thuy_cung } : null)
  briefSection('Xung đột / Kim-Hỏa góc cứng', xd.kim_hoa_cung ? { data: xd.kim_hoa_cung } : null)
  briefSection('Xung đột / Kim-Mặt Trăng góc cứng', xd.kim_moon_cung ? { data: xd.kim_moon_cung } : null)

  // Muc 5
  L(`\n${'═'.repeat(60)}`)
  L('MỤC 5 / BÀI HỌC VÀ CHÌA KHÓA')
  L('═'.repeat(60))

  const m5 = brief.muc5
  briefSection('Thổ-Mặt Trăng (trưởng thành cảm xúc)', m5.tho_moon ? { data: m5.tho_moon } : null)
  briefSection('Thổ-Sao Kim (yêu có trách nhiệm)', m5.tho_kim ? { data: m5.tho_kim } : null)
  briefSection('Thổ-Sao Thủy (giao tiếp chín chắn)', m5.tho_thuy ? { data: m5.tho_thuy } : null)
  briefSection('Thổ-Sao Hỏa (xử lý xung đột)', m5.tho_hoa ? { data: m5.tho_hoa } : null)

  // Muc 6
  const m6 = brief.muc6
  L(`\n${'═'.repeat(60)}`)
  L('MỤC 6 / TỔNG KẾT')
  L('═'.repeat(60))
  L(`Tổng nhà trống cần chú ý: ${m6.n_empty_sp} nhà (${m6.assessment})`)

  // Mask all real names -> aliases
  let result = lines.join('\n')
  result = mask(result)
  return result
}

// ══════════════════════════════════════════════════════════════════════════════
//  STEP 3: buildRelationshipEssayPrompt
// ══════════════════════════════════════════════════════════════════════════════

export function buildRelationshipEssayPrompt(
  chartA: ChartData, chartB: ChartData,
  relBlocks: RelBlocks,
  profileA: Profile, profileB: Profile,
): { prompt: string; brief: RelBrief } {
  const brief = buildRelationshipBrief(chartA, chartB, relBlocks, profileA, profileB)
  const briefText = formatBriefForPrompt(brief)

  const m = brief.meta
  const aliasA = m._alias_A || m.name_A
  const aliasB = m._alias_B || m.name_B

  let instructions = loadPromptTemplate('relationship')
  // Replace template variables, full_name first (before name_A/B alias replacement)
  const replacements: Record<string, string> = {
    '{full_name_A}': m.full_name_A,
    '{full_name_B}': m.full_name_B,
    '{name_A}': aliasA,
    '{pronoun_A}': m.pronoun_A,
    '{title_A}': m.title_A,
    '{name_B}': aliasB,
    '{pronoun_B}': m.pronoun_B,
    '{title_B}': m.title_B,
    '{gender_note}': m.gender_note,
  }
  for (const [key, val] of Object.entries(replacements)) {
    instructions = instructions.split(key).join(val)
  }

  return { prompt: briefText + '\n\n' + instructions, brief }
}

// ══════════════════════════════════════════════════════════════════════════════
//  STEP 4: sanitizeRelationshipOutput
// ══════════════════════════════════════════════════════════════════════════════

export function sanitizeRelationshipOutput(text: string, brief: RelBrief): string {
  if (!text || !brief) return text

  const muc2 = brief.muc2

  // Find Muc 2 boundaries
  let m2Start = text.indexOf('2. Vì Sao')
  if (m2Start === -1) m2Start = text.indexOf('2. ')
  let m2End = text.indexOf('3. Ngôn Ngữ')
  if (m2End === -1) m2End = text.indexOf('3. ')
  if (m2Start === -1) return text

  let muc2Text = m2End !== -1 ? text.substring(m2Start, m2End) : text.substring(m2Start)

  // Subsections to remove from Muc 2 (KHONG VIET in brief)
  const removals: string[] = []
  if (muc2.kim_hoa === null) removals.push('Sao Kim – Sao Hỏa')
  if (muc2.kim_moon === null) removals.push('Sao Kim – Mặt Trăng')
  if (muc2.pluto === null) removals.push('Pluto aspects')
  if (muc2.doi_dinh === null) removals.push('Cặp cung đối đỉnh')
  if (muc2.nha_5_8 === null) removals.push('Nhà 5 và Nhà 8')
  // Always banned from Muc 2
  removals.push(
    'Sao Kim – Sao Thủy', 'Sao Thổ – Mặt Trăng',
    'Sao Thổ – Sao Kim', 'Sao Thổ – Sao Hỏa', 'Sao Thổ – Sao Thủy',
  )

  for (const label of removals) {
    const allLines = muc2Text.split('\n')
    const newLines: string[] = []
    let skip = false
    for (const ln of allLines) {
      const s = ln.trim()
      if (!skip && s.includes(label) && (s.endsWith(':') || s.endsWith(':  '))) {
        skip = true
        continue
      }
      if (skip) {
        if (s.endsWith(':') && s.length > 0 && s.length < 90 && !s.startsWith('[')) {
          skip = false
        } else if (/^\d+[.)]\s/.test(s)) {
          skip = false
        } else if (s.startsWith('[KTLUẬN]')) {
          skip = false
        } else {
          continue
        }
      }
      newLines.push(ln)
    }
    muc2Text = newLines.join('\n')
  }

  // Duyen so: remove invalid houses
  const ds = muc2.duyen_so
  if (ds !== null) {
    const validHouses = new Set(ds.houses)
    const dsIdx = muc2Text.toLowerCase().indexOf('duyên số')
    if (dsIdx !== -1) {
      const beforeDs = muc2Text.substring(0, dsIdx)
      let afterDs = muc2Text.substring(dsIdx)
      for (let h = 1; h <= 12; h++) {
        if (!validHouses.has(h)) {
          afterDs = afterDs.replace(
            new RegExp(`[^.]*\\b[Nn]hà\\s*${h}\\b[^.]*\\.\\s*`, 'g'),
            ''
          )
        }
      }
      muc2Text = beforeDs + afterDs
    }
  }

  // Reconstruct
  if (m2End !== -1) {
    text = text.substring(0, m2Start) + muc2Text + text.substring(m2End)
  } else {
    text = text.substring(0, m2Start) + muc2Text
  }

  // Cleanup technical labels
  text = text.replace(/\s*–\s*[Cc]hủ\s*[Nn]hà\s*[Tt]rống\s*:?\s*/g, ' ')
  text = text.replace(/CHỦ_NHÀ_TRỐNG\s*:?\s*/g, '')

  // Insert Muc 4 headings
  text = ensureMuc4Headings(text)

  // Strip continuation meta text
  for (const marker of ['Tôi đã hoàn thành', 'Tôi xin lỗi', 'Nếu bạn muốn tôi', 'Nếu bạn muốn:']) {
    const idx = text.indexOf(marker)
    if (idx !== -1) text = text.substring(0, idx).trimEnd()
  }

  // Replace aliases back to real names (onlyName)
  const meta = brief.meta
  const aliasA = meta._alias_A
  const aliasB = meta._alias_B
  const realA = meta.name_A   // onlyName of A
  const realB = meta.name_B   // onlyName of B
  if (aliasA && aliasB) {
    text = text.split(aliasA).join(realA).split(aliasB).join(realB)
    text = text.split(aliasA.toUpperCase()).join(realA.toUpperCase())
      .split(aliasB.toUpperCase()).join(realB.toUpperCase())
  }

  // Replace any full names the AI may have used in body/subtitles (picked up from greeting)
  // Only preserve full names in greeting (Kính gửi) and sign-off (Chúc) lines
  const fullNameA = meta.full_name_A
  const fullNameB = meta.full_name_B
  if (fullNameA && fullNameA !== realA) {
    text = text.split('\n').map(line => {
      const t = line.trim().toLowerCase()
      if (t.startsWith('kính gửi') || t.startsWith('chúc ')) return line
      return line.split(fullNameA).join(realA)
    }).join('\n')
  }
  if (fullNameB && fullNameB !== realB) {
    text = text.split('\n').map(line => {
      const t = line.trim().toLowerCase()
      if (t.startsWith('kính gửi') || t.startsWith('chúc ')) return line
      return line.split(fullNameB).join(realB)
    }).join('\n')
  }

  return text
}

// ── Muc 4 headings helper ────────────────────────────────────────────────────

function ensureMuc4Headings(text: string): string {
  const hhPattern = /lõi\s+tính\s+cách\s+hòa\s+hợp/i
  const xdPattern = /lõi\s+tính\s+cách\s+xung\s+đột/i

  function insertBeforeLine(txt: string, matchIndex: number, label: string): string {
    const lineStart = txt.lastIndexOf('\n', matchIndex - 1)
    const pos = lineStart !== -1 ? lineStart + 1 : 0
    return txt.substring(0, pos) + label + '\n\n' + txt.substring(pos)
  }

  let m4Start = text.indexOf('4. Điểm Hòa Hợp')
  if (m4Start === -1) m4Start = text.indexOf('4. ')
  let m4End = text.indexOf('5. Bài Học')
  if (m4End === -1) m4End = text.indexOf('5. ')
  if (m4Start === -1) return text

  let m4Text = m4End !== -1 ? text.substring(m4Start, m4End) : text.substring(m4Start)

  // Insert XUNG DOT first (so positions don't shift for HOA HOP)
  if (!m4Text.includes('XUNG ĐỘT')) {
    const xdMatch = xdPattern.exec(m4Text)
    if (xdMatch) {
      m4Text = insertBeforeLine(m4Text, xdMatch.index, 'XUNG ĐỘT')
    }
  }

  // Then insert HOA HOP
  if (!m4Text.includes('HÒA HỢP')) {
    const hhMatch = hhPattern.exec(m4Text)
    if (hhMatch) {
      m4Text = insertBeforeLine(m4Text, hhMatch.index, 'HÒA HỢP')
    }
  }

  if (m4End !== -1) {
    text = text.substring(0, m4Start) + m4Text + text.substring(m4End)
  } else {
    text = text.substring(0, m4Start) + m4Text
  }
  return text
}

// ── Utility ──────────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
