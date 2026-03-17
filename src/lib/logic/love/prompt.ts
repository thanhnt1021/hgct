// Love prompt builder, Brief system matching /root/mo/app/logic/love/essay_pdf.py
// Template: 6-section love essay per user specification
import fs from 'fs'
import path from 'path'
import { getZodiac, getHouseOfPlanet, checkAspect } from '@/lib/astrology/calculations'
import type { ChartData } from '@/lib/astrology/calculations'
import { CORE_PLANETS, PLANET_NAMES_VN, RULER_MAP } from '@/lib/astrology/constants'

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

// Venus/Moon hard aspect targets and their meaning labels
const VENUS_HARD_PLANETS: Record<string, string> = {
  Saturn: 'Kim cứng Thổ → sợ bị từ chối, tự ti, yêu muộn',
  Pluto:  'Kim cứng Diêm Vương → yêu sâu, kiểm soát, ám ảnh khó buông',
  Uranus: 'Kim cứng Thiên Vương → tình yêu chớp nhoáng, yêu nhanh rời nhanh, thích tự do',
  Neptune:'Kim cứng Hải Vương → lý tưởng hóa tình yêu, hi sinh, dễ vỡ mộng',
  Mars:   'Kim cứng Hỏa → yêu mãnh liệt nhưng dễ xung đột',
}
const MOON_HARD_PLANETS: Record<string, string> = {
  Saturn: 'Trăng cứng Thổ → sợ bị từ chối, tự ti, khó mở lòng',
  Pluto:  'Trăng cứng Diêm Vương → cảm xúc sâu cực đoan, kiểm soát, ám ảnh',
  Neptune:'Trăng cứng Hải Vương → lý tưởng hóa, hi sinh, dễ mất bản thân trong tình yêu',
  Mars:   'Trăng cứng Hỏa → cảm xúc bùng nổ, yêu mãnh liệt nhưng dễ xung đột',
}
// Saturn bài học targets
const SATURN_LESSON_PLANETS: Record<string, string> = {
  Moon:    'Saturn-Moon → học trưởng thành cảm xúc, không mang sợ hãi cũ vào tình yêu mới',
  Venus:   'Saturn-Venus → học yêu có trách nhiệm, cam kết thật sự thay vì né tránh',
  Mercury: 'Saturn-Mercury → học giao tiếp chín chắn, nói thật thay vì im lặng hoặc né xung đột',
  Mars:    'Saturn-Mars → học xử lý xung đột lành mạnh, không bùng nổ hoặc đóng băng',
}
// North Node (True Node) love lessons
const NORTH_NODE_LOVE: Record<number, string> = {
  5: 'La Hầu Nhà 5 → bài học: mở lòng, bộc lộ cảm xúc, dám yêu dám bị nhìn thấy',
  7: 'La Hầu Nhà 7 → bài học: học mở lòng bước vào cam kết thật sự; mô thức cũ hay quá độc lập, sợ ràng buộc',
  8: 'La Hầu Nhà 8 → bài học: học tin tưởng, chia sẻ tổn thương sâu nhất, để người kia thật sự vào',
}
// Chiron love wounds
const CHIRON_LOVE: Record<number, string> = {
  5: 'Chiron Nhà 5 → vết thương: từng bị từ chối hoặc yêu đơn phương → sợ yêu, giấu cảm xúc, khó thổ lộ',
  7: 'Chiron Nhà 7 → vết thương: từng bị bỏ rơi hoặc kiểm soát trong quan hệ → sợ tiến vào cam kết',
  8: 'Chiron Nhà 8 → vết thương: từng gắn kết sâu bị phản bội → yêu nhưng khó chia sẻ, sợ không được tin',
}

// ── Brief builder ────────────────────────────────────────────────

function buildLoveBrief(
  chartData: ChartData,
  loveBlocks: Record<string, unknown>,
  profile: { name: string; fullName?: string; onlyName?: string; gender?: string; dob: { day: string; month: string; year: string } }
): string {
  const fullName = profile.fullName || profile.name || ''
  const name = profile.onlyName || profile.name || ''
  const pronoun = 'bạn'
  const dobStr = `${profile.dob.day}/${profile.dob.month}/${profile.dob.year}`

  const planets = chartData.planets
  const cusps = chartData.cusps

  function getZ(key: string): string {
    if (!(key in planets)) return '?'
    const [, z] = getZodiac(planets[key].lon)
    return z
  }
  function getH(key: string): number {
    if (!(key in planets)) return 0
    return getHouseOfPlanet(planets[key].lon, cusps)
  }
  function psIn(hNum: number): string[] {
    return CORE_PLANETS
      .filter(p => p in planets && getHouseOfPlanet(planets[p].lon, cusps) === hNum)
      .map(p => PLANET_NAMES_VN[p] || p)
  }

  // Core positions
  const ascZ   = getZ('Asc')
  const sunZ   = getZ('Sun');   const sunH   = getH('Sun')
  const moonZ  = getZ('Moon');  const moonH  = getH('Moon')
  const venusZ = getZ('Venus'); const venusH = getH('Venus')
  const marsZ  = getZ('Mars');  const marsH  = getH('Mars')

  // H7
  const h7Lon = cusps.length === 13 ? cusps[7] : cusps[6]
  const [, h7Z] = getZodiac(h7Lon)
  const h7Ps = psIn(7)
  const rulerH7 = RULER_MAP[h7Z]
  const rulerH7H = rulerH7 && rulerH7 in planets ? getH(rulerH7) : 0
  const rulerH7Vn = rulerH7 ? (PLANET_NAMES_VN[rulerH7] || rulerH7) : 'N/A'

  // Block data
  const b1 = (loveBlocks.block1 || {}) as Record<string, unknown>
  const b2 = (loveBlocks.block2 || {}) as Record<string, unknown>

  const coreData   = (b1.coreData   || []) as { label: string; zodiac: string; cho: string; yeu: string }[]
  const attraction = (b1.attraction || []) as { label: string; content: string }[]
  const venusGu    = stripHtml(String(b1.venusGu    || ''))
  const moonAnToan = stripHtml(String(b1.moonAnToan || ''))
  const h7Peak     = (b2.peak  || {}) as { zodiac: string; energy: string }
  const h7Roles    = (b2.roles || []) as { label: string; content: string }[]
  const h7Meeting  = (b2.meeting || {}) as { rulerLabel: string; rulerHouse: number; content: string }
  const h7Ints     = (b2.interactions || []) as { label: string; type: string; content: string }[]

  // Venus hard aspects (only with specific planets from template)
  const venusHardLines: string[] = []
  for (const [pKey, label] of Object.entries(VENUS_HARD_PLANETS)) {
    if (!(pKey in planets) || !('Venus' in planets)) continue
    const asp = checkAspect(planets['Venus'].lon, planets[pKey].lon)
    if (asp && asp.type === 'Hard') {
      venusHardLines.push(`  Sao Kim ${asp.name_vn} ${PLANET_NAMES_VN[pKey] || pKey} (orb ${asp.orb_round}°) → VIẾT\n  ${label}`)
    } else {
      venusHardLines.push(`  Kim-${PLANET_NAMES_VN[pKey] || pKey} → KHÔNG VIẾT`)
    }
  }

  // Moon hard aspects (only with specific planets from template)
  const moonHardLines: string[] = []
  for (const [pKey, label] of Object.entries(MOON_HARD_PLANETS)) {
    if (!(pKey in planets) || !('Moon' in planets)) continue
    const asp = checkAspect(planets['Moon'].lon, planets[pKey].lon)
    if (asp && asp.type === 'Hard') {
      moonHardLines.push(`  Mặt Trăng ${asp.name_vn} ${PLANET_NAMES_VN[pKey] || pKey} (orb ${asp.orb_round}°) → VIẾT\n  ${label}`)
    } else {
      moonHardLines.push(`  Trăng-${PLANET_NAMES_VN[pKey] || pKey} → KHÔNG VIẾT`)
    }
  }

  // Saturn aspects for Section 5 bài học
  const saturnLines: string[] = []
  for (const [pKey, label] of Object.entries(SATURN_LESSON_PLANETS)) {
    if (!(pKey in planets) || !('Saturn' in planets)) continue
    const asp = checkAspect(planets['Saturn'].lon, planets[pKey].lon)
    if (asp && asp.type !== 'Minor') {
      saturnLines.push(`  Sao Thổ ${asp.name_vn} ${PLANET_NAMES_VN[pKey] || pKey} (orb ${asp.orb_round}°, ${asp.type === 'Hard' ? 'góc cứng' : 'góc mềm'}) → VIẾT\n  ${label}`)
    } else {
      saturnLines.push(`  Thổ-${PLANET_NAMES_VN[pKey] || pKey} → KHÔNG VIẾT`)
    }
  }

  // North Node (True Node), only relevant for houses 5, 7, 8
  const nnH = 'True Node' in planets ? getH('True Node') : 0
  const nnLine = NORTH_NODE_LOVE[nnH]
    ? `  La Hầu ở Nhà ${nnH} → VIẾT\n  ${NORTH_NODE_LOVE[nnH]}`
    : `  La Hầu ở Nhà ${nnH} (không phải 5/7/8) → KHÔNG VIẾT`

  // Chiron, only relevant for houses 5, 7, 8
  const chironH = 'Chiron' in planets ? getH('Chiron') : 0
  const chironLine = CHIRON_LOVE[chironH]
    ? `  Chiron ở Nhà ${chironH} → VIẾT\n  ${CHIRON_LOVE[chironH]}`
    : `  Chiron ở Nhà ${chironH} (không phải 5/7/8) → KHÔNG VIẾT`

  // H7 interactions split by type
  const h7Hard = h7Ints.filter(it => it.type === 'Cứng')
  const h7Soft = h7Ints.filter(it => it.type === 'Mềm')

  // ── Format brief ─────────────────────────────────────────────────
  const lines: string[] = []

  lines.push(`=== DỮ LIỆU ĐÃ TÍNH TOÁN / BẢN ĐỒ TÌNH DUYÊN ===`)
  lines.push(`Họ tên: ${fullName} | Ngày sinh: ${dobStr}`)
  lines.push(`Xưng hô: ${pronoun}`)

  lines.push(`\n${'═'.repeat(60)}`)
  lines.push(`[THÔNG TIN CƠ BẢN / HỆ THAM CHIẾU]`)
  lines.push(`${'═'.repeat(60)}`)
  lines.push(`- Cung Mọc: ${ascZ}`)
  lines.push(`- Mặt Trời: ${sunZ}, Nhà ${sunH}`)
  lines.push(`- Mặt Trăng: ${moonZ}, Nhà ${moonH}`)
  lines.push(`- Sao Kim: ${venusZ}, Nhà ${venusH}`)
  lines.push(`- Sao Hỏa: ${marsZ}, Nhà ${marsH}`)
  lines.push(`- Đỉnh Nhà 7: ${h7Z} | Hành tinh trong Nhà 7: ${h7Ps.length ? h7Ps.join(', ') : 'Trống'}`)
  lines.push(`- Chủ tinh Nhà 7 (${rulerH7Vn}) ở Nhà ${rulerH7H}`)

  lines.push(`\n${'═'.repeat(60)}`)
  lines.push(`MỤC 1 / TỔNG QUAN NĂNG LƯỢNG TÌNH YÊU`)
  lines.push(`${'═'.repeat(60)}`)
  lines.push(`(Dùng cho Mục 1: AC-Sun-Moon, Venus, Moon, Mars, Nhà trội)`)

  for (const c of coreData) {
    lines.push(`\n  ${c.label} / Cung ${c.zodiac}:`)
    const cho = stripHtml(c.cho)
    const yeu = stripHtml(c.yeu)
    if (cho) lines.push(`    Cho đi / Cách yêu: ${cho}`)
    if (yeu) lines.push(`    Điểm yếu tình cảm: ${yeu}`)
  }

  lines.push(`\n  Sao Kim (${venusZ}, Nhà ${venusH}) / gu đối tác:`)
  lines.push(`    ${venusGu || '(không có dữ liệu)'}`)

  lines.push(`\n  Mặt Trăng (${moonZ}) / nhu cầu cảm xúc sâu xa:`)
  lines.push(`    ${moonAnToan || '(không có dữ liệu)'}`)

  lines.push(`\n  Sao Hỏa (${marsZ}, Nhà ${marsH}):`)
  lines.push(`    (Luận cách theo đuổi, hấp dẫn và giải quyết xung đột từ cung ${marsZ}, nhà ${marsH})`)

  lines.push(`\n  Nhà trội / điều ${pronoun} mong muốn đối phương có:`)
  if (attraction.length > 0) {
    for (const a of attraction.slice(0, 5)) {
      const content = stripHtml(a.content)
      if (content) lines.push(`    ${a.label}: ${content}`)
    }
  } else {
    lines.push(`    (không có dữ liệu nhà trội)`)
  }

  lines.push(`\n${'═'.repeat(60)}`)
  lines.push(`MỤC 2 / KIỂU NGƯỜI THU HÚT BẠN`)
  lines.push(`${'═'.repeat(60)}`)
  lines.push(`(Dùng dữ liệu MỤC 1 + thêm gặp ở đâu)`)

  const meetContent = stripHtml(h7Meeting.content || '')
  lines.push(`\n  Gặp đối tác ở đâu / Chủ tinh Nhà 7 (${h7Meeting.rulerLabel || rulerH7Vn}) ở Nhà ${h7Meeting.rulerHouse || rulerH7H}:`)
  lines.push(`    ${meetContent || '(không có dữ liệu)'}`)

  lines.push(`\n${'═'.repeat(60)}`)
  lines.push(`MỤC 3 / CÁCH BẠN YÊU VÀ THỂ HIỆN CẢM XÚC`)
  lines.push(`${'═'.repeat(60)}`)

  lines.push(`\n  Đỉnh Nhà 7 (${h7Peak.zodiac || h7Z}) / thái độ trong tình yêu:`)
  lines.push(`    ${stripHtml(h7Peak.energy || '') || '(không có dữ liệu)'}`)

  lines.push(`\n  Hành tinh/Chủ tinh trong Nhà 7 / năng lượng đặt vào tình yêu:`)
  if (h7Roles.length > 0) {
    for (const r of h7Roles) {
      const content = stripHtml(r.content)
      if (content) lines.push(`    ${r.label}: ${content}`)
    }
  } else {
    lines.push(`    (Nhà 7 trống / dùng energy đỉnh để phân tích)`)
  }

  lines.push(`\n${'═'.repeat(60)}`)
  lines.push(`MỤC 4 / KHÓ KHĂN VÀ MÔ THỨC LẶP LẠI`)
  lines.push(`${'═'.repeat(60)}`)

  lines.push(`\n  Nhà 7 tương tác CỨNG với:`)
  if (h7Hard.length > 0) {
    for (const it of h7Hard) {
      lines.push(`    ${it.label} → VIẾT`)
      lines.push(`    ${stripHtml(it.content)}`)
    }
  } else {
    lines.push(`    (không có tương tác cứng) → KHÔNG VIẾT`)
  }

  lines.push(`\n  Nhà 7 tương tác MỀM với:`)
  if (h7Soft.length > 0) {
    for (const it of h7Soft) {
      lines.push(`    ${it.label} → VIẾT`)
      lines.push(`    ${stripHtml(it.content)}`)
    }
  } else {
    lines.push(`    (không có tương tác mềm) → KHÔNG VIẾT`)
  }

  lines.push(`\n  Góc cứng Sao Kim / mô thức lặp lại trong tình yêu:`)
  lines.push(venusHardLines.join('\n'))

  lines.push(`\n  Góc cứng Mặt Trăng / mô thức an toàn cảm xúc:`)
  lines.push(moonHardLines.join('\n'))

  lines.push(`\n${'═'.repeat(60)}`)
  lines.push(`MỤC 5 / BÀI HỌC TÌNH YÊU (conditional / chỉ VIẾT phần có dữ liệu)`)
  lines.push(`${'═'.repeat(60)}`)
  lines.push(`LƯU Ý: Các dòng → KHÔNG VIẾT thì TUYỆT ĐỐI không nhắc tới trong bài.`)

  lines.push(`\n  Sao Thổ tạo góc với:`)
  lines.push(saturnLines.join('\n'))

  lines.push(`\n  La Hầu (North Node):`)
  lines.push(nnLine)

  lines.push(`\n  Chiron:`)
  lines.push(chironLine)

  lines.push(`\n${'═'.repeat(60)}`)
  lines.push(`MỤC 6 / TỔNG KẾT HÀNH TRÌNH TÌNH YÊU`)
  lines.push(`${'═'.repeat(60)}`)
  lines.push(`(Tổng hợp từ tất cả các mục trên để viết phần kết luận)`)

  return lines.join('\n')
}

// ── Main export ───────────────────────────────────────────────────

export function buildLovePrompt(
  chartData: ChartData,
  loveBlocks: Record<string, unknown>,
  profile: { name: string; fullName?: string; onlyName?: string; gender?: string; dob: { day: string; month: string; year: string } }
): string {
  const fullName = profile.fullName || profile.name || ''
  const name = profile.onlyName || profile.name || ''
  const pronoun = 'bạn'
  const dobStr = `${profile.dob.day}/${profile.dob.month}/${profile.dob.year}`

  const brief = buildLoveBrief(chartData, loveBlocks, profile)

  const instructions = loadPromptTemplate('love')
    .replace(/{pronoun}/g, pronoun)
    .replace(/{full_name}/g, fullName)
    .replace(/{name}/g, name)
    .replace(/{dob_str}/g, dobStr)

  return brief + '\n\n' + instructions
}
