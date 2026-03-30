import CtvAdminPanel from './CtvAdminPanel'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Đại Sứ — HGCT Dashboard' }

export default function CtvPage() {
  return (
    <div>
      <h1 style={{ color: '#c9a84c', fontFamily: 'var(--font-vietnam)', fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Quản lý Đại Sứ (CTV)
      </h1>
      <p style={{ color: '#6b6585', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', marginBottom: '2rem' }}>
        Danh sách cộng tác viên, hoa hồng và trạng thái hoạt động
      </p>
      <CtvAdminPanel />
    </div>
  )
}
