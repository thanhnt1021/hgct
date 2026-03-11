'use client'

// VISUAL ONLY — LocationPicker restyled to Celestial Sanctum design
// All search logic, API calls, and data flow untouched

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search } from 'lucide-react'

interface LocationResult {
  display_name: string
  short_name: string
  lat: number
  lon: number
  tz: string
  country_code: string
}

interface LocationValue {
  address: string
  lat: number
  lon: number
  tz: string
}

interface LocationPickerProps {
  value: LocationValue
  onChange: (v: LocationValue) => void
  label?: string
}

export default function LocationPicker({ value, onChange, label = 'Nơi sinh' }: LocationPickerProps) {
  const [query, setQuery] = useState(value.address || '')
  const [results, setResults] = useState<LocationResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [cc, setCc] = useState('vn')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value.address || '')
  }, [value.address])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = useCallback(async (q: string, country: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const params = new URLSearchParams({ q, cc: country })
      const res = await fetch(`/api/location/search?${params}`)
      if (res.ok) { const data = await res.json(); setResults(data); setOpen(true) }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  const handleInput = (v: string) => {
    setQuery(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(v, cc), 600)
  }

  const select = (r: LocationResult) => {
    onChange({ address: r.short_name || r.display_name.split(',')[0], lat: r.lat, lon: r.lon, tz: r.tz })
    setQuery(r.short_name || r.display_name.split(',')[0])
    setOpen(false)
    setResults([])
  }

  const COUNTRIES = [
    { code: 'vn', label: 'Việt Nam' },
    { code: 'us', label: 'Mỹ' },
    { code: 'gb', label: 'Anh' },
    { code: 'au', label: 'Úc' },
    { code: 'ca', label: 'Canada' },
    { code: 'fr', label: 'Pháp' },
    { code: 'de', label: 'Đức' },
    { code: 'jp', label: 'Nhật Bản' },
    { code: 'kr', label: 'Hàn Quốc' },
    { code: 'sg', label: 'Singapore' },
    { code: 'th', label: 'Thái Lan' },
    { code: '', label: 'Toàn cầu' },
  ]

  const inputStyle = {
    height: '2rem',
    padding: '0 0.5rem',
    fontSize: '0.75rem',
    fontFamily: 'var(--font-vietnam)',
  } as React.CSSProperties

  return (
    <div ref={containerRef}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            color: '#8a8399',
            fontFamily: 'var(--font-vietnam)',
            fontSize: '0.75rem',
            fontWeight: 500,
            letterSpacing: '0.06em',
          }}
        >
          {label}
        </label>
      )}

      {/* Single row: grid 12 cols — [Country col-3] [Address col-7] [Search col-2] */}
      <div className="grid grid-cols-12 gap-2">
        {/* Country select */}
        <select
          value={cc}
          onChange={e => { setCc(e.target.value); if (query.length >= 2) search(query, e.target.value) }}
          className="col-span-3"
          style={{ ...inputStyle, paddingLeft: '0.4rem', paddingRight: '0.15rem' }}
        >
          {COUNTRIES.map(c => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>

        {/* Address text input — wrapped in relative div so dropdown aligns to it only */}
        <div className="col-span-7 relative">
          <input
            type="text"
            value={query}
            onChange={e => handleInput(e.target.value)}
            placeholder="Nhập tên thành phố..."
            className="w-full"
            style={{ ...inputStyle, minWidth: 0 }}
          />

          {/* Results dropdown — only as wide as Address input */}
          {open && results.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '4px',
                zIndex: 100,
                background: 'rgba(11,11,31,0.98)',
                border: '1px solid rgba(200,148,63,0.2)',
                borderRadius: '0.75rem',
                boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
                maxHeight: '220px',
                overflowY: 'auto',
                backdropFilter: 'blur(20px)',
              }}
            >
              {results.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => select(r)}
                  className="w-full text-left px-4 py-3 text-sm transition-all"
                  style={{
                    color: '#f4efe6',
                    borderBottom: i < results.length - 1 ? '1px solid rgba(200,148,63,0.07)' : 'none',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(38,28,86,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="font-medium" style={{ fontFamily: 'var(--font-vietnam)' }}>
                    {r.short_name}
                  </span>
                  <span
                    className="block truncate"
                    style={{ color: '#4a4560', fontSize: '0.75rem', fontFamily: 'var(--font-vietnam)', marginTop: '0.1rem' }}
                  >
                    {r.display_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search button */}
        <button
          type="button"
          onClick={() => search(query, cc)}
          disabled={loading}
          className="col-span-2 h-8 flex items-center justify-center gap-1 flex-shrink-0"
          style={{
            background: 'rgba(200,148,63,0.1)',
            border: '1px solid rgba(200,148,63,0.25)',
            borderRadius: '0.5rem',
            color: '#d9ab55',
            cursor: loading ? 'default' : 'pointer',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-vietnam)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = 'rgba(200,148,63,0.2)' }}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(200,148,63,0.1)'}
        >
          {loading ? (
            <div className="w-3 h-3 border-2 rounded-full animate-spin"
              style={{ borderColor: 'rgba(200,148,63,0.25)', borderTopColor: '#d9ab55' }} />
          ) : (
            <>
              <Search size={12} />
              <span>Tìm</span>
            </>
          )}
        </button>
      </div>

      {/* Selected location info */}
      {value.lat !== 0 && (
        <p
          className="mt-1 text-xs"
          style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)' }}
        >
          ✦ {value.address} · {value.lat.toFixed(4)}, {value.lon.toFixed(4)} · {value.tz}
        </p>
      )}
    </div>
  )
}
