// PDF generator using Puppeteer - renders HTML essay to PDF
// Replaces Python ReportLab EssayPDFGenerator
import fs from 'fs'
import path from 'path'

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
  return s.startsWith('[') && s.endsWith(']') && !s.startsWith('[KTLUẬN]') && !s.startsWith('[KTTIỂU]') && !s.startsWith('[SUBTITLE]') && s !== '[CLOSING]' && s.length > 2
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
  return text.trim()
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
  if (/^\d+\.\s+\S/.test(s) && s.length < 120) return 'section_heading'
  if (s.toLowerCase().startsWith('kính gửi')) return 'opener'
  if (SIGN_KEYS.some(k => s.startsWith(k))) return 'signature'
  if (s.endsWith(':') && s.length < 90) return 'subheading'
  if (isVnTitleHeading(s)) return 'title_heading'
  return 'body'
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const PDF_IMGS_DIR = '/root/hgct/imgs'

interface PdfOptions {
  coverTitle: string
  sectionTitle: string
  profile: { name: string; dob: { day: string; month: string; year: string }; tob?: string }
  profileB?: { name: string; dob: { day: string; month: string; year: string }; tob?: string }
  service?: string
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

function buildHtml(essayText: string, options: PdfOptions): string {
  // Strip AI's closing (unreliable) and inject hardcoded version when available.
  // Primary cut point: [CLOSING] marker. Fallback: detect "Cảm ơn bạn đã" at line start.
  let processedText = essayText
  const hardcodedClosing = options.service ? CLOSING_BLOCKS[options.service] : undefined
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
  for (const line of lines) {
    const s = line.trim()
    if (!s) {
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
    if (kind === 'closing_start') { flushSigs(); closingMode = true; continue }
    // Intro section (before first numbered heading): no subheadings
    if (kind === 'subheading' && !seenSectionHeading) kind = 'body'
    if (kind === 'section_heading') seenSectionHeading = true
    const safe = escapeHtml(s)

    if (kind === 'signature') {
      sigBuffer.push(`<p class="signature">${safe}</p>`)
      continue
    }
    flushSigs()

    // Flush pendingRule before any non-subtitle content
    if (pendingRule && kind !== 'section_subtitle') {
      groupHtmlLines[groupHtmlLines.length - 1].push('<hr class="section-rule">')
      pendingRule = false
    }

    if (kind === 'section_heading') {
      groupHtmlLines.push([])
    }

    let html = ''
    switch (kind) {
      case 'section_heading':  html = `<h2 class="section">${safe}</h2>`; break
      case 'title_heading':    html = `<h2 class="section">${safe}</h2><hr class="section-rule">`; break
      case 'section_subtitle': html = `<p class="section-subtitle">${safe.replace(/^\[SUBTITLE\]\s*/, '')}</p>`; break
      case 'subheading':       html = `<h3 class="subheading">${safe}</h3>`; break
      case 'opener':           html = `<p class="opener">${safe}</p>`; break
      case 'bullet':           html = `<p class="bullet">${safe}</p>`; break
      case 'bullet_indent':    html = `<p class="bullet-indent">${safe}</p>`; break
      case 'dash_bullet':      html = `<p class="dash-bullet">${safe}</p>`; break
      case 'red_box': {
        const content = s.slice('[KTLUẬN]'.length).trim()
        html = `<div class="red-box">${escapeHtml(content)}</div>`; break
      }
      case 'mini_box': {
        const content = s.slice('[KTTIỂU]'.length).trim()
        html = `<div class="mini-box">${escapeHtml(content)}</div>`; break
      }
      default:                 html = `<p class="body">${safe}</p>`
    }
    groupHtmlLines[groupHtmlLines.length - 1].push(html)
    if (kind === 'section_heading') pendingRule = true
    if (kind === 'section_subtitle') {
      groupHtmlLines[groupHtmlLines.length - 1].push('<hr class="section-rule">')
      pendingRule = false
    }
  }
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

.cover { page-break-after: always; text-align: center; height: 252mm; display: flex; flex-direction: column; box-sizing: border-box; }
.cover-line { width: 55%; height: 1.5px; background: #dc2626; margin: 7mm auto; }
.cover-title { font-family: 'MontserratBold'; font-size: 32.9pt; color: #dc2626; margin: 0; }
.cover-name { font-family: 'GreatVibes'; font-size: 50.8pt; color: #1f2937; margin: 10mm 0 4mm; }
.cover-name-sm { font-family: 'GreatVibes'; font-size: 38.9pt; color: #1f2937; margin: 4mm 0; }
.cover-and { font-family: 'NunitoItalic'; font-size: 23.9pt; color: #6b7280; margin: 4mm 0; }
.cover-sub { font-family: 'Nunito'; font-size: 17.9pt; color: #6b7280; }
.cover-footer { font-family: 'Nunito'; font-size: 17.9pt; color: #6b7280; padding-bottom: 5mm; }
.cover-spacer { flex: 1; min-height: 0; }
.cover-main { width: 100%; }

.section { font-family: 'MontserratBold'; font-size: 19.5pt; color: #dc2626; margin: 14pt 0 6pt; }
.section-first { margin-top: 0; }
.section-subtitle { font-family: 'NunitoItalic'; font-size: 12pt; color: #6b7280; margin: -2pt 0 4pt; }
.section-rule { border: none; border-top: 1pt solid #dc2626; margin: 0 0 8pt; }
.subheading { font-family: 'MontserratBold'; font-size: 16.5pt; color: #1f2937; margin: 8pt 0 4pt; page-break-after: avoid; break-after: avoid; }
.opener { font-family: 'NunitoItalic'; font-size: 14.9pt; margin: 4pt 0 6pt; }
.body { text-align: justify; margin: 2pt 0 5pt; }
.bullet { margin: 2pt 0 3pt; padding-left: 12pt; text-indent: -12pt; }
.bullet-indent { font-family: 'NunitoItalic'; font-size: 13.5pt; color: #dc2626; margin: 1pt 0 2pt; padding-left: 28pt; text-indent: -12pt; }
.dash-bullet { margin: 2pt 0 3pt; padding-left: 12pt; text-indent: -12pt; font-style: italic; }
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
async function buildTemplatePdf(contentPdfBuffer: Buffer, imgPrefix: string): Promise<Buffer> {
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
  try {
    const imgPrefix = options.service ? SERVICE_IMG_PREFIX[options.service] : undefined

    const chromium = await import('@sparticuz/chromium')
    const puppeteer = await import('puppeteer-core')
    const execPath = await chromium.default.executablePath()
    const browser = await puppeteer.default.launch({
      args: [...chromium.default.args, '--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: execPath,
      headless: true,
    })
    const page = await browser.newPage()

    // Fix 1: viewport width = 642px = A4 print content width (170mm @ 96dpi).
    // This makes screen layout match print layout so heading overflow detection is accurate.
    await page.setViewport({ width: 642, height: 1123 })

    // Capture browser console logs for debugging JS evaluations
    page.on('console', msg => console.log('[PDF-JS]', msg.text()))

    const html = buildHtml(essayText, options)
    await page.setContent(html, { waitUntil: 'networkidle0' })

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
      // PAGE_H = A4(297mm) - top(25mm) - bottom(20mm) = 252mm ≈ 952px at 96dpi
      const PAGE_H = 252 * (96 / 25.4)
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

      // ── SUBHEADING WIDOW HELPERS ──────────────────────────────────────────────────
      // Shared helpers used by both the XUNG ĐỘT fix and the general subheading fix.

      // Skip spacers and invisible elements to find the real next content sibling.
      function findNextContent(el: HTMLElement): HTMLElement | null {
        let next = el.nextElementSibling as HTMLElement | null
        while (next && (next.classList.contains('spacer') || (next.textContent?.trim() === '' && next.offsetHeight <= 8))) {
          next = next.nextElementSibling as HTMLElement | null
        }
        return next
      }

      // How much space does nextEl need to not trigger a page break before it?
      // Elements with page-break-inside:avoid (red-box, mini-box) need full height.
      // For red-box, add 2×SCALLOP_OVERFLOW (18px each side) because the scallop SVG
      // protrudes beyond the box boundary — the wrapper approach adds this as padding,
      // but spaceNeededFor() runs before the wrapper is created.
      // Regular paragraphs need orphans × lineHeight.
      function spaceNeededFor(nextEl: HTMLElement): number {
        const isRedBox = nextEl.classList.contains('red-box')
        const breakAvoid = isRedBox || nextEl.classList.contains('mini-box')
        if (breakAvoid) {
          const SCALLOP_OVERFLOW = 18  // top + bottom wave protrusion for red-box scallop
          return nextEl.offsetHeight + (isRedBox ? 2 * SCALLOP_OVERFLOW : 0)
        }
        const lh = parseFloat(window.getComputedStyle(nextEl).lineHeight) || 22
        const orphans = parseInt(nextEl.style.orphans || '4') || 4
        const lines = Math.round(nextEl.offsetHeight / lh) || 1
        return Math.min(orphans, lines) * lh
      }

      // Returns true if placing sh on its current page would leave it as a widow
      // (i.e. the print engine would push the following content to the next page).
      // Uses shTop (not shBottom) to determine which page the subheading belongs to —
      // a subheading is "on" a page based on where it STARTS, not where it ends.
      // Using shBottom caused Math.ceil to round up to the wrong page when the bottom
      // overflowed by even 1px, making pageEndPx point to page N+1 and the check always fail.
      function wouldBeWidow(sh: HTMLElement, group: HTMLElement): boolean {
        const groupTop = group.getBoundingClientRect().top
        const shTop = sh.getBoundingClientRect().top - groupTop
        const pageEndPx = (Math.floor(shTop / PAGE_H) + 1) * PAGE_H
        const nextEl = findNextContent(sh)
        if (!nextEl) return false
        const nextTop = nextEl.getBoundingClientRect().top - groupTop
        return (pageEndPx - nextTop) < spaceNeededFor(nextEl)
      }

      // ── XUNG ĐỘT / HÒA HỢP WIDOW FIX ────────────────────────────────────────────
      // These title-headings sit inside a section-group without page-break-before,
      // so they can land near a page bottom. When the first subheading after them
      // would be a widow, move the heading itself to the next page — pulling the
      // subheading along. Do NOT also move the subheading independently.
      const xdHandledSubheadings = new Set<HTMLElement>()
      ;(Array.from(document.querySelectorAll('h2.section')) as HTMLElement[]).forEach(h2 => {
        const txt = h2.textContent?.trim() || ''
        if (txt !== 'XUNG ĐỘT' && txt !== 'HÒA HỢP') return
        // Find the first h3.subheading that follows this heading
        let firstSh: HTMLElement | null = null
        let sib = h2.nextElementSibling as HTMLElement | null
        while (sib) {
          if (sib.tagName === 'H3' && sib.classList.contains('subheading')) { firstSh = sib; break }
          sib = sib.nextElementSibling as HTMLElement | null
        }
        if (!firstSh) return
        xdHandledSubheadings.add(firstSh)
        const group = h2.closest('.section-group') as HTMLElement | null
        if (!group) return
        const groupTop = group.getBoundingClientRect().top
        const h2Bottom = h2.getBoundingClientRect().bottom - groupTop
        const h2PageEnd = Math.ceil(h2Bottom / PAGE_H) * PAGE_H
        const firstShTop = firstSh.getBoundingClientRect().top - groupTop
        const h2Isolated = firstShTop >= h2PageEnd  // firstSh đã bị CSS đẩy sang trang khác
        if (wouldBeWidow(firstSh, group) || h2Isolated) {
          h2.style.pageBreakBefore = 'always'
          h2.style.breakBefore = 'always'
          console.log(`[xd-widow] moved "${txt}" to next page (isolated=${h2Isolated})`)
        } else {
          console.log(`[xd-ok] "${txt}" stays`)
        }
      })

      // ── SUBHEADING ORPHAN FIX ─────────────────────────────────────────────────────
      // A subheading alone at the bottom of a page must move to the next page.
      // Skips subheadings already handled by the XUNG ĐỘT/HÒA HỢP fix above.
      // Uses improved spaceNeededFor() that handles page-break-inside:avoid elements.
      ;(Array.from(document.querySelectorAll('h3.subheading')) as HTMLElement[]).forEach(sh => {
        if (xdHandledSubheadings.has(sh)) return
        const group = sh.closest('.section-group') as HTMLElement | null
        if (!group) return
        if (wouldBeWidow(sh, group)) {
          sh.style.pageBreakBefore = 'always'
          sh.style.breakBefore = 'always'
          console.log(`[sh-orphan] moved: "${sh.textContent?.slice(0, 30)}"`)
        } else {
          console.log(`[sh-ok] stays: "${sh.textContent?.slice(0, 30)}"`)
        }
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
      margin: { top: '25mm', right: '20mm', bottom: '20mm', left: '20mm' },
    })
    await browser.close()

    if (imgPrefix) {
      return await buildTemplatePdf(Buffer.from(contentPdf), imgPrefix)
    }

    return Buffer.from(contentPdf)
  } catch (e) {
    console.error('[PDF ERROR]', e)
    return null
  }
}
