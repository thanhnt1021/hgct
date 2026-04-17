// Verify data sau restore: decrypt 5 profile cua user hentaiikidd (id=1)
// Run (via docker): docker run --rm --network host -v /home/hgct/hgct:/app -w /app node:20-alpine sh -c 'npm i pg --silent --no-save && node verify-profiles.mjs'

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createDecipheriv } from 'crypto'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envContent = readFileSync(resolve(__dirname, '.env.local'), 'utf-8')
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
}

const KEY_HEX = process.env.PROFILE_ENCRYPTION_KEY
if (!KEY_HEX || KEY_HEX.length !== 64) {
  console.error('PROFILE_ENCRYPTION_KEY missing or invalid')
  process.exit(1)
}
const KEY = Buffer.from(KEY_HEX, 'hex')

function decrypt(encObj) {
  if (!encObj || typeof encObj !== 'object' || typeof encObj._enc !== 'string') return encObj
  const [ivHex, ctHex, tagHex] = encObj._enc.split(':')
  const decipher = createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  const dec = Buffer.concat([decipher.update(Buffer.from(ctHex, 'hex')), decipher.final()])
  return JSON.parse(dec.toString('utf8'))
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

const { rows: user } = await client.query(`SELECT id, username, email, user_uid, is_premium, plan_type FROM users WHERE username='hentaiikidd'`)
console.log('=== USER hentaiikidd ===')
console.log(JSON.stringify(user[0], null, 2))

const { rows: profCount } = await client.query(`SELECT COUNT(*)::int AS c FROM profiles WHERE user_uid=$1`, [user[0].user_uid])
console.log(`\nTotal profiles: ${profCount[0].c}`)

const { rows: profs } = await client.query(
  `SELECT id, profile_uid, name, gender, data, created_at FROM profiles WHERE user_uid=$1 ORDER BY id ASC LIMIT 5`,
  [user[0].user_uid]
)

console.log('\n=== FIRST 5 PROFILES (decrypted) ===')
for (const p of profs) {
  console.log('\n---')
  console.log(`id: ${p.id} | profile_uid: ${p.profile_uid}`)
  console.log(`name (plaintext col): ${p.name}`)
  console.log(`gender: ${p.gender}`)
  console.log(`created_at: ${p.created_at}`)
  try {
    const decrypted = decrypt(p.data)
    console.log(`data (decrypted):`)
    console.log(JSON.stringify(decrypted, null, 2))
  } catch (e) {
    console.log(`data (RAW, decrypt failed: ${e.message}):`)
    console.log(JSON.stringify(p.data, null, 2))
  }
}

await client.end()
console.log('\n=== DONE ===')
