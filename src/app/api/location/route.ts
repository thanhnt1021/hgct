import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  const country = searchParams.get('country') || 'vn'

  if (!q) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 })
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=${country}&format=json&limit=5`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'HatGiongChiemTinh/1.0' },
    })
    const data = await res.json()

    const results = data.map((item: Record<string, string>) => ({
      name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    }))

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ error: 'Location search failed' }, { status: 500 })
  }
}
