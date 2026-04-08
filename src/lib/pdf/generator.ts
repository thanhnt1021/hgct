// PDF generator using Puppeteer - renders HTML essay to PDF
// Replaces Python ReportLab EssayPDFGenerator
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import { randomBytes } from 'crypto'
import { tmpdir } from 'os'

const FONTS_DIR = path.join(process.cwd(), 'public', 'fonts')

function fontB64(filename: string): string {
  try {
    return fs.readFileSync(path.join(FONTS_DIR, filename)).toString('base64')
  } catch {
    return ''
  }
}

const ABSENCE_PHRASES = [
  'không ghi nhận', 'dữ liệu không', 'phần này được bỏ qua',
  'do đó phần này', 'do đó bỏ qua', 'vì vậy bỏ qua',
  'không có dữ liệu', 'không ghi bất cứ', 'không xuất hiện góc',
  'không có bất kỳ góc', 'nên bỏ qua', 'không tồn tại trong dữ liệu',
  'không ghi nhận được', 'không có góc nào', 'bỏ qua tiểu mục',
  'không được kích hoạt', 'không có nhà 5', 'không có nhà 8',
  'không có thông tin duyên số', 'không phải là chủ đạo',
  'không tập trung nhiều vào', 'không có kích hoạt',
  'không có cặp cung đối đỉnh', 'không đến từ sự bổ sung',
  'không có cặp đối đỉnh',
]

function isAbsenceLine(s: string): boolean {
  const low = s.toLowerCase()
  return ABSENCE_PHRASES.some(p => low.includes(p))
}

function isBracketNote(s: string): boolean {
  if (s.includes('[/]')) return false  // contains format tag closing — not a bracket note
  return s.startsWith('[') && s.endsWith(']') && !s.startsWith('[KTLUẬN]') && !s.startsWith('[KTTIỂU]') && !s.startsWith('[SUBTITLE]') && s !== '[CLOSING]' && s !== '[CTA_PAGE]' && s.length > 2
}

/**
 * Parse inline format tags in text (AFTER escapeHtml).
 * Supported: [bold]text[/]  [italic]text[/]  [underline]text[/]
 *            [#rrggbb]text[/]  [#rrggbb+bold]text[/]
 * Malformed / unclosed tags → left as plain text (regex won't match).
 */
function parseFormatTags(text: string): string {
  return text.replace(
    /\[(#[0-9a-fA-F]{6}(?:\+bold)?|bold|italic|underline)\]([^\[]*?)\[\/\]/g,
    (_, tag: string, content: string) => {
      if (tag === 'bold')      return `<strong>${content}</strong>`
      if (tag === 'italic')    return `<em>${content}</em>`
      if (tag === 'underline') return `<span style="text-decoration:underline">${content}</span>`
      if (tag.includes('+bold')) return `<strong style="color:${tag.split('+')[0]}">${content}</strong>`
      return `<span style="color:${tag}">${content}</span>`
    }
  )
}

/**
 * Split inline dash-bullet lists into separate lines.
 * "text: - item1; - item2; - item3." → "text:\n- Item1\n- Item2\n- Item3."
 */
function splitInlineDashBullets(text: string): string {
  return text.split('\n').flatMap(line => {
    const s = line.trim()
    if (!s.includes('; - ')) return [line]

    const segments = s.split(/;\s+- /)
    if (segments.length < 2) return [line]

    const result: string[] = []
    const first = segments[0]

    // First segment may contain "intro: - first_item"
    const colonDash = first.match(/^(.+?):\s*- (.+)$/)
    if (colonDash) {
      result.push(colonDash[1].trim() + ':')
      const item = colonDash[2].trim()
      result.push('- ' + item.charAt(0).toUpperCase() + item.slice(1))
    } else if (first.startsWith('- ')) {
      const item = first.slice(2).trim()
      result.push('- ' + item.charAt(0).toUpperCase() + item.slice(1))
    } else {
      const idx = first.lastIndexOf(' - ')
      if (idx > 0 && idx < first.length - 3) {
        result.push(first.substring(0, idx).trim())
        const item = first.substring(idx + 3).trim()
        result.push('- ' + item.charAt(0).toUpperCase() + item.slice(1))
      } else {
        result.push(first)
      }
    }

    for (let i = 1; i < segments.length; i++) {
      const item = segments[i].trim()
      if (item) {
        result.push('- ' + item.charAt(0).toUpperCase() + item.slice(1))
      }
    }

    return result
  }).join('\n')
}

export function cleanForPdf(text: string): string {
  if (!text) return ''
  // Remove markdown
  text = text.replace(/^#{1,6}\s+/gm, '')
  text = text.replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')
  text = text.replace(/_{1,3}([^_\n]+)_{1,3}/g, '$1')
  text = text.replace(/^[-=_]{3,}\s*$/gm, '')
  text = text.replace(/`+/g, '')
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<[^>]+>/g, '')
  // Strip em dashes from AI output (AI sometimes generates them regardless of prompt)
  text = text.replace(/ — /g, ', ')
  text = text.replace(/—/g, ', ')

  // Split inline dash-bullet lists into separate lines
  text = splitInlineDashBullets(text)

  // Filter absence and bracket lines
  const filtered = text.split('\n').filter(line => {
    const s = line.trim()
    return !isBracketNote(s) && !isAbsenceLine(s)
  })
  text = filtered.join('\n')

  // Remove orphaned subheadings
  const lines = text.split('\n')
  const result: string[] = []
  let i = 0
  while (i < lines.length) {
    const s = lines[i].trim()
    const isSub = s.endsWith(':') && s.length > 0 && s.length < 90 && !/^\d+[.)]\s/.test(s)
    if (isSub) {
      let j = i + 1
      const bodyLines: string[] = []
      while (j < lines.length) {
        const ns = lines[j].trim()
        if (!ns) { j++; continue }
        if ((ns.endsWith(':') && ns.length < 90) || /^\d+[.)]\s/.test(ns) || ns.startsWith('[KTLUẬN]')) break
        bodyLines.push(ns)
        j++
      }
      if (bodyLines.length === 0 || bodyLines.every(bl => isAbsenceLine(bl))) {
        i = j
        continue
      }
    }
    result.push(lines[i])
    i++
  }
  text = result.join('\n')
  text = text.replace(/\n{3,}/g, '\n\n')

  // Trim overly long keyword segments in [bold] keyword lines
  text = text.split('\n').map(trimKeywordBoldLine).join('\n')

  return text.trim()
}

// Limit [bold] keyword lines to max 3 comma-separated segments, no trimming within segments.
// Single-phrase (no comma): keep as-is.
function trimSegments(content: string): string {
  if (!content.includes(',')) return content.trim()
  return content.split(',').map(seg => seg.trim()).filter(s => s.length > 0).slice(0, 3).join(', ')
}

function trimKeywordBoldLine(line: string): string {
  const s = line.trim()
  if (s.startsWith('[bold]') && s.endsWith('[/]')) {
    const inner = s.slice('[bold]'.length, s.length - '[/]'.length)
    return `[bold]${trimSegments(inner)}[/]`
  }
  // 3-block: [red header][/] [bold]name:[/] [bold]keywords[/] — trim only keywords block
  const m3 = s.match(/^(\[#[^\]]+\][^\[]*\[\/\]\s*\[bold\][^\[]*\[\/\]\s*)\[bold\](.*?)\[\/\]$/)
  if (m3) return `${m3[1]}[bold]${trimSegments(m3[2])}[/]`
  // 2-block: [red header][/] [bold]keywords[/]
  const m = s.match(/^(\[#[^\]]+\][^\[]*\[\/\]\s*)\[bold\](.*?)\[\/\]$/)
  if (m) return `${m[1]}[bold]${trimSegments(m[2])}[/]`
  return line
}

const VN_CONJUNCTIONS = new Set(['và','với','của','về','trong','cho','hay','hoặc','là','nhưng','từ','đến','tới','ra','vào','lên','xuống','qua','lại','cùng','theo'])
const PROSE_STARTERS = ['Anh ','Chị ','Bạn ','Với ','Khi ','Để ','Việc ','Điều ','Đây ','Đó ','Như ','Nếu ','Tuy ','Dù ','Mặc ','Vì ','Do ','Bởi ','Qua ','Sau ','Trước ']
const SIGN_KEYS = ['Trân trọng','Claude –','Claude -','Chúc ','— Claude','– Claude','Hạt Giống Chiêm Tinh','Cảm ơn bạn đã','Mong rằng bản luận giải']

function isVnTitleHeading(s: string): boolean {
  if (s.length > 80 || /[.,:;!?]$/.test(s)) return false
  if (PROSE_STARTERS.some(p => s.startsWith(p))) return false
  if (SIGN_KEYS.some(k => s.startsWith(k))) return false
  if (s.toLowerCase().startsWith('kính gửi')) return false
  const words = s.split(/\s+/)
  if (words.length < 2) return false
  const nonConj = words.filter(w => !VN_CONJUNCTIONS.has(w.toLowerCase()))
  if (!nonConj.length) return false
  const capCount = nonConj.filter(w => w && w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase()).length
  return capCount / nonConj.length >= 0.75
}

function classifyLine(line: string): string {
  const s = line.trim()
  if (!s) return 'empty'
  if (s.startsWith('[KTLUẬN]')) return 'red_box'
  if (s.startsWith('[KTTIỂU]')) return 'mini_box'
  if (s === '[CLOSING]') return 'closing_start'
  if (s.startsWith('[SUBTITLE]')) return 'section_subtitle'
  if (/^\s{3,}\*\s/.test(line)) return 'bullet_indent'
  if (s.startsWith('* ')) return 'bullet'
  if (s.startsWith('- ') && s.length > 2) return 'dash_bullet'
  if (s === '[CTA_PAGE]') return 'cta_page_start'
  if (s.startsWith('[LOCKED]')) return 'locked_heading'
  if (s.startsWith('[LSUB]')) return 'locked_subtitle'
  if (/^\d+\.\s+\S/.test(s) && s.length < 120) return 'section_heading'
  if (s.toLowerCase().startsWith('kính gửi')) return 'opener'
  if (SIGN_KEYS.some(k => s.startsWith(k))) return 'signature'
  if (s.endsWith(':') && s.length < 90) return 'subheading'
  if (isVnTitleHeading(s)) return 'title_heading'
  if (s.startsWith('[#')) return 'format_subheading'
  if (s.startsWith('[bold]') && s.endsWith('[/]')) return 'bold_summary'
  return 'body'
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const PDF_IMGS_DIR = '/home/hgct/hgct/imgs'

interface PdfOptions {
  coverTitle: string
  sectionTitle: string
  profile: { name: string; dob: { day: string; month: string; year: string }; tob?: string }
  profileB?: { name: string; dob: { day: string; month: string; year: string }; tob?: string }
  service?: string
  skipClosing?: boolean
}

function buildFontFaces(): string {
  const fonts = [
    { family: 'Nunito',        file: 'Nunito-Regular.ttf' },
    { family: 'NunitoItalic',  file: 'Nunito-LightItalic.ttf' },
    { family: 'Montserrat',    file: 'Montserrat-Regular.ttf' },
    { family: 'MontserratBold',file: 'Montserrat-SemiBoldItalic.ttf' },
    { family: 'GreatVibes',    file: 'GreatVibes-Regular.ttf' },
    { family: 'Faustina',      file: 'Faustina-SemiBold.ttf' },
  ]
  return fonts.map(f => {
    const b64 = fontB64(f.file)
    if (!b64) return ''
    return `@font-face { font-family: '${f.family}'; src: url('data:font/truetype;base64,${b64}') format('truetype'); }`
  }).join('\n')
}

/** Generate the HTML string for a single classified content line.
 * Used by buildHtml() directly and by the subheading-wrap buffering logic.
 * Handles all kinds except 'signature', 'empty', 'closing_start'. */
function lineToHtml(kind: string, s: string): string {
  const safe = escapeHtml(s)
  switch (kind) {
    case 'section_heading':  return `<h2 class="section">${safe}</h2>`
    case 'title_heading':    return `<h2 class="section">${safe}</h2><hr class="section-rule">`
    case 'section_subtitle': return `<p class="section-subtitle">${safe.replace(/^\[SUBTITLE\]\s*/, '')}</p>`
    case 'locked_heading':  return `<h2 class="section">${safe.replace(/^\[LOCKED\]\s*/, '')}</h2>`
    case 'locked_subtitle': return `<p class="section-subtitle">${safe.replace(/^\[LSUB\]\s*/, '')}</p>`
    case 'cta_page_start':  return ''
    case 'subheading':          return `<h3 class="subheading">${parseFormatTags(safe)}</h3>`
    case 'format_subheading':   return `<p class="body">${parseFormatTags(safe)}</p>`
    case 'bold_summary': {
      const cap = safe.replace(/^\[bold\](.)/, (_, c) => `[bold]${c.toUpperCase()}`)
      return `<p class="body">${parseFormatTags(cap)}</p>`
    }
    case 'opener':           return `<p class="opener">${parseFormatTags(safe)}</p>`
    case 'bullet':           return `<p class="bullet">${parseFormatTags(safe)}</p>`
    case 'bullet_indent':    return `<p class="bullet-indent">${parseFormatTags(safe)}</p>`
    case 'dash_bullet':      return `<p class="dash-bullet">${parseFormatTags(safe)}</p>`
    case 'red_box': {
      const content = s.slice('[KTLUẬN]'.length).trim()
      return `<div class="red-box">${parseFormatTags(escapeHtml(content))}</div>`
    }
    case 'mini_box': {
      const content = s.slice('[KTTIỂU]'.length).trim()
      return `<div class="mini-box">${parseFormatTags(escapeHtml(content))}</div>`
    }
    default: return `<p class="body">${parseFormatTags(safe)}</p>`
  }
}

function buildHtml(essayText: string, options: PdfOptions): string {
  // Strip AI's closing (unreliable) and inject hardcoded version when available.
  // Primary cut point: [CLOSING] marker. Fallback: detect "Cảm ơn bạn đã" at line start.
  let processedText = essayText
  const hardcodedClosing = (!options.skipClosing && options.service) ? CLOSING_BLOCKS[options.service] : undefined
  if (hardcodedClosing) {
    let cutIdx = processedText.indexOf('[CLOSING]')
    if (cutIdx < 0) {
      // Fallback: find "Cảm ơn bạn đã" at the start of a line
      const m = processedText.match(/\nCảm ơn bạn đã/)
      if (m?.index != null) cutIdx = m.index
    }
    const base = cutIdx >= 0 ? processedText.slice(0, cutIdx).trimEnd() : processedText.trimEnd()
    processedText = base + '\n\n[CLOSING]\n' + hardcodedClosing
  }
  const cleaned = cleanForPdf(processedText)
  const lines = cleaned.split('\n')
  const dobStr = `${options.profile.dob.day}/${options.profile.dob.month}/${options.profile.dob.year}`

  // Group content into section groups.
  // Group 0 = intro content (opener + paragraphs before first numbered section heading).
  // Groups 1+ = each numbered section heading and its following content.
  const groupHtmlLines: string[][] = [[]]
  const sigBuffer: string[] = []
  function flushSigs() {
    if (!sigBuffer.length) return
    const wrapped = `<div style="page-break-inside:avoid;break-inside:avoid">${sigBuffer.join('')}</div>`
    groupHtmlLines[groupHtmlLines.length - 1].push(wrapped)
    sigBuffer.length = 0
  }

  let seenSectionHeading = false
  let pendingRule = false
  let closingMode = false
  const subheadingBuffer: string[] = []

  // Flush orphaned subheadings (no following content) as plain h3 elements.
  function flushSubheadingBuffer() {
    if (!subheadingBuffer.length) return
    subheadingBuffer.forEach(h => groupHtmlLines[groupHtmlLines.length - 1].push(h))
    subheadingBuffer.length = 0
  }

  for (const line of lines) {
    const s = line.trim()
    if (!s) {
      if (subheadingBuffer.length > 0) continue  // skip spacers while buffering subheadings
      if (sigBuffer.length > 0) {
        sigBuffer.push('<div class="spacer"></div>')
      } else {
        groupHtmlLines[groupHtmlLines.length - 1].push('<div class="spacer"></div>')
      }
      continue
    }
    let kind = classifyLine(line)
    // Once [CLOSING] is seen, all subsequent lines become signature
    if (closingMode && kind !== 'closing_start') kind = 'signature'
    if (kind === 'closing_start') { flushSubheadingBuffer(); flushSigs(); closingMode = true; continue }
    // Intro section (before first numbered heading): no subheadings
    if ((kind === 'subheading' || kind === 'format_subheading' || kind === 'bold_summary') && !seenSectionHeading) kind = 'body'
    if (kind === 'section_heading') seenSectionHeading = true

    if (kind === 'signature') {
      flushSubheadingBuffer()
      sigBuffer.push(`<p class="signature">${escapeHtml(s)}</p>`)
      continue
    }
    flushSigs()

    // ── SUBHEADING BUFFERING ───────────────────────────────────────────────────
    // Buffer consecutive h3 subheadings, then wrap them together with the first
    // following content element in a page-break-inside:avoid div.
    // The print engine keeps the whole block on one page — no JS measurement needed.
    if (kind === 'subheading' || kind === 'format_subheading' || kind === 'bold_summary') {
      if (pendingRule) {
        groupHtmlLines[groupHtmlLines.length - 1].push('<hr class="section-rule">')
        pendingRule = false
      }
      subheadingBuffer.push(lineToHtml(kind, s))
      continue
    }

    if (subheadingBuffer.length > 0) {
      if (kind !== 'section_heading' && kind !== 'title_heading' && kind !== 'section_subtitle') {
        // First real content after subheading(s) — wrap together as unbreakable unit
        const wrapped = `<div style="page-break-inside:avoid;break-inside:avoid">${subheadingBuffer.join('')}${lineToHtml(kind, s)}</div>`
        groupHtmlLines[groupHtmlLines.length - 1].push(wrapped)
        subheadingBuffer.length = 0
        continue
      }
      // Structural break (new section/subtitle): flush buffer as orphaned subheadings
      flushSubheadingBuffer()
    }
    // ──────────────────────────────────────────────────────────────────────────

    // Flush pendingRule before any non-subtitle content
    if (pendingRule && kind !== 'section_subtitle') {
      groupHtmlLines[groupHtmlLines.length - 1].push('<hr class="section-rule">')
      pendingRule = false
    }

    if (kind === 'cta_page_start') { groupHtmlLines.push([]); seenSectionHeading = true; continue }
    if (kind === 'section_heading') groupHtmlLines.push([])
    if (kind === 'locked_heading') seenSectionHeading = true

    const html = lineToHtml(kind, s)
    groupHtmlLines[groupHtmlLines.length - 1].push(html)
    if (kind === 'section_heading') pendingRule = true
    if (kind === 'section_subtitle') {
      groupHtmlLines[groupHtmlLines.length - 1].push('<hr class="section-rule">')
      pendingRule = false
    }
  }
  flushSubheadingBuffer()
  flushSigs()

  const contentHtml = groupHtmlLines.map((htmlLines, i) => {
    const inner = i === 0
      ? `<h2 class="section section-first">${escapeHtml(options.sectionTitle)}</h2>
<hr style="border:none;border-top:1pt solid #dc2626;margin-bottom:8pt;">${htmlLines.join('')}`
      : htmlLines.join('')
    const cls = i === 0 ? 'section-group' : 'section-group is-section'
    return `<div class="${cls}">${inner}</div>`
  }).join('')

  const tobLine = options.profile.tob ? `\n       <div class="cover-sub">Giờ sinh: ${escapeHtml(options.profile.tob)}</div>` : ''
  const tobBLine = options.profileB?.tob ? `\n       <div class="cover-sub">Giờ sinh: ${escapeHtml(options.profileB.tob)}</div>` : ''
  const coverName = options.profileB
    ? `<div class="cover-name-sm">${escapeHtml(options.profile.name)}</div>
       <div class="cover-sub">Ngày sinh: ${dobStr}</div>${tobLine}
       <div class="cover-and">&amp;</div>
       <div class="cover-name-sm">${escapeHtml(options.profileB.name)}</div>
       <div class="cover-sub">Ngày sinh: ${options.profileB.dob.day}/${options.profileB.dob.month}/${options.profileB.dob.year}</div>${tobBLine}`
    : `<div class="cover-name">${escapeHtml(options.profile.name)}</div>
       <div class="cover-sub">Ngày sinh: ${dobStr}</div>${tobLine}`

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
${buildFontFaces()}

:root { --scallop-stroke: ${SCALLOP_STROKE_COLOR[options.service ?? ''] ?? '#7B68AE'}; }

/* @page: size only — margins are set via page.pdf() to avoid conflicts */
@page { size: A4; }
/* margin:0 on body ensures clientWidth in screen mode = viewport width = print content width (642px) */
body { margin: 0; font-family: 'Nunito', sans-serif; font-size: 14.9pt; color: #1f2937; line-height: 1.55; }

.cover { page-break-after: always; text-align: center; height: 244mm; display: flex; flex-direction: column; box-sizing: border-box; }
.cover-line { width: 55%; height: 1.5px; background: #dc2626; margin: 7mm auto; }
.cover-title { font-family: 'MontserratBold'; font-size: 32.9pt; color: #dc2626; margin: 0; }
.cover-name { font-family: 'GreatVibes'; font-size: 50.8pt; color: #1f2937; margin: 10mm 0 4mm; }
.cover-name-sm { font-family: 'GreatVibes'; font-size: 38.9pt; color: #1f2937; margin: 4mm 0; }
.cover-and { font-family: 'NunitoItalic'; font-size: 23.9pt; color: #6b7280; margin: 4mm 0; }
.cover-sub { font-family: 'Nunito'; font-size: 17.9pt; color: #6b7280; }
.cover-footer { font-family: 'Nunito'; font-size: 17.9pt; color: #6b7280; padding-bottom: 5mm; }
.cover-spacer { flex: 1; min-height: 0; }
.cover-main { width: 100%; }

.section { font-family: 'MontserratBold'; font-size: 19.5pt; color: #dc2626; margin: 14pt 0 6pt; page-break-after: avoid; break-after: avoid; }
.section-first { margin-top: 0; }
.section-subtitle { font-family: 'NunitoItalic'; font-size: 12pt; color: #6b7280; margin: -2pt 0 4pt; }
.section-rule { border: none; border-top: 1pt solid #dc2626; margin: 0 0 8pt; page-break-after: avoid; break-after: avoid; }
.subheading { font-family: 'MontserratBold'; font-size: 16.5pt; color: #1f2937; margin: 8pt 0 4pt; page-break-after: avoid; break-after: avoid; }
.opener { font-family: 'NunitoItalic'; font-size: 14.9pt; margin: 4pt 0 6pt; }
.body { text-align: justify; margin: 2pt 0 5pt; orphans: 3; widows: 3; }
.bullet { margin: 2pt 0 3pt; padding-left: 12pt; text-indent: -12pt; }
.bullet-indent { font-family: 'NunitoItalic'; font-size: 13.5pt; color: #dc2626; margin: 1pt 0 2pt; padding-left: 28pt; text-indent: -12pt; }
.dash-bullet { margin: 2pt 0 3pt; padding-left: 12pt; text-indent: -12pt; font-style: italic; orphans: 3; widows: 3; }
.signature { font-family: 'NunitoItalic'; font-size: 11pt; color: #6b7280; margin: 8pt 0 3pt; }
.spacer { height: 4pt; }
.red-box { font-family: 'MontserratBold'; font-size: 13.5pt; border: 1.5pt solid #dc2626; background: #fff5f5; padding: 18px 32px; margin: 20px 20px; text-align: justify; page-break-inside: avoid; break-inside: avoid; }
.mini-box { font-family: 'Nunito'; font-size: 15.5pt; border: 1.2pt solid #dc2626; background: #fef9f9; padding: 7pt 10pt; margin: 5pt 0 7pt; text-align: justify; page-break-inside: avoid; break-inside: avoid; }

/* Signature: fixed orphans/widows (typically 1-line, just a safety floor). */
.signature { orphans: 4; widows: 4; }

.section-group { }
.section-group.is-section { page-break-before: always; break-before: always; }
</style></head><body>
<div class="cover">
  <div class="cover-spacer"></div>
  <div class="cover-main">
    <div class="cover-line"></div>
    <h1 class="cover-title">${escapeHtml(options.coverTitle)}</h1>
    <div class="cover-line"></div>
    ${coverName}
  </div>
  <div class="cover-spacer"></div>
  <div class="cover-footer">Hạt Giống Chiêm Tinh</div>
</div>
${contentHtml}
</body></html>`
}

// Service → hardcoded closing block (injected after AI output, replaces AI's unreliable closing)
// Keeping closing text in prompts is intentional — it nudges AI to output [CLOSING] marker.
// Everything after [CLOSING] from AI is stripped and replaced with this.
const CLOSING_BLOCKS: Partial<Record<string, string>> = {
  career: `Cảm ơn bạn đã lựa chọn Hạt Giống Chiêm Tinh.

Hy vọng những góc nhìn từ bản luận giải này sẽ giúp bạn nhìn rõ hơn những tiềm năng bên trong mình, hiểu được "hạt giống" riêng mà bạn mang theo và tìm thấy con đường phù hợp để phát triển.

Chúc bạn luôn đủ kiên nhẫn, đủ tin tưởng vào bản thân và tìm thấy con đường sự nghiệp khiến bạn thật sự được là chính mình.

Trân trọng,

Hạt Giống Chiêm Tinh`,

  love: `Cảm ơn bạn đã dành thời gian để nhìn lại hành trình yêu của mình qua góc nhìn của Hạt Giống Chiêm Tinh.

Nếu hành trình yêu của bạn từng có những chờ đợi, những trải nghiệm chưa trọn vẹn hay những câu hỏi chưa có lời đáp, thì điều đó không có nghĩa là bạn kém may mắn trong tình yêu. Đôi khi đó chỉ là cách cuộc đời giúp bạn hiểu mình sâu sắc hơn trước khi bước vào một mối quan hệ thật sự phù hợp.

Hy vọng bản luận giải này đã giúp bạn nhìn rõ hơn về bản thân trong tình yêu, để từ đó bước vào những mối quan hệ với nhiều sự thấu hiểu, chủ động và bình an hơn.

Chúc bạn luôn giữ được sự dịu dàng với chính mình và khi thời điểm phù hợp đến, bạn sẽ gặp được một mối quan hệ khiến bạn cảm thấy được là chính mình và được yêu thương.

Trân trọng,

Hạt Giống Chiêm Tinh`,

  synastry: `Cảm ơn bạn đã dành thời gian để nhìn lại mối quan hệ của mình qua góc nhìn của Hạt Giống Chiêm Tinh.

Mỗi mối quan hệ đều giống như một cuộc gặp gỡ giữa hai "bầu trời" khác nhau. Có những điểm hòa hợp khiến hai người dễ dàng tìm thấy nhau, và cũng có những khác biệt giúp mỗi người học cách trưởng thành hơn trong tình yêu.

Hy vọng bản luận giải này đã giúp bạn nhìn rõ hơn sự kết nối giữa hai bạn - để trân trọng những điều tốt đẹp đang có, và nhẹ nhàng hơn với những điều vẫn đang cần được thấu hiểu.

Bởi đôi khi, điều quan trọng nhất trong một mối quan hệ không phải là hai người hoàn hảo dành cho nhau, mà là hai người sẵn sàng hiểu nhau hơn, và hoàn thiện bản thân mỗi ngày.

Chúc hai bạn luôn tìm thấy sự bình yên và ý nghĩa trên hành trình kết nối của chính mình.

Trân trọng,

Hạt Giống Chiêm Tinh`,

  transit: `Cảm ơn bạn đã tin tưởng Hạt Giống Chiêm Tinh.

Mong rằng bản luận giải này, cũng như những góc nhìn từ chiêm tinh sẽ giúp bạn hiểu mình rõ hơn, nhẹ lòng hơn trước những điều đang diễn ra và tự tin bước tiếp trên con đường của mình.

Chúc bạn luôn tìm thấy sự bình an và đúng hướng trên hành trình cuộc đời.

Trân trọng,

Hạt Giống Chiêm Tinh`,
}

// Service → scallop border stroke color
const SCALLOP_STROKE_COLOR: Record<string, string> = {
  career:       '#346099',
  love:         '#7B68AE',
  synastry:     '#7B68AE',
  transit:      '#7B68AE',
}

// Service → image prefix mapping
const SERVICE_IMG_PREFIX: Record<string, string> = {
  transit:      'VanHan',
  vanhan:       'VanHan',
  career:       'HuongNghiep',
  love:         'TinhDuyen',
  synastry:     'CapDoi',
  relationship: 'CapDoi',
}

/**
 * Template PDF assembly (all services):
 * cover (01) + each content page with bg-02 overlaid under text + end (03)
 *
 * All 3 JPEGs embedded directly in finalDoc (no intermediate docs).
 * bgImg embedded ONCE, reused across all content pages — pdf-lib
 * references the same XObject, so bg is stored only once regardless of page count.
 */
function buildCareerReferenceHtml(): string {
  const imgB64 = fs.readFileSync(path.join(PDF_IMGS_DIR, 'pdf-HuongNghiep-0x.jpg')).toString('base64')
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
${buildFontFaces()}
@page { size: A4; }
body { margin: 0; font-family: 'Nunito', sans-serif; font-size: 14.9pt; color: #1f2937; line-height: 1.55; }
.ref-title { font-family: 'MontserratBold'; font-size: 19.5pt; color: #dc2626; margin: 0 0 6pt; }
.ref-rule  { border: none; border-top: 1pt solid #dc2626; margin: 0 0 8pt; }
.ref-sub   { font-family: 'MontserratBold'; font-size: 13pt; color: #1f2937; margin: 0 0 3pt; }
.ref-cap   { font-family: 'NunitoItalic'; font-size: 11pt; color: #6b7280; margin: 0 0 6pt; }
.ref-img   { display: block; max-height: 150mm; width: auto; max-width: 100%; margin: 0 auto 6pt; }
.ref-conc-title { font-family: 'MontserratBold'; font-size: 16.5pt; color: #dc2626; margin: 0 0 5pt; }
.ref-cols  { display: grid; grid-template-columns: 1fr 1fr 1fr; }
.ref-col   { padding: 0 7pt; font-size: 8.5pt; line-height: 1.35; }
.ref-col:not(:first-child) { border-left: 0.5pt solid #d1d5db; }
.ref-col-title { font-family: 'MontserratBold'; font-size: 8.5pt; color: #dc2626; margin: 0 0 3pt; line-height: 1.3; }
.ref-col-body  { font-family: 'Nunito'; font-size: 8pt; color: #1f2937; line-height: 1.35; margin: 0; }
</style></head><body>
<div class="ref-title">TÀI LIỆU THAM KHẢO</div>
<hr class="ref-rule">
<div class="ref-sub">"La bàn nghề nghiệp trong kỷ nguyên trí tuệ nhân tạo (AI)"</div>
<div class="ref-cap">Dữ liệu mới nhất do Anthropic (một công ty nghiên cứu và phát triển trí tuệ nhân tạo) công bố vào tháng 3/2026</div>
<img class="ref-img" src="data:image/jpeg;base64,${imgB64}" alt="">
<div class="ref-conc-title">Kết luận:</div>
<div class="ref-cols">
  <div class="ref-col">
    <div class="ref-col-title">Nhóm 1: Những công việc AI khó thay thế</div>
    <div class="ref-col-body">- Tính chất: Cần sự thấu cảm sâu sắc, tư vấn tâm lý, xử lý các tình huống cảm xúc phức tạp, và các công việc sáng tạo dựa trên trải nghiệm, tay nghề cá nhân, thợ lành nghề.</div>
  </div>
  <div class="ref-col">
    <div class="ref-col-title">Nhóm 2: Những công việc AI sẽ hỗ trợ</div>
    <div class="ref-col-body">- Tính chất: Tổng hợp thông tin, viết lách cơ bản, thiết kế sơ bộ hoặc quản lý dữ liệu.</div>
  </div>
  <div class="ref-col">
    <div class="ref-col-title">Nhóm 3: Những công việc có nguy cơ bị thay thế cao</div>
    <div class="ref-col-body">- Tính chất: Các công việc lặp đi lặp lại, nhập liệu đơn thuần hoặc các quy trình logic khô khan không cần sự sáng tạo hay linh hoạt.</div>
  </div>
</div>
</body></html>`
}

async function buildTemplatePdf(contentPdfBuffer: Buffer, imgPrefix: string, refPageBuffer?: Buffer): Promise<Buffer> {
  const { PDFDocument } = await import('pdf-lib')
  const W = 595.28, H = 841.89  // A4 in points

  const finalDoc = await PDFDocument.create()

  // Embed all 3 JPEGs once into finalDoc
  const coverImg = await finalDoc.embedJpg(fs.readFileSync(`${PDF_IMGS_DIR}/pdf-${imgPrefix}-01.jpg`))
  const bgImg    = await finalDoc.embedJpg(fs.readFileSync(`${PDF_IMGS_DIR}/pdf-${imgPrefix}-02.jpg`))
  const endImg   = await finalDoc.embedJpg(fs.readFileSync(`${PDF_IMGS_DIR}/pdf-${imgPrefix}-03.jpg`))

  // ── Page 1: cover ─────────────────────────────────────────────────────────
  finalDoc.addPage([W, H]).drawImage(coverImg, { x: 0, y: 0, width: W, height: H })

  // ── Content pages: bgImg (bottom) + embedded content page (top) ───────────
  const contentDoc = await PDFDocument.load(contentPdfBuffer)
  for (const pageIndex of contentDoc.getPageIndices()) {
    const [embeddedPage] = await finalDoc.embedPages([contentDoc.getPage(pageIndex)])
    const p = finalDoc.addPage([W, H])
    p.drawImage(bgImg, { x: 0, y: 0, width: W, height: H })       // layer 1: background
    p.drawPage(embeddedPage, { x: 0, y: 0, width: W, height: H }) // layer 2: text content
  }

  // ── Reference page (career only) — second-to-last ──────────────────────────
  if (refPageBuffer) {
    const refDoc = await PDFDocument.load(refPageBuffer)
    for (const idx of refDoc.getPageIndices()) {
      const [embRef] = await finalDoc.embedPages([refDoc.getPage(idx)])
      const p = finalDoc.addPage([W, H])
      p.drawImage(bgImg, { x: 0, y: 0, width: W, height: H })
      p.drawPage(embRef, { x: 0, y: 0, width: W, height: H })
    }
  }

  // ── Last page: end ─────────────────────────────────────────────────────────
  finalDoc.addPage([W, H]).drawImage(endImg, { x: 0, y: 0, width: W, height: H })

  return Buffer.from(await finalDoc.save())
}

// Footer template for Puppeteer's native displayHeaderFooter.
// Renders INSIDE the bottom margin area — never overlaps with page content.
// padding-bottom: 12mm lifts the footer text above any border/decoration at the
// page bottom edge (measured from vanhan bg image: galaxy border = 10.4mm).
const FOOTER_TEMPLATE = `<div style="
  box-sizing: border-box;
  width: 100%;
  padding: 0 25mm 12mm;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10pt;
  color: #9ca3af;
  text-align: center;
"><div style="border-top: 0.8pt solid #fca5a5; padding-top: 3mm;">Hạt Giống Chiêm Tinh</div></div>`

export async function generatePdf(essayText: string, options: PdfOptions): Promise<Buffer | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any = null
  try {
    const imgPrefix = options.service ? SERVICE_IMG_PREFIX[options.service] : undefined

    const chromium = await import('@sparticuz/chromium')
    const puppeteer = await import('puppeteer-core')

    // Auto-fix EACCES: if chromium binary isn't executable by current user, delete it
    // so @sparticuz/chromium re-extracts with correct ownership on next executablePath() call
    let execPath = await chromium.default.executablePath()
    try {
      const { accessSync, unlinkSync, constants } = await import('fs')
      try { accessSync(execPath, constants.X_OK) } catch {
        console.warn('[PDF] Chromium not executable — removing and re-extracting:', execPath)
        try { unlinkSync(execPath) } catch {}
        execPath = await chromium.default.executablePath()
      }
    } catch {}

    browser = await puppeteer.default.launch({
      args: [...chromium.default.args, '--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: execPath,
      headless: true,
    })
    const page = await browser.newPage()
    // Global timeout for all navigations — inline HTML can take >30s on loaded server
    page.setDefaultNavigationTimeout(60000)

    // Fix 1: viewport width = 642px = A4 print content width (170mm @ 96dpi).
    // This makes screen layout match print layout so heading overflow detection is accurate.
    await page.setViewport({ width: 642, height: 1123 })

    // Capture browser console logs for debugging JS evaluations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    page.on('console', (msg: any) => console.log('[PDF-JS]', msg.text()))

    const html = buildHtml(essayText, options)
    // 'load' fires when HTML is parsed — correct for self-contained inline HTML.
    // Font correctness is guaranteed by `document.fonts.ready` in the evaluate below.
    // 'networkidle0' was unreliable: Chromium internal activity could reset the 500ms
    // idle timer, causing intermittent 30s timeouts even with no external resources.
    await page.setContent(html, { waitUntil: 'load', timeout: 60000 })

    // Polyfill esbuild's __name helper for TSX runtime (not available in browser context)
    await page.evaluate(() => { (globalThis as any).__name = (fn: any, _n: string) => fn })

    // Heading resize + orphan compression in one evaluate.
    // await document.fonts.ready ensures font metrics are accurate before any measurement.
    await page.evaluate(async () => {
      // Wait for all embedded fonts to be fully loaded before measuring text widths
      await document.fonts.ready

      // ── STRIP TRAILING SPACERS ───────────────────────────────────────────────────
      // Trailing .spacer divs (from blank lines in essay) can push a section-group's
      // height past a page boundary. Combined with page-break-before:always on the
      // next group, this creates a completely blank page. Remove them proactively.
      for (const group of Array.from(document.querySelectorAll('.section-group')) as HTMLElement[]) {
        let last = group.lastElementChild as Element | null
        while (last) {
          const isEmpty = last.classList.contains('spacer') ||
            (last.textContent?.trim() === '' && (last as HTMLElement).offsetHeight <= 8)
          if (isEmpty) {
            const prev = last.previousElementSibling
            last.remove()
            last = prev
          } else {
            break
          }
        }
      }
      void document.body.offsetHeight // force layout flush after removal

      // ── HEADING RESIZE ──────────────────────────────────────────────────────────
      // Reduce all h2.section font-sizes together until every heading fits in 1 line.
      // viewport=642px ensures clientWidth = A4 print content area (170mm).
      const sections = Array.from(document.querySelectorAll('h2.section')) as HTMLElement[]
      if (sections.length) {
        let tries = 0
        let anyWraps = true
        while (anyWraps && tries < 40) {
          tries++
          anyWraps = false
          for (const el of sections) {
            const saved = el.style.whiteSpace
            el.style.whiteSpace = 'nowrap'
            void el.offsetWidth // force layout flush
            const wraps = el.scrollWidth > el.clientWidth
            el.style.whiteSpace = saved
            if (wraps) {
              anyWraps = true
              console.log(`[heading-wrap] "${el.textContent?.slice(0, 40)}" scrollW=${el.scrollWidth} clientW=${el.clientWidth}`)
              break
            }
          }
          if (anyWraps) {
            const curPx = parseFloat(window.getComputedStyle(sections[0]).fontSize)
            if (curPx <= 10) break
            const newPx = Math.round((curPx - 0.5) * 10) / 10
            sections.forEach(el => { el.style.fontSize = newPx + 'px' })
            console.log(`[heading-resize] → ${newPx}px`)
          }
        }
        sections.forEach(el => {
          el.style.whiteSpace = 'nowrap'
          console.log(`[heading-final] "${el.textContent?.slice(0, 40)}" fs=${window.getComputedStyle(el).fontSize} scrollW=${el.scrollWidth} clientW=${el.clientWidth}`)
          el.style.whiteSpace = ''
        })
      }

      // ── GLOBAL ORPHAN COMPRESSION ────────────────────────────────────────────────
      // Detects paragraphs with ≤3 orphan lines overflowing onto the next print page.
      // When found, reduces line-height GLOBALLY for ALL body content and re-checks
      // from scratch — guaranteeing no orphan is ever missed (no bug hole).
      //
      // Positions measured relative to each section-group's top, because .is-section
      // groups always start at the top of a new print page (page-break-before: always).
      //
      // PAGE_H = A4(297mm) - top(25mm) - bottom(28mm) = 244mm ≈ 922px at 96dpi
      const PAGE_H = (297 - 25 - 28) * (96 / 25.4)
      const BODY_SEL = 'p.body, p.opener, p.bullet, p.bullet-indent, p.dash-bullet, p.signature'

      function hasOrphans(): boolean {
        for (const group of Array.from(document.querySelectorAll('.section-group')) as HTMLElement[]) {
          const groupTop = group.getBoundingClientRect().top
          for (const el of Array.from(group.querySelectorAll(BODY_SEL)) as HTMLElement[]) {
            const relBottom = el.getBoundingClientRect().bottom - groupTop
            const overflow = relBottom % PAGE_H
            if (overflow < 1) continue
            const lhPx = parseFloat(window.getComputedStyle(el).lineHeight)
            if (!lhPx || isNaN(lhPx)) continue
            if (overflow < lhPx * 3.5) {
              console.log(`[orphan-found] overflow=${overflow.toFixed(0)}px / threshold=${(lhPx * 3.5).toFixed(0)}px / "${el.textContent?.slice(0, 30)}"`)
              return true
            }
          }
        }
        return false
      }

      let lh = 1.55
      for (let iter = 0; iter < 15 && lh >= 1.30; iter++) {
        if (!hasOrphans()) {
          console.log(`[orphan-done] stable at lh=${lh} after ${iter} iter`)
          break
        }
        lh = Math.round((lh - 0.02) * 100) / 100
        ;(document.querySelectorAll(BODY_SEL) as NodeListOf<HTMLElement>).forEach(el => {
          el.style.lineHeight = String(lh)
        })
        void document.body.offsetHeight // force full layout flush
        console.log(`[orphan-compress] iter=${iter + 1} lh=${lh}`)
      }

      // ── PER-ELEMENT ORPHANS/WIDOWS ────────────────────────────────────────────────
      // Set CSS orphans/widows per paragraph based on its actual line count AFTER
      // compression. This prevents widows from cascading into new orphans:
      //   lines 1-5 or >8 → widows=4, orphans=4  (standard rule)
      //   lines 6-8       → widows=floor(n/2), orphans=ceil(n/2)
      //     e.g. 6→3+3, 7→3+4 (widow=3,orphan=4), 8→4+4
      // Applied as inline styles (override CSS) so print engine uses per-para values.
      const OW_SEL = 'p.body, p.opener, p.bullet, p.bullet-indent, p.dash-bullet'
      ;(document.querySelectorAll(OW_SEL) as NodeListOf<HTMLElement>).forEach(el => {
        const lhPx = parseFloat(window.getComputedStyle(el).lineHeight)
        if (!lhPx || isNaN(lhPx) || lhPx <= 0) return
        const lineCount = Math.round(el.offsetHeight / lhPx)
        let w: number, o: number
        if (lineCount <= 5) {
          // Short paragraphs: keep on one page (current or next), never split
          el.style.pageBreakInside = 'avoid'
          el.style.breakInside = 'avoid'
          w = lineCount; o = lineCount
        } else if (lineCount <= 8) {
          w = Math.floor(lineCount / 2)  // widow  (smaller half → top of next page)
          o = Math.ceil(lineCount / 2)   // orphan (larger half  → bottom of current page)
        } else {
          w = 4; o = 4
        }
        el.style.widows = String(w)
        el.style.orphans = String(o)
        console.log(`[ow] lines=${lineCount} w=${w} o=${o} "${el.textContent?.slice(0, 25)}"`)
      })


      // ── SCALLOPED BORDER FOR RED-BOX ──────────────────────────────────────────────
      // Replace the rectangular CSS border with a wavy/scalloped SVG border.
      // Runs after all layout adjustments so box dimensions are final.

      const genScallopPath = (W: number, H: number, scallopD: number): string => {
        let cr = scallopD * 0.6
        cr = Math.min(cr, (H - 4) / 2, (W - 4) / 2)
        if (cr < 4) cr = 4

        const topLen = Math.max(0, W - 2 * cr)
        const sideLen = Math.max(0, H - 2 * cr)

        const calcN = (length: number, targetD: number) => {
          if (length <= 0) return { n: 0, d: 0 }
          const n = Math.max(1, Math.round(length / targetD))
          return { n, d: length / n }
        }

        const top = calcN(topLen, scallopD)
        const side = calcN(sideLen, scallopD)

        const kappa = 0.5522847498
        const cb = cr * 0.55

        let p = `M ${cr} 0`

        // Top edge — scallops bulge UP (negative y)
        for (let i = 0; i < top.n; i++) {
          const sx = cr + i * top.d
          const ex = sx + top.d
          const b = top.d / 2 * 0.75
          p += ` C ${sx + top.d * 0.25} ${-b}, ${sx + top.d * 0.75} ${-b}, ${ex} 0`
        }

        // Top-right corner
        p += ` C ${W - cr + cr * kappa + cb * 0.3} ${-cb * 0.3}, ${W + cb * 0.3} ${cr - cr * kappa - cb * 0.3}, ${W} ${cr}`

        // Right edge — scallops bulge RIGHT (positive x)
        for (let i = 0; i < side.n; i++) {
          const sy = cr + i * side.d
          const ey = sy + side.d
          const b = side.d / 2 * 0.75
          p += ` C ${W + b} ${sy + side.d * 0.25}, ${W + b} ${sy + side.d * 0.75}, ${W} ${ey}`
        }

        // Bottom-right corner
        p += ` C ${W + cb * 0.3} ${H - cr + cr * kappa + cb * 0.3}, ${W - cr + cr * kappa + cb * 0.3} ${H + cb * 0.3}, ${W - cr} ${H}`

        // Bottom edge — scallops bulge DOWN (positive y), right to left
        for (let i = 0; i < top.n; i++) {
          const sx = W - cr - i * top.d
          const ex = sx - top.d
          const b = top.d / 2 * 0.75
          p += ` C ${sx - top.d * 0.25} ${H + b}, ${sx - top.d * 0.75} ${H + b}, ${ex} ${H}`
        }

        // Bottom-left corner
        p += ` C ${cr - cr * kappa - cb * 0.3} ${H + cb * 0.3}, ${-cb * 0.3} ${H - cr + cr * kappa + cb * 0.3}, 0 ${H - cr}`

        // Left edge — scallops bulge LEFT (negative x), bottom to top
        for (let i = 0; i < side.n; i++) {
          const sy = H - cr - i * side.d
          const ey = sy - side.d
          const b = side.d / 2 * 0.75
          p += ` C ${-b} ${sy - side.d * 0.25}, ${-b} ${sy - side.d * 0.75}, 0 ${ey}`
        }

        // Top-left corner
        p += ` C ${-cb * 0.3} ${cr - cr * kappa - cb * 0.3}, ${cr - cr * kappa - cb * 0.3} ${-cb * 0.3}, ${cr} 0`

        p += ' Z'
        return p
      }

      ;(document.querySelectorAll('.red-box') as NodeListOf<HTMLElement>).forEach(box => {
        const w = box.offsetWidth
        const h = box.offsetHeight
        const scallopD = 40
        const strokeW = 2.5
        const maxBulge = scallopD / 2 * 0.75
        const overflow = Math.ceil(maxBulge + strokeW)  // = 18px

        const pathD = genScallopPath(w, h, scallopD)

        const svgNS = 'http://www.w3.org/2000/svg'
        const svg = document.createElementNS(svgNS, 'svg')
        svg.setAttribute('width', String(w + 2 * overflow))
        svg.setAttribute('height', String(h + 2 * overflow))
        svg.setAttribute('viewBox', `${-overflow} ${-overflow} ${w + 2 * overflow} ${h + 2 * overflow}`)
        svg.style.position = 'absolute'
        svg.style.top = '0'
        svg.style.left = '0'
        svg.style.pointerEvents = 'none'
        svg.style.zIndex = '-1'

        const pathEl = document.createElementNS(svgNS, 'path')
        pathEl.setAttribute('d', pathD)
        const scallopStroke = getComputedStyle(document.documentElement).getPropertyValue('--scallop-stroke').trim() || '#7B68AE'
        pathEl.setAttribute('fill', '#fff5f5')
        pathEl.setAttribute('stroke', scallopStroke)
        pathEl.setAttribute('stroke-width', String(strokeW))
        pathEl.setAttribute('stroke-linecap', 'round')
        pathEl.setAttribute('stroke-linejoin', 'round')
        svg.appendChild(pathEl)

        // Wrapper approach: wrap the box in a div that includes the scallop overflow
        // inside its own border-box (via padding: overflow). Move page-break-inside:avoid
        // to the wrapper so the print engine's page-break algorithm sees the full
        // wrapper height (box + overflow above/below) as the unbreakable unit.
        // This prevents the SVG (positioned at top:0 of wrapper) from bleeding onto
        // the previous page when the box is pushed to the next page.
        // Wrapper margin is reduced by overflow so total visual spacing stays the same.
        const computed = window.getComputedStyle(box)
        const bmt = parseFloat(computed.marginTop) || 0
        const bmr = parseFloat(computed.marginRight) || 0
        const bmb = parseFloat(computed.marginBottom) || 0
        const bml = parseFloat(computed.marginLeft) || 0

        const wrapper = document.createElement('div')
        wrapper.style.position = 'relative'
        wrapper.style.padding = `${overflow}px`
        wrapper.style.marginTop    = `${Math.max(0, bmt - overflow)}px`
        wrapper.style.marginRight  = `${Math.max(0, bmr - overflow)}px`
        wrapper.style.marginBottom = `${Math.max(0, bmb - overflow)}px`
        wrapper.style.marginLeft   = `${Math.max(0, bml - overflow)}px`
        wrapper.style.pageBreakInside = 'avoid'
        wrapper.style.breakInside = 'avoid'

        // Remove CSS border/bg from box; SVG provides them. Box no longer owns the break.
        box.style.border = 'none'
        box.style.background = 'none'
        box.style.position = 'relative'
        box.style.zIndex = '0'
        box.style.margin = '0'
        box.style.pageBreakInside = 'auto'
        box.style.breakInside = 'auto'

        // Re-parent: wrapper replaces box in the DOM, box + SVG go inside wrapper
        box.parentNode!.insertBefore(wrapper, box)
        wrapper.appendChild(box)
        wrapper.appendChild(svg)

        console.log(`[scallop] red-box ${w}x${h} overflow=${overflow} — wrapper`)
      })
    })

    const contentPdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      // Fix 2: Use Puppeteer native footer — renders inside bottom margin, never overlaps content.
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: FOOTER_TEMPLATE,
      margin: { top: '25mm', right: '20mm', bottom: '28mm', left: '20mm' },
    })

    // Career: render static reference page (second-to-last) with same margins/footer
    let refPageBuffer: Buffer | undefined
    if (options.service === 'career') {
      page.setDefaultNavigationTimeout(60000)
      await page.setContent(buildCareerReferenceHtml(), { waitUntil: 'load', timeout: 60000 })
      const refPdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: FOOTER_TEMPLATE,
        margin: { top: '25mm', right: '20mm', bottom: '28mm', left: '20mm' },
      })
      refPageBuffer = Buffer.from(refPdf)
    }

    await browser.close()
    browser = null // mark as closed so finally doesn't double-close

    const finalPdf = imgPrefix
      ? await buildTemplatePdf(Buffer.from(contentPdf), imgPrefix, refPageBuffer)
      : Buffer.from(contentPdf)

    return await compressPdf(finalPdf)
  } catch (e) {
    console.error('[PDF ERROR]', e)
    return null
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}

async function compressPdf(buffer: Buffer): Promise<Buffer> {
  const id = randomBytes(8).toString('hex')
  const inFile = path.join(tmpdir(), `hgct-pdf-in-${id}.pdf`)
  const outFile = path.join(tmpdir(), `hgct-pdf-out-${id}.pdf`)
  try {
    fs.writeFileSync(inFile, buffer)
    execFileSync('gs', [
      '-dBATCH', '-dNOPAUSE', '-dQUIET',
      '-sDEVICE=pdfwrite',
      '-dPDFSETTINGS=/printer',
      '-dCompatibilityLevel=1.7',
      `-sOutputFile=${outFile}`,
      inFile,
    ], { timeout: 60_000 })
    const result = fs.readFileSync(outFile)
    console.log(`[PDF] gs compress: ${buffer.length} → ${result.length} bytes (${Math.round(result.length / buffer.length * 100)}%)`)
    return result
  } catch (err) {
    console.error('[PDF] gs compress failed, returning uncompressed:', err)
    return buffer
  } finally {
    try { fs.unlinkSync(inFile) } catch {}
    try { fs.unlinkSync(outFile) } catch {}
  }
}
