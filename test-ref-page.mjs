// Test: generate Career + Love essay, extract [bold] keywords
// Run: npx tsx --tsconfig tsconfig.json test-ref-page.mjs (from /root/hgct)

process.env.DATABASE_URL = "postgresql://nguydev:***DA-GO***@localhost:5432/zodiacdb"
process.env.OPENROUTER_API_KEY = "***DA-GO***"
process.env.PROFILE_ENCRYPTION_KEY = "***DA-GO***"

const { calculateChart } = await import('./src/lib/astrology/calculations.ts')
const { getKnowledgeFromDB } = await import('./src/lib/astrology/knowledge.ts')
const { getCareerBlocks } = await import('./src/lib/logic/career/manager.ts')
const { buildCareerPrompt } = await import('./src/lib/logic/career/prompt.ts')
const { getLoveBlocks } = await import('./src/lib/logic/love/manager.ts')
const { buildLovePrompt } = await import('./src/lib/logic/love/prompt.ts')

// Profile 686: Nguyễn Trung Thành
const dataThanh = { ho: 'Nguyễn', dem: 'Trung', ten: 'Thành', gender: 'Male', dob: { day: 12, month: 1, year: 1994 }, tob: { hour: 8, minute: 0 }, loc: { lat: 21.3149047, lon: 105.7321959, tz: 'Asia/Ho_Chi_Minh' } }
// Profile 705: Nhỏ (<22)
const dataNho = { ho: '', dem: '', ten: 'Nhỏ', gender: 'Male', dob: { day: 6, month: 7, year: 2013 }, tob: { hour: 6, minute: 8 }, loc: { lat: 21.0245, lon: 105.8412, tz: 'Asia/Ho_Chi_Minh' } }

async function callAI(prompt) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'anthropic/claude-sonnet-4-6', max_tokens: 32000, stream: false, messages: [{ role: 'user', content: prompt }] }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.choices?.[0]?.message?.content || ''
}

function extractBoldLines(text) {
  return text.split('\n').map(l => l.trim()).filter(l => l.includes('[bold]') && l.includes('[/]'))
}

async function run(label, rawData, service) {
  console.log(`\n${'='.repeat(60)}\n${label} — ${service.toUpperCase()}\n${'='.repeat(60)}`)
  const { dob, tob, loc } = rawData
  const dobStr = `${dob.day}/${dob.month}/${dob.year}`
  const tobStr = `${tob.hour}:${String(tob.minute).padStart(2, '0')}`
  const chart = calculateChart(dobStr, tobStr, loc.lat, loc.lon, loc.tz)
  if (!chart) throw new Error('Chart calculation failed')

  const fullName = [rawData.ho, rawData.dem, rawData.ten].filter(Boolean).join(' ')
  const profile = {
    name: fullName, fullName, onlyName: rawData.ten,
    gender: rawData.gender,
    dob: { day: String(dob.day), month: String(dob.month), year: String(dob.year) },
    tob: tobStr,
  }

  const kb = await getKnowledgeFromDB()

  let prompt
  if (service === 'career') {
    const blocks = getCareerBlocks(chart, kb)
    prompt = buildCareerPrompt(blocks, profile, chart)
  } else {
    const blocks = getLoveBlocks(chart, kb)
    prompt = buildLovePrompt(chart, blocks, profile)
  }

  console.log(`Prompt: ${prompt.length} chars → calling AI...`)
  const essay = await callAI(prompt)
  console.log(`AI output: ${essay.length} chars`)

  const bolds = extractBoldLines(essay)
  console.log(`\n--- BOLD KEYWORD LINES (${bolds.length}) ---`)
  bolds.forEach((l, i) => console.log(`${i+1}. ${l}`))
}

const kb_warm = await getKnowledgeFromDB() // pre-warm DB connection
await run('Nguyễn Trung Thành', dataThanh, 'career')
await run('Nguyễn Trung Thành', dataThanh, 'love')
await run('Nhỏ (<22)', dataNho, 'career')
console.log('\n✅ Done')
