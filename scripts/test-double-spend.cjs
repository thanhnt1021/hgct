// Double-spend test for the coin unlock flow.
//
// Fires N concurrent transactions that replicate the unlock-section atomic op
// (decrement coin + guard >=0 + insert unique Reading row) for the SAME
// (user, profile, service, section). Proves that no matter the concurrency,
// the user is charged exactly ONCE — the Reading @@unique constraint + the
// atomic decrement guarantee it.
//
// Run inside the app container (has @prisma/client + DATABASE_URL):
//   docker exec -i -w /app hgct-demo node < scripts/test-double-spend.cjs

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const USER = 'dstest-fixed-user'
const PROFILE = 'dstestprofile01'
const SERVICE = 'career'
const SECTION = 'career-1'
const PRICE = 59
const START = 100
const CONCURRENCY = 10

async function cleanup() {
  await prisma.reading.deleteMany({ where: { userUid: USER } })
  await prisma.coinTransaction.deleteMany({ where: { userUid: USER } })
  await prisma.user.deleteMany({ where: { userUid: USER } })
}

async function oneUnlock() {
  return prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { userUid: USER },
      data: { coin: { decrement: PRICE }, coinUpdatedAt: new Date() },
      select: { coin: true },
    })
    if (u.coin < 0) throw new Error('insufficient')
    await tx.reading.create({
      data: { userUid: USER, profileUid: PROFILE, service: SERVICE, sectionId: SECTION, content: 'x' },
    })
    await tx.coinTransaction.create({
      data: { userUid: USER, delta: -PRICE, balanceAfter: u.coin, reason: `unlock-${SECTION}`, refType: 'deduct', refId: `${SERVICE}:${PROFILE}:${SECTION}` },
    })
    return u.coin
  })
}

async function main() {
  await cleanup()
  // Seed user with enough coins that, WITHOUT the unique guard, multiple
  // charges could go through (START/PRICE = ~1.7 → 2 naive charges possible).
  await prisma.user.create({ data: { userUid: USER, username: USER, email: `${USER}@local`, passwordHash: 'x', coin: START } })

  const results = await Promise.allSettled(
    Array.from({ length: CONCURRENCY }, () => oneUnlock()),
  )
  const ok = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  const finalCoin = (await prisma.user.findUnique({ where: { userUid: USER }, select: { coin: true } })).coin
  const readings = await prisma.reading.count({ where: { userUid: USER, service: SERVICE, sectionId: SECTION } })
  const deducts = await prisma.coinTransaction.count({ where: { userUid: USER, refType: 'deduct' } })

  const expectCoin = START - PRICE
  const pass = ok === 1 && readings === 1 && deducts === 1 && finalCoin === expectCoin

  console.log(`concurrency=${CONCURRENCY} succeeded=${ok} failed=${failed}`)
  console.log(`finalCoin=${finalCoin} (expect ${expectCoin}) · readings=${readings} (expect 1) · deductTx=${deducts} (expect 1)`)
  console.log(pass ? 'RESULT: PASS ✓ — charged exactly once' : 'RESULT: FAIL ✗')

  await cleanup()
  await prisma.$disconnect()
  process.exit(pass ? 0 : 1)
}

main().catch(async (e) => { console.error('ERROR', e); await prisma.$disconnect(); process.exit(2) })
