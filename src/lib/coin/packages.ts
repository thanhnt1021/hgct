// Coin top-up packages. Bảng giá chốt 2026-07-09 (go-live prod): 69k/99k/199k/399k, gói 4 mở.

export interface CoinPackage {
  code: string
  coins: number
  amountVnd: number
  enabled: boolean
  label: string
  hidden?: boolean    // true = không hiện trong UI nạp xu
  promoCode?: string  // nếu có: chỉ mua được sau khi nhập đúng mã ưu đãi này
}

export const COIN_PACKAGES: CoinPackage[] = [
  // COIN000 (test 2k) ẩn khỏi UI — vẫn giữ getPackage hoạt động nếu cần test thủ công.
  { code: 'COIN000', coins: 1000, amountVnd: 2000,   enabled: false, hidden: true, label: 'Test SePay (2k)' },
  { code: 'COIN001', coins: 250,  amountVnd: 69000,  enabled: true,                label: 'Gói 1' },
  { code: 'COIN002', coins: 450,  amountVnd: 99000,  enabled: true,                label: 'Gói 2' },
  { code: 'COIN003', coins: 800,  amountVnd: 199000, enabled: true,                label: 'Gói 3' },
  { code: 'COIN004', coins: 2000, amountVnd: 399000, enabled: true,                label: 'Gói 4' },
  // Mã ưu đãi "Thanhphuong" — ẩn khỏi UI mặc định, chỉ lộ ra sau khi nhập đúng mã ở trang nạp xu.
  { code: 'PROMO001', coins: 300,  amountVnd: 50000, enabled: true, hidden: true, label: 'Ưu đãi mã Thanhphuong', promoCode: 'thanhphuong' },
  { code: 'PROMO002', coins: 1000, amountVnd: 29000, enabled: true, hidden: true, label: 'Ưu đãi mã Thanhphuongxinhgai', promoCode: 'thanhphuongxinhgai' },
]

export function getPackage(code: string): CoinPackage | null {
  return COIN_PACKAGES.find(p => p.code === code) ?? null
}

export function packageByAmount(amount: number): CoinPackage | null {
  return COIN_PACKAGES.find(p => p.enabled && p.amountVnd === amount) ?? null
}

export function getPackageByPromoCode(rawCode: string): CoinPackage | null {
  const code = rawCode.trim().toLowerCase()
  if (!code) return null
  return COIN_PACKAGES.find(p => p.enabled && p.promoCode?.toLowerCase() === code) ?? null
}
