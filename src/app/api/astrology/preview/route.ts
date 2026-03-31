import { NextRequest } from 'next/server'
import { calculateChart } from '@/lib/astrology/calculations'
import { getKnowledgeFromDB } from '@/lib/astrology/knowledge'
import { getCareerBlocks } from '@/lib/logic/career/manager'
import { buildCareerPrompt } from '@/lib/logic/career/prompt'
import { generateEssayStreaming } from '@/lib/openrouter'
import { generatePdf } from '@/lib/pdf/generator'
import { chromiumSemaphore } from '@/lib/job-queue'
import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'

const PREVIEW_DIR = '/tmp/hgct-previews'

const SYSTEM_PROMPT =
  'Bạn là một chiêm tinh gia chuyên nghiệp, có kiến thức sâu rộng về chiêm tinh học phương Tây. Bạn viết bằng tiếng Việt, văn phong ấm áp, dễ hiểu, truyền cảm hứng.'

interface InputData {
  name: string
  ten?: string
  gender?: string
  dob: { day: number; month: number; year: number }
  tob: { hour: number; minute: number; unknown?: boolean }
  loc: { address: string; lat: number; lon: number; tz: string }
}

/** Truncate the prompt scaffold right before "2. ..." (section 2 heading) */
function truncatePromptAtSection2(prompt: string): string {
  const lines = prompt.split('\n')
  const cutIdx = lines.findIndex(l => /^2\.\s+\S/.test(l))
  if (cutIdx === -1) return prompt
  const truncated = lines.slice(0, cutIdx).join('\n').trimEnd()
  return truncated + '\n\n--- CHỈ ĐIỀN LỜI CHÀO VÀ MỤC 1. KẾT THÚC NGAY SAU KHI HOÀN THÀNH MỤC 1 ---'
}

/** Also truncate AI output at section 2 as safety (in case AI rambles) */
function truncateOutputAtSection2(text: string): string {
  const lines = text.split('\n')
  const idx = lines.findIndex(l => /^2\.\s+\S/.test(l.trim()))
  if (idx === -1) return text
  return lines.slice(0, idx).join('\n').trimEnd()
}

const COVER_TITLES: Record<string, string> = {
  career: 'LUẬN GIẢI HƯỚNG NGHIỆP',
  love: 'LUẬN GIẢI TÌNH DUYÊN',
  synastry: 'LUẬN GIẢI BẢN ĐỒ CẶP ĐÔI',
  transit: 'LUẬN GIẢI VẬN HẠN',
}

const SECTION_TITLES: Record<string, string> = {
  career: 'TỔNG HỢP LUẬN GIẢI HƯỚNG NGHIỆP',
  love: 'TỔNG HỢP LUẬN GIẢI TÌNH DUYÊN',
  synastry: 'TỔNG HỢP LUẬN GIẢI BẢN ĐỒ CẶP ĐÔI',
  transit: 'TỔNG HỢP LUẬN GIẢI VẬN HẠN',
}

interface LockedSection { title: string; subtitle?: string }

function getLockedSections(service: string, isYoungCareer?: boolean): LockedSection[] {
  if (service === 'career') {
    if (isYoungCareer) {
      return [
        { title: '2. Năng lực bẩm sinh của bạn', subtitle: 'Những "siêu năng lực" tự nhiên bạn đang sở hữu mà chưa biết' },
        { title: '3. Những "Nút thắt" cần tháo gỡ để bạn bứt phá', subtitle: 'Hiểu mình để tháo gỡ và tiến về phía trước' },
        { title: '4. Định hướng chuyên ngành và lĩnh vực phù hợp', subtitle: 'Vùng đất hứa nơi bạn có thể tỏa sáng' },
        { title: '5. Mở khóa tiềm năng — Tối ưu hóa năng lực của bạn', subtitle: 'Chiến lược học tập và phát triển bản thân phù hợp nhất với bạn' },
      ]
    }
    return [
      { title: '2. Năng lực bẩm sinh của bạn là gì?', subtitle: 'Những điểm mạnh tự nhiên giúp bạn dễ phát triển và tạo ra giá trị lâu dài bền vững' },
      { title: '3. Thách thức nào tiềm ẩn trong bạn?', subtitle: 'Những điểm cần lưu ý, rèn luyện để bạn phát huy tốt hơn tiềm năng của mình' },
      { title: '4. Lĩnh vực công việc nào thực sự phù hợp với bạn?', subtitle: 'Hướng nghề nghiệp giúp bạn phát huy tốt nhất khả năng của mình' },
      { title: '5. Cách nào giúp bạn khơi thông dòng chảy tài chính?', subtitle: 'Con đường tài chính thuận lợi, phù hợp với năng lực tự nhiên của bạn' },
      { title: '6. Chiến lược phát triển sự nghiệp của bạn là gì?', subtitle: 'Cách bạn xây dựng con đường nghề nghiệp bền vững lâu dài dựa trên năng lực và thế mạnh của bản thân' },
      { title: '7. Lời nhắn từ các vì sao', subtitle: 'Nhìn lại những điểm cốt lõi và hướng phát triển trong tương lai' },
    ]
  }
  if (service === 'love') {
    return [
      { title: '2. Tiếng gọi trái tim', subtitle: 'Hình mẫu khiến bạn thực sự rung động' },
      { title: '3. Ngôn ngữ tình yêu', subtitle: 'Cách bạn trao đi yêu thương' },
      { title: '4. Nút thắt cần tháo gỡ', subtitle: 'Những thách thức trong tình yêu và cách chuyển hóa' },
      { title: '5. La bàn hạnh phúc', subtitle: 'Bước ngoặt chạm đến tình yêu bền vững' },
      { title: '6. Thông điệp tình yêu từ các vì sao', subtitle: 'Những điều vũ trụ muốn nhắn nhủ cho hành trình tình yêu của bạn' },
    ]
  }
  if (service === 'synastry') {
    return [
      { title: '2. Tiếng gọi trái tim', subtitle: 'Vì sao hai bạn gặp và thu hút nhau?' },
      { title: '3. Ngôn ngữ tình yêu', subtitle: 'Cách hai bạn yêu và được yêu' },
      { title: '4. Chuyện đôi mình', subtitle: 'Những điểm hòa hợp và khác biệt cần thấu hiểu' },
      { title: '5. La bàn hạnh phúc', subtitle: 'Chìa khóa để đi cùng nhau bền vững' },
      { title: '6. Thông điệp dành cho mối quan hệ', subtitle: 'Nhìn lại hành trình chung' },
    ]
  }
  // transit
  return [
    { title: '2. Công việc và sự nghiệp', subtitle: 'Cơ hội và thách thức trong sự nghiệp của bạn giai đoạn này' },
    { title: '3. Tài chính đầu tư', subtitle: 'Dòng chảy tài chính và hướng đầu tư phù hợp với vận hạn của bạn' },
    { title: '4. Tình yêu hôn nhân', subtitle: 'Năng lượng tình cảm và những điều cần lưu ý trong các mối quan hệ thân thiết' },
    { title: '5. Gia đình, nhà cửa', subtitle: 'Những chuyển dịch trong cuộc sống gia đình và không gian sống của bạn' },
    { title: '6. Sức Khỏe', subtitle: 'Những lưu ý về thể chất và tinh thần để bạn duy trì năng lượng tích cực' },
    { title: '7. Thông điệp dành cho bạn trong giai đoạn này', subtitle: 'Lời nhắn từ các vì sao cho hành trình phía trước của bạn' },
  ]
}

/** Build locked sections block to append after section 1 content.
 * All locked titles go on ONE single page together, then CTA on its own page. */
function buildLockedSectionsText(sections: LockedSection[]): string {
  const lines: string[] = []
  // One [CTA_PAGE] to start a new page for ALL locked titles
  lines.push('')
  lines.push('[CTA_PAGE]')
  lines.push('')
  for (const s of sections) {
    lines.push('[LOCKED] ' + s.title)
    if (s.subtitle) lines.push('[LSUB] ' + s.subtitle)
    lines.push('')
  }
  // CTA on its own separate page
  lines.push('[CTA_PAGE]')
  lines.push('')
  lines.push('ĐỂ NHẬN BÁO CÁO ĐẦY ĐỦ')
  lines.push('')
  lines.push(`Bản luận giải đầy đủ gồm ${sections.length + 1} phần, bao gồm toàn bộ nội dung chi tiết theo từng khía cạnh. Để nhận bản PDF hoàn chỉnh gửi thẳng vào email, hãy nhấn nút Nhận báo cáo đầy đủ ở trên.`)
  return lines.join('\n')
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response('event: error\ndata: {"message":"Dữ liệu không hợp lệ"}\n\n', {
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }

  const encoder = new TextEncoder()
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  const send = (event: string, data: object) => {
    try {
      writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
    } catch {}
  }

  ;(async () => {
    try {
      const { service, inputData, inputDataB, startDate, endDate } = body as {
        service: string
        inputData: InputData
        inputDataB?: InputData
        startDate?: string
        endDate?: string
      }

      if (!service || !inputData) {
        send('error', { message: 'Thiếu thông tin đầu vào' })
        return
      }
      if (!['career', 'love', 'synastry', 'transit'].includes(service)) {
        send('error', { message: 'Dịch vụ không hợp lệ' })
        return
      }

      send('progress', { pct: 5, label: 'Đang xác lập bản đồ sao...' })

      // Build chart for person A
      const { dob, tob, loc, name, ten, gender } = inputData
      const pad = (n: number) => String(n).padStart(2, '0')
      const dobStr = `${dob.day}/${dob.month}/${dob.year}`
      const tobStr = tob.unknown ? '12:00' : `${pad(tob.hour)}:${pad(tob.minute)}`
      const chart = calculateChart(dobStr, tobStr, loc.lat, loc.lon, loc.tz)
      if (!chart) {
        send('error', { message: 'Không thể tính toán bản đồ sao' })
        return
      }

      const fullName = name
      const onlyName = (ten || '').trim() || name
      const profile = {
        name: fullName,
        fullName,
        onlyName,
        gender: gender || 'Female',
        dob: { day: String(dob.day), month: String(dob.month), year: String(dob.year) },
        tob: tobStr,
      }

      send('progress', { pct: 10, label: 'Đang tải dữ liệu chiêm tinh...' })
      const kb = await getKnowledgeFromDB()

      send('progress', { pct: 15, label: 'Đang xây dựng bản phân tích...' })

      let prompt: string
      const coverTitle = COVER_TITLES[service]
      const sectionTitle = SECTION_TITLES[service]
      let coverProfileB:
        | { name: string; dob: { day: string; month: string; year: string }; tob?: string }
        | undefined
      let isYoungCareer = false

      if (service === 'career') {
        // Determine age for adult/young split
        const now = new Date()
        const birthDate = new Date(dob.year, dob.month - 1, dob.day)
        const age = now.getFullYear() - birthDate.getFullYear() -
          (now < new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0)
        isYoungCareer = age < 22
        const blocks = getCareerBlocks(chart, kb)
        prompt = buildCareerPrompt(blocks, profile, chart)
      } else if (service === 'love') {
        const { getLoveBlocks } = await import('@/lib/logic/love/manager')
        const { buildLovePrompt } = await import('@/lib/logic/love/prompt')
        const blocks = getLoveBlocks(chart, kb)
        prompt = buildLovePrompt(chart, blocks, profile)
      } else if (service === 'synastry') {
        if (!inputDataB) {
          send('error', { message: 'Thiếu dữ liệu người B' })
          return
        }
        const { dob: dobB, tob: tobB, loc: locB, name: nameB, ten: tenB, gender: genderB } =
          inputDataB
        const dobBStr = `${dobB.day}/${dobB.month}/${dobB.year}`
        const tobBStr = tobB.unknown ? '12:00' : `${pad(tobB.hour)}:${pad(tobB.minute)}`
        const chartB = calculateChart(dobBStr, tobBStr, locB.lat, locB.lon, locB.tz)
        if (!chartB) {
          send('error', { message: 'Không thể tính bản đồ sao người B' })
          return
        }
        const fullNameB = nameB
        const onlyNameB = (tenB || '').trim() || nameB
        const profileB = {
          name: fullNameB,
          fullName: fullNameB,
          onlyName: onlyNameB,
          gender: genderB || 'Male',
          dob: { day: String(dobB.day), month: String(dobB.month), year: String(dobB.year) },
        }
        const { getRelationshipBlocks } = await import('@/lib/logic/relationship/manager')
        const { buildRelationshipEssayPrompt } = await import(
          '@/lib/logic/relationship/prompt'
        )
        const blocks = getRelationshipBlocks(chart, chartB, kb)
        const result = buildRelationshipEssayPrompt(chart, chartB, blocks, profile, profileB)
        prompt = typeof result === 'string' ? result : result.prompt
        coverProfileB = {
          name: fullNameB,
          dob: profileB.dob,
          tob: tobBStr,
        }
      } else {
        // transit
        const { buildVanhanEssayPrompt } = await import('@/lib/logic/vanhan/prompt')
        const sd = (startDate as string) || new Date().toISOString().split('T')[0]
        const ed =
          (endDate as string) ||
          new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
        prompt = buildVanhanEssayPrompt(chart, sd, ed, profile, kb)
      }

      // Truncate prompt at section 2
      const previewPrompt = truncatePromptAtSection2(prompt)

      send('progress', { pct: 18, label: 'Vũ trụ đang biên soạn bản xem trước...' })

      const EXPECTED_CHARS = 2000
      let essayText = await generateEssayStreaming(
        SYSTEM_PROMPT,
        previewPrompt,
        (charsReceived) => {
          const pct = Math.min(Math.floor(18 + (charsReceived / EXPECTED_CHARS) * 62), 80)
          send('progress', { pct, label: 'Vũ trụ đang biên soạn bản xem trước...' })
        },
      )

      // Truncate output at section 2 as safety
      essayText = truncateOutputAtSection2(essayText)

      // Strip [CLOSING] and lời cảm ơn from preview (generator would re-inject full closing)
      const closingIdx = essayText.indexOf('[CLOSING]')
      if (closingIdx >= 0) essayText = essayText.slice(0, closingIdx).trimEnd()
      const thankMatch = essayText.match(/\nCảm ơn bạn đã/)
      if (thankMatch?.index != null) essayText = essayText.slice(0, thankMatch.index).trimEnd()

      // Append locked section titles (no content) + CTA
      const lockedSections = getLockedSections(service, isYoungCareer)
      essayText = essayText.trimEnd() + '\n' + buildLockedSectionsText(lockedSections)

      if (!essayText || essayText.length < 200) {
        send('error', { message: 'Không thể tạo nội dung xem trước' })
        return
      }

      send('progress', { pct: 82, label: 'Đang tạo file PDF...' })

      // Generate real PDF
      await chromiumSemaphore.acquire()
      let pdfBuffer: Buffer | null = null
      try {
        pdfBuffer = await generatePdf(essayText, {
          coverTitle,
          sectionTitle,
          profile,
          profileB: coverProfileB,
          service,
          skipClosing: true,
        })
      } finally {
        chromiumSemaphore.release()
      }

      if (!pdfBuffer) {
        send('error', { message: 'Lỗi tạo PDF' })
        return
      }

      // Save to /tmp
      if (!fs.existsSync(PREVIEW_DIR)) fs.mkdirSync(PREVIEW_DIR, { recursive: true })
      const previewId = randomUUID()
      fs.writeFileSync(path.join(PREVIEW_DIR, `${previewId}.pdf`), pdfBuffer)

      send('progress', { pct: 100, label: 'Hoàn thành!' })
      send('complete', { id: previewId })
    } catch (err) {
      console.error('[preview]', err)
      send('error', { message: 'Lỗi tạo bản xem trước. Vui lòng thử lại.' })
    } finally {
      try {
        await writer.close()
      } catch {}
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      'Connection': 'keep-alive',
    },
  })
}
