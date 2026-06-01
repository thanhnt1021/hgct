// Filesystem cache for fully-generated essays. Keyed by user + service + profileHash.
// Re-visits within the cache window reuse the cached text — user doesn't pay
// the LLM cost twice and any already-unlocked sections render immediately.

import fs from 'fs'
import path from 'path'

const DIR = '/tmp/hgct-essays'

function ensureDir() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true })
}

export function readEssay(key: string): string | null {
  try {
    const p = path.join(DIR, `${key}.txt`)
    if (!fs.existsSync(p)) return null
    return fs.readFileSync(p, 'utf8')
  } catch {
    return null
  }
}

export function writeEssay(key: string, text: string): void {
  try {
    ensureDir()
    fs.writeFileSync(path.join(DIR, `${key}.txt`), text, 'utf8')
  } catch {
    // best-effort — caching is not critical
  }
}

export function hasEssay(key: string): boolean {
  try {
    return fs.existsSync(path.join(DIR, `${key}.txt`))
  } catch {
    return false
  }
}
