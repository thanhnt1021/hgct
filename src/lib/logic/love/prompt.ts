// Love prompt builder (ported from love/essay_pdf.py)
import fs from 'fs'
import path from 'path'
import { getZodiac, getHouseOfPlanet, checkAspect } from '@/lib/astrology/calculations'
import type { ChartData } from '@/lib/astrology/calculations'
import { CORE_PLANETS, PLANET_NAMES_VN, PLANET_SYMBOLS } from '@/lib/astrology/constants'

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

function formatPlanetPositions(chartData: ChartData): string {
  const lines: string[] = []
  const pPos = chartData.planets
  const cusps = chartData.cusps

  for (const p of CORE_PLANETS) {
    if (!(p in pPos)) continue
    const lon = pPos[p].lon
    const [, zName, , deg] = getZodiac(lon)
    const house = getHouseOfPlanet(lon, cusps)
    const sym = PLANET_SYMBOLS[p] || ''
    const vnName = PLANET_NAMES_VN[p] || p
    lines.push(`${sym} ${vnName} (${p}): ${Math.round(deg)}° ${zName} - Nhà ${house}`)
  }

  return lines.join('\n')
}

function formatLoveHouses(chartData: ChartData): string {
  const loveHouses = [5, 7, 8, 11, 12]
  const lines: string[] = []
  const cusps = chartData.cusps
  const pPos = chartData.planets

  for (const h of loveHouses) {
    const hLon = cusps.length === 13 ? cusps[h] : cusps[h - 1]
    const [, zName] = getZodiac(hLon)
    const planetsInH = CORE_PLANETS.filter(p => p in pPos && getHouseOfPlanet(pPos[p].lon, cusps) === h)
    const pStr = planetsInH.length > 0
      ? planetsInH.map(p => PLANET_NAMES_VN[p] || p).join(', ')
      : 'Trống'
    lines.push(`Nhà ${h} (${zName}): ${pStr}`)
  }

  return lines.join('\n')
}

function formatLoveAspects(chartData: ChartData): string {
  const lovePlanets = ['Venus', 'Mars', 'Moon']
  const lines: string[] = []
  const pPos = chartData.planets

  for (const p1 of lovePlanets) {
    if (!(p1 in pPos)) continue
    for (const p2 of CORE_PLANETS) {
      if (p2 === p1 || !(p2 in pPos)) continue
      const asp = checkAspect(pPos[p1].lon, pPos[p2].lon)
      if (asp && asp.type !== 'Minor') {
        const vn1 = PLANET_NAMES_VN[p1] || p1
        const vn2 = PLANET_NAMES_VN[p2] || p2
        lines.push(`${vn1} ${asp.symbol} ${vn2} (${asp.name_vn}, orb ${asp.orb_round}°) [${asp.type}]`)
      }
    }
  }

  return lines.join('\n')
}

function formatBlockData(loveBlocks: Record<string, unknown>): string {
  const lines: string[] = []
  const b1 = (loveBlocks.block1 || {}) as Record<string, unknown>
  const b2 = (loveBlocks.block2 || {}) as Record<string, unknown>

  // Block 1: Overview
  lines.push('=== BLOCK 1: TỔNG QUAN TÌNH YÊU ===')

  // Core data (Asc/Sun/Moon cho/yeu)
  for (const item of (b1.coreData || []) as Record<string, string>[]) {
    lines.push(`\n${item.label} - Cung ${item.zodiac}:`)
    const cho = stripHtml(item.cho || '')
    const yeu = stripHtml(item.yeu || '')
    if (cho) lines.push(`  Cho đi: ${cho}`)
    if (yeu) lines.push(`  Cần được yêu: ${yeu}`)
  }

  // Attraction
  for (const attr of (b1.attraction || []) as Record<string, string>[]) {
    const t = stripHtml(attr.content || '')
    if (t) lines.push(`\n${attr.label}: ${t}`)
  }

  // Venus gu
  const venusGu = stripHtml(String(b1.venusGu || ''))
  if (venusGu) lines.push(`\nGu thẩm mỹ Venus: ${venusGu}`)

  // Moon an toan
  const moonAnToan = stripHtml(String(b1.moonAnToan || ''))
  if (moonAnToan) lines.push(`\nNhu cầu an toàn Moon: ${moonAnToan}`)

  // Block 2: H7 Details
  lines.push('\n=== BLOCK 2: CHI TIẾT NHÀ 7 ===')

  const peak = (b2.peak || {}) as Record<string, string>
  const energy = stripHtml(peak.energy || '')
  if (energy) lines.push(`\nĐỉnh Nhà 7 - Cung ${peak.zodiac}: ${energy}`)

  // Roles
  for (const role of (b2.roles || []) as Record<string, string>[]) {
    const t = stripHtml(role.content || '')
    if (t) lines.push(`${role.label} trong Nhà 7: ${t}`)
  }

  // Meeting
  const meeting = (b2.meeting || {}) as Record<string, unknown>
  const meetingContent = stripHtml(String(meeting.content || ''))
  if (meetingContent) {
    lines.push(`\nChủ tinh Nhà 7 (${meeting.rulerLabel}) ở Nhà ${meeting.rulerHouse}: ${meetingContent}`)
  }

  // Interactions
  const interactions = (b2.interactions || []) as Record<string, unknown>[]
  for (const imp of interactions) {
    const t = txt(imp.content)
    if (t) lines.push(`${imp.label || imp.description || ''}: ${t}`)
  }

  const isH7Empty = b2.isH7Empty as boolean
  if (isH7Empty) {
    lines.push('\n(Nhà 7 trống - phân tích dựa trên chủ tinh)')
  }

  return lines.join('\n')
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

  const planetPositions = formatPlanetPositions(chartData)
  const loveHouses = formatLoveHouses(chartData)
  const loveAspects = formatLoveAspects(chartData)
  const blockData = formatBlockData(loveBlocks)

  const dataText = [
    '--- VỊ TRÍ HÀNH TINH ---',
    planetPositions,
    '',
    '--- NHÀ TÌNH YÊU (5, 7, 8, 11, 12) ---',
    loveHouses,
    '',
    '--- GÓC CHIẾU TÌNH YÊU (Venus/Mars/Moon) ---',
    loveAspects,
    '',
    blockData,
  ].join('\n')

  const instructions = loadPromptTemplate('love')
    .replace(/{pronoun}/g, pronoun)
    .replace(/{full_name}/g, fullName)
    .replace(/{name}/g, name)
    .replace(/{dob_str}/g, dobStr)

  return (
    `=== DỮ LIỆU PHÂN TÍCH BẢN ĐỒ SAO ===\n` +
    `Họ tên: ${fullName} | Ngày sinh: ${dobStr}\n` +
    `\n${dataText}\n\n` +
    instructions
  )
}
