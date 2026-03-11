/**
 * Test: verify love blocks KB data is correctly loaded
 * Run: set -a && source .env.local && set +a && npx tsx test_love_blocks.ts
 */
import prisma from './src/lib/db'
import { calculateChart } from './src/lib/astrology/calculations'
import { getLoveBlocks } from './src/lib/logic/love/manager'
import { getZodiac, getHouseOfPlanet } from './src/lib/astrology/calculations'
import { RULER_MAP, PLANET_NAMES_VN } from './src/lib/astrology/constants'

async function main() {
  const entries = await prisma.knowledgeBase.findMany()
  const kb: Record<string, unknown[][]> = {}
  for (const e of entries) kb[e.tabName] = e.data as unknown[][]

  // Test chart: 15/3/1990, 14:30, Hà Nội
  const chart = calculateChart('15/3/1990', '14:30', 21.0245, 105.8412, 'Asia/Ho_Chi_Minh')
  if (!chart) throw new Error('Chart failed')

  const blocks = getLoveBlocks(chart, kb)
  const b1 = blocks.block1
  const b2 = blocks.block2

  let pass = 0, fail = 0

  function check(label: string, val: unknown, expectNonEmpty = true) {
    const s = typeof val === 'string' ? val : JSON.stringify(val)
    const ok = expectNonEmpty ? (s.trim().length > 0) : (s.trim().length === 0)
    console.log(`${ok ? '✅' : '❌'} ${label}`)
    if (!ok) console.log(`   Got: "${s.substring(0, 80)}"`)
    else if (expectNonEmpty) console.log(`   = "${s.substring(0, 80)}${s.length > 80 ? '...' : ''}"`)
    ok ? pass++ : fail++
  }

  console.log('\n=== BLOCK 1: OVERVIEW ===')

  // coreData: Asc/Sun/Moon → cho + yeu must be non-empty
  for (const c of b1.coreData) {
    check(`${c.label} (${c.zodiac}) CHO ĐI`, c.cho)
    check(`${c.label} (${c.zodiac}) ĐIỂM YẾU`, c.yeu)
  }

  // attraction: dom houses → nhận lại
  console.log(`\nDom houses: ${b1.attraction.map(a => a.label).join(', ')}`)
  for (const a of b1.attraction) {
    check(`Nhà trội ${a.label} content`, a.content)
  }
  if (b1.attraction.length === 0) {
    console.log('⚠️  No attraction data (no dom houses found)')
  }

  // Venus gu
  const venusLon = chart.planets['Venus'].lon
  const [, venusZ] = getZodiac(venusLon)
  console.log(`\nVenus in ${venusZ}`)
  check('Venus gu đối tác', b1.venusGu)

  // Moon an toàn
  const moonLon = chart.planets['Moon'].lon
  const [, moonZ] = getZodiac(moonLon)
  console.log(`Moon in ${moonZ}`)
  check('Moon an toàn', b1.moonAnToan)

  console.log('\n=== BLOCK 2: H7 DETAIL ===')

  // H7 peak energy
  console.log(`H7 zodiac: ${b2.peak.zodiac}`)
  check('H7 peak energy', b2.peak.energy)

  // Roles
  for (const r of b2.roles) {
    check(`${r.label} role`, r.content)
  }
  if (b2.roles.length === 0) console.log('⚠️  No roles (H7 empty and no ruler?)')

  // Meeting (ruler H7 location)
  console.log(`\nH7 ruler: ${b2.meeting.rulerLabel} in House ${b2.meeting.rulerHouse}`)
  check('Meeting location content', b2.meeting.content)

  // Interactions with KB content
  console.log(`\nH7 interactions: ${b2.interactions.length} found`)
  for (const it of b2.interactions) {
    check(`${it.label} content`, it.content)
  }
  if (b2.interactions.length === 0) console.log('⚠️  No interactions')

  // isH7Empty flag
  console.log(`\nH7 empty: ${b2.isH7Empty}`)

  // Summary
  console.log(`\n=== SUMMARY: ${pass} passed, ${fail} failed ===`)

  // Print full data structure for inspection
  console.log('\n=== RAW BLOCK DATA (for prompt builder) ===')
  console.log('\n-- B1.coreData --')
  for (const c of b1.coreData) {
    const cho = c.cho.replace(/<br>/g, ' ').substring(0, 100)
    const yeu = c.yeu.replace(/<br>/g, ' ').substring(0, 80)
    console.log(`  ${c.label} (${c.zodiac}): CHO="${cho}" | YEU="${yeu}"`)
  }
  console.log('\n-- B1.attraction --')
  for (const a of b1.attraction) {
    console.log(`  ${a.label}: "${a.content.replace(/<br>/g, ' ').substring(0, 100)}"`)
  }
  console.log('\n-- B1.venusGu --')
  console.log(' ', b1.venusGu.replace(/<br>/g, ' ').substring(0, 120))
  console.log('\n-- B1.moonAnToan --')
  console.log(' ', b1.moonAnToan.replace(/<br>/g, ' ').substring(0, 120))
  console.log('\n-- B2.peak --')
  console.log(`  ${b2.peak.zodiac}: "${b2.peak.energy.replace(/<br>/g, ' ').substring(0, 120)}"`)
  console.log('\n-- B2.roles --')
  for (const r of b2.roles) {
    console.log(`  ${r.label}: "${r.content.replace(/<br>/g, ' ').substring(0, 100)}"`)
  }
  console.log('\n-- B2.meeting --')
  console.log(`  ${b2.meeting.rulerLabel} ở Nhà ${b2.meeting.rulerHouse}: "${b2.meeting.content.replace(/<br>/g, ' ').substring(0, 120)}"`)
  console.log('\n-- B2.interactions --')
  for (const it of b2.interactions) {
    console.log(`  ${it.label}: "${it.content.replace(/<br>/g, ' ').substring(0, 100)}"`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
