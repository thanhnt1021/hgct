import { NextRequest } from 'next/server'
import { calculateChart } from '@/lib/astrology/calculations'
import { getKnowledgeFromDB } from '@/lib/astrology/knowledge'
import { getCareerBlocks } from '@/lib/logic/career/manager'
import { buildCareerPrompt } from '@/lib/logic/career/prompt'

export const runtime = 'nodejs'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
const MODEL = 'anthropic/claude-sonnet-4-6'
const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

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

function truncatePromptAtSection2(prompt: string): string {
  const lines = prompt.split('\n')
  const cutIdx = lines.findIndex(l => /^2\.\s+\S/.test(l))
  if (cutIdx === -1) return prompt
  const truncated = lines.slice(0, cutIdx).join('\n').trimEnd()
  // Instruct AI to skip the intro/greeting (already shown on frontend) and start from section 1 heading
  return truncated + '\n\n--- BỎ QUA phần lời chào và đoạn mở đầu (đã hiển thị sẵn). BẮT ĐẦU OUTPUT NGAY từ tiêu đề "1. ..." và nội dung phân tích bên dưới. KẾT THÚC NGAY SAU KHI HOÀN THÀNH MỤC 1 ---'
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

      const kb = await getKnowledgeFromDB()

      let prompt: string
      let isYoungCareer = false

      if (service === 'career') {
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
        const { dob: dobB, tob: tobB, loc: locB, name: nameB, ten: tenB, gender: genderB } = inputDataB
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
          name: fullNameB, fullName: fullNameB, onlyName: onlyNameB,
          gender: genderB || 'Male',
          dob: { day: String(dobB.day), month: String(dobB.month), year: String(dobB.year) },
        }
        const { getRelationshipBlocks } = await import('@/lib/logic/relationship/manager')
        const { buildRelationshipEssayPrompt } = await import('@/lib/logic/relationship/prompt')
        const blocks = getRelationshipBlocks(chart, chartB, kb)
        const result = buildRelationshipEssayPrompt(chart, chartB, blocks, profile, profileB)
        prompt = typeof result === 'string' ? result : result.prompt
      } else {
        // transit
        const { buildVanhanEssayPrompt } = await import('@/lib/logic/vanhan/prompt')
        const sd = (startDate as string) || new Date().toISOString().split('T')[0]
        const ed = (endDate as string) || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
        prompt = buildVanhanEssayPrompt(chart, sd, ed, profile, kb)
      }

      const previewPrompt = truncatePromptAtSection2(prompt)

      // Stream OpenRouter response directly to client
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120_000)

      const orRes = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://hatgiongchiemtinh.com',
          'X-Title': 'Hat Giong Chiem Tinh',
        },
        body: JSON.stringify({
          model: MODEL,
          stream: true,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: previewPrompt },
          ],
          max_tokens: 4000,
          temperature: 0.75,
        }),
        signal: controller.signal,
      })

      if (!orRes.ok || !orRes.body) {
        send('error', { message: `OpenRouter error: ${orRes.status}` })
        return
      }

      const reader = orRes.body.getReader()
      const dec = new TextDecoder()
      let buf = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() || ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (raw === '[DONE]') break
            try {
              const parsed = JSON.parse(raw)
              const delta = parsed.choices?.[0]?.delta?.content
              if (delta) send('chunk', { text: delta })
            } catch {}
          }
        }
      } finally {
        clearTimeout(timeout)
        reader.releaseLock()
      }

      send('done', { service, isYoungCareer })
    } catch (err) {
      send('error', { message: (err as Error).message || 'Lỗi không xác định' })
    } finally {
      writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
