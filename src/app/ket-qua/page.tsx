'use client'

// /ket-qua (không id) → điều hướng tới lá số mới nhất trong cache, hoặc về form nếu chưa có.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { listCharts } from '@/lib/chartStore'

export default function KetQuaIndex() {
  const router = useRouter()
  useEffect(() => {
    // Chỉ trỏ tới lá số local thật (bỏ hồ sơ tài khoản id 'p_…' — chưa có trang kết quả riêng)
    const charts = listCharts().filter(c => !String(c.id).startsWith('p_'))
    if (charts.length) router.replace(`/ket-qua/${charts[0].id}`)
    else router.replace('/#lap-la-so')
  }, [router])
  return <div style={{ minHeight: '100vh', background: '#edd5b1' }} />
}
