/**
 * E2E test: love brief + AI → verify essay structure & accuracy
 * Run: set -a && source .env.local && set +a && npx tsx test_love_e2e.ts
 */
import prisma from './src/lib/db'
import { calculateChart } from './src/lib/astrology/calculations'
import { getLoveBlocks } from './src/lib/logic/love/manager'
import { buildLovePrompt } from './src/lib/logic/love/prompt'
import { generateEssay } from './src/lib/openrouter'

const SYSTEM_PROMPT = 'Bạn là một chiêm tinh gia chuyên nghiệp, có kiến thức sâu rộng về chiêm tinh học phương Tây. Bạn viết bằng tiếng Việt, văn phong ấm áp, dễ hiểu, truyền cảm hứng.'

async function main() {
  const entries = await prisma.knowledgeBase.findMany()
  const kb: Record<string, unknown[][]> = {}
  for (const e of entries) kb[e.tabName] = e.data as unknown[][]

  const chart = calculateChart('15/3/1990', '14:30', 21.0245, 105.8412, 'Asia/Ho_Chi_Minh')
  if (!chart) throw new Error('Chart failed')

  const blocks = getLoveBlocks(chart, kb)
  const profile = {
    name: 'Nguyễn Thị An', fullName: 'Nguyễn Thị An', onlyName: 'An',
    gender: 'Female', dob: { day: '15', month: '3', year: '1990' }
  }

  const prompt = buildLovePrompt(chart, blocks, profile)
  console.log(`Prompt: ${prompt.length} chars`)
  console.log('\n--- CALLING AI ---')

  const essay = await generateEssay(SYSTEM_PROMPT, prompt)

  console.log('\n=== AI ESSAY ===')
  console.log(essay)

  // ── Structure checks ────────────────────────────────────────────
  console.log('\n=== STRUCTURE VERIFICATION ===')
  let pass = 0, fail = 0

  function check(label: string, cond: boolean, note = '') {
    console.log(`${cond ? '✅' : '❌'} ${label}${note ? ' — ' + note : ''}`)
    cond ? pass++ : fail++
  }

  // 6 required sections
  check('Mục 1: Tổng Quan Năng Lượng', essay.includes('1. Tổng Quan Năng Lượng'))
  check('Mục 2: Kiểu Người Thu Hút', essay.includes('2. Kiểu Người Thu Hút'))
  check('Mục 3: Cách Bạn Yêu', essay.includes('3. Cách Bạn Yêu') || (essay.includes('3. Cách ') && essay.includes('Yêu')))
  check('Mục 4: Khó Khăn / Mô Thức', essay.includes('4. Những Khó Khăn') || essay.includes('4. Khó Khăn'))
  check('Mục 5: Bài Học Tình Yêu', essay.includes('5. Bài Học Tình Yêu'))
  check('Mục 6: Tổng Kết', essay.includes('6. Tổng Kết'))

  // Greeting + Signoff
  check('Greeting (Kính gửi)', essay.includes('Kính gửi'))
  check('Signoff (Hạt Giống Chiêm Tinh)', essay.includes('Hạt Giống Chiêm Tinh'))
  check('Signoff sentence', essay.includes('Chúc') && essay.includes('tình yêu'))

  // full_name only in greeting/signoff, NOT in body
  const lines = essay.split('\n')
  const bodyLines = lines.filter(l =>
    !l.includes('Kính gửi') &&
    !l.includes('Chúc') && !l.includes('Trân trọng') && !l.includes('Hạt Giống')
  )
  const fullNameInBody = bodyLines.filter(l => l.includes('Nguyễn Thị An'))
  check('Full name not in body', fullNameInBody.length === 0,
    `found in ${fullNameInBody.length} lines`)

  // Data accuracy — these SHOULD appear (from VIẾT sections)
  check('Mentions Bảo Bình (Venus/H7 zodiac)', essay.includes('Bảo Bình'))
  check('Mentions Bọ Cạp (Moon zodiac)', essay.includes('Bọ Cạp'))
  check('Mentions Song Ngư (Sun zodiac)', essay.includes('Song Ngư'))
  check('Mentions Sư Tử (Asc zodiac)', essay.includes('Sư Tử'))
  check('Mentions La Hầu lesson (Nhà 7)', essay.includes('La Hầu') || essay.includes('Bắc Giao'))

  // KHÔNG VIẾT sections should NOT appear
  check('Chiron NOT mentioned (KHÔNG VIẾT)', !essay.includes('Chiron'))
  check('Kim-Thổ NOT mentioned', !(essay.toLowerCase().includes('kim cứng thổ') || essay.includes('sợ bị từ chối') && essay.includes('tự ti')))
  // Actually "sợ bị từ chối" might appear from Moon/Saturn context but Kim-Thổ specifically
  // Let's just check Chiron since it's clearly KHÔNG VIẾT

  // Summary boxes — each section (1-5) must end with "Tóm lại, ..."
  const tomlaiCount = (essay.match(/Tóm lại,/g) || []).length
  check('Has summary boxes (Tóm lại,)', tomlaiCount >= 5, `${tomlaiCount} "Tóm lại," found`)

  // No markdown
  check('No markdown', !/##|\*\*|^---/.test(essay))

  // Word count
  const wordCount = essay.split(/\s+/).filter(Boolean).length
  const inRange = wordCount >= 1200 && wordCount <= 3500
  check('Word count in range', inRange, `~${wordCount} words (target 1400-2000)`)

  // Bullet points in Muc 6
  check('Mục 6 has bullet list (dấu gạch đầu dòng)', essay.includes('- ') || essay.includes('• '))

  console.log(`\n=== SUMMARY: ${pass} passed, ${fail} failed ===`)
  if (fail > 0) console.log('Review the essay above for failures.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
