import prisma from './src/lib/db'
import { calculateChart } from './src/lib/astrology/calculations'
import { getCareerBlocks } from './src/lib/logic/career/manager'
import { buildCareerPrompt } from './src/lib/logic/career/prompt'
import { generateEssay } from './src/lib/openrouter'

const SYSTEM_PROMPT = 'Bạn là một chiêm tinh gia chuyên nghiệp, có kiến thức sâu rộng về chiêm tinh học phương Tây. Bạn viết bằng tiếng Việt, văn phong ấm áp, dễ hiểu, truyền cảm hứng.'

async function main() {
  // Load KB
  const entries = await prisma.knowledgeBase.findMany()
  const kb: Record<string, unknown[][]> = {}
  for (const e of entries) kb[e.tabName] = e.data as unknown[][]

  // Compute chart
  const chart = calculateChart('15/3/1990', '14:30', 21.0245, 105.8412, 'Asia/Ho_Chi_Minh')
  if (!chart) throw new Error('Chart failed')

  const blocks = getCareerBlocks(chart, kb)
  const profile = {
    name: 'Nguyễn Thị An', fullName: 'Nguyễn Thị An', onlyName: 'An',
    gender: 'Female', dob: { day: '15', month: '3', year: '1990' }
  }

  const prompt = buildCareerPrompt(blocks, profile, chart)
  console.log('Prompt length:', prompt.length, 'chars')
  console.log('\n--- FIRST 800 chars of prompt ---')
  console.log(prompt.substring(0, 800))
  console.log('\n--- CALLING AI (non-streaming) ---')

  const essay = await generateEssay(SYSTEM_PROMPT, prompt)

  console.log('\n=== AI ESSAY OUTPUT ===')
  console.log(essay)

  // Structure verification
  console.log('\n=== STRUCTURE VERIFICATION ===')
  const requiredSections = [
    '1. Tổng Quan', '2. Điểm Mạnh', '3. Những Điểm Yếu',
    '4. Định Hướng', '5. Mô Thức', '6. Chiến Lược', '7. Tổng Kết'
  ]
  for (const s of requiredSections) {
    const found = essay.includes(s)
    console.log(`${found ? '✅' : '❌'} "${s}"`)
  }

  // Greeting check
  const hasGreeting = essay.includes('Kính gửi')
  const hasSignoff = essay.includes('Hạt Giống Chiêm Tinh')
  console.log(`${hasGreeting ? '✅' : '❌'} Greeting (Kính gửi)`)
  console.log(`${hasSignoff ? '✅' : '❌'} Signoff (Hạt Giống Chiêm Tinh)`)

  // Full name only in greeting/signoff, not in body
  const lines = essay.split('\n')
  const bodyLines = lines.filter(l => !l.includes('Kính gửi') && !l.includes('Chúc') && !l.includes('Trân trọng') && !l.includes('Hạt Giống'))
  const fullNameInBody = bodyLines.filter(l => l.includes('Nguyễn Thị An'))
  console.log(`${fullNameInBody.length === 0 ? '✅' : '⚠️'} Full name not in body (found in ${fullNameInBody.length} lines)`)

  // Word count
  const wordCount = essay.split(/\s+/).filter(Boolean).length
  const inRange = wordCount >= 1400 && wordCount <= 1800
  console.log(`${inRange ? '✅' : '⚠️'} Word count: ~${wordCount} (target: 1400-1800)`)

  // No markdown
  const hasMarkdown = /##|^\*\*|^---/.test(essay)
  console.log(`${!hasMarkdown ? '✅' : '❌'} No markdown detected`)

  // Summary boxes (mỗi mục nên có tổng kết)
  const summaryCount = (essay.match(/tổng kết|cốt lõi|tóm lại/gi) || []).length
  console.log(`ℹ️  Summary-like phrases: ${summaryCount}`)

  console.log('\n✅ E2E test complete.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
