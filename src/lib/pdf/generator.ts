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

  let contentHtml = ''
  for (const line of lines) {
    const s = line.trim()
    if (!s) { contentHtml += '<div class="spacer"></div>'; continue }
    const kind = classifyLine(line)
    const safe = escapeHtml(s)

    switch (kind) {
      case 'section_heading':
        contentHtml += `<h2 class="section">${safe}</h2>`; break
      case 'subheading':
        contentHtml += `<h3 class="subheading">${safe}</h3>`; break
      case 'opener':
        contentHtml += `<p class="opener">${safe}</p>`; break
      case 'signature':
        contentHtml += `<p class="signature">${safe}</p>`; break
      case 'bullet':
        contentHtml += `<p class="bullet">${safe}</p>`; break
      case 'bullet_indent':
        contentHtml += `<p class="bullet-indent">${safe}</p>`; break
      case 'red_box': {
        const content = s.slice('[KTLUẬN]'.length).trim()
        contentHtml += `<div class="red-box">${escapeHtml(content)}</div>`; break
      }
      default:
        contentHtml += `<p class="body">${safe}</p>`
    }
  }

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

@page { size: A4; margin: 25mm 20mm 20mm 20mm; }
body { font-family: 'Nunito', sans-serif; font-size: 11pt; color: #1f2937; line-height: 1.55; }

.cover { page-break-after: always; text-align: center; padding-top: 50mm; }
.cover-line { width: 55%; height: 1.5px; background: #dc2626; margin: 7mm auto; }
.cover-title { font-family: 'MontserratBold'; font-size: 22pt; color: #dc2626; margin: 0; }
.cover-name { font-family: 'GreatVibes'; font-size: 34pt; color: #1f2937; margin: 10mm 0 4mm; }
.cover-name-sm { font-family: 'GreatVibes'; font-size: 26pt; color: #1f2937; margin: 4mm 0; }
.cover-and { font-family: 'NunitoItalic'; font-size: 16pt; color: #6b7280; margin: 4mm 0; }
.cover-sub { font-family: 'Nunito'; font-size: 12pt; color: #6b7280; }
.cover-footer { font-family: 'Nunito'; font-size: 12pt; color: #6b7280; margin-top: 60mm; }

.section { font-family: 'MontserratBold'; font-size: 13pt; color: #dc2626; margin: 14pt 0 6pt; padding-bottom: 4pt; border-bottom: 1pt solid #dc2626; }
.subheading { font-family: 'MontserratBold'; font-size: 11pt; color: #1f2937; margin: 8pt 0 4pt; }
.opener { font-family: 'NunitoItalic'; font-size: 11pt; margin: 4pt 0 6pt; }
.body { text-align: justify; margin: 2pt 0 5pt; }
.bullet { margin: 2pt 0 3pt; padding-left: 12pt; text-indent: -12pt; }
.bullet-indent { font-family: 'NunitoItalic'; font-size: 10pt; color: #dc2626; margin: 1pt 0 2pt; padding-left: 28pt; text-indent: -12pt; }
.signature { font-family: 'NunitoItalic'; color: #6b7280; margin: 8pt 0 3pt; }
.spacer { height: 4pt; }
.red-box { font-family: 'MontserratBold'; font-size: 11pt; border: 1.5pt solid #dc2626; background: #fff5f5; padding: 8pt 10pt; margin: 6pt 0 8pt; text-align: justify; }

@media print {
  .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 8pt; color: #6b7280; border-top: 0.8pt solid #E8AAAA; padding-top: 2mm; }
}
</style></head><body>
<div class="footer">Hạt Giống Chiêm Tinh</div>
<div class="cover">
  <div class="cover-line"></div>
  <h1 class="cover-title">${escapeHtml(options.coverTitle)}</h1>
  <div class="cover-line"></div>
  ${coverName}
  <div class="cover-footer">Hạt Giống Chiêm Tinh</div>
</div>
<h2 class="section">${escapeHtml(options.sectionTitle)}</h2>
<hr style="border:none;border-top:1pt solid #dc2626;margin-bottom:8pt;">
${contentHtml}
</body></html>`
}

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
    const html = buildHtml(essayText, options)
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '25mm', right: '20mm', bottom: '20mm', left: '20mm' },
    })
    await browser.close()
    return Buffer.from(pdfBuffer)
  } catch (e) {
    console.error('[PDF ERROR]', e)
    return null
  }
}
