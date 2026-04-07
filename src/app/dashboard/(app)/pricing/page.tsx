import { getAllPrices, getAllDisplayPrices } from '@/lib/pricing'
import PriceEditor from './PriceEditor'

export const dynamic = 'force-dynamic'

export default async function PricingPage() {
  const [prices, displayPrices] = await Promise.all([getAllPrices(), getAllDisplayPrices()])

  return (
    <div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: 4, color: '#f0e8d0' }}>Giá Dịch Vụ</h1>
      <p style={{ color: '#6b6585', fontSize: '0.8rem', marginBottom: 32 }}>Cài đặt giá niêm yết và giá bán thật cho từng dịch vụ</p>
      <div style={{ maxWidth: 520 }}>
        <PriceEditor initialPrices={prices} initialDisplayPrices={displayPrices} />
      </div>
    </div>
  )
}
