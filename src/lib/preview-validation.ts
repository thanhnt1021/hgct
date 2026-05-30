/**
 * Strict input validation for preview endpoints (no-auth public surface).
 * Goal: bound prompt size + reject malformed payloads before they hit
 * OpenRouter / Puppeteer / SMTP.
 *
 * Used by:
 *   - /api/astrology/preview-stream
 *   - /api/astrology/preview
 *   - /api/astrology/preview-email (uuid + email only)
 */

export const MAX_BODY_BYTES = 4096

const MAX_NAME_LEN = 60
const MAX_TEN_LEN = 30
const MAX_ADDRESS_LEN = 500
const VALID_TZ = /^[A-Za-z_]+\/[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)?$/
const VALID_GENDER = new Set(['Male', 'Female', 'Other'])
const VALID_SERVICE = new Set(['career', 'love', 'synastry', 'transit'])

interface InputData {
  name: unknown
  ten?: unknown
  gender?: unknown
  dob?: { day?: unknown; month?: unknown; year?: unknown } | unknown
  tob?:
    | { hour?: unknown; minute?: unknown; unknown?: unknown }
    | unknown
  loc?:
    | {
        address?: unknown
        lat?: unknown
        lon?: unknown
        tz?: unknown
      }
    | unknown
}

/** Returns null on success, error code string otherwise. */
export function validateInputData(d: unknown): string | null {
  if (!d || typeof d !== 'object') return 'inputData-missing'
  const x = d as InputData

  if (typeof x.name !== 'string' || x.name.length === 0 || x.name.length > MAX_NAME_LEN)
    return 'name-invalid'
  if (
    x.ten !== undefined &&
    x.ten !== null &&
    (typeof x.ten !== 'string' || (x.ten as string).length > MAX_TEN_LEN)
  )
    return 'ten-invalid'
  if (
    x.gender !== undefined &&
    x.gender !== null &&
    !VALID_GENDER.has(x.gender as string)
  )
    return 'gender-invalid'

  if (!x.dob || typeof x.dob !== 'object') return 'dob-missing'
  const dob = x.dob as { day: unknown; month: unknown; year: unknown }
  if (!Number.isInteger(dob.day) || (dob.day as number) < 1 || (dob.day as number) > 31)
    return 'dob.day-invalid'
  if (!Number.isInteger(dob.month) || (dob.month as number) < 1 || (dob.month as number) > 12)
    return 'dob.month-invalid'
  if (
    !Number.isInteger(dob.year) ||
    (dob.year as number) < 1900 ||
    (dob.year as number) > 2200
  )
    return 'dob.year-invalid'

  if (!x.tob || typeof x.tob !== 'object') return 'tob-missing'
  const tob = x.tob as { hour: unknown; minute: unknown; unknown?: boolean }
  if (!tob.unknown) {
    if (
      !Number.isInteger(tob.hour) ||
      (tob.hour as number) < 0 ||
      (tob.hour as number) > 23
    )
      return 'tob.hour-invalid'
    if (
      !Number.isInteger(tob.minute) ||
      (tob.minute as number) < 0 ||
      (tob.minute as number) > 59
    )
      return 'tob.minute-invalid'
  }

  if (!x.loc || typeof x.loc !== 'object') return 'loc-missing'
  const loc = x.loc as {
    address: unknown
    lat: unknown
    lon: unknown
    tz: unknown
  }
  if (
    typeof loc.lat !== 'number' ||
    !Number.isFinite(loc.lat) ||
    loc.lat < -90 ||
    loc.lat > 90
  )
    return 'loc.lat-invalid'
  if (
    typeof loc.lon !== 'number' ||
    !Number.isFinite(loc.lon) ||
    loc.lon < -180 ||
    loc.lon > 180
  )
    return 'loc.lon-invalid'
  if (typeof loc.tz !== 'string' || !VALID_TZ.test(loc.tz)) return 'loc.tz-invalid'
  if (typeof loc.address !== 'string' || loc.address.length > MAX_ADDRESS_LEN)
    return 'loc.address-invalid'

  return null
}

export function isValidService(s: unknown): s is 'career' | 'love' | 'synastry' | 'transit' {
  return typeof s === 'string' && VALID_SERVICE.has(s)
}

/** ISO date string YYYY-MM-DD, length capped */
export function isValidDateString(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
}
