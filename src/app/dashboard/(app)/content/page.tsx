import prisma from '@/lib/db'
import ContentEditor from './ContentEditor'

export const dynamic = 'force-dynamic'

const CONTENT_KEYS = [
  'hero_subtitle', 'hero_cta_text', 'cta_body', 'cta_button_text',
  'service_career_name', 'service_career_desc',
  'service_love_name', 'service_love_desc',
  'service_synastry_name', 'service_synastry_desc',
  'service_transit_name', 'service_transit_desc',
]

export default async function ContentPage() {
  const rows = await prisma.config.findMany({ where: { key: { in: CONTENT_KEYS } } })
  const values = Object.fromEntries(rows.map((r) => [r.key, r.value]))

  return (
    <div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: 4, color: '#f0e8d0' }}>Nội Dung</h1>
      <p style={{ color: '#6b6585', fontSize: '0.8rem', marginBottom: 32 }}>Chỉnh sửa text hiển thị trên trang chủ và trang dịch vụ — thay đổi có hiệu lực ngay</p>
      <ContentEditor initialValues={values} />
    </div>
  )
}
