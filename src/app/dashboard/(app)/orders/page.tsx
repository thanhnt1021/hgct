import OrdersTable from './OrdersTable'

export default function OrdersPage() {
  return (
    <div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: 4, color: '#f0e8d0' }}>Đơn Hàng</h1>
      <p style={{ color: '#6b6585', fontSize: '0.8rem', marginBottom: 28 }}>Xem và theo dõi tất cả các đơn hàng</p>
      <OrdersTable />
    </div>
  )
}
