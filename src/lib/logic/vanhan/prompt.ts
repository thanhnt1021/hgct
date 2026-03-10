// Vanhan (transit) prompt builder (ported from essay_pdf.py - build_vanhan_essay_prompt)
// This is the most complex transit prompt builder (~417 lines in Python)

import fs from 'fs'
import path from 'path'
import type { ChartData } from '@/lib/astrology/calculations'
import { getHouseOfPlanet, checkAspect } from '@/lib/astrology/calculations'
import { OUTER_PLANETS, PLANET_NAMES_VN, PLANET_SYMBOLS } from '@/lib/astrology/constants'
import {
  scanHouseTransitsInRange,
  findExactAspectTimes,
  type HouseTransitPeriod,
  type ExactAspectHit,
} from '@/lib/astrology/transit-stubs'

// ─── Constants ───────────────────────────────────────────────────

const HOUSE_THEMES: Record<number, string> = {
  1: 'bản thân, hình ảnh cá nhân, cách thể hiện ra bên ngoài',
  2: 'tài chính cá nhân, thu nhập, giá trị bản thân',
  3: 'giao tiếp, học tập, anh chị em, di chuyển ngắn',
  4: 'gia đình, nhà cửa, nguồn gốc, nền tảng nội tâm',
  5: 'sáng tạo, tình yêu, con cái, niềm vui, giải trí',
  6: 'sức khỏe, công việc hàng ngày, kỷ luật, phục vụ',
  7: 'đối tác, hôn nhân, các mối quan hệ 1-1',
  8: 'biến đổi sâu, tài chính chung, tâm linh, mất mát và tái sinh',
  9: 'triết lý, du lịch xa, học vấn cao, mở rộng tầm nhìn',
  10: 'sự nghiệp, danh tiếng, vị thế xã hội, thành tựu',
  11: 'bạn bè, cộng đồng, ước mơ, mạng lưới xã hội',
  12: 'nội tâm ẩn, tiềm thức, nghỉ ngơi, buông bỏ, tâm linh',
}

const TRANSIT_POINTS: Record<string, number> = {
  Jupiter: 5,
  Saturn: -5,
  Uranus: 3,
  Neptune: 2,
  Pluto: -3,
}

const ASPECT_VN: Record<string, string> = {
  Conjunction: 'Hội Tụ (0°)',
  Sextile: 'Lục Hợp (60°)',
  Square: 'Vuông Góc (90°)',
  Trine: 'Tam Hợp (120°)',
  Opposition: 'Đối Đỉnh (180°)',
}

const ASPECT_TYPE_MAP: Record<string, 'soft' | 'hard'> = {
  Conjunction: 'hard',
  Sextile: 'soft',
  Square: 'hard',
  Trine: 'soft',
  Opposition: 'hard',
}

// House-to-section mapping: which houses are relevant to which sections
const SECTION_HOUSES: Record<string, number[]> = {
  'tong_quan': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  'cong_viec': [10, 6, 2],
  'tai_chinh': [2, 8, 11],
  'tinh_yeu': [5, 7, 1],
  'gia_dinh': [4, 3, 12],
  'suc_khoe': [6, 1, 8, 12],
  'tong_ket': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
}

// ─── Types ───────────────────────────────────────────────────────

interface HouseScore {
  house: number
  score: number
  classification: 'TIM_DO' | 'TIM_DEN' | 'TIM_VANG'
  transits: TransitInHouse[]
  softAspects: AspectInHouse[]
  hardAspects: AspectInHouse[]
}

interface TransitInHouse {
  planet: string
  planetVn: string
  startDate: string
  endDate: string
  retrograde: boolean
}

interface AspectInHouse {
  transitPlanet: string
  transitPlanetVn: string
  natalPlanet: string
  natalPlanetVn: string
  aspect: string
  aspectVn: string
  type: 'soft' | 'hard'
  exactDates: string[]
}

interface Profile {
  name: string
  gender?: string
  dob: { day: string; month: string; year: string }
}

// ─── Helpers ─────────────────────────────────────────────────────

function loadPromptTemplate(name: string): string {
  const promptPath = path.join(process.cwd(), 'src', 'prompts', `${name}.txt`)
  return fs.readFileSync(promptPath, 'utf-8')
}

function formatDate(dateStr: string): string {
  // Expect YYYY-MM-DD or DD/MM/YYYY, return DD/MM/YYYY
  if (dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }
  return dateStr
}

/**
 * Merge retrograde-split periods for the same planet in the same house.
 * If planet enters house, retrogrades out, then re-enters, merge into one period
 * with the earliest start and latest end.
 */
function mergeRetrogradePeriods(periods: HouseTransitPeriod[]): HouseTransitPeriod[] {
  if (periods.length <= 1) return periods

  // Sort by start date
  const sorted = [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate))
  const merged: HouseTransitPeriod[] = []

  let current = { ...sorted[0] }
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]
    if (next.planet === current.planet && next.house === current.house) {
      // Merge: extend end date, mark as retrograde if either was
      if (next.endDate > current.endDate) {
        current.endDate = next.endDate
      }
      current.retrograde = current.retrograde || next.retrograde
    } else {
      merged.push(current)
      current = { ...next }
    }
  }
  merged.push(current)
  return merged
}

// ─── Core: Scan all transits and compute house scores ────────────

function computeHouseScores(
  natalChart: ChartData,
  startDate: string,
  endDate: string,
): HouseScore[] {
  const cusps = natalChart.cusps
  const natalPlanets = natalChart.planets

  // Initialize scores for all 12 houses
  const houseData: Record<number, {
    score: number
    transits: TransitInHouse[]
    softAspects: AspectInHouse[]
    hardAspects: AspectInHouse[]
  }> = {}

  for (let h = 1; h <= 12; h++) {
    houseData[h] = { score: 0, transits: [], softAspects: [], hardAspects: [] }
  }

  // For each outer planet, scan house transits
  for (const planet of OUTER_PLANETS) {
    const planetVn = PLANET_NAMES_VN[planet] || planet
    const points = TRANSIT_POINTS[planet] || 0

    // Get house transit periods
    let periods = scanHouseTransitsInRange(planet, natalChart, startDate, endDate)
    periods = mergeRetrogradePeriods(periods)

    for (const period of periods) {
      const h = period.house
      if (h < 1 || h > 12) continue

      // Add transit points to house score
      houseData[h].score += points

      houseData[h].transits.push({
        planet,
        planetVn,
        startDate: period.startDate,
        endDate: period.endDate,
        retrograde: period.retrograde,
      })
    }

    // Find aspects between transit planet and natal planets
    const natalTargets = [
      'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
      'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
      'Asc', 'MC',
    ]

    for (const natalP of natalTargets) {
      if (!(natalP in natalPlanets)) continue
      const natalLon = natalPlanets[natalP].lon

      const exactHits = findExactAspectTimes(
        planet, natalP, natalLon, startDate, endDate,
      )

      if (exactHits.length === 0) continue

      // Group hits by aspect type
      const hitsByAspect: Record<string, ExactAspectHit[]> = {}
      for (const hit of exactHits) {
        if (!hitsByAspect[hit.aspect]) hitsByAspect[hit.aspect] = []
        hitsByAspect[hit.aspect].push(hit)
      }

      for (const [aspectName, hits] of Object.entries(hitsByAspect)) {
        const aspectVn = ASPECT_VN[aspectName] || aspectName
        const type = ASPECT_TYPE_MAP[aspectName] || 'hard'
        const exactDates = hits.map(h => formatDate(h.exactDate))

        // Determine which house this natal planet is in
        const natalHouse = getHouseOfPlanet(natalLon, cusps)

        // Add aspect score: soft aspects +1, hard aspects -1
        if (type === 'soft') {
          houseData[natalHouse].score += 1
        } else {
          houseData[natalHouse].score -= 1
        }

        const natalPVn = PLANET_NAMES_VN[natalP] || natalP

        const aspectEntry: AspectInHouse = {
          transitPlanet: planet,
          transitPlanetVn: planetVn,
          natalPlanet: natalP,
          natalPlanetVn: natalPVn,
          aspect: aspectName,
          aspectVn,
          type,
          exactDates,
        }

        if (type === 'soft') {
          houseData[natalHouse].softAspects.push(aspectEntry)
        } else {
          houseData[natalHouse].hardAspects.push(aspectEntry)
        }
      }
    }
  }

  // Classify houses
  const results: HouseScore[] = []
  for (let h = 1; h <= 12; h++) {
    const d = houseData[h]
    let classification: 'TIM_DO' | 'TIM_DEN' | 'TIM_VANG'
    if (d.score >= 3) {
      classification = 'TIM_DO'
    } else if (d.score <= -3) {
      classification = 'TIM_DEN'
    } else {
      classification = 'TIM_VANG'
    }

    results.push({
      house: h,
      score: d.score,
      classification,
      transits: d.transits,
      softAspects: d.softAspects,
      hardAspects: d.hardAspects,
    })
  }

  return results
}

// ─── Format house block for prompt ───────────────────────────────

function formatHouseBlock(hs: HouseScore): string {
  const lines: string[] = []
  const theme = HOUSE_THEMES[hs.house] || ''
  const classLabel =
    hs.classification === 'TIM_DO' ? 'THUẬN LỢI' :
    hs.classification === 'TIM_DEN' ? 'THÁCH THỨC' : 'ỔN ĐỊNH'

  lines.push(`\n--- Nhà ${hs.house} (${theme}) — ${classLabel} (điểm: ${hs.score}) ---`)

  // Transits through this house
  if (hs.transits.length > 0) {
    for (const t of hs.transits) {
      const retro = t.retrograde ? ' [có nghịch hành]' : ''
      lines.push(
        `* ${t.planetVn} (${PLANET_SYMBOLS[t.planet] || ''}) Transit qua Nhà ${hs.house} ` +
        `từ ${formatDate(t.startDate)} đến ${formatDate(t.endDate)}${retro}`
      )
    }
  }

  // Soft aspects
  if (hs.softAspects.length > 0) {
    for (const asp of hs.softAspects) {
      let line =
        `* ${asp.transitPlanetVn} Transit tạo góc ${asp.aspectVn} với ` +
        `${asp.natalPlanetVn} Natal`

      if (asp.exactDates.length > 0) {
        if (asp.exactDates.length === 1) {
          line += `. Đặc biệt vào ngày ${asp.exactDates[0]}`
        } else {
          line += `. Đặc biệt vào các ngày ${asp.exactDates.join(', ')}`
        }
      }
      lines.push(line)
    }
  }

  // Hard aspects
  if (hs.hardAspects.length > 0) {
    for (const asp of hs.hardAspects) {
      let line =
        `* ${asp.transitPlanetVn} Transit tạo góc ${asp.aspectVn} với ` +
        `${asp.natalPlanetVn} Natal`

      if (asp.exactDates.length > 0) {
        if (asp.exactDates.length === 1) {
          line += `. Đặc biệt vào ngày ${asp.exactDates[0]}`
        } else {
          line += `. Đặc biệt vào các ngày ${asp.exactDates.join(', ')}`
        }
      }
      lines.push(line)
    }
  }

  if (hs.transits.length === 0 && hs.softAspects.length === 0 && hs.hardAspects.length === 0) {
    lines.push('(Không có transit đáng kể trong giai đoạn này)')
  }

  return lines.join('\n')
}

// ─── Format section data ─────────────────────────────────────────

function formatSectionData(
  sectionName: string,
  houseScores: HouseScore[],
  relevantHouses: number[],
): string {
  const lines: string[] = []

  // Filter to relevant houses that have activity
  const activeHouses = houseScores.filter(
    hs => relevantHouses.includes(hs.house) &&
      (hs.transits.length > 0 || hs.softAspects.length > 0 || hs.hardAspects.length > 0)
  )

  if (activeHouses.length === 0) {
    lines.push('(Không có transit đáng kể ảnh hưởng đến lĩnh vực này)')
    return lines.join('\n')
  }

  for (const hs of activeHouses) {
    lines.push(formatHouseBlock(hs))
  }

  return lines.join('\n')
}

// ─── Tong Quan section (overview) ────────────────────────────────

function formatTongQuan(houseScores: HouseScore[]): string {
  const lines: string[] = []

  const timDo = houseScores.filter(h => h.classification === 'TIM_DO')
    .sort((a, b) => b.score - a.score)
  const timDen = houseScores.filter(h => h.classification === 'TIM_DEN')
    .sort((a, b) => a.score - b.score)
  const timVang = houseScores.filter(h => h.classification === 'TIM_VANG')

  lines.push(`Tổng quan: ${timDo.length} nhà thuận lợi, ${timDen.length} nhà thách thức, ${timVang.length} nhà ổn định.`)
  lines.push('')

  if (timDo.length > 0) {
    lines.push('CÁC NHÀ THUẬN LỢI (ưu tiên):')
    for (const hs of timDo.slice(0, 4)) {
      lines.push(`  Nhà ${hs.house} (${HOUSE_THEMES[hs.house]}) — điểm ${hs.score}`)
    }
  }

  if (timDen.length > 0) {
    lines.push('\nCÁC NHÀ THÁCH THỨC (cần lưu ý):')
    for (const hs of timDen.slice(0, 4)) {
      lines.push(`  Nhà ${hs.house} (${HOUSE_THEMES[hs.house]}) — điểm ${hs.score}`)
    }
  }

  if (timVang.length > 0) {
    lines.push('\nCÁC NHÀ ỔN ĐỊNH:')
    const names = timVang.map(h => `Nhà ${h.house}`).join(', ')
    lines.push(`  ${names}`)
  }

  return lines.join('\n')
}

// ─── Tong Ket section (summary) ──────────────────────────────────

function formatTongKet(houseScores: HouseScore[]): string {
  const lines: string[] = []

  const timDo = houseScores.filter(h => h.classification === 'TIM_DO')
    .sort((a, b) => b.score - a.score)
  const timDen = houseScores.filter(h => h.classification === 'TIM_DEN')
    .sort((a, b) => a.score - b.score)

  lines.push('NÊN TẬP TRUNG VÀO:')
  for (const hs of timDo) {
    lines.push(`  Nhà ${hs.house} (${HOUSE_THEMES[hs.house]}) — điểm ${hs.score}`)
  }

  lines.push('\nĐẶC BIỆT LƯU Ý:')
  for (const hs of timDen) {
    lines.push(`  Nhà ${hs.house} (${HOUSE_THEMES[hs.house]}) — điểm ${hs.score}`)
  }

  return lines.join('\n')
}

// ─── Main prompt builder ─────────────────────────────────────────

export function buildVanhanEssayPrompt(
  natalChart: ChartData,
  startDate: string,
  endDate: string,
  profile: Profile,
): string {
  const name = profile.name || ''
  const gender = profile.gender || 'Female'
  const pronoun = gender === 'Female' ? 'chị' : 'anh'
  const dobStr = `${profile.dob.day}/${profile.dob.month}/${profile.dob.year}`
  const startStr = formatDate(startDate)
  const endStr = formatDate(endDate)

  // Compute all house scores
  const houseScores = computeHouseScores(natalChart, startDate, endDate)

  // Build data sections
  const dataLines: string[] = []

  dataLines.push('=== DỮ LIỆU VẬN HẠN ===')
  dataLines.push(`Họ tên: ${name}`)
  dataLines.push(`Giới tính: ${gender === 'Female' ? 'Nữ' : 'Nam'}`)
  dataLines.push(`Ngày sinh: ${dobStr}`)
  dataLines.push(`Giai đoạn: ${startStr} — ${endStr}`)
  dataLines.push('')

  // Section 1: Tổng quan
  dataLines.push('=== PHẦN 1: TỔNG QUAN NĂNG LƯỢNG CỦA NĂM ===')
  dataLines.push(formatTongQuan(houseScores))
  dataLines.push('')

  // All house details for overview
  for (const hs of houseScores) {
    if (hs.transits.length > 0 || hs.softAspects.length > 0 || hs.hardAspects.length > 0) {
      dataLines.push(formatHouseBlock(hs))
    }
  }
  dataLines.push('')

  // Section 2: Công việc
  dataLines.push('=== PHẦN 2: CÔNG VIỆC – SỰ NGHIỆP ===')
  dataLines.push('')
  dataLines.push('Sự nghiệp – danh tiếng (Nhà 10):')
  dataLines.push(formatSectionData('su_nghiep', houseScores, [10]))
  dataLines.push('')
  dataLines.push('Hiệu suất công việc (Nhà 6):')
  dataLines.push(formatSectionData('hieu_suat', houseScores, [6]))
  dataLines.push('')

  // Section 3: Tài chính
  dataLines.push('=== PHẦN 3: TÀI CHÍNH – ĐẦU TƯ ===')
  dataLines.push('')
  dataLines.push('Tiền tự kiếm (Nhà 2):')
  dataLines.push(formatSectionData('tien', houseScores, [2]))
  dataLines.push('')
  dataLines.push('Đầu tư – kinh doanh (Nhà 8, 11):')
  dataLines.push(formatSectionData('dau_tu', houseScores, [8, 11]))
  dataLines.push('')

  // Section 4: Tình yêu
  dataLines.push('=== PHẦN 4: TÌNH YÊU – HÔN NHÂN ===')
  dataLines.push('')
  dataLines.push('Tình yêu – chưa kết hôn (Nhà 5):')
  dataLines.push(formatSectionData('tinh_yeu', houseScores, [5]))
  dataLines.push('')
  dataLines.push('Hôn nhân – đã kết hôn (Nhà 7):')
  dataLines.push(formatSectionData('hon_nhan', houseScores, [7]))
  dataLines.push('')

  // Section 5: Gia đình
  dataLines.push('=== PHẦN 5: GIA ĐÌNH – NHÀ CỬA ===')
  dataLines.push('')
  dataLines.push('Gia đình và nhà cửa (Nhà 4, 3):')
  dataLines.push(formatSectionData('gia_dinh', houseScores, [4, 3]))
  dataLines.push('')

  // Section 6: Sức khỏe
  dataLines.push('=== PHẦN 6: SỨC KHỎE ===')
  dataLines.push('')
  dataLines.push('Sức khỏe thể chất (Nhà 6, 1):')
  dataLines.push(formatSectionData('the_chat', houseScores, [6, 1]))
  dataLines.push('')
  dataLines.push('Sức khỏe tinh thần (Nhà 8, 12):')
  dataLines.push(formatSectionData('tinh_than', houseScores, [8, 12]))
  dataLines.push('')

  // Section 7: Tổng kết
  dataLines.push('=== PHẦN 7: TỔNG KẾT VÀ LỜI KHUYÊN ===')
  dataLines.push(formatTongKet(houseScores))
  dataLines.push('')

  // Load and fill prompt template
  const template = loadPromptTemplate('vanhan')
  const filledTemplate = template
    .replace(/\{pronoun\}/g, pronoun)
    .replace(/\{name\}/g, name)
    .replace(/\{dob_str\}/g, dobStr)
    .replace(/\{start_str\}/g, startStr)
    .replace(/\{end_str\}/g, endStr)

  // Combine data + template
  return dataLines.join('\n') + '\n\n' + filledTemplate
}
