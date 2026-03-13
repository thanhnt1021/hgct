import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

function getKey(): Buffer | null {
  const hex = process.env.PROFILE_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) return null
  return Buffer.from(hex, 'hex')
}

export function encryptProfileData(data: unknown): unknown {
  const key = getKey()
  if (!key) return data

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const json = JSON.stringify(data)
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return { _enc: `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}` }
}

export function decryptProfileData(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data
  const enc = (data as Record<string, unknown>)._enc
  if (typeof enc !== 'string') return data // not encrypted

  const key = getKey()
  if (!key) return data // key not configured

  try {
    const [ivHex, ctHex, tagHex] = enc.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const ciphertext = Buffer.from(ctHex, 'hex')
    const authTag = Buffer.from(tagHex, 'hex')

    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return JSON.parse(decrypted.toString('utf8'))
  } catch {
    return data // decryption failed — return raw
  }
}
