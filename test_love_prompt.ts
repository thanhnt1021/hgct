/**
 * Test: verify love prompt contains all required data sections
 * Run: set -a && source .env.local && set +a && npx tsx test_love_prompt.ts
 */
import prisma from './src/lib/db'
import { calculateChart } from './src/lib/astrology/calculations'
import { getLoveBlocks } from './src/lib/logic/love/manager'
import { buildLovePrompt } from './src/lib/logic/love/prompt'

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

  console.log(`Prompt length: ${prompt.length} chars\n`)

  let pass = 0, fail = 0
  function check(label: string, needle: string) {
    const found = prompt.includes(needle)
    console.log(`${found ? '✅' : '❌'} ${label}`)
    if (!found) console.log(`   Missing: "${needle}"`)
    found ? pass++ : fail++
  }

  // Chart sections
  check('Header', 'DỮ LIỆU PHÂN TÍCH BẢN ĐỒ SAO TÌNH DUYÊN')
  check('Cung Mọc', 'Cung Mọc:')
  check('Sun position', 'Mặt Trời:')
  check('Moon position', 'Mặt Trăng:')
  check('Venus position', 'Sao Kim:')
  check('Mars position', 'Sao Hỏa:')
  check('H5 house', 'Nhà 5 (lãng mạn')
  check('H7 house', 'Nhà 7 (hôn nhân')
  check('H7 ruler', 'Chủ tinh Nhà 7')
  check('H8 house', 'Nhà 8 (gắn kết sâu')
  check('H11 house', 'Nhà 11')
  check('H12 house', 'Nhà 12')
  check('Love aspects', 'GÓC TÌNH CẢM')

  // KB blocks
  check('Block 1A header', 'BLOCK 1A: CÁCH YÊU')
  check('Block 1A coreData non-empty', 'Cho đi / Cách yêu:')
  check('Block 1A yeu non-empty', 'Điểm yếu tình cảm:')
  check('Block 1B dom houses', 'BLOCK 1B: KIỂU NGƯỜI')
  check('Block 1B non-empty', 'Nhà 6:')
  check('Block 1C Venus gu', 'BLOCK 1C: GU ĐỐI TÁC')
  check('Block 1C non-empty', 'Gu:')
  check('Block 1D Moon need', 'BLOCK 1D: NHU CẦU CẢM XÚC')
  check('Block 1D non-empty', 'an toàn khi')
  check('Block 2A H7 energy', 'BLOCK 2A: NĂNG LƯỢNG ĐỐI TÁC')
  check('Block 2A non-empty (peak energy text)', 'bạn đồng hành')
  check('Block 2B H7 roles', 'BLOCK 2B: VAI TRÒ')
  check('Block 2B non-empty', 'Sao Kim:')
  check('Block 2C meeting', 'BLOCK 2C: GẶP ĐỐI TÁC')
  check('Block 2C non-empty (meeting text)', 'Gặp qua')
  check('Block 2D interactions', 'BLOCK 2D: TƯƠNG TÁC')
  check('Block 2D hard interaction', 'Cứng')
  check('Block 2D soft interaction', 'Mềm')
  check('Instructions present', 'YÊU CẦU VIẾT BÀI LUẬN')

  // No N/A in critical sections
  const b1CStart = prompt.indexOf('BLOCK 1A')
  const b2DEnd = prompt.indexOf('YÊU CẦU VIẾT')
  const dataSection = prompt.substring(b1CStart, b2DEnd)
  const naCount = (dataSection.match(/\bN\/A\b/g) || []).length
  console.log(`${naCount === 0 ? '✅' : '⚠️ '} No N/A in data blocks (found ${naCount})`)
  naCount === 0 ? pass++ : fail++

  console.log(`\n=== SUMMARY: ${pass} passed, ${fail} failed ===`)

  // Show first 2000 chars of data section
  console.log('\n=== PROMPT PREVIEW (first 2000 chars of data section) ===')
  console.log(prompt.substring(0, 2000))
}

main().catch(console.error).finally(() => prisma.$disconnect())
