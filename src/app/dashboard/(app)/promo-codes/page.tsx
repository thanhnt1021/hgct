import PromoCodesPanel from './PromoCodesPanel'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mã ưu đãi — HGCT Dashboard' }

export default function PromoCodesPage() {
  return (
    <div>
      <h1 style={{ color: '#c9a84c', fontFamily: 'var(--font-vietnam)', fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Mã ưu đãi nạp xu
      </h1>
      <p style={{ color: '#6b6585', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', marginBottom: '2rem' }}>
        Danh sách mã ưu đãi, giới hạn lượt dùng và hạn dùng — thêm/sửa/xoá không cần deploy
      </p>
      <PromoCodesPanel />
    </div>
  )
}
