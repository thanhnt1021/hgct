import { notFound } from 'next/navigation'
import { getJobFromDb } from '@/lib/jobs'
import prisma from '@/lib/db'
import ReportViewer from './ReportViewer'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

async function getReportData(id: string) {
  const job = await getJobFromDb(id)
  if (!job || job.status !== 'done' || !job.result?.pdfUrl) return null
  // Fetch name + service from DB (not in Job interface)
  const dbJob = await prisma.job.findUnique({
    where: { id },
    select: { name: true, service: true, createdAt: true },
  })
  return {
    jobId: id,
    pdfUrl: job.result.pdfUrl,
    pdfFilename: job.result.pdfFilename || `bao-cao-${dbJob?.service || 'chiem-tinh'}.pdf`,
    name: dbJob?.name || 'Báo cáo chiêm tinh',
    service: dbJob?.service || 'career',
    createdAt: dbJob?.createdAt?.toISOString() || new Date().toISOString(),
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const data = await getReportData(id)
  if (!data) return { title: 'Báo cáo chiêm tinh | Hạt Giống Chiêm Tinh' }

  const SERVICE_LABELS: Record<string, string> = {
    career: 'Sự Nghiệp', love: 'Tình Yêu', synastry: 'Cặp Đôi', transit: 'Vận Hạn',
  }
  const label = SERVICE_LABELS[data.service] || data.service
  return {
    title: `Báo cáo ${label} - ${data.name} | Hạt Giống Chiêm Tinh`,
    description: `Xem báo cáo chiêm tinh ${label} của ${data.name} được tạo bởi Hạt Giống Chiêm Tinh.`,
    openGraph: {
      title: `Báo cáo ${label} - ${data.name}`,
      description: `Báo cáo chiêm tinh ${label} của ${data.name}`,
      siteName: 'Hạt Giống Chiêm Tinh',
    },
  }
}

export default async function ReportPage({ params }: Props) {
  const { id } = await params
  // Basic UUID validation
  if (!/^[a-f0-9-]{36}$/.test(id)) notFound()

  const data = await getReportData(id)
  if (!data) notFound()

  return <ReportViewer {...data} />
}
