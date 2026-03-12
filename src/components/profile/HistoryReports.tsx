'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { RefreshCw, Download, FileText, Share2 } from 'lucide-react'

interface HistoryEntry {
  jobId: string
  service: string
  name: string
  email: string
  createdAt: string
}

interface JobStatus {
  status: 'processing' | 'done' | 'error'
  progress: number
  label: string
  result?: { pdfUrl?: string; pdfFilename?: string; emailSent?: boolean }
  error?: string
}

const SERVICE_LABELS: Record<string, string> = {
  career: 'Sự nghiệp',
  love: 'Tình yêu',
  synastry: 'Synastry',
  transit: 'Vận hạn',
}

const SERVICE_COLORS: Record<string, string> = {
  career: '#3b82f6',
  love: '#ec4899',
  synastry: '#8b5cf6',
  transit: '#f59e0b',
}

type FilterType = 'all' | 'career' | 'love' | 'synastry' | 'transit'
type FilterStatus = 'all' | 'done' | 'processing' | 'error'

const PAGE_SIZE = 10

export default function HistoryReports() {
  const { user } = useAuth()
  const router = useRouter()
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [statuses, setStatuses] = useState<Record<string, JobStatus>>({})
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({})
  const [sharing, setSharing] = useState<Record<string, boolean>>({})
  const [shareMsg, setShareMsg] = useState<Record<string, string>>({})
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)

  // Load history from DB
  useEffect(() => {
    if (!user) return
    setLoading(true)
    fetch('/api/jobs/history', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : [])
      .then((jobs: Array<{
        id: string
        service: string | null
        name: string | null
        email: string | null
        createdAt: string
        status: string
        progress: number
        label: string
        result: unknown
        error: string | null
      }>) => {
        setEntries(jobs.map(j => ({
          jobId: j.id,
          service: j.service || 'career',
          name: j.name || '',
          email: j.email || '',
          createdAt: j.createdAt,
        })))
        const initStatuses: Record<string, JobStatus> = {}
        for (const j of jobs) {
          initStatuses[j.id] = {
            status: j.status as JobStatus['status'],
            progress: j.progress,
            label: j.label,
            result: j.result as JobStatus['result'],
            error: j.error || undefined,
          }
        }
        setStatuses(initStatuses)
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [user])

  const fetchStatus = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/job/${jobId}`)
      if (res.ok) {
        const data = await res.json()
        setStatuses(prev => ({ ...prev, [jobId]: data }))
      }
    } catch { /* ignore */ }
  }, [])

  // Auto-refresh processing jobs every 30s
  useEffect(() => {
    const processingIds = entries
      .filter(e => !statuses[e.jobId] || statuses[e.jobId].status === 'processing')
      .map(e => e.jobId)
    if (processingIds.length === 0) return
    const interval = setInterval(() => {
      processingIds.forEach(id => fetchStatus(id))
    }, 30000)
    return () => clearInterval(interval)
  }, [entries, statuses, fetchStatus])

  const manualRefresh = async (jobId: string) => {
    setRefreshing(prev => ({ ...prev, [jobId]: true }))
    await fetchStatus(jobId)
    setRefreshing(prev => ({ ...prev, [jobId]: false }))
  }

  const handleDownload = (entry: HistoryEntry) => {
    const st = statuses[entry.jobId]
    if (!st?.result?.pdfUrl) return
    const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    if (isMobile) {
      router.push(`/report/${entry.jobId}`)
      return
    }
    const a = document.createElement('a')
    a.href = st.result.pdfUrl
    a.download = st.result.pdfFilename || `bao-cao-${entry.service}.pdf`
    a.click()
  }

  const handleShare = async (entry: HistoryEntry) => {
    const st = statuses[entry.jobId]
    if (!st?.result?.pdfUrl) return
    const filename = st.result.pdfFilename || `bao-cao-${entry.service}.pdf`
    const reportUrl = `${window.location.origin}/report/${entry.jobId}`

    setSharing(prev => ({ ...prev, [entry.jobId]: true }))
    setShareMsg(prev => ({ ...prev, [entry.jobId]: '' }))

    try {
      if (navigator.share) {
        let shareData: ShareData = {
          title: `Báo cáo chiêm tinh - ${entry.name}`,
          text: `Xem báo cáo chiêm tinh ${SERVICE_LABELS[entry.service] || entry.service} của ${entry.name}`,
          url: reportUrl,
        }
        // Try to attach actual PDF file if browser supports it
        if (typeof navigator.canShare === 'function') {
          try {
            const res = await fetch(st.result.pdfUrl)
            const blob = await res.blob()
            const file = new File([blob], filename, { type: 'application/pdf' })
            if (navigator.canShare({ files: [file] })) {
              shareData = { title: shareData.title, text: shareData.text, files: [file] }
            }
          } catch { /* fallback to URL share */ }
        }
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(reportUrl)
        setShareMsg(prev => ({ ...prev, [entry.jobId]: 'Đã copy link!' }))
        setTimeout(() => setShareMsg(prev => ({ ...prev, [entry.jobId]: '' })), 2500)
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setShareMsg(prev => ({ ...prev, [entry.jobId]: 'Không thể chia sẻ' }))
        setTimeout(() => setShareMsg(prev => ({ ...prev, [entry.jobId]: '' })), 2500)
      }
    } finally {
      setSharing(prev => ({ ...prev, [entry.jobId]: false }))
    }
  }

  // Filter and paginate
  const filtered = entries.filter(e => {
    if (filterType !== 'all' && e.service !== filterType) return false
    const st = statuses[e.jobId]
    if (filterStatus !== 'all') {
      const s = st?.status || 'processing'
      if (s !== filterStatus) return false
    }
    return true
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const StatusBadge = ({ jobId }: { jobId: string }) => {
    const st = statuses[jobId]
    if (!st) return (
      <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', fontFamily: 'var(--font-vietnam)' }}>
        <span className="inline-block animate-pulse">Đang xử lý</span>
      </span>
    )
    if (st.status === 'done') return (
      <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', fontFamily: 'var(--font-vietnam)' }}>
        Hoàn thành
      </span>
    )
    if (st.status === 'error') return (
      <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontFamily: 'var(--font-vietnam)' }}>
        Lỗi
      </span>
    )
    return (
      <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', fontFamily: 'var(--font-vietnam)' }}>
        <span className="inline-block animate-pulse">Đang xử lý {st.progress > 0 ? `${st.progress}%` : ''}</span>
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)' }}>
        <RefreshCw size={18} className="animate-spin mr-2" />
        Đang tải lịch sử...
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-2" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)' }}>
        Lịch sử & Báo cáo
      </h2>
      <p className="text-sm mb-6" style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)' }}>
        Tất cả báo cáo đã tạo trên tài khoản của bạn.
      </p>

      {/* Filters — horizontal scroll on mobile */}
      {entries.length > 0 && (
        <div className="mb-5 space-y-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {(['all','career','love','synastry','transit'] as FilterType[]).map(t => (
              <button key={t} onClick={() => { setFilterType(t); setPage(0) }}
                className="px-3 rounded-lg text-xs font-medium flex-shrink-0"
                style={{
                  background: filterType === t ? (t === 'all' ? 'rgba(201,168,76,0.15)' : `${SERVICE_COLORS[t]}22`) : 'rgba(255,255,255,0.04)',
                  color: filterType === t ? (t === 'all' ? '#d9ab55' : SERVICE_COLORS[t]) : '#6b7280',
                  border: `1px solid ${filterType === t ? (t === 'all' ? 'rgba(201,168,76,0.3)' : `${SERVICE_COLORS[t]}55`) : 'rgba(255,255,255,0.06)'}`,
                  fontFamily: 'var(--font-vietnam)',
                  minHeight: 36,
                }}>
                {t === 'all' ? 'Tất cả' : SERVICE_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {(['all','done','processing','error'] as FilterStatus[]).map(s => (
              <button key={s} onClick={() => { setFilterStatus(s); setPage(0) }}
                className="px-3 rounded-lg text-xs flex-shrink-0"
                style={{
                  background: filterStatus === s ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                  color: filterStatus === s ? '#f4efe6' : '#6b7280',
                  border: `1px solid ${filterStatus === s ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
                  fontFamily: 'var(--font-vietnam)',
                  minHeight: 36,
                  whiteSpace: 'nowrap',
                }}>
                {s === 'all' ? 'Mọi trạng thái' : s === 'done' ? 'Hoàn thành' : s === 'processing' ? 'Đang xử lý' : 'Lỗi'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty */}
      {entries.length === 0 && (
        <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(26,21,53,0.6)', border: '1px dashed rgba(201,168,76,0.15)' }}>
          <FileText size={32} style={{ color: '#4a4560', margin: '0 auto 1rem' }} />
          <p className="mb-1" style={{ color: '#94a3b8', fontFamily: 'var(--font-vietnam)' }}>
            Bạn chưa có báo cáo nào.
          </p>
          <p className="text-sm mb-5" style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)' }}>
            Hãy đặt báo cáo chiêm tinh đầu tiên!
          </p>
          <button onClick={() => router.push('/services')}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: '#c9a84c', color: '#0a0a1a', fontFamily: 'var(--font-vietnam)' }}>
            Xem dịch vụ →
          </button>
        </div>
      )}

      {/* No results after filter */}
      {entries.length > 0 && filtered.length === 0 && (
        <div className="text-center py-8" style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)' }}>
          Không có báo cáo nào phù hợp với bộ lọc.
        </div>
      )}

      {/* List */}
      {paginated.length > 0 && (
        <div className="space-y-3">
          {paginated.map(entry => {
            const st = statuses[entry.jobId]
            const isDone = st?.status === 'done'
            const isError = st?.status === 'error'
            const isProcessing = !st || st.status === 'processing'
            return (
              <div key={entry.jobId} className="rounded-xl px-4 py-3"
                style={{ background: 'rgba(26,21,53,0.6)', border: '1px solid rgba(201,168,76,0.08)' }}>
                {/* Row 1: service badge + name */}
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-xs flex-shrink-0"
                    style={{ background: `${SERVICE_COLORS[entry.service] || '#6b7280'}22`, color: SERVICE_COLORS[entry.service] || '#6b7280', fontFamily: 'var(--font-vietnam)' }}>
                    {SERVICE_LABELS[entry.service] || entry.service}
                  </span>
                  <p className="font-semibold truncate flex-1 min-w-0"
                    style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem' }}>
                    {entry.name}
                  </p>
                </div>
                {/* Row 2: date + email */}
                <p className="truncate mb-2" style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem' }}>
                  {new Date(entry.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · {entry.email}
                </p>
                {/* Progress bar for processing jobs */}
                {isProcessing && (
                  <div className="mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.7rem' }}>
                        {st?.label || 'Đang xử lý...'}
                      </span>
                      <span style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontWeight: 700, fontSize: '0.75rem' }}>
                        {st?.progress ?? 0}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(200,148,63,0.08)' }}>
                      <div className="h-full rounded-full" style={{
                        width: `${st?.progress ?? 0}%`,
                        background: 'linear-gradient(90deg, #c8943f, #f0cc78)',
                        boxShadow: '0 0 8px rgba(200,148,63,0.4)',
                        transition: 'width 700ms cubic-bezier(0.4, 0, 0.2, 1)',
                      }} />
                    </div>
                  </div>
                )}
                {isError && st.error && (
                  <p className="text-xs mb-2" style={{ color: '#ef4444', fontFamily: 'var(--font-vietnam)' }}>{st.error.slice(0, 120)}</p>
                )}
                {/* Row 3: status + actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {!isProcessing && <StatusBadge jobId={entry.jobId} />}
                  <button
                    onClick={() => manualRefresh(entry.jobId)}
                    disabled={refreshing[entry.jobId]}
                    style={{ color: '#6b7280', background: 'rgba(255,255,255,0.04)', padding: '0.375rem', borderRadius: '0.5rem', minWidth: 32, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Làm mới trạng thái"
                  >
                    <RefreshCw size={13} className={refreshing[entry.jobId] ? 'animate-spin' : ''} />
                  </button>
                  <button
                    onClick={() => handleDownload(entry)}
                    disabled={!isDone || !st?.result?.pdfUrl}
                    className="flex items-center gap-1.5 px-3 rounded-lg text-xs font-medium"
                    style={{
                      background: isDone && st?.result?.pdfUrl ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.03)',
                      color: isDone && st?.result?.pdfUrl ? '#d9ab55' : '#4a4560',
                      border: `1px solid ${isDone && st?.result?.pdfUrl ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.05)'}`,
                      fontFamily: 'var(--font-vietnam)',
                      cursor: isDone && st?.result?.pdfUrl ? 'pointer' : 'not-allowed',
                      minHeight: 36,
                    }}
                    title={isDone ? 'Xem PDF' : 'Báo cáo chưa hoàn thành'}
                  >
                    <Download size={12} /> Tải PDF
                  </button>
                  {isDone && st?.result?.pdfUrl && (
                    <div className="relative">
                      <button
                        onClick={() => handleShare(entry)}
                        disabled={sharing[entry.jobId]}
                        className="flex items-center gap-1.5 px-3 rounded-lg text-xs font-medium"
                        style={{
                          background: 'rgba(61,43,94,0.4)',
                          color: '#a78bfa',
                          border: '1px solid rgba(167,139,250,0.2)',
                          fontFamily: 'var(--font-vietnam)',
                          cursor: 'pointer',
                          minHeight: 36,
                          opacity: sharing[entry.jobId] ? 0.6 : 1,
                        }}
                        title="Chia sẻ PDF"
                      >
                        <Share2 size={12} />
                        {sharing[entry.jobId] ? 'Đang tải...' : 'Chia sẻ'}
                      </button>
                      {shareMsg[entry.jobId] && (
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs px-2 py-0.5 rounded"
                          style={{ background: 'rgba(26,21,53,0.95)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)', fontFamily: 'var(--font-vietnam)' }}>
                          {shareMsg[entry.jobId]}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5 gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ color: page === 0 ? '#4a4560' : '#d9ab55', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.1)', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', minHeight: 44, display: 'flex', alignItems: 'center' }}>
            ← Trước
          </button>
          <span style={{ color: '#6b7280', fontSize: '0.82rem', fontFamily: 'var(--font-vietnam)' }}>
            {page + 1} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            style={{ color: page >= totalPages - 1 ? '#4a4560' : '#d9ab55', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.1)', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', minHeight: 44, display: 'flex', alignItems: 'center' }}>
            Sau →
          </button>
        </div>
      )}
    </div>
  )
}
