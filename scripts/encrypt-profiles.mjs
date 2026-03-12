// Run: node scripts/encrypt-profiles.mjs
// Encrypts all existing plaintext profiles in DB using PROFILE_ENCRYPTION_KEY

import { PrismaClient } from '@prisma/client'
import { createCipheriv, randomBytes } from 'crypto'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Parse .env.local manually
const envPath = resolve(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
}

const KEY_HEX = process.env.PROFILE_ENCRYPTION_KEY
if (!KEY_HEX || KEY_HEX.length !== 64) {
  console.error('PROFILE_ENCRYPTION_KEY missing or invalid (need 64 hex chars)')
  process.exit(1)
}

const KEY = Buffer.from(KEY_HEX, 'hex')

function encrypt(data) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', KEY, iv)
  const json = JSON.stringify(data)
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return { _enc: `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}` }
}

function isAlreadyEncrypted(data) {
  return data && typeof data === 'object' && typeof data._enc === 'string'
}

const prisma = new PrismaClient()

async function main() {
  const profiles = await prisma.profile.findMany({ select: { id: true, data: true } })
  console.log(`Found ${profiles.length} profiles`)

  let encrypted = 0, skipped = 0
  for (const p of profiles) {
    if (isAlreadyEncrypted(p.data)) { skipped++; continue }
    await prisma.profile.update({
      where: { id: p.id },
      data: { data: encrypt(p.data) },
    })
    encrypted++
    if (encrypted % 50 === 0) console.log(`Encrypted ${encrypted}/${profiles.length - skipped}...`)
  }

  console.log(`Done: ${encrypted} encrypted, ${skipped} already encrypted`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
