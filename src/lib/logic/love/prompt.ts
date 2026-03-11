// Love prompt builder — matches /root/mo/app/logic/love/essay_pdf.py build_love_essay_prompt()
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

export function buildLovePrompt(
  chartData: ChartData,
  loveBlocks: Record<string, unknown>,
  profile: { name: string; fullName?: string; onlyName?: string; gender?: string; dob: { day: string; month: string; year: string } }
): string {
  const fullName = profile.fullName || profile.name || ''
  const name = profile.onlyName || profile.name || ''
  const gender = profile.gender || 'Female'
  const pronoun = gender === 'Female' ? 'chị' : 'anh'
  const dobStr = `${profile.dob.day}/${profile.dob.month}/${profile.dob.year}`

  const planets = chartData.planets
  const cusps = chartData.cusps

  function getZ(key: string): string {
    const [, z] = getZodiac(planets[key].lon)
    return z
  }
  function getH(key: string): number {
    return getHouseOfPlanet(planets[key].lon, cusps)
  }
  function houseZ(hNum: number): string {
    const idx = cusps.length === 13 ? hNum : hNum - 1
    const [, z] = getZodiac(cusps[idx])
    return z
  }
  function psIn(hNum: number): string[] {
    return CORE_PLANETS
      .filter(p => p in planets && getHouseOfPlanet(planets[p].lon, cusps) === hNum)
      .map(p => PLANET_NAMES_VN[p] || p)
  }

  // ── Chart positions ─────────────────────────────────────────────
  const ascZ   = getZ('Asc')
  const sunZ   = getZ('Sun');   const sunH   = getH('Sun')
  const moonZ  = getZ('Moon');  const moonH  = getH('Moon')
  const venusZ = getZ('Venus'); const venusH = getH('Venus')
  const marsZ  = getZ('Mars');  const marsH  = getH('Mars')

  // Love houses
  const h5Z   = houseZ(5); const h5Ps  = psIn(5)
  const h7Z   = houseZ(7); const h7Ps  = psIn(7)
  const h8Ps  = psIn(8)
  const h11Ps = psIn(11)
  const h12Ps = psIn(12)

  const rulerH7 = RULER_MAP[h7Z]
  const rulerH7H = rulerH7 && rulerH7 in planets ? getH(rulerH7) : 'N/A'

  // Love aspects (Venus / Mars / Moon × all CORE_PLANETS, non-Minor)
  const lovePlanets = ['Venus', 'Mars', 'Moon']
  const aspLines: string[] = []
  for (const lp of lovePlanets) {
    if (!(lp in planets)) continue
    for (const other of CORE_PLANETS) {
      if (other === lp || !(other in planets)) continue
      const asp = checkAspect(planets[lp].lon, planets[other].lon)
      if (asp && asp.type !== 'Minor') {
        const vn1 = PLANET_NAMES_VN[lp] || lp
        const vn2 = PLANET_NAMES_VN[other] || other
        aspLines.push(
          `- ${vn1} ${asp.name_vn} ${vn2} (${asp.type}, orb ${asp.orb_round}°)`
        )
      }
    }
  }
  const aspText = aspLines.length > 0 ? aspLines.join('\n') : 'Không có góc nổi bật'

  // ── Block data ──────────────────────────────────────────────────
  const b1 = (loveBlocks.block1 || {}) as Record<string, unknown>
  const b2 = (loveBlocks.block2 || {}) as Record<string, unknown>

  // Block 1A: Asc/Sun/Moon → cho đi + điểm yếu
  const coreData = (b1.coreData || []) as { label: string; zodiac: string; cho: string; yeu: string }[]
  const coreLines: string[] = []
  for (const c of coreData) {
    const cho = stripHtml(c.cho)
    const yeu = stripHtml(c.yeu)
    const label = `${c.label} (${c.zodiac})`
    if (cho) coreLines.push(`  - ${label} — Cho đi / Cách yêu: ${cho}`)
    if (yeu) coreLines.push(`  - ${label} — Điểm yếu tình cảm: ${yeu}`)
  }
  const coreText = coreLines.join('\n') || 'N/A'

  // Block 1B: dom houses → nhận lại
  const attraction = (b1.attraction || []) as { label: string; content: string }[]
  const attLines = attraction
    .filter(a => stripHtml(a.content))
    .map(a => `  - ${a.label}: ${stripHtml(a.content)}`)
  const attText = attLines.join('\n') || 'N/A'

  // Block 1C: Venus gu đối tác
  const venusGu = stripHtml(String(b1.venusGu || '')) || 'N/A'

  // Block 1D: Moon nhu cầu an toàn
  const moonNeed = stripHtml(String(b1.moonAnToan || '')) || 'N/A'

  // Block 2A: H7 energy
  const h7Peak = (b2.peak || {}) as { zodiac: string; energy: string }
  const h7Energy = stripHtml(h7Peak.energy || '') || 'N/A'

  // Block 2B: planet/ruler roles in H7
  const roles = (b2.roles || []) as { label: string; content: string }[]
  const roleLines = roles
    .filter(r => stripHtml(r.content))
    .map(r => `  - ${r.label}: ${stripHtml(r.content)}`)
  const roleText = roleLines.join('\n') || 'N/A'

  // Block 2C: where to meet partner
  const meeting = (b2.meeting || {}) as { rulerLabel: string; rulerHouse: number; content: string }
  const meetHouse = meeting.rulerHouse || 'N/A'
  const meetLoc = stripHtml(meeting.content || '') || 'N/A'

  // Block 2D: H7 interactions
  const interactions = (b2.interactions || []) as { label: string; content: string }[]
  const intLines = interactions
    .filter(it => stripHtml(it.content))
    .map(it => `  - ${it.label}: ${stripHtml(it.content)}`)
  const intText = intLines.join('\n') || 'Không có tương tác nổi bật'

  // ── Assemble prompt ──────────────────────────────────────────────
  const instructions = loadPromptTemplate('love')
    .replace(/{pronoun}/g, pronoun)
    .replace(/{full_name}/g, fullName)
    .replace(/{name}/g, name)
    .replace(/{dob_str}/g, dobStr)

  return (
    `=== DỮ LIỆU PHÂN TÍCH BẢN ĐỒ SAO TÌNH DUYÊN ===\n` +
    `Họ tên: ${fullName} | Ngày sinh: ${dobStr}\n` +
    `\n--- CÁC VỊ TRÍ HÀNH TINH CHÍNH ---\n` +
    `- Cung Mọc: ${ascZ} (ấn tượng đầu tiên, cách tiếp cận quan hệ)\n` +
    `- Mặt Trời: ${sunZ}, Nhà ${sunH} (bản ngã trong tình yêu)\n` +
    `- Mặt Trăng: ${moonZ}, Nhà ${moonH} (nhu cầu cảm xúc sâu xa)\n` +
    `- Sao Kim: ${venusZ}, Nhà ${venusH} (cách yêu, gu đối tác)\n` +
    `- Sao Hỏa: ${marsZ}, Nhà ${marsH} (cách tiếp cận, năng lượng ham muốn)\n` +
    `\n--- CÁC NHÀ TÌNH DUYÊN ---\n` +
    `- Nhà 5 (lãng mạn, hẹn hò đầu): Đỉnh ${h5Z}, Hành tinh: ${h5Ps.length ? h5Ps.join(', ') : 'Trống'}\n` +
    `- Nhà 7 (hôn nhân, đối tác lâu dài): Đỉnh ${h7Z}, Hành tinh: ${h7Ps.length ? h7Ps.join(', ') : 'Trống'}\n` +
    `- Chủ tinh Nhà 7 (${rulerH7 ? (PLANET_NAMES_VN[rulerH7] || rulerH7) : 'N/A'}) ở Nhà ${rulerH7H}\n` +
    `- Nhà 8 (gắn kết sâu, tình dục, tiền chung): ${h8Ps.length ? h8Ps.join(', ') : 'Trống'}\n` +
    `- Nhà 11 (gặp gỡ qua bạn bè, cộng đồng): ${h11Ps.length ? h11Ps.join(', ') : 'Trống'}\n` +
    `- Nhà 12 (mẫu tiềm thức, hy sinh): ${h12Ps.length ? h12Ps.join(', ') : 'Trống'}\n` +
    `\n--- GÓC TÌNH CẢM (Sao Kim / Sao Hỏa / Mặt Trăng) ---\n` +
    `${aspText}\n` +
    `\n--- BLOCK 1A: CÁCH YÊU VÀ ĐIỂM YẾU TÌNH CẢM ---\n` +
    `(Cung Mọc / Mặt Trời / Mặt Trăng — nguồn: hệ thống tri thức)\n` +
    `${coreText}\n` +
    `\n--- BLOCK 1B: KIỂU NGƯỜI THU HÚT (NHÀ TRỘI) ---\n` +
    `(Loại người ${pronoun} ${name} vô thức bị thu hút, theo nhà trội bản đồ)\n` +
    `${attText}\n` +
    `\n--- BLOCK 1C: GU ĐỐI TÁC (SAO KIM ${venusZ}) ---\n` +
    `${venusGu}\n` +
    `\n--- BLOCK 1D: NHU CẦU CẢM XÚC SÂU XA (MẶT TRĂNG ${moonZ}) ---\n` +
    `${moonNeed}\n` +
    `\n--- BLOCK 2A: NĂNG LƯỢNG ĐỐI TÁC (ĐỈNH NHÀ 7 = ${h7Z}) ---\n` +
    `${h7Energy}\n` +
    `\n--- BLOCK 2B: VAI TRÒ HÀNH TINH / CHỦ TINH NHÀ 7 ---\n` +
    `${roleText}\n` +
    `\n--- BLOCK 2C: GẶP ĐỐI TÁC Ở ĐÂU (Chủ tinh Nhà 7 ở Nhà ${meetHouse}) ---\n` +
    `${meetLoc}\n` +
    `\n--- BLOCK 2D: TƯƠNG TÁC NHÀ 7 VỚI CÁC NHÀ KHÁC ---\n` +
    `${intText}\n\n` +
    instructions
  )
}
