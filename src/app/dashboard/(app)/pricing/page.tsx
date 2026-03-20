import { getAllPrices } from '@/lib/pricing'
import PriceEditor from './PriceEditor'

export const dynamic = 'force-dynamic'

export default async function PricingPage() {
  const prices = await getAllPrices()

  return (
    <div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: 4, color: '#f0e8d0' }}>Giá Dịch Vụ</h1>
      <p style={{ color: '#6b6585', fontSize: '0.8rem', marginBottom: 32 }}>Cài đặt giá cho từng loại dịch vụ</p>
      <div style={{ maxWidth: 520 }}>
        <PriceEditor initialPrices={prices} />
      </div>
    </div>
  )
}
