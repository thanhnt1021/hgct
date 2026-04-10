import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/db'
import ChartPreview from './ChartPreview'

export default async function DemoChartPdfPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/')

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { planType: true },
  })
  if (user?.planType !== 'lifetime') redirect('/')

  const uid = (session.user as Record<string, unknown>).uid as string
  const profiles = await prisma.profile.findMany({
    where: { userUid: uid },
    select: { profileUid: true, name: true, data: true },
    orderBy: { id: 'desc' },
  })

  return <ChartPreview profiles={profiles.map(p => ({
    id: p.profileUid,
    name: p.name,
    data: p.data as Record<string, unknown>,
  }))} />
}
