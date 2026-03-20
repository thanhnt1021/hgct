import prisma from '@/lib/db'
import MaintenanceToggle from './MaintenanceToggle'

export const dynamic = 'force-dynamic'

export default async function OperationsPage() {
  const row = await prisma.config.findUnique({ where: { key: 'site_mode' } })
  const siteMode = row?.value ?? 'normal'

  return (
    <div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: 4, color: '#f0e8d0' }}>Vận Hành</h1>
      <p style={{ color: '#6b6585', fontSize: '0.8rem', marginBottom: 32 }}>Cài đặt hoạt động của trang web</p>

      <section style={{
        background: '#13131f',
        border: '1px solid rgba(201,168,76,0.12)',
        borderRadius: 10,
        padding: '24px',
        maxWidth: 520,
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#c9a84c', marginBottom: 6 }}>
          Chế Độ Bảo Trì
        </h2>
        <p style={{ fontSize: '0.8rem', color: '#8a8399', marginBottom: 20, lineHeight: 1.5 }}>
          Khi bật, trang <strong style={{ color: '#e8e0f0' }}>/services</strong> sẽ hiển thị thông báo bảo trì thay vì danh sách dịch vụ. Các trang khác hoạt động bình thường.
        </p>
        <MaintenanceToggle currentMode={siteMode} />
      </section>
    </div>
  )
}
