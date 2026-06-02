// Full essay stream (no truncation). Requires login.
// On completion the full text is cached on disk keyed by user + profile + service
// so subsequent visits can reveal already-unlocked sections without paying the
// LLM cost again.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calculateChart } from '@/lib/astrology/calculations'
import { getKnowledgeFromDB } from '@/lib/astrology/knowledge'
import { getCareerBlocks } from '@/lib/logic/career/manager'
import { buildCareerPrompt } from '@/lib/logic/career/prompt'
import { verifyTurnstileToken, getClientIp } from '@/lib/turnstile'
import {
  MAX_BODY_BYTES,
  validateInputData,
  isValidDateString,
} from '@/lib/preview-validation'
import { profileHash, type InputData } from '@/lib/essay/key'
import { readEssay, writeEssay } from '@/lib/essay/cache'

export const runtime = 'nodejs'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
const MODEL = 'anthropic/claude-sonnet-4-6'
const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

const SYSTEM_PROMPT =
  'Bạn là một chiêm tinh gia chuyên nghiệp, có kiến thức sâu rộng về chiêm tinh học phương Tây. Bạn viết bằng tiếng Việt, văn phong ấm áp, dễ hiểu, truyền cảm hứng.'

const FULL_STREAM_SERVICES = new Set([
  'career', 'love', 'synastry', 'transit',
  'relations-parents', 'relations-children', 'relations-colleague', 'relations-friend',
])

export async function POST(req: NextRequest) {
  // Auth — full stream requires a logged-in user (sections are paid via coin).
  const session = await getServerSession(authOptions)
  const userUid = (session?.user as { uid?: string } | undefined)?.uid
  if (!userUid) {
    return NextResponse.json({ error: 'Cần đăng nhập để xem bản đầy đủ' }, { status: 401 })
  }

  // Body validation (same gates as preview-stream)
  let raw: string
  try { raw = await req.text() } catch {
    return NextResponse.json({ error: 'Không đọc được dữ liệu' }, { status: 400 })
  }
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Dữ liệu quá lớn' }, { status: 413 })
  }
  let body: Record<string, unknown>
  try { body = JSON.parse(raw) } catch {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 })
  }

  const ip = getClientIp(req)
  const cfToken = typeof body.cfTurnstileToken === 'string' ? body.cfTurnstileToken : ''
  const turnstile = await verifyTurnstileToken(cfToken, ip)
  if (!turnstile.success) {
    return NextResponse.json(
      { error: 'Xác thực bảo mật thất bại', reason: turnstile.reason },
      { status: 403 },
    )
  }

  const service = body.service as string
  if (!FULL_STREAM_SERVICES.has(service)) {
    return NextResponse.json({ error: 'Dịch vụ không hợp lệ' }, { status: 400 })
  }
  const validErr = validateInputData(body.inputData)
  if (validErr) {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ: ' + validErr }, { status: 400 })
  }
  const needsB = service === 'synastry' || service.startsWith('relations-')
  if (needsB) {
    if (!body.inputDataB) {
      return NextResponse.json({ error: 'Thiếu dữ liệu người B' }, { status: 400 })
    }
    const eB = validateInputData(body.inputDataB)
    if (eB) return NextResponse.json({ error: 'Dữ liệu người B không hợp lệ: ' + eB }, { status: 400 })
  }
  if (body.startDate !== undefined && body.startDate !== null && !isValidDateString(body.startDate)) {
    return NextResponse.json({ error: 'startDate không hợp lệ' }, { status: 400 })
  }
  if (body.endDate !== undefined && body.endDate !== null && !isValidDateString(body.endDate)) {
    return NextResponse.json({ error: 'endDate không hợp lệ' }, { status: 400 })
  }

  const inputData = body.inputData as InputData
  const inputDataB = body.inputDataB as InputData | undefined
  const startDate = body.startDate as string | undefined
  const endDate = body.endDate as string | undefined

  const hash = profileHash(inputData, inputDataB)

  const encoder = new TextEncoder()
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const send = (event: string, data: object) => {
    try { writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)) } catch {}
  }

  ;(async () => {
    try {
      // Cache hit — replay full text immediately, no LLM cost.
      const cached = await readEssay(userUid, service, hash)
      if (cached) {
        send('cached', { hash })
        // Drip cached text in chunks so the UI feels live but doesn't block.
        const chunks = cached.match(/[\s\S]{1,400}/g) || [cached]
        for (const c of chunks) send('chunk', { text: c })
        send('done', { service, hash, cached: true })
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
        name: fullName, fullName, onlyName,
        gender: gender || 'Female',
        dob: { day: String(dob.day), month: String(dob.month), year: String(dob.year) },
        tob: tobStr,
      }

      const kb = await getKnowledgeFromDB()
      let prompt: string

      if (service === 'career') {
        const blocks = getCareerBlocks(chart, kb)
        prompt = buildCareerPrompt(blocks, profile, chart)
      } else if (service === 'love') {
        const { getLoveBlocks } = await import('@/lib/logic/love/manager')
        const { buildLovePrompt } = await import('@/lib/logic/love/prompt')
        const blocks = getLoveBlocks(chart, kb)
        prompt = buildLovePrompt(chart, blocks, profile)
      } else if (service === 'synastry' || service.startsWith('relations-')) {
        const iB = inputDataB!
        const dobBStr = `${iB.dob.day}/${iB.dob.month}/${iB.dob.year}`
        const tobBStr = iB.tob.unknown ? '12:00' : `${pad(iB.tob.hour)}:${pad(iB.tob.minute)}`
        const chartB = calculateChart(dobBStr, tobBStr, iB.loc.lat, iB.loc.lon, iB.loc.tz)
        if (!chartB) {
          send('error', { message: 'Không thể tính bản đồ sao người B' })
          return
        }
        const profileB = {
          name: iB.name, fullName: iB.name, onlyName: (iB.ten || '').trim() || iB.name,
          gender: iB.gender || 'Male',
          dob: { day: String(iB.dob.day), month: String(iB.dob.month), year: String(iB.dob.year) },
        }
        const { getRelationshipBlocks } = await import('@/lib/logic/relationship/manager')
        const { buildRelationshipEssayPrompt } = await import('@/lib/logic/relationship/prompt')
        const blocks = getRelationshipBlocks(chart, chartB, kb)
        // Phase E: pick the dedicated template for each relation type — falls
        // back to the original synastry template for `service === 'synastry'`.
        const templateName = service.startsWith('relations-') ? service : 'relationship'
        // Each relations-* template is now fully self-contained → no context-block prepend.
        const result = buildRelationshipEssayPrompt(chart, chartB, blocks, profile, profileB, { templateName })
        prompt = typeof result === 'string' ? result : result.prompt
      } else {
        // transit
        const { buildVanhanEssayPrompt } = await import('@/lib/logic/vanhan/prompt')
        const sd = startDate || new Date().toISOString().split('T')[0]
        const ed = endDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
        prompt = buildVanhanEssayPrompt(chart, sd, ed, profile, kb)
      }

      send('hash', { hash })

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 240_000)

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
            { role: 'user', content: prompt },
          ],
          max_tokens: 8000,
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
      let collected = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() || ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const rawData = line.slice(6).trim()
            if (rawData === '[DONE]') break
            try {
              const parsed = JSON.parse(rawData)
              const delta = parsed.choices?.[0]?.delta?.content
              if (delta) {
                collected += delta
                send('chunk', { text: delta })
              }
            } catch {}
          }
        }
      } finally {
        clearTimeout(timeout)
        reader.releaseLock()
      }

      await writeEssay(userUid, service, hash, collected)
      send('done', { service, hash, cached: false })
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
