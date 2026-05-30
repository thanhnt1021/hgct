// Rotate PROFILE_ENCRYPTION_KEY: decrypt all profiles with OLD key, re-encrypt with NEW key.
//
// Usage (inside hgct-prod container):
//   node /app/scripts/migrate-profile-encryption.mjs --new-key=<64-hex> [--dry-run] [--limit=N]
//
// Reads OLD key from process.env.PROFILE_ENCRYPTION_KEY (current env).
//
// Safety:
//   - --dry-run: decrypt + re-encrypt + verify round-trip, NO DB write. Run this FIRST.
//   - Per-row transaction (each profile updated independently). If row N fails, prior
//     N-1 are already committed.
//   - Backup DB BEFORE running (Phase 3 backup at ~/evidence/db-prerotate-*.sql.gz)
//   - Verifies round-trip (encrypt then decrypt) on each row before writing.
//
// Exit codes: 0 = success, 1 = error.

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? true]
  })
)

const OLD_KEY_HEX = process.env.PROFILE_ENCRYPTION_KEY
const NEW_KEY_HEX = args['new-key']
const DRY_RUN = args['dry-run'] === true || args['dry-run'] === 'true'
const LIMIT = args.limit ? parseInt(args.limit, 10) : null

if (!OLD_KEY_HEX || OLD_KEY_HEX.length !== 64) {
  console.error('ERROR: PROFILE_ENCRYPTION_KEY env not set or wrong length (need 64 hex)')
  process.exit(1)
}
if (!NEW_KEY_HEX || NEW_KEY_HEX.length !== 64) {
  console.error('ERROR: --new-key=<64-hex> required')
  process.exit(1)
}
if (OLD_KEY_HEX === NEW_KEY_HEX) {
  console.error('ERROR: new-key cannot equal old key')
  process.exit(1)
}

const OLD_KEY = Buffer.from(OLD_KEY_HEX, 'hex')
const NEW_KEY = Buffer.from(NEW_KEY_HEX, 'hex')

function decrypt(encStr, key) {
  const [ivHex, ctHex, tagHex] = encStr.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const ciphertext = Buffer.from(ctHex, 'hex')
  const authTag = Buffer.from(tagHex, 'hex')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return JSON.parse(decrypted.toString('utf8'))
}

function encrypt(data, key) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const json = JSON.stringify(data)
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}`
}

const prisma = new PrismaClient()

console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (no write)' : 'WRITE'}`)
console.log(`Old key fingerprint: ${OLD_KEY_HEX.slice(0, 6)}...${OLD_KEY_HEX.slice(-4)}`)
console.log(`New key fingerprint: ${NEW_KEY_HEX.slice(0, 6)}...${NEW_KEY_HEX.slice(-4)}`)
if (LIMIT) console.log(`Limit: first ${LIMIT} rows`)
console.log('')

const all = await prisma.profile.findMany({
  select: { id: true, profileUid: true, data: true },
  orderBy: { id: 'asc' },
  ...(LIMIT ? { take: LIMIT } : {}),
})
console.log(`Total profiles to process: ${all.length}`)

let ok = 0, skipped = 0, failed = 0
const errors = []

for (const p of all) {
  const data = p.data
  if (!data || typeof data !== 'object' || !('_enc' in data) || typeof data._enc !== 'string') {
    skipped++
    continue
  }

  try {
    // Decrypt with OLD key
    const plaintext = decrypt(data._enc, OLD_KEY)

    // Re-encrypt with NEW key
    const newEncStr = encrypt(plaintext, NEW_KEY)

    // Round-trip verify (decrypt with NEW key → must equal plaintext)
    const verify = decrypt(newEncStr, NEW_KEY)
    if (JSON.stringify(verify) !== JSON.stringify(plaintext)) {
      throw new Error('round-trip mismatch')
    }

    if (!DRY_RUN) {
      await prisma.profile.update({
        where: { id: p.id },
        data: { data: { _enc: newEncStr } },
      })
    }
    ok++
    if (ok % 50 === 0) console.log(`  Progress: ${ok}/${all.length}`)
  } catch (err) {
    failed++
    errors.push({ id: p.id, profileUid: p.profileUid, error: String(err.message || err) })
  }
}

console.log('')
console.log('─────────────── SUMMARY ───────────────')
console.log(`OK:      ${ok}`)
console.log(`Skipped: ${skipped} (not encrypted / no _enc field)`)
console.log(`Failed:  ${failed}`)
if (failed > 0) {
  console.log('Errors:')
  errors.slice(0, 10).forEach(e => console.log(`  id=${e.id} uid=${e.profileUid}: ${e.error}`))
  if (errors.length > 10) console.log(`  ...and ${errors.length - 10} more`)
}
console.log('───────────────────────────────────────')

if (DRY_RUN) {
  console.log('')
  console.log('This was a DRY-RUN. No DB changes.')
  console.log('If all OK + 0 failed → re-run without --dry-run to apply.')
}

await prisma.$disconnect()
process.exit(failed > 0 ? 1 : 0)
