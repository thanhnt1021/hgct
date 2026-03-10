// Career prompt builder (ported from career_pdf.py)
import fs from 'fs'
import path from 'path'

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

export function buildCareerPrompt(
  careerData: Record<string, unknown>,
  profile: { name: string; gender?: string; dob: { day: string; month: string; year: string } }
): string {
  const name = profile.name || ''
  const gender = profile.gender || 'Female'
  const pronoun = gender === 'Female' ? 'chị' : 'anh'
  const dobStr = `${profile.dob.day}/${profile.dob.month}/${profile.dob.year}`

  const b1 = (careerData.block1 || {}) as Record<string, unknown>
  const b2 = (careerData.block2 || {}) as Record<string, unknown>
  const b3 = (careerData.block3 || {}) as Record<string, unknown>
  const b4 = (careerData.block4 || {}) as Record<string, unknown>

  const lines: string[] = []

  // Block 1
  lines.push('=== BLOCK 1: CON NGƯỜI & TÍNH CÁCH ===')
  for (const item of (b1.coreData || b1.core_data || []) as Record<string, unknown>[]) {
    const leftTxt = txt(item.left)
    const rightTxt = txt(item.right)
    lines.push(`\n${item.label} - Cung ${item.zodiac}:`)
    if (leftTxt) lines.push(`  Thế mạnh / Cách thể hiện: ${leftTxt}`)
    if (rightTxt) lines.push(`  Điểm yếu / Cần chú ý: ${rightTxt}`)
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
  for (const h of (b1.mappedHouses || b1.mapped_houses || []) as Record<string, unknown>[]) {
    const m = stripHtml(String(h.meaning || ''))
    if (m) lines.push(`Nhà trội Nhà ${h.num}: ${m}`)
  }

  // Block 2
  lines.push('\n=== BLOCK 2: TÀI NĂNG NỔI BẬT ===')
  const summary = (b2.summary || {}) as Record<string, unknown>
  for (const z of (summary.zodiacs || []) as Record<string, string>[]) {
    const t = stripHtml(z.content)
    if (t) lines.push(`\nƯu điểm Cung ${z.name}: ${t}`)
  }
  for (const dom of (summary.dominants || []) as Record<string, string>[]) {
    const t = stripHtml(dom.content)
    if (t) lines.push(`Trội ${dom.label}: ${t}`)
  }
  for (const h of (summary.houses || []) as Record<string, string>[]) {
    const t = stripHtml(h.content)
    if (t) lines.push(`${h.label}: ${t}`)
  }
  const talents = (summary.talents || {}) as Record<string, unknown[]>
  for (const ta of (talents.tight || []) as Record<string, string>[]) {
    const t = stripHtml(ta.content)
    if (t) lines.push(`\nGóc chặt ${ta.label} (${ta.sub}): ${t}`)
  }
  for (const ma of (talents.many || []) as Record<string, unknown>[]) {
    const t = txt(ma.content)
    if (t) lines.push(`Hành tinh nhiều góc ${ma.label}: ${t}`)
  }
  const ruler = (summary.ruler || {}) as Record<string, string>
  const rulerT = stripHtml(ruler.content)
  if (rulerT) lines.push(`\nChủ lá số (${ruler.label}): ${rulerT}`)
  const notes = (b2.notes || {}) as Record<string, unknown[]>
  for (const d of (notes.disadvantages || []) as Record<string, string>[]) {
    const t = stripHtml(d.content)
    if (t) lines.push(`\nNhược điểm Cung ${d.name}: ${t}`)
  }
  for (const m of (notes.missing || []) as Record<string, string>[]) {
    const t = stripHtml(m.content)
    if (t) lines.push(`Thiếu ${m.type} - ${m.label}: ${t}`)
  }

  // Block 3
  lines.push('\n=== BLOCK 3: CON ĐƯỜNG SỰ NGHIỆP ===')
  const mc = (b3.mcInfo || b3.mc_info || {}) as Record<string, string>
  const mcT = stripHtml(mc.content)
  if (mcT) lines.push(`\nNăng lượng sự nghiệp (đỉnh Nhà 10 = ${mc.zodiac}): ${mcT}`)
  for (const role of (b3.roles || []) as Record<string, string>[]) {
    const t = stripHtml(role.content)
    if (t) lines.push(`Vai trò - ${role.label}: ${t}`)
  }
  const hl = (b3.highlight || {}) as Record<string, string>
  const hlT = stripHtml(hl.content)
  if (hlT) lines.push(`${hl.label}: ${hlT}`)
  for (const imp of (b3.impacts || []) as Record<string, unknown>[]) {
    const t = txt(imp.content)
    if (t) lines.push(`${imp.label}: ${t}`)
  }
  const env = (b3.environment || {}) as Record<string, string>
  if (env) {
    const t1 = stripHtml(env.rulerContent || env.ruler_content || '')
    const t2 = stripHtml(env.locContent || env.loc_content || '')
    if (t1) lines.push(`\nMôi trường phù hợp (Chủ tinh Nhà 6 = ${env.rulerLabel || env.ruler_label || ''}): ${t1}`)
    if (t2) lines.push(`${env.locLabel || env.loc_label || ''}: ${t2}`)
  }

  // Block 4
  lines.push('\n=== BLOCK 4: TÀI CHÍNH & ĐẦU TƯ ===')
  const s1 = (b4.section1 || {}) as Record<string, unknown>
  const earn = (s1.earnHow || s1.earn_how || {}) as Record<string, string>
  const earnT = stripHtml(earn.content)
  if (earnT) lines.push(`\nCách kiếm tiền (đỉnh Nhà 2 = ${earn.label}): ${earnT}`)
  for (const en of (s1.energies || []) as Record<string, string>[]) {
    const t = stripHtml(en.content)
    if (t) lines.push(`${en.label}: ${t}`)
  }
  const s2 = (b4.section2 || {}) as Record<string, string>
  const s2T = stripHtml(s2.content)
  if (s2T) lines.push(`${s2.label}: ${s2T}`)
  for (const imp of (b4.h2Impacts || b4.h2_impacts || []) as Record<string, unknown>[]) {
    const t = txt(imp.content)
    if (t) lines.push(`${imp.label}: ${t}`)
  }
  const s3 = (b4.section3 || {}) as Record<string, unknown>
  const styleD = (s3.style || {}) as Record<string, string>
  const styleT = stripHtml(styleD.content)
  if (styleT) lines.push(`\nPhong cách đầu tư (đỉnh Nhà 8 = ${styleD.label}): ${styleT}`)
  const fld = (s3.field || {}) as Record<string, string>
  const fldT = stripHtml(fld.content)
  if (fldT) lines.push(`${fld.label}: ${fldT}`)
  const favs = (b4.favSigns || b4.fav_signs || []) as string[]
  if (favs.length > 0) lines.push(`\nDấu hiệu tài chính thuận lợi: ${favs.join(', ')}`)
  for (const mn of (b4.moneyNotes || b4.money_notes || []) as Record<string, string>[]) {
    const t = stripHtml(mn.content)
    if (t) lines.push(`${mn.label}: ${t}`)
  }

  const dataText = lines.join('\n')

  const instructions = loadPromptTemplate('career')
    .replace(/{pronoun}/g, pronoun)
    .replace(/{name}/g, name)
    .replace(/{dob_str}/g, dobStr)

  return (
    `=== DỮ LIỆU PHÂN TÍCH BẢN ĐỒ SAO ===\n` +
    `Họ tên: ${name} | Ngày sinh: ${dobStr}\n` +
    `\n${dataText}\n\n` +
    instructions
  )
}
