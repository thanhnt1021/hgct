// Non-streaming essay generation + filesystem cache.
// Used by /api/coin/unlock-section (lazy gen on first unlock) so /reading
// doesn't have to stream anything on mount.
//
// Heavy: blocks ~30-90s for the OpenRouter call. Caller (route handler) is
// responsible for any user-facing loading state.

import { calculateChart } from '@/lib/astrology/calculations'
import { getKnowledgeFromDB } from '@/lib/astrology/knowledge'
import { getCareerBlocks } from '@/lib/logic/career/manager'
import { buildCareerPrompt } from '@/lib/logic/career/prompt'
import { relationsContextBlock, type RelationsType } from '@/lib/logic/relations/context'
import { profileHash, cacheKey, type InputData } from '@/lib/essay/key'
import { readEssay, writeEssay } from '@/lib/essay/cache'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
const MODEL = 'anthropic/claude-sonnet-4-6'
const API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const SYSTEM_PROMPT =
  'Bạn là một chiêm tinh gia chuyên nghiệp, có kiến thức sâu rộng về chiêm tinh học phương Tây. Bạn viết bằng tiếng Việt, văn phong ấm áp, dễ hiểu, truyền cảm hứng.'

export async function generateAndCacheEssay(opts: {
  userUid: string
  service: string
  inputData: InputData
  inputDataB?: InputData
  startDate?: string
  endDate?: string
}): Promise<{ hash: string; essay: string }> {
  const hash = profileHash(opts.inputData, opts.inputDataB)
  const key = cacheKey(opts.userUid, opts.service, hash)

  const cached = readEssay(key)
  if (cached) return { hash, essay: cached }

  const { dob, tob, loc, name, ten, gender } = opts.inputData
  const pad = (n: number) => String(n).padStart(2, '0')
  const dobStr = `${dob.day}/${dob.month}/${dob.year}`
  const tobStr = tob.unknown ? '12:00' : `${pad(tob.hour)}:${pad(tob.minute)}`
  const chart = calculateChart(dobStr, tobStr, loc.lat, loc.lon, loc.tz)
  if (!chart) throw new Error('Không tính được bản đồ sao')

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

  if (opts.service === 'career') {
    const blocks = getCareerBlocks(chart, kb)
    prompt = buildCareerPrompt(blocks, profile, chart)
  } else if (opts.service === 'love') {
    const { getLoveBlocks } = await import('@/lib/logic/love/manager')
    const { buildLovePrompt } = await import('@/lib/logic/love/prompt')
    const blocks = getLoveBlocks(chart, kb)
    prompt = buildLovePrompt(chart, blocks, profile)
  } else if (opts.service === 'synastry' || opts.service.startsWith('relations-')) {
    const iB = opts.inputDataB
    if (!iB) throw new Error('Thiếu dữ liệu người B')
    const dobBStr = `${iB.dob.day}/${iB.dob.month}/${iB.dob.year}`
    const tobBStr = iB.tob.unknown ? '12:00' : `${pad(iB.tob.hour)}:${pad(iB.tob.minute)}`
    const chartB = calculateChart(dobBStr, tobBStr, iB.loc.lat, iB.loc.lon, iB.loc.tz)
    if (!chartB) throw new Error('Không tính được bản đồ sao người B')
    const profileB = {
      name: iB.name, fullName: iB.name, onlyName: (iB.ten || '').trim() || iB.name,
      gender: iB.gender || 'Male',
      dob: { day: String(iB.dob.day), month: String(iB.dob.month), year: String(iB.dob.year) },
    }
    const { getRelationshipBlocks } = await import('@/lib/logic/relationship/manager')
    const { buildRelationshipEssayPrompt } = await import('@/lib/logic/relationship/prompt')
    const blocks = getRelationshipBlocks(chart, chartB, kb)
    const templateName = opts.service.startsWith('relations-') ? opts.service : 'relationship'
    const result = buildRelationshipEssayPrompt(chart, chartB, blocks, profile, profileB, { templateName })
    const basePrompt = typeof result === 'string' ? result : result.prompt
    const ctx = opts.service.startsWith('relations-')
      ? relationsContextBlock(opts.service as RelationsType)
      : ''
    prompt = ctx + basePrompt
  } else if (opts.service === 'transit') {
    const { buildVanhanEssayPrompt } = await import('@/lib/logic/vanhan/prompt')
    const sd = opts.startDate || new Date().toISOString().split('T')[0]
    const ed = opts.endDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
    prompt = buildVanhanEssayPrompt(chart, sd, ed, profile, kb)
  } else {
    throw new Error('Service không hợp lệ')
  }

  // Use stream=true + collect chunks to avoid single-response timeout.
  // Claude Sonnet 4.6 generates ~30 tok/s; 8000 tok ≈ 4.5 min, so non-stream
  // single response can time out before completion. Streaming keeps the
  // HTTP body alive with continuous chunks → no idle timeout.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 600_000) // 10 min hard cap
  let essay = ''
  try {
    const res = await fetch(API_URL, {
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
    if (!res.ok || !res.body) throw new Error(`OpenRouter error: ${res.status}`)

    const reader = res.body.getReader()
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
            if (delta) essay += delta
          } catch {}
        }
      }
    } finally {
      reader.releaseLock()
    }

    if (!essay) throw new Error('OpenRouter returned empty essay')
  } finally {
    clearTimeout(timeout)
  }

  writeEssay(key, essay)
  return { hash, essay }
}
