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
  return s.startsWith('[') && s.endsWith(']') && !s.startsWith('[KTLUẬN]') && s.length > 2
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
const SIGN_KEYS = ['Trân trọng','Claude –','Claude -','Chúc ','— Claude','– Claude','Hạt Giống Chiêm Tinh']

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
  if (/^\s{3,}\*\s/.test(line)) return 'bullet_indent'
  if (s.startsWith('* ')) return 'bullet'
  if (/^\d+\.\s+\S/.test(s) && s.length < 120) return 'section_heading'
  if (s.toLowerCase().startsWith('kính gửi')) return 'opener'
  if (SIGN_KEYS.some(k => s.startsWith(k))) return 'signature'
  if (s.endsWith(':') && s.length < 90) return 'subheading'
  if (isVnTitleHeading(s)) return 'section_heading'
  return 'body'
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface PdfOptions {
  coverTitle: string
  sectionTitle: string
  profile: { name: string; dob: { day: string; month: string; year: string } }
  profileB?: { name: string; dob: { day: string; month: string; year: string } }
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
  const cleaned = cleanForPdf(essayText)
  const lines = cleaned.split('\n')
  const dobStr = `${options.profile.dob.day}/${options.profile.dob.month}/${options.profile.dob.year}`

  // Group content into section groups.
  // Group 0 = intro content (opener + paragraphs before first numbered section heading).
  // Groups 1+ = each numbered section heading and its following content.
  const groupHtmlLines: string[][] = [[]]

  for (const line of lines) {
    const s = line.trim()
    if (!s) {
      groupHtmlLines[groupHtmlLines.length - 1].push('<div class="spacer"></div>')
      continue
    }
    const kind = classifyLine(line)
    const safe = escapeHtml(s)

    if (kind === 'section_heading') {
      groupHtmlLines.push([])
    }

    let html = ''
    switch (kind) {
      case 'section_heading':  html = `<h2 class="section">${safe}</h2>`; break
      case 'subheading':       html = `<h3 class="subheading">${safe}</h3>`; break
      case 'opener':           html = `<p class="opener">${safe}</p>`; break
      case 'signature':        html = `<p class="signature">${safe}</p>`; break
      case 'bullet':           html = `<p class="bullet">${safe}</p>`; break
      case 'bullet_indent':    html = `<p class="bullet-indent">${safe}</p>`; break
      case 'red_box': {
        const content = s.slice('[KTLUẬN]'.length).trim()
        html = `<div class="red-box">${escapeHtml(content)}</div>`; break
      }
      default:                 html = `<p class="body">${safe}</p>`
    }
    groupHtmlLines[groupHtmlLines.length - 1].push(html)
  }

  const contentHtml = groupHtmlLines.map((htmlLines, i) => {
    const inner = i === 0
      ? `<h2 class="section section-first">${escapeHtml(options.sectionTitle)}</h2>
<hr style="border:none;border-top:1pt solid #dc2626;margin-bottom:8pt;">${htmlLines.join('')}`
      : htmlLines.join('')
    const cls = i === 0 ? 'section-group' : 'section-group is-section'
    return `<div class="${cls}">${inner}</div>`
  }).join('')

  const coverName = options.profileB
    ? `<div class="cover-name-sm">${escapeHtml(options.profile.name)}</div>
       <div class="cover-sub">Ngày sinh: ${dobStr}</div>
       <div class="cover-and">&amp;</div>
       <div class="cover-name-sm">${escapeHtml(options.profileB.name)}</div>
       <div class="cover-sub">Ngày sinh: ${options.profileB.dob.day}/${options.profileB.dob.month}/${options.profileB.dob.year}</div>`
    : `<div class="cover-name">${escapeHtml(options.profile.name)}</div>
       <div class="cover-sub">Ngày sinh: ${dobStr}</div>`

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
${buildFontFaces()}

/* @page: size only — margins are set via page.pdf() to avoid conflicts */
@page { size: A4; }
/* margin:0 on body ensures clientWidth in screen mode = viewport width = print content width (642px) */
body { margin: 0; font-family: 'Nunito', sans-serif; font-size: 14.9pt; color: #1f2937; line-height: 1.55; }

.cover { page-break-after: always; text-align: center; padding-top: 50mm; }
.cover-line { width: 55%; height: 1.5px; background: #dc2626; margin: 7mm auto; }
.cover-title { font-family: 'MontserratBold'; font-size: 32.9pt; color: #dc2626; margin: 0; }
.cover-name { font-family: 'GreatVibes'; font-size: 50.8pt; color: #1f2937; margin: 10mm 0 4mm; }
.cover-name-sm { font-family: 'GreatVibes'; font-size: 38.9pt; color: #1f2937; margin: 4mm 0; }
.cover-and { font-family: 'NunitoItalic'; font-size: 23.9pt; color: #6b7280; margin: 4mm 0; }
.cover-sub { font-family: 'Nunito'; font-size: 17.9pt; color: #6b7280; }
.cover-footer { font-family: 'Nunito'; font-size: 17.9pt; color: #6b7280; margin-top: 60mm; }

.section { font-family: 'MontserratBold'; font-size: 19.5pt; color: #dc2626; margin: 14pt 0 6pt; padding-bottom: 4pt; border-bottom: 1pt solid #dc2626; }
.section-first { margin-top: 0; }
.subheading { font-family: 'MontserratBold'; font-size: 16.5pt; color: #1f2937; margin: 8pt 0 4pt; page-break-after: avoid; break-after: avoid; }
.opener { font-family: 'NunitoItalic'; font-size: 14.9pt; margin: 4pt 0 6pt; }
.body { text-align: justify; margin: 2pt 0 5pt; }
.bullet { margin: 2pt 0 3pt; padding-left: 12pt; text-indent: -12pt; }
.bullet-indent { font-family: 'NunitoItalic'; font-size: 13.5pt; color: #dc2626; margin: 1pt 0 2pt; padding-left: 28pt; text-indent: -12pt; }
.signature { font-family: 'NunitoItalic'; font-size: 11pt; color: #6b7280; margin: 8pt 0 3pt; }
.spacer { height: 4pt; }
.red-box { font-family: 'MontserratBold'; font-size: 16.5pt; border: 1.5pt solid #dc2626; background: #fff5f5; padding: 8pt 10pt; margin: 6pt 0 8pt; text-align: justify; page-break-inside: avoid; break-inside: avoid; }

/* Signature: fixed orphans/widows (typically 1-line, just a safety floor). */
.signature { orphans: 4; widows: 4; }

.section-group { }
.section-group.is-section { page-break-before: always; break-before: always; }
</style></head><body>
<div class="cover">
  <div class="cover-line"></div>
  <h1 class="cover-title">${escapeHtml(options.coverTitle)}</h1>
  <div class="cover-line"></div>
  ${coverName}
  <div class="cover-footer">Hạt Giống Chiêm Tinh</div>
</div>
${contentHtml}
</body></html>`
}

// Footer template for Puppeteer's native displayHeaderFooter.
// Renders INSIDE the bottom margin area — never overlaps with page content.
const FOOTER_TEMPLATE = `<div style="
  box-sizing: border-box;
  width: 100%;
  padding: 3mm 20mm 0 20mm;
  border-top: 0.8pt solid #fca5a5;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10pt;
  color: #9ca3af;
  text-align: center;
">Hạt Giống Chiêm Tinh</div>`

export async function generatePdf(essayText: string, options: PdfOptions): Promise<Buffer | null> {
  try {
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
      const BODY_SEL = 'p.body, p.opener, p.bullet, p.bullet-indent, p.signature'

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
      const OW_SEL = 'p.body, p.opener, p.bullet, p.bullet-indent'
      ;(document.querySelectorAll(OW_SEL) as NodeListOf<HTMLElement>).forEach(el => {
        const lhPx = parseFloat(window.getComputedStyle(el).lineHeight)
        if (!lhPx || isNaN(lhPx) || lhPx <= 0) return
        const lineCount = Math.round(el.offsetHeight / lhPx)
        let w: number, o: number
        if (lineCount >= 6 && lineCount <= 8) {
          w = Math.floor(lineCount / 2)  // widow  (smaller half → top of next page)
          o = Math.ceil(lineCount / 2)   // orphan (larger half  → bottom of current page)
        } else {
          w = 4; o = 4
        }
        el.style.widows = String(w)
        el.style.orphans = String(o)
        console.log(`[ow] lines=${lineCount} w=${w} o=${o} "${el.textContent?.slice(0, 25)}"`)
      })
    })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      // Fix 2: Use Puppeteer native footer — renders inside bottom margin, never overlaps content.
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: FOOTER_TEMPLATE,
      margin: { top: '25mm', right: '20mm', bottom: '20mm', left: '20mm' },
    })
    await browser.close()
    return Buffer.from(pdfBuffer)
  } catch (e) {
    console.error('[PDF ERROR]', e)
    return null
  }
}
