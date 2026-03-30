import { redirect } from 'next/navigation'
import { getCtvSession } from '@/lib/ctv/auth'
import { prisma } from '@/lib/db'
import DaisuDashboard from './DaisuDashboard'

export const dynamic = 'force-dynamic'

export default async function DaisuPage() {
  const session = await getCtvSession()
  if (!session) redirect('/daisu/login')
  if (session.status === 'pending_setup') redirect(`/daisu/setup?ctvId=${session.ctvId}`)

  const [ctv, stats] = await Promise.all([
    prisma.ctv.findUnique({
      where: { id: session.ctvId },
      select: { id: true, name: true, email: true, ctvCode: true, commissionRate: true, status: true },
    }),
    (async () => {
      if (!session.ctvCode) return { totalOrders: 0, totalCommission: 0, paidCommission: 0 }
      const [totalOrders, commSum, paidSum] = await Promise.all([
        prisma.order.count({ where: { ctvCode: session.ctvCode, status: 'completed' } }),
        prisma.ctvCommission.aggregate({ where: { ctvId: session.ctvId }, _sum: { amount: true } }),
        prisma.ctvCommission.aggregate({ where: { ctvId: session.ctvId, status: 'paid' }, _sum: { amount: true } }),
      ])
      return {
        totalOrders,
        totalCommission: commSum._sum.amount || 0,
        paidCommission: paidSum._sum.amount || 0,
      }
    })(),
  ])

  if (!ctv) redirect('/daisu/login')

  return <DaisuDashboard ctv={ctv} stats={stats} />
}
