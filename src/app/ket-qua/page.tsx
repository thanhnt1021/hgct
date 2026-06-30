'use client'

// /ket-qua (không id) → điều hướng tới lá số mới nhất trong cache, hoặc về form nếu chưa có.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { listCharts } from '@/lib/chartStore'

export default function KetQuaIndex() {
  const router = useRouter()
  useEffect(() => {
    const charts = listCharts()
    if (charts.length) router.replace(`/ket-qua/${charts[0].id}`)
    else router.replace('/#lap-la-so')
  }, [router])
  return <div style={{ minHeight: '100vh', background: '#edd5b1' }} />
}
