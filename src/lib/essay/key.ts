// Stable hash for caching essays per (user, profile, service).
// Includes profile data so editing profile produces a new essay.

import { createHash } from 'crypto'

export interface InputData {
  name: string
  ten?: string
  gender?: string
  dob: { day: number; month: number; year: number }
  tob: { hour: number; minute: number; unknown?: boolean }
  loc: { address: string; lat: number; lon: number; tz: string }
}

export function profileHash(input: InputData, inputB?: InputData): string {
  const norm = (i: InputData) => ({
    n: i.name,
    g: i.gender || '',
    d: `${i.dob.year}-${i.dob.month}-${i.dob.day}`,
    t: i.tob.unknown ? 'u' : `${i.tob.hour}:${i.tob.minute}`,
    l: `${i.loc.lat.toFixed(4)},${i.loc.lon.toFixed(4)},${i.loc.tz}`,
  })
  const payload = inputB ? [norm(input), norm(inputB)] : [norm(input)]
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16)
}

export function cacheKey(userUid: string, service: string, hash: string): string {
  return `${userUid}_${service}_${hash}`
}

export function unlockRefId(service: string, hash: string, sectionId: string): string {
  return `${service}:${hash}:${sectionId}`
}
