// Career prompt builder /Brief pattern (7-section new template)
import fs from 'fs'
import path from 'path'
import { getZodiac, getHouseOfPlanet } from '@/lib/astrology/calculations'
import type { ChartData } from '@/lib/astrology/calculations'
import { CORE_PLANETS, PLANET_NAMES_VN } from '@/lib/astrology/constants'

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(text: string): string {
  if (!text) return ''
  let t = String(text)
  t = t.replace(/<br\s*\/?>/gi, ' ')
  t = t.replace(/<[^>]+>/g, '')
  t = t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  return t.split(/\s+/).join(' ').trim()
}

function txt(contentField: unknown): string {
  if (typeof contentField === 'object' && contentField !== null) {
    const d = contentField as Record<string, string>
    return stripHtml(d.detail || d.short || '')
  }
  return stripHtml(String(contentField || ''))
}

function loadPromptTemplate(name: string): string {
  const promptPath = path.join(process.cwd(), 'src', 'prompts', `${name}.txt`)
  return fs.readFileSync(promptPath, 'utf-8')
}

// ── CareerBrief type ──────────────────────────────────────────────────────────

interface PlanetPos { zodiac: string; house: number }

interface CareerBrief {
  meta: {
    name: string
    fullName: string
    pronoun: string
    dobStr: string
  }
  muc1: {
    core: { label: string; zodiac: string; strength: string; weakness: string }[]
    dominants: { label: string; content: string }[]
    weaks: { label: string; content: string }[]
    houses: { num: number; meaning: string }[]
  }
  muc2: {
    zodiacs: { name: string; content: string }[]
    dominants: { label: string; content: string }[]
    houses: { label: string; content: string }[]
    tightAspects: { label: string; sub: string; content: string }[]
    manyAspects: { label: string; content: string }[]
    ruler: { label: string; content: string }
  }
  muc3: {
    zodiacs: { name: string; content: string }[]
    missing: { type: string; label: string; content: string }[]
    saturn: PlanetPos | null
    pluto: PlanetPos | null
  }
  muc4: {
    h10Zodiac: string
    h10Energy: string
    h10Planets: { label: string; content: string }[]
    h10Interactions: { label: string; type: string; content: string }[]
    isH10Empty: boolean
    mars: PlanetPos | null
    h6Zodiac: string
    h6Planets: string[]         // raw VN names, no KB
    h6Ruler: string
    h6RulerContent: string
    h6RulerLoc: string
    h6RulerLocContent: string
  }
  muc5: {
    h2Zodiac: string
    h2EarnContent: string
    h2Planets: { label: string; content: string }[]
    h2RulerLoc: string
    h2RulerLocContent: string
    h2Hard: { label: string; content: string }[]   // thách thức
    h2Soft: { label: string; content: string }[]   // thuận lợi
    isH2Empty: boolean
    h2SaturnOrPluto: string[]   // e.g. ["Sao Thổ (Nhà 2)"]
    h8Zodiac: string
    h8InvestContent: string
    h8Planets: string[]         // raw VN names
    h8RulerLoc: string
    h8RulerLocContent: string
    h8SaturnOrPluto: string[]
    favorable: string[]
    moneyNotes: { label: string; content: string }[]
  }
}

// ── STEP 1: buildCareerBrief ──────────────────────────────────────────────────

export function buildCareerBrief(
  chartData: ChartData,
  careerData: Record<string, unknown>,
  profile: { name: string; fullName?: string; onlyName?: string; gender?: string; dob: { day: string; month: string; year: string } },
): CareerBrief {
  const fullName = profile.fullName || profile.name || ''
  const name = profile.onlyName || profile.name || ''
  const pronoun = 'bạn'
  const dobStr = `${profile.dob.day}/${profile.dob.month}/${profile.dob.year}`

  const b1 = (careerData.block1 || {}) as Record<string, unknown>
  const b2 = (careerData.block2 || {}) as Record<string, unknown>
  const b3 = (careerData.block3 || {}) as Record<string, unknown>
  const b4 = (careerData.block4 || {}) as Record<string, unknown>

  const planets = chartData.planets
  const cusps = chartData.cusps

  // ── Helper: get planet position ──
  function getPlanetPos(pKey: string): PlanetPos | null {
    if (!(pKey in planets)) return null
    const [, zodiac] = getZodiac(planets[pKey].lon)
    const house = getHouseOfPlanet(planets[pKey].lon, cusps)
    return { zodiac, house }
  }

  // ── Helper: planets in house ──
  function planetsInHouse(hNum: number): string[] {
    return CORE_PLANETS
      .filter(p => p in planets && getHouseOfPlanet(planets[p].lon, cusps) === hNum)
      .map(p => PLANET_NAMES_VN[p] || p)
  }

  // ── Muc 1 ──
  const coreData = (b1.coreData || b1.core_data || []) as Record<string, unknown>[]
  const analysis = (b1.careerAnalysis || b1.career_analysis || {}) as Record<string, unknown[]>

  // ── Muc 2 ──
  const summary = (b2.summary || {}) as Record<string, unknown>
  const talents = (summary.talents || {}) as Record<string, unknown[]>
  const ruler = (summary.ruler || {}) as Record<string, string>
  const notes = (b2.notes || {}) as Record<string, unknown[]>

  // ── Muc 4: H10 ──
  const mc = (b3.mcInfo || b3.mc_info || {}) as Record<string, string>
  const h10Interactions = (b3.impacts || []) as Record<string, unknown>[]

  // H6 data
  const env = (b3.environment || {}) as Record<string, string>

  // H6 zodiac from cusps
  const h6Lon = cusps.length === 13 ? cusps[6] : cusps[5]
  const [, h6Zodiac] = getZodiac(h6Lon)
  const h6Planets = planetsInHouse(6)

  // ── Muc 5: H2/H8 ──
  const s1 = (b4.section1 || {}) as Record<string, unknown>
  const earn = (s1.earnHow || s1.earn_how || {}) as Record<string, string>
  const s2 = (b4.section2 || {}) as Record<string, string>
  const s3 = (b4.section3 || {}) as Record<string, unknown>
  const styleD = (s3.style || {}) as Record<string, string>
  const fld = (s3.field || {}) as Record<string, string>
  const h2Impacts = (b4.h2Impacts || b4.h2_impacts || []) as Record<string, unknown>[]

  // Separate H2 interactions into hard vs soft
  const h2Hard = h2Impacts
    .filter(i => (i as { label: string; content: unknown; type?: string }).label?.toLowerCase().includes('cứng') || String(i.label || '').toLowerCase().includes('cứng'))
    .map(i => ({ label: String(i.label || ''), content: txt(i.content) }))
  const h2Soft = h2Impacts
    .filter(i => String(i.label || '').toLowerCase().includes('mềm'))
    .map(i => ({ label: String(i.label || ''), content: txt(i.content) }))

  // H8 planets
  const h8Planets = planetsInHouse(8)

  // Saturn/Pluto in H2 or H8
  const saturnPos = getPlanetPos('Saturn')
  const plutoPos = getPlanetPos('Pluto')

  const h2SaturnOrPluto: string[] = []
  const h8SaturnOrPluto: string[] = []
  if (saturnPos) {
    if (saturnPos.house === 2) h2SaturnOrPluto.push('Sao Thổ')
    if (saturnPos.house === 8) h8SaturnOrPluto.push('Sao Thổ')
  }
  if (plutoPos) {
    if (plutoPos.house === 2) h2SaturnOrPluto.push('Diêm Vương')
    if (plutoPos.house === 8) h8SaturnOrPluto.push('Diêm Vương')
  }

  return {
    meta: { name, fullName, pronoun, dobStr },

    muc1: {
      core: coreData.map(item => ({
        label: String(item.label || ''),
        zodiac: String(item.zodiac || ''),
        strength: txt(item.left),
        weakness: txt(item.right),
      })),
      dominants: ((analysis.dominants || []) as Record<string, unknown>[]).map(d => ({
        label: String(d.label || ''),
        content: txt(d.content),
      })),
      weaks: ((analysis.weaks || []) as Record<string, unknown>[]).map(w => ({
        label: String(w.label || ''),
        content: txt(w.content),
      })),
      houses: ((b1.mappedHouses || b1.mapped_houses || []) as Record<string, unknown>[]).map(h => ({
        num: Number(h.num || 0),
        meaning: stripHtml(String(h.meaning || '')),
      })),
    },

    muc2: {
      zodiacs: ((summary.zodiacs || []) as Record<string, string>[]).map(z => ({
        name: z.name || '',
        content: stripHtml(z.content || ''),
      })),
      dominants: ((summary.dominants || []) as Record<string, string>[]).map(d => ({
        label: d.label || '',
        content: stripHtml(d.content || ''),
      })),
      houses: ((summary.houses || []) as Record<string, string>[]).map(h => ({
        label: h.label || '',
        content: stripHtml(h.content || ''),
      })),
      tightAspects: ((talents.tight || []) as Record<string, string>[]).map(ta => ({
        label: ta.label || '',
        sub: ta.sub || '',
        content: stripHtml(ta.content || ''),
      })),
      manyAspects: ((talents.many || []) as Record<string, unknown>[]).map(ma => ({
        label: String(ma.label || ''),
        content: txt(ma.content),
      })),
      ruler: { label: ruler.label || '', content: stripHtml(ruler.content || '') },
    },

    muc3: {
      zodiacs: ((notes.disadvantages || []) as Record<string, string>[]).map(d => ({
        name: d.name || '',
        content: stripHtml(d.content || ''),
      })),
      missing: ((notes.missing || []) as Record<string, string>[]).map(m => ({
        type: m.type || '',
        label: m.label || '',
        content: stripHtml(m.content || ''),
      })),
      saturn: saturnPos,
      pluto: plutoPos,
    },

    muc4: {
      h10Zodiac: mc.zodiac || '',
      h10Energy: stripHtml(mc.content || ''),
      h10Planets: ((b3.roles || []) as Record<string, string>[]).map(r => ({
        label: r.label || '',
        content: stripHtml(r.content || ''),
      })),
      h10Interactions: h10Interactions.map(imp => ({
        label: String(imp.label || ''),
        type: String((imp as Record<string, string>).type || ''),
        content: txt(imp.content),
      })),
      isH10Empty: Boolean(b3.isH10Empty || b3.is_h10_empty),
      mars: getPlanetPos('Mars'),
      h6Zodiac,
      h6Planets,
      h6Ruler: env.rulerLabel || env.ruler_label || '',
      h6RulerContent: stripHtml(env.rulerContent || env.ruler_content || ''),
      h6RulerLoc: env.locLabel || env.loc_label || '',
      h6RulerLocContent: stripHtml(env.locContent || env.loc_content || ''),
    },

    muc5: {
      h2Zodiac: earn.label || '',
      h2EarnContent: stripHtml(earn.content || ''),
      h2Planets: ((s1.energies || []) as Record<string, string>[]).map(e => ({
        label: e.label || '',
        content: stripHtml(e.content || ''),
      })),
      h2RulerLoc: s2.label || '',
      h2RulerLocContent: stripHtml(s2.content || ''),
      h2Hard,
      h2Soft,
      isH2Empty: Boolean(b4.isH2Empty || b4.is_h2_empty),
      h2SaturnOrPluto,
      h8Zodiac: styleD.label || '',
      h8InvestContent: stripHtml(styleD.content || ''),
      h8Planets,
      h8RulerLoc: fld.label || '',
      h8RulerLocContent: stripHtml(fld.content || ''),
      h8SaturnOrPluto,
      favorable: (b4.favSigns || b4.fav_signs || []) as string[],
      moneyNotes: ((b4.moneyNotes || b4.money_notes || []) as Record<string, string>[]).map(mn => ({
        label: mn.label || '',
        content: stripHtml(mn.content || ''),
      })),
    },
  }
}

// ── STEP 2: formatCareerBriefForPrompt ───────────────────────────────────────

function briefLine(label: string, data: string | null, extraNote = ''): string {
  if (data === null || data.trim() === '') {
    return `\n  ${label}: → KHÔNG VIẾT (không có dữ liệu)`
  }
  const lines = [`\n  ${label}: → VIẾT`, `  Dữ liệu: ${data}`]
  if (extraNote) lines.push(`  ${extraNote}`)
  return lines.join('\n')
}

export function formatCareerBriefForPrompt(brief: CareerBrief): string {
  const { meta, muc1, muc2, muc3, muc4, muc5 } = brief
  const { name, fullName, pronoun, dobStr } = meta
  const L: string[] = []

  L.push(`=== DỮ LIỆU ĐÃ TÍNH TOÁN /BẢN ĐỒ HƯỚNG NGHIỆP ===`)
  L.push(`Họ tên: ${fullName} | Ngày sinh: ${dobStr}`)

  // ══ MỤC 1: Tổng quan bản chất ══
  L.push(`\n${'═'.repeat(60)}`)
  L.push('MỤC 1 /TỔNG QUAN BẢN CHẤT CON NGƯỜI')
  L.push('═'.repeat(60))

  for (const c of muc1.core) {
    L.push(`\n  ${c.label} /Cung ${c.zodiac}:`)
    if (c.strength) L.push(`    Thế mạnh / Cách tiếp cận: ${c.strength}`)
    if (c.weakness) L.push(`    Điểm yếu / Cần chú ý: ${c.weakness}`)
  }

  if (muc1.dominants.length) {
    L.push('\n  Nguyên tố & Tính chất nổi trội:')
    for (const d of muc1.dominants) {
      if (d.content) L.push(`    ${d.label}: ${d.content}`)
    }
  }
  if (muc1.weaks.length) {
    L.push('\n  Nguyên tố & Tính chất thiếu hụt:')
    for (const w of muc1.weaks) {
      if (w.content) L.push(`    ${w.label}: ${w.content}`)
    }
  }
  if (muc1.houses.length) {
    L.push('\n  Nhà trội (lĩnh vực đặc biệt quan tâm):')
    for (const h of muc1.houses) {
      if (h.meaning) L.push(`    Nhà ${h.num}: ${h.meaning}`)
    }
  }

  // ══ MỤC 2: Điểm mạnh bẩm sinh ══
  L.push(`\n${'═'.repeat(60)}`)
  L.push('MỤC 2 /ĐIỂM MẠNH BẨM SINH VÀ NĂNG LỰC TỰ NHIÊN')
  L.push('═'.repeat(60))

  if (muc2.zodiacs.length) {
    L.push('\n  Ưu điểm từ lõi tính cách (AC/Sun/Moon):')
    for (const z of muc2.zodiacs) {
      if (z.content) L.push(`    Cung ${z.name}: ${z.content}`)
    }
  }
  if (muc2.dominants.length) {
    L.push('\n  Phát huy từ nguyên tố/tính chất trội:')
    for (const d of muc2.dominants) {
      if (d.content) L.push(`    ${d.label}: ${d.content}`)
    }
  }
  if (muc2.houses.length) {
    L.push('\n  Lĩnh vực phát triển từ nhà trội:')
    for (const h of muc2.houses) {
      if (h.content) L.push(`    ${h.label}: ${h.content}`)
    }
  }
  if (muc2.tightAspects.length) {
    L.push('\n  Năng khiếu bẩm sinh (góc chiếu chặt nhất):')
    for (const ta of muc2.tightAspects) {
      if (ta.content) L.push(`    ${ta.label} (${ta.sub}): ${ta.content}`)
    }
  }
  if (muc2.manyAspects.length) {
    L.push('\n  Năng khiếu từ hành tinh tạo nhiều góc:')
    for (const ma of muc2.manyAspects) {
      if (ma.content) L.push(`    ${ma.label}: ${ma.content}`)
    }
  }
  if (muc2.ruler.content) {
    L.push(`\n  Công cụ bẩm sinh /Chủ bản đồ sao (${muc2.ruler.label}): ${muc2.ruler.content}`)
  }

  // ══ MỤC 3: Điểm yếu ══
  L.push(`\n${'═'.repeat(60)}`)
  L.push('MỤC 3 /NHỮNG ĐIỂM YẾU VÀ CẦN PHÁT TRIỂN')
  L.push('═'.repeat(60))

  if (muc3.zodiacs.length) {
    L.push('\n  Nhược điểm từ lõi tính cách (AC/Sun/Moon):')
    for (const z of muc3.zodiacs) {
      if (z.content) L.push(`    Cung ${z.name}: ${z.content}`)
    }
  }
  if (muc3.missing.length) {
    L.push('\n  Thiếu hụt cần bù đắp:')
    for (const m of muc3.missing) {
      if (m.content) L.push(`    Thiếu ${m.type} ${m.label}: ${m.content}`)
    }
  }

  // Saturn
  if (muc3.saturn) {
    L.push(briefLine(
      'Sao Thổ (áp lực, trách nhiệm, nơi tự ti)',
      `Cung ${muc3.saturn.zodiac}, Nhà ${muc3.saturn.house}`,
      'Nhà này là nơi có xu hướng tự ti, mặc cảm, cảm giác trách nhiệm đè nặng và khó vượt qua.'
    ))
  } else {
    L.push('\n  Sao Thổ: → KHÔNG VIẾT (không có dữ liệu)')
  }

  // Pluto
  if (muc3.pluto) {
    L.push(briefLine(
      'Diêm Vương (cực đoan, biến động sâu)',
      `Cung ${muc3.pluto.zodiac}, Nhà ${muc3.pluto.house}`,
      'Nhà này có xu hướng cực đoan, kiểm soát, nhiều biến động và chuyển hóa sâu.'
    ))
  } else {
    L.push('\n  Diêm Vương: → KHÔNG VIẾT (không có dữ liệu)')
  }

  // ══ MỤC 4: Định hướng sự nghiệp ══
  L.push(`\n${'═'.repeat(60)}`)
  L.push('MỤC 4 /ĐỊNH HƯỚNG SỰ NGHIỆP PHÙ HỢP')
  L.push('═'.repeat(60))

  // H10
  if (muc4.h10Energy) {
    L.push(`\n  Năng lượng sự nghiệp /Đỉnh Nhà 10 (${muc4.h10Zodiac}): ${muc4.h10Energy}`)
  }

  if (muc4.h10Planets.length) {
    L.push(`\n  Hành tinh trong Nhà 10 (năng lượng & thái độ đặt vào sự nghiệp):`)
    for (const r of muc4.h10Planets) {
      if (r.content) L.push(`    ${r.label}: ${r.content}`)
    }
  } else if (muc4.isH10Empty) {
    L.push('\n  Nhà 10 trống /luận theo chủ tinh Nhà 10 bên dưới.')
  }

  // H10 interactions
  if (muc4.h10Interactions.length) {
    const hardInter = muc4.h10Interactions.filter(i => i.label.toLowerCase().includes('cứng'))
    const softInter = muc4.h10Interactions.filter(i => i.label.toLowerCase().includes('mềm'))
    if (hardInter.length) {
      L.push('\n  Thách thức sự nghiệp (tương tác cứng):')
      for (const i of hardInter) {
        if (i.content) L.push(`    ${i.label}: ${i.content}`)
      }
    }
    if (softInter.length) {
      L.push('\n  Hỗ trợ sự nghiệp (tương tác mềm):')
      for (const i of softInter) {
        if (i.content) L.push(`    ${i.label}: ${i.content}`)
      }
    }
  } else {
    L.push('\n  Tương tác Nhà 10: → KHÔNG VIẾT (không có tương tác)')
  }

  // Mars
  if (muc4.mars) {
    L.push(briefLine(
      'Sao Hỏa (phong cách hành động, giải quyết vấn đề)',
      `Cung ${muc4.mars.zodiac}, Nhà ${muc4.mars.house}`,
      'Luận về cách khách hàng hành động, xử lý thử thách và thúc đẩy bản thân trong sự nghiệp.'
    ))
  }

  // H6
  L.push(`\n  Môi trường làm việc phù hợp /Đỉnh Nhà 6: ${muc4.h6Zodiac}`)
  if (muc4.h6Planets.length) {
    L.push(`  Hành tinh trong Nhà 6: ${muc4.h6Planets.join(', ')} → luận về thái độ với công việc hàng ngày`)
  } else {
    L.push('  Nhà 6 trống /luận theo chủ tinh bên dưới.')
  }
  if (muc4.h6RulerContent) {
    L.push(`  Chủ tinh Nhà 6 (${muc4.h6Ruler}) /Môi trường phù hợp: ${muc4.h6RulerContent}`)
  }
  if (muc4.h6RulerLocContent) {
    L.push(`  ${muc4.h6RulerLoc}: ${muc4.h6RulerLocContent}`)
  }

  // ══ MỤC 5: Tiền bạc ══
  L.push(`\n${'═'.repeat(60)}`)
  L.push('MỤC 5 /MÔ THỨC TIỀN BẠC')
  L.push('═'.repeat(60))

  // H2
  if (muc5.h2EarnContent) {
    L.push(`\n  Cách kiếm tiền /Đỉnh Nhà 2 (${muc5.h2Zodiac}): ${muc5.h2EarnContent}`)
  }
  if (muc5.h2Planets.length) {
    L.push('\n  Hành tinh trong Nhà 2 (thái độ & năng lượng với tiền bạc):')
    for (const p of muc5.h2Planets) {
      if (p.content) L.push(`    ${p.label}: ${p.content}`)
    }
  } else if (muc5.isH2Empty) {
    L.push('  Nhà 2 trống /luận theo chủ tinh Nhà 2.')
  }
  if (muc5.h2RulerLocContent) {
    L.push(`  ${muc5.h2RulerLoc} (lĩnh vực tạo ra tiền): ${muc5.h2RulerLocContent}`)
  }

  // H8
  if (muc5.h8InvestContent) {
    L.push(`\n  Phong cách đầu tư /Đỉnh Nhà 8 (${muc5.h8Zodiac}): ${muc5.h8InvestContent}`)
  }
  if (muc5.h8Planets.length) {
    L.push(`  Hành tinh trong Nhà 8: ${muc5.h8Planets.join(', ')} → luận về thái độ, năng lượng khi đầu tư`)
  } else {
    L.push('  Nhà 8 trống /luận theo chủ tinh Nhà 8.')
  }
  if (muc5.h8RulerLocContent) {
    L.push(`  ${muc5.h8RulerLoc} (lĩnh vực nên đầu tư): ${muc5.h8RulerLocContent}`)
  }

  // H2 thách thức (cứng)
  if (muc5.h2Hard.length || muc5.h2SaturnOrPluto.length) {
    L.push('\n  Thách thức tiền bạc (cản trở, khó khăn):')
    for (const i of muc5.h2Hard) {
      if (i.content) L.push(`    ${i.label}: ${i.content}`)
    }
    if (muc5.h2SaturnOrPluto.length) {
      L.push(`    Cảnh báo: ${muc5.h2SaturnOrPluto.join(', ')} ở Nhà 2 → kỷ luật tài chính cần thiết, có thể thiếu hụt hoặc trì hoãn`)
    }
    if (muc5.h8SaturnOrPluto.length) {
      L.push(`    Cảnh báo: ${muc5.h8SaturnOrPluto.join(', ')} ở Nhà 8 → đầu tư cần cẩn trọng, rủi ro tiềm ẩn`)
    }
  } else {
    L.push('\n  Thách thức tiền bạc: → KHÔNG VIẾT (không có tương tác cứng và không có Thổ/Diêm Vương ở H2/H8)')
  }

  // H2 thuận lợi (mềm)
  if (muc5.h2Soft.length || muc5.favorable.length) {
    L.push('\n  Dấu hiệu thuận lợi tài chính:')
    for (const i of muc5.h2Soft) {
      if (i.content) L.push(`    ${i.label}: ${i.content}`)
    }
    for (const f of muc5.favorable) {
      L.push(`    Dấu hiệu: ${f}`)
    }
  } else {
    L.push('\n  Dấu hiệu thuận lợi tài chính: → KHÔNG VIẾT (không có)')
  }

  // Lưu ý chi tiêu
  if (muc5.moneyNotes.length) {
    L.push('\n  Lưu ý quản lý tài chính (xu hướng chi tiêu):')
    for (const mn of muc5.moneyNotes) {
      if (mn.content) L.push(`    ${mn.label}: ${mn.content}`)
    }
  } else {
    L.push('\n  Lưu ý quản lý tài chính: → KHÔNG VIẾT (không có dấu hiệu)')
  }

  return L.join('\n')
}

// ── STEP 3: buildCareerPrompt ─────────────────────────────────────────────────

export function buildCareerPrompt(
  careerData: Record<string, unknown>,
  profile: { name: string; fullName?: string; onlyName?: string; gender?: string; dob: { day: string; month: string; year: string } },
  chartData?: ChartData,
): string {
  const fullName = profile.fullName || profile.name || ''
  const name = profile.onlyName || profile.name || ''
  const pronoun = 'bạn'
  const dobStr = `${profile.dob.day}/${profile.dob.month}/${profile.dob.year}`

  // Age-conditional greeting
  const today = new Date()
  const dobDate = new Date(Number(profile.dob.year), Number(profile.dob.month) - 1, Number(profile.dob.day))
  let age = today.getFullYear() - dobDate.getFullYear()
  const m = today.getMonth() - dobDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) age--

  const greetingAdult = `Bạn yêu mến!\n\nChào mừng bạn đến với hành trình hiểu chính mình.\n\nCó thể bạn đang đứng trước một ngã rẽ trong công việc và cuộc sống, cũng có thể bạn chỉ đơn giản muốn hiểu bản thân mình rõ hơn. Bởi trong cuộc đời, ai cũng có những giai đoạn phải dừng lại và tự hỏi:\n\nMình thật sự phù hợp với điều gì?\nCon đường nào mới là hướng đi đúng với mình?\n\nMỗi người khi sinh ra đều mang theo một "hạt giống" riêng. Có những hạt giống cần được đặt đúng môi trường để nảy mầm, phát triển và tỏa sáng. Chiêm tinh giống như một tấm bản đồ giúp bạn nhận ra hạt giống đó - những điểm mạnh tự nhiên, cách bạn phát triển tốt nhất và môi trường giúp bạn trưởng thành.\n\nHy vọng bản luận giải này sẽ giúp bạn nhìn rõ hơn những tiềm năng bên trong mình, tìm thấy hướng đi phù hợp và từng bước xây dựng một con đường sự nghiệp vững vàng và bền vững hơn cho tương lai.`

  const greetingYoung = `Bạn yêu mến!\n\nChào mừng bạn đến với hành trình khám phá chính mình.\n\nCó thể bạn đang bắt đầu nghĩ nhiều hơn về tương lai:\n\nMình phù hợp với ngành học nào?\nMình nên theo đuổi điều gì để vừa phát triển tốt vừa cảm thấy thật sự là chính mình?\n\nĐôi khi việc chọn hướng đi không hề dễ dàng, bởi mỗi người trong chúng ta đều có những điểm mạnh và cách phát triển rất khác nhau.\n\nTheo chiêm tinh, khi sinh ra mỗi người đều mang theo một "hạt giống" riêng - những khả năng tự nhiên, cách tư duy và môi trường phù hợp để mình phát triển tốt nhất. Chiêm tinh giống như một tấm bản đồ nhỏ giúp bạn nhận ra những tiềm năng đó, để từ đó hiểu mình rõ hơn và tự tin lựa chọn con đường phù hợp cho tương lai.\n\nHy vọng bản luận giải này sẽ giúp bạn khám phá thêm những điều thú vị về bản thân và tìm thấy hướng đi khiến bạn vừa phát triển tốt vừa cảm thấy hứng thú với hành trình phía trước.`

  const greeting = age >= 22 ? greetingAdult : greetingYoung

  let briefText: string

  if (chartData) {
    // New path: use Brief system
    const brief = buildCareerBrief(chartData, careerData, profile)
    briefText = formatCareerBriefForPrompt(brief)
  } else {
    // Fallback: legacy block format (backward compat)
    briefText = buildLegacyBriefText(careerData)
  }

  const instructions = loadPromptTemplate('career')
    .replace(/{greeting}/g, greeting)
    .replace(/{pronoun}/g, pronoun)
    .replace(/{full_name}/g, fullName)
    .replace(/{name}/g, name)
    .replace(/{dob_str}/g, dobStr)

  return briefText + '\n\n' + instructions
}

// ── Legacy fallback (giữ backward compat) ────────────────────────────────────

function buildLegacyBriefText(careerData: Record<string, unknown>): string {
  const b1 = (careerData.block1 || {}) as Record<string, unknown>
  const b2 = (careerData.block2 || {}) as Record<string, unknown>
  const b3 = (careerData.block3 || {}) as Record<string, unknown>
  const b4 = (careerData.block4 || {}) as Record<string, unknown>

  const lines: string[] = ['=== DỮ LIỆU PHÂN TÍCH BẢN ĐỒ SAO (LEGACY) ===']

  lines.push('\n=== BLOCK 1: CON NGƯỜI & TÍNH CÁCH ===')
  for (const item of (b1.coreData || b1.core_data || []) as Record<string, unknown>[]) {
    const leftTxt = txt(item.left)
    const rightTxt = txt(item.right)
    lines.push(`\n${item.label} - Cung ${item.zodiac}:`)
    if (leftTxt) lines.push(`  Thế mạnh: ${leftTxt}`)
    if (rightTxt) lines.push(`  Điểm yếu: ${rightTxt}`)
  }
  const analysis = (b1.careerAnalysis || b1.career_analysis || {}) as Record<string, unknown[]>
  for (const dom of (analysis.dominants || []) as Record<string, unknown>[]) {
    const t = txt(dom.content)
    if (t) lines.push(`\n${dom.label}: ${t}`)
  }
  for (const w of (analysis.weaks || []) as Record<string, unknown>[]) {
    const t = txt(w.content)
    if (t) lines.push(`${w.label}: ${t}`)
  }

  lines.push('\n=== BLOCK 2: TÀI NĂNG ===')
  const summary = (b2.summary || {}) as Record<string, unknown>
  const talents = (summary.talents || {}) as Record<string, unknown[]>
  const ruler = (summary.ruler || {}) as Record<string, string>
  for (const z of (summary.zodiacs || []) as Record<string, string>[]) {
    if (z.content) lines.push(`Ưu điểm Cung ${z.name}: ${stripHtml(z.content)}`)
  }
  for (const ta of (talents.tight || []) as Record<string, string>[]) {
    if (ta.content) lines.push(`Góc chặt ${ta.label}: ${stripHtml(ta.content)}`)
  }
  if (ruler.content) lines.push(`Chủ bản đồ sao (${ruler.label}): ${stripHtml(ruler.content)}`)

  lines.push('\n=== BLOCK 3: SỰ NGHIỆP ===')
  const mc = (b3.mcInfo || b3.mc_info || {}) as Record<string, string>
  if (mc.content) lines.push(`Đỉnh Nhà 10 (${mc.zodiac}): ${stripHtml(mc.content)}`)

  lines.push('\n=== BLOCK 4: TÀI CHÍNH ===')
  const s1 = (b4.section1 || {}) as Record<string, unknown>
  const earn = (s1.earnHow || s1.earn_how || {}) as Record<string, string>
  if (earn.content) lines.push(`Cách kiếm tiền (Nhà 2 = ${earn.label}): ${stripHtml(earn.content)}`)

  return lines.join('\n')
}
