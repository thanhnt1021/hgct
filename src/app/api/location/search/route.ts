import { NextRequest, NextResponse } from 'next/server'
import { find as findTz } from 'geo-tz'

// Country code to default timezone overrides (where geo-tz may be inaccurate)
const COUNTRY_TZ_OVERRIDE: Record<string, string> = {
  vn: 'Asia/Ho_Chi_Minh',
  th: 'Asia/Bangkok',
  kh: 'Asia/Phnom_Penh',
  la: 'Asia/Vientiane',
  my: 'Asia/Kuala_Lumpur',
}

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
  address?: {
    city?: string
    town?: string
    village?: string
    county?: string
    state?: string
    country?: string
    country_code?: string
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const cc = searchParams.get('cc') || ''  // country code hint

  if (q.length < 2) return NextResponse.json([])

  try {
    const params = new URLSearchParams({
      q,
      format: 'json',
      addressdetails: '1',
      limit: '15',
    })
    if (cc && cc !== 'other') params.set('countrycodes', cc)

    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'HatGiongChiemTinh/1.0 (hatgiongchiemtinh.com)' },
      next: { revalidate: 300 },
    })

    if (!res.ok) return NextResponse.json([])
    const data: NominatimResult[] = await res.json()

    const results = data.map((item) => {
      const lat = parseFloat(item.lat)
      const lon = parseFloat(item.lon)
      const countryCode = item.address?.country_code?.toLowerCase() || ''

      // Get timezone: use override map first, then geo-tz
      let tz = COUNTRY_TZ_OVERRIDE[countryCode] || ''
      if (!tz) {
        const tzList = findTz(lat, lon)
        tz = tzList[0] || 'UTC'
      }

      // Build short name
      const a = item.address || {}
      const city = a.city || a.town || a.village || a.county || ''
      const state = a.state || ''
      const country = a.country || ''
      const parts = [city, state, country].filter(Boolean)
      const shortName = parts.slice(0, 2).join(', ')

      return {
        display_name: item.display_name,
        short_name: shortName || item.display_name.split(',')[0],
        lat,
        lon,
        tz,
        country_code: countryCode,
      }
    })

    return NextResponse.json(results)
  } catch (e) {
    console.error('[location/search]', e)
    return NextResponse.json([])
  }
}
