import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import ServicesClient from './ServicesClient'
import Navbar from '@/components/layout/Navbar'

export const dynamic = 'force-dynamic'

const SERVICE_CONFIG_KEYS = [
  'service_career_name', 'service_career_desc',
  'service_love_name', 'service_love_desc',
  'service_synastry_name', 'service_synastry_desc',
  'service_transit_name', 'service_transit_desc',
]

export default async function ServicesPage() {
  const [row, session, configRows] = await Promise.all([
    prisma.config.findUnique({ where: { key: 'site_mode' } }),
    getServerSession(authOptions),
    prisma.config.findMany({ where: { key: { in: SERVICE_CONFIG_KEYS } } }),
  ])
  const serviceConfigs = Object.fromEntries(configRows.map((r) => [r.key, r.value]))

  const isMaintenance = row?.value === 'maintenance'
  const isLifetime = (session?.user as any)?.planType === 'lifetime'

  // Lifetime users bypass maintenance mode
  if (isMaintenance && !isLifetime) {
    return (
      <div className="min-h-screen" style={{ background: '#06060f' }}>
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 pt-40 pb-16 text-center">
          <div style={{ fontSize: '2.8rem', marginBottom: 24 }}>✦</div>
          <h1 style={{
            fontFamily: 'var(--font-vietnam)',
            fontSize: 'clamp(1.3rem, 3.5vw, 1.8rem)',
            fontWeight: 700,
            color: '#f4efe6',
            marginBottom: 16,
            letterSpacing: '0.02em',
          }}>
            Sắp ra mắt
          </h1>
          <p style={{
            color: '#8a8399',
            fontFamily: 'var(--font-vietnam)',
            fontSize: '0.95rem',
            lineHeight: 1.8,
            marginBottom: 32,
          }}>
            Đang hoàn thiện thêm.<br />
            Vui lòng quay lại sau.
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '0.65rem 1.8rem',
              border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: 6,
              color: '#a09ab8',
              fontFamily: 'var(--font-vietnam)',
              fontSize: '0.85rem',
              textDecoration: 'none',
            }}
          >
            ← Về trang chủ
          </a>
        </div>
      </div>
    )
  }

  return <ServicesClient serviceConfigs={serviceConfigs} />
}
