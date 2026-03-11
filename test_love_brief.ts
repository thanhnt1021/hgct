/**
 * Test: verify love brief completeness + VIẾT/KHÔNG VIẾT markers
 * Run: set -a && source .env.local && set +a && npx tsx test_love_brief.ts
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
  console.log(`Prompt: ${prompt.length} chars\n`)

  let pass = 0, fail = 0
  function check(label: string, needle: string, required = true) {
    const found = prompt.includes(needle)
    const ok = required ? found : true
    console.log(`${found ? '✅' : (required ? '❌' : '⚠️')} ${label}`)
    if (!found && required) console.log(`   Missing: "${needle}"`)
    if (required) found ? pass++ : fail++
  }

  console.log('=== BRIEF STRUCTURE ===')
  check('Header', 'DỮ LIỆU ĐÃ TÍNH TOÁN — BẢN ĐỒ TÌNH DUYÊN')
  check('Core positions', 'Cung Mọc:')
  check('Venus+house', 'Sao Kim:')
  check('Mars+house', 'Sao Hỏa:')
  check('H7 zodiac', 'Đỉnh Nhà 7:')
  check('H7 ruler', 'Chủ tinh Nhà 7')
  check('MUC 1 header', 'MỤC 1 — TỔNG QUAN')
  check('MUC1: coreData cho', 'Cho đi / Cách yêu:')
  check('MUC1: coreData yeu', 'Điểm yếu tình cảm:')
  check('MUC1: Venus gu', 'gu đối tác:')
  check('MUC1: Moon anToan', 'nhu cầu cảm xúc sâu xa:')
  check('MUC1: Mars note', 'Luận cách theo đuổi')
  check('MUC1: attraction', 'Nhà trội — điều')
  check('MUC 2 header', 'MỤC 2 — KIỂU NGƯỜI')
  check('MUC2: meeting', 'Gặp đối tác ở đâu')
  check('MUC2: meeting content', 'Gặp qua')
  check('MUC 3 header', 'MỤC 3 — CÁCH BẠN YÊU')
  check('MUC3: H7 energy', 'thái độ trong tình yêu')
  check('MUC3: H7 roles', 'Hành tinh/Chủ tinh trong Nhà 7')
  check('MUC 4 header', 'MỤC 4 — KHÓ KHĂN')
  check('MUC4: H7 hard', 'Nhà 7 tương tác CỨNG')
  check('MUC4: H7 soft', 'Nhà 7 tương tác MỀM')
  check('MUC4: Venus hard', 'Góc cứng Sao Kim')
  check('MUC4: Moon hard', 'Góc cứng Mặt Trăng')
  check('MUC4: VIẾT markers present', '→ VIẾT')
  check('MUC4: KHONG VIET markers present', '→ KHÔNG VIẾT')
  check('MUC 5 header', 'MỤC 5 — BÀI HỌC')
  check('MUC5: Saturn', 'Sao Thổ tạo góc')
  check('MUC5: North Node', 'La Hầu (North Node)')
  check('MUC5: Chiron', 'Chiron:')
  check('MUC 6 header', 'MỤC 6 — TỔNG KẾT')
  check('Instructions present', 'YÊU CẦU VIẾT BÀI LUẬN TÌNH DUYÊN')
  check('Template structure Muc 1', '1. Tổng Quan Năng Lượng')
  check('Template structure Muc 2', '2. Kiểu Người Thu Hút')
  check('Template structure Muc 3', '3. Cách Bạn Yêu')
  check('Template structure Muc 4', '4. Những Khó Khăn')
  check('Template structure Muc 5', '5. Bài Học Tình Yêu')
  check('Template structure Muc 6', '6. Tổng Kết Hành Trình')

  // Count VIẾT vs KHÔNG VIẾT
  const vietCount = (prompt.match(/→ VIẾT/g) || []).length
  const khongVietCount = (prompt.match(/→ KHÔNG VIẾT/g) || []).length
  console.log(`\nℹ️  → VIẾT: ${vietCount}, → KHÔNG VIẾT: ${khongVietCount}`)

  console.log(`\n=== SUMMARY: ${pass} passed, ${fail} failed ===`)

  // Print the brief section (before instructions)
  const instrIdx = prompt.indexOf('=== YÊU CẦU VIẾT BÀI LUẬN')
  const brief = instrIdx > 0 ? prompt.substring(0, instrIdx) : prompt
  console.log('\n=== BRIEF CONTENT ===')
  console.log(brief)
}

main().catch(console.error).finally(() => prisma.$disconnect())
