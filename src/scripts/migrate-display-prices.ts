/**
 * One-time script: seed display prices + referral code into Config table.
 * Run: npx tsx src/scripts/migrate-display-prices.ts
 */
import prisma from '../lib/db'

async function main() {
  const entries = [
    { key: 'display_price_career', value: '199000' },
    { key: 'display_price_love', value: '199000' },
    { key: 'display_price_transit', value: '199000' },
    { key: 'display_price_synastry', value: '269000' },
    // Referral code active status
    { key: 'referral_code_HGCT2026', value: 'active' },
  ]

  for (const entry of entries) {
    await prisma.config.upsert({
      where: { key: entry.key },
      update: { value: entry.value },
      create: { key: entry.key, value: entry.value },
    })
    console.log(`✓ ${entry.key} = ${entry.value}`)
  }

  console.log('Done.')
  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
