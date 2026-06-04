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
import { profileHash, type InputData } from '@/lib/essay/key'
import { readEssay, writeEssay } from '@/lib/essay/cache'

const SYSTEM_PROMPT =
  'Bạn là một chiêm tinh gia chuyên nghiệp, có kiến thức sâu rộng về chiêm tinh học phương Tây. Bạn viết bằng tiếng Việt, văn phong ấm áp, dễ hiểu, truyền cảm hứng.'


export async function generateAndCacheEssay(opts: {
  userUid: string
  service: string
  inputData: InputData
  inputDataB?: InputData
  startDate?: string
  endDate?: string
  onProgress?: (charsReceived: number) => void
}): Promise<{ hash: string; essay: string }> {
  const hash = profileHash(opts.inputData, opts.inputDataB)

  const cached = await readEssay(opts.userUid, opts.service, hash)
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
    // Each relations-* template is now fully self-contained (per-type body) —
    // no runtime context-block prepend needed.
    const result = buildRelationshipEssayPrompt(chart, chartB, blocks, profile, profileB, { templateName })
    prompt = typeof result === 'string' ? result : result.prompt
  } else if (opts.service === 'transit') {
    const { buildVanhanEssayPrompt } = await import('@/lib/logic/vanhan/prompt')
    const sd = opts.startDate || new Date().toISOString().split('T')[0]
    const ed = opts.endDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
    prompt = buildVanhanEssayPrompt(chart, sd, ed, profile, kb)
  } else {
    throw new Error('Service không hợp lệ')
  }

  // Robust generation — use the EXACT same never-fail streaming client as the
  // legacy PDF report flow (reportProcessor): streams with internal retry
  // (4 attempts, 5s/20s/60s backoff) and retries on stalled/interrupted streams.
  const { generateEssayStreaming } = await import('@/lib/openrouter')
  const essay = await generateEssayStreaming(SYSTEM_PROMPT, prompt, opts.onProgress ?? (() => {}))
  if (!essay) throw new Error('OpenRouter returned empty essay')

  // Persist (keep-first on race) then re-read the canonical row so that if a
  // concurrent request generated + stored a different essay first, every caller
  // slices sections from the SAME canonical essay → no cross-section mismatch.
  await writeEssay(opts.userUid, opts.service, hash, essay, opts.inputData?.name)
  const canonical = await readEssay(opts.userUid, opts.service, hash)
  return { hash, essay: canonical ?? essay }
}
