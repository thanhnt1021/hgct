// ─── Profile & User ───────────────────────────────────────────────

export interface BirthDate {
  day: number
  month: number
  year: number
}

export interface BirthTime {
  hour: number
  minute: number
}

export interface BirthLocation {
  lat: number
  lon: number
  tz: string
  address: string
}

export interface ProfileData {
  id?: number
  userId?: string
  name: string
  gender: 'Male' | 'Female'
  email?: string
  dob: BirthDate
  tob: BirthTime
  loc: BirthLocation
  tzOffset?: number | null
}

// ─── Astrology Core ──────────────────────────────────────────────

export interface PlanetPosition {
  lon: number
  lat?: number
  speed?: number
}

export interface ChartData {
  jd: number
  cusps: number[]
  angles: { Asc: number; MC: number }
  planets: Record<string, PlanetPosition>
  meta: { lat: number; lon: number; tz: string }
  info: {
    local_time: string
    ut_time: string
    lst: string
    lat_lon: string
    house_sys: string
  }
}

export interface AspectResult {
  aspect: string
  name_vn: string
  orb: number
  orb_round: number
  type: 'Hard' | 'Soft' | 'Minor'
  symbol: string
}

// ─── Services ────────────────────────────────────────────────────

export type ServiceType = 'career' | 'love' | 'synastry' | 'transit'

export interface ServiceInfo {
  type: ServiceType
  name: string
  description: string
  route: string
}

// ─── Orders ──────────────────────────────────────────────────────

export interface OrderData {
  service: ServiceType
  profileA: ProfileData
  profileB?: ProfileData // for synastry
  email: string
  startDate?: string // for transit
  endDate?: string   // for transit
}
