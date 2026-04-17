// Test 4 PDFs: Huong Nghiep / Van Han / Tinh Duyen / Cap Doi for hentaii.kidd@gmail.com
// Usage (inside hgct-prod container): node /app/scripts/test-4-pdfs.mjs
// Requires: DATABASE_URL + PROFILE_ENCRYPTION_KEY in env.

import { createRequire } from 'node:module'
import crypto from 'node:crypto'
const require = createRequire(import.meta.url)
const { PrismaClient } = require('/app/node_modules/.prisma/client')
const prisma = new PrismaClient()

const KEY = Buffer.from(process.env.PROFILE_ENCRYPTION_KEY, 'hex')
function decryptProfile(encStr) {
  const [ivHex, ctHex, tagHex] = encStr.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const ct = Buffer.from(ctHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(ct), decipher.final()])
  return JSON.parse(plain.toString('utf8'))
}

const NGUY_UID = '5bb5e10a-04d7-430f-834e-1c3cb6e1ac7b'
const VAN_ANH_UID = 'edff02ad-2757-4390-96f3-4f8295efee12'
const EMAIL = 'hentaii.kidd@gmail.com'

async function loadProfile(uid) {
  const p = await prisma.profile.findUnique({ where: { profileUid: uid } })
  if (!p) throw new Error(`profile ${uid} not found`)
  const encRaw = p.data?._enc
  if (!encRaw) throw new Error(`profile ${uid} not encrypted as expected`)
  const d = decryptProfile(encRaw)
  return { name: p.name, gender: p.gender, data: d }
}

async function main() {
  const nguy = await loadProfile(NGUY_UID)
  const vanAnh = await loadProfile(VAN_ANH_UID)
  console.log('[test] nguy:', nguy.name, nguy.data.dob, nguy.data.loc?.address?.slice(0, 40))
  console.log('[test] vanAnh:', vanAnh.name, vanAnh.data.dob, vanAnh.data.loc?.address?.slice(0, 40))

  const testCases = [
    { service: 'career', profileA: nguy, profileB: null, startDate: null, endDate: null },
    { service: 'vanhan', profileA: nguy, profileB: null, startDate: '2026-04-17', endDate: '2026-10-17' },
    { service: 'love',   profileA: nguy, profileB: null, startDate: null, endDate: null },
    { service: 'relationship', profileA: vanAnh, profileB: nguy, startDate: null, endDate: null },
  ]

  const orders = []
  for (const tc of testCases) {
    const order = await prisma.order.create({
      data: {
        userUid: null,
        service: tc.service,
        email: EMAIL,
        amount: 0,
        status: 'failed',
        paymentStatus: 'paid',
        paidAt: new Date(),
        profileData: { ...tc.profileA.data, name: tc.profileA.name, gender: tc.profileA.gender },
        profileDataB: tc.profileB ? { ...tc.profileB.data, name: tc.profileB.name, gender: tc.profileB.gender } : null,
        profileUidA: tc.profileA === nguy ? NGUY_UID : VAN_ANH_UID,
        profileUidB: tc.profileB === nguy ? NGUY_UID : (tc.profileB === vanAnh ? VAN_ANH_UID : null),
        startDate: tc.startDate,
        endDate: tc.endDate,
        retryCount: 0,
      },
    })
    console.log(`[test] created order #${order.id} service=${tc.service}`)
    orders.push({ id: order.id, service: tc.service })
  }
  console.log('ORDER_IDS=' + orders.map((o) => `${o.id}:${o.service}`).join(','))
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
