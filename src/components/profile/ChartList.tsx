'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Search, ArrowUpDown } from 'lucide-react'
import ProfileFormModal, { ProfileFormData, EMPTY_PROFILE_FORM } from './ProfileFormModal'

interface Profile {
  id: string
  ho: string; dem: string; ten: string; name: string; gender: string
  dob: { day: number; month: number; year: number }
  tob: { hour: number; minute: number; unknown: boolean }
  loc: { address: string; lat: number; lon: number; tz: string }
  note: string
  createdAt: string
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

type SortKey = 'name_asc' | 'name_desc' | 'date_newest' | 'date_oldest'

const SORT_LABELS: Record<SortKey, string> = {
  name_asc: 'Tên A→Z',
  name_desc: 'Tên Z→A',
  date_newest: 'Mới nhất',
  date_oldest: 'Cũ nhất',
}

export default function ChartList() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [pendingPageSize, setPendingPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('date_newest')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<ProfileFormData | null>(null)
  const [saving, setSaving] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [mainProfileId, setMainProfileId] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfiles = () =>
      fetch('/api/profiles', { cache: 'no-store' })
        .then(r => r.json())
        .then(data => {
          if (data.profiles) {
            setProfiles(data.profiles.map((p: any) => ({
              id: String(p.id),
              ho: p.data?.ho || '', dem: p.data?.dem || '',
              ten: p.data?.ten || p.name, name: p.name,
              gender: p.gender || 'Female',
              dob: p.data?.dob || { day: 0, month: 0, year: 0 },
              tob: p.data?.tob || { hour: -1, minute: -1, unknown: false },
              loc: p.data?.loc || { address: 'Hà Nội', lat: 21.02, lon: 105.84, tz: 'Asia/Ho_Chi_Minh' },
              note: p.data?.note || '',
              createdAt: p.createdAt || '',
            })))
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))

    const fetchMainId = () =>
      fetch('/api/user/account', { cache: 'no-store' })
        .then(r => r.json())
        .then(data => {
          setMainProfileId(data.mainChartData?._profileId ? String(data.mainChartData._profileId) : null)
        })
        .catch(() => {})

    const loadData = () => { fetchProfiles(); fetchMainId() }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.mainProfileId !== undefined) {
        setMainProfileId(detail.mainProfileId ? String(detail.mainProfileId) : null)
      }
      fetchProfiles()
    }

    loadData()
    window.addEventListener('profiles:refresh', handler)
    return () => window.removeEventListener('profiles:refresh', handler)
  }, [])

  const openNew = () => { setEditingId(null); setEditingData(null); setModalOpen(true) }

  const openEdit = (p: Profile) => {
    setEditingId(p.id)
    setEditingData({ ho: p.ho, dem: p.dem, ten: p.ten, gender: p.gender, dob: p.dob, tob: p.tob, loc: p.loc, note: p.note })
    setModalOpen(true)
  }

  const handleSave = async (formData: ProfileFormData, _saveProfile?: boolean) => {
    setSaving(true)
    const name = [formData.ho, formData.dem, formData.ten].filter(Boolean).join(' ')
    const body = { name, gender: formData.gender, data: { ...formData, ho: formData.ho, dem: formData.dem, ten: formData.ten, note: formData.note || '' } }

    try {
      if (editingId) {
        const res = await fetch('/api/profiles', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...body }),
        })
        if (res.ok) {
          setProfiles(prev => prev.map(p => p.id === editingId ? { ...p, ...formData, name, note: formData.note || '' } : p))
          setModalOpen(false)
        }
      } else {
        const res = await fetch('/api/profiles', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (res.ok && data.profile) {
          const p = data.profile
          setProfiles(prev => [{
            id: String(p.id), ho: p.data?.ho || '', dem: p.data?.dem || '',
            ten: p.data?.ten || p.name, name: p.name, gender: p.gender || 'Female',
            dob: p.data?.dob || formData.dob, tob: p.data?.tob || formData.tob,
            loc: p.data?.loc || formData.loc, note: p.data?.note || '',
            createdAt: p.createdAt || '',
          }, ...prev])
          setModalOpen(false)
        }
      }
    } catch { /* ignore */ }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    try { await fetch(`/api/profiles?id=${id}`, { method: 'DELETE' }) } catch { /* ignore */ }
    setProfiles(prev => prev.filter(p => p.id !== id))
    setDeleteConfirm(null)
  }

  const applyPageSize = () => { setPageSize(pendingPageSize); setPage(0) }

  const filtered = useMemo(() => {
    let list = [...profiles]
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q))
    }
    switch (sort) {
      case 'name_asc':    list.sort((a, b) => a.name.localeCompare(b.name, 'vi')); break
      case 'name_desc':   list.sort((a, b) => b.name.localeCompare(a.name, 'vi')); break
      case 'date_newest': list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break
      case 'date_oldest': list.sort((a, b) => a.createdAt.localeCompare(b.createdAt)); break
    }
    // Pin "Bạn" lên đầu luôn, bất kể sort
    if (mainProfileId) {
      const idx = list.findIndex(p => p.id === mainProfileId)
      if (idx > 0) list = [list[idx], ...list.slice(0, idx), ...list.slice(idx + 1)]
    }
    return list
  }, [profiles, search, sort, mainProfileId])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize)

  const formatMeta = (p: Profile) => {
    const dateStr = p.dob.day > 0 ? `${p.dob.day}/${p.dob.month}/${p.dob.year}` : 'Chưa có ngày'
    const timeStr = p.tob.unknown ? 'Không rõ giờ' : p.tob.hour >= 0 ? `${String(p.tob.hour).padStart(2,'0')}:${String(p.tob.minute).padStart(2,'0')}` : 'Chưa có giờ'
    return `${dateStr} · ${timeStr} · ${p.loc.address}`
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>Bản đồ sao</h2>
          {profiles.length > 0 && (
            <p className="text-sm mt-0.5" style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)' }}>
              {profiles.length} hồ sơ{search && filtered.length !== profiles.length ? ` · ${filtered.length} kết quả` : ''}
            </p>
          )}
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 rounded-xl font-semibold text-sm flex-shrink-0"
          style={{ background: '#c9a84c', color: '#0a0a1a', fontFamily: 'var(--font-vietnam)', minHeight: 44 }}>
          <Plus size={15} /> Thêm hồ sơ
        </button>
      </div>

      {/* Toolbar */}
      {profiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-0 rounded-xl px-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.1)', minHeight: 40 }}>
            <Search size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              placeholder="Tìm theo tên..."
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', width: '100%', padding: '0.5rem 0', minWidth: 0 }}
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(0) }}
                style={{ color: '#6b7280', flexShrink: 0, lineHeight: 1 }}>✕</button>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5 rounded-xl px-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.1)', minHeight: 40 }}>
            <ArrowUpDown size={13} style={{ color: '#6b7280', flexShrink: 0 }} />
            <select
              value={sort}
              onChange={e => { setSort(e.target.value as SortKey); setPage(0) }}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem', padding: 0, cursor: 'pointer' }}
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map(k => (
                <option key={k} value={k} style={{ background: '#0a0a1a', color: '#f4efe6' }}>{SORT_LABELS[k]}</option>
              ))}
            </select>
          </div>

          {/* Page size */}
          <div className="flex items-center gap-2 rounded-xl px-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.1)', minHeight: 40 }}>
            <span style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Hiện:</span>
            <select
              value={pendingPageSize}
              onChange={e => setPendingPageSize(+e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem', padding: 0, cursor: 'pointer' }}
            >
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n} style={{ background: '#0a0a1a', color: '#f4efe6' }}>{n}</option>)}
            </select>
            {pendingPageSize !== pageSize && (
              <button onClick={applyPageSize}
                className="px-2.5 py-0.5 rounded-lg text-xs font-semibold"
                style={{ background: '#c9a84c', color: '#0a0a1a', fontFamily: 'var(--font-vietnam)' }}>
                OK
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(201,168,76,0.2)', borderTopColor: '#c9a84c' }} />
        </div>
      )}

      {/* Empty */}
      {!loading && profiles.length === 0 && (
        <div className="text-center py-12 rounded-2xl" style={{ border: '1px dashed rgba(201,168,76,0.15)' }}>
          <p style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', marginBottom: '1rem' }}>Chưa có hồ sơ nào.</p>
          <button onClick={openNew} className="px-5 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: '#c9a84c', color: '#0a0a1a', fontFamily: 'var(--font-vietnam)' }}>
            + Tạo hồ sơ đầu tiên
          </button>
        </div>
      )}

      {/* No search results */}
      {!loading && profiles.length > 0 && filtered.length === 0 && (
        <div className="text-center py-8" style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)' }}>
          Không tìm thấy hồ sơ nào khớp với &quot;{search}&quot;
        </div>
      )}

      {/* Profile list */}
      {!loading && paginated.length > 0 && (
        <div className="space-y-2">
          {paginated.map(p => (
            <div key={p.id} className="rounded-xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.08)' }}>

              {/* Row 1: gender icon + name + badge */}
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(61,43,94,0.5)', fontSize: '0.8rem' }}>
                  {p.gender === 'Female' ? '♀' : p.gender === 'Male' ? '♂' : '⊕'}
                </div>
                <p className="font-semibold truncate flex-1 min-w-0"
                  style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem' }}>
                  {p.name}
                </p>
                {mainProfileId === p.id && (
                  <span style={{ color: '#d9ab55', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--font-vietnam)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    ✦ Bạn
                  </span>
                )}
              </div>

              {/* Row 1b: note / nickname — always rendered for consistent card height */}
              <p className="truncate"
                style={{ color: '#8b8fa8', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', fontStyle: 'italic', paddingLeft: '2.25rem', minHeight: '1.15em', marginBottom: '0.2rem' }}>
                {p.note || ''}
              </p>

              {/* Row 2: meta info */}
              <p className="truncate mb-2.5"
                style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', paddingLeft: '2.25rem' }}>
                {formatMeta(p)}
              </p>

              {/* Row 3: action buttons */}
              <div className="flex gap-1.5 flex-wrap" style={{ paddingLeft: '2.25rem' }}>
                <button
                  onClick={() => router.push(`/chart?id=${p.id}`)}
                  style={{ color: '#d9ab55', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', fontWeight: 600, padding: '0.375rem 0.625rem', borderRadius: '0.5rem', minHeight: 36 }}>
                  Bản đồ ✦
                </button>
                <button
                  onClick={() => {
                    sessionStorage.setItem('inputData', JSON.stringify({ name: p.name, gender: p.gender, dob: p.dob, tob: { hour: p.tob.unknown ? 12 : (p.tob.hour >= 0 ? p.tob.hour : 12), minute: p.tob.unknown ? 0 : (p.tob.minute >= 0 ? p.tob.minute : 0) }, loc: p.loc }))
                    router.push('/services')
                  }}
                  style={{ color: '#c9a84c', background: 'rgba(61,43,94,0.5)', border: '1px solid rgba(201,168,76,0.15)', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', padding: '0.375rem 0.625rem', borderRadius: '0.5rem', minHeight: 36 }}>
                  Dịch vụ
                </button>
                <button onClick={() => openEdit(p)}
                  title="Sửa"
                  style={{ color: '#c9a84c', background: 'rgba(201,168,76,0.08)', padding: '0.375rem 0.5rem', borderRadius: '0.5rem', minHeight: 36, minWidth: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={13} />
                </button>
                {deleteConfirm === p.id ? (
                  <>
                    <button onClick={() => handleDelete(p.id)}
                      style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', padding: '0.375rem 0.625rem', borderRadius: '0.5rem', minHeight: 36 }}>
                      Xác nhận
                    </button>
                    <button onClick={() => setDeleteConfirm(null)}
                      style={{ color: '#94a3b8', background: 'rgba(148,163,184,0.08)', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem', padding: '0.375rem 0.625rem', borderRadius: '0.5rem', minHeight: 36 }}>
                      Hủy
                    </button>
                  </>
                ) : (
                  <button onClick={() => setDeleteConfirm(p.id)}
                    title="Xóa"
                    style={{ color: '#6b7280', background: 'rgba(107,114,128,0.08)', padding: '0.375rem 0.5rem', borderRadius: '0.5rem', minHeight: 36, minWidth: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ color: page === 0 ? '#4a4560' : '#d9ab55', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.1)', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', minHeight: 44, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ChevronLeft size={14} /> Trước
          </button>
          <span style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem' }}>
            {page + 1} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            style={{ color: page >= totalPages - 1 ? '#4a4560' : '#d9ab55', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.1)', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', minHeight: 44, display: 'flex', alignItems: 'center', gap: 4 }}>
            Sau <ChevronRight size={14} />
          </button>
        </div>
      )}

      <ProfileFormModal
        open={modalOpen}
        title={editingId ? 'Chỉnh sửa hồ sơ' : 'Thêm hồ sơ mới'}
        initialData={editingData ?? EMPTY_PROFILE_FORM}
        saving={saving}
        onSave={handleSave}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}
