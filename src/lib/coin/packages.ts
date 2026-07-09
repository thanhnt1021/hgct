// Coin top-up packages. Bảng giá preview 2026-07 (69k/99k/199k/399k) — gói 4 mở trên demo.

export interface CoinPackage {
  code: string
  coins: number
  amountVnd: number
  enabled: boolean
  label: string
  hidden?: boolean    // true = không hiện trong UI nạp xu
  promoCode?: string  // nếu có: chỉ mua được sau khi nhập đúng mã ưu đãi này
}

// Giá theo môi trường (runtime): COIN_TEST_PRICES=true (demo) → giá preview 69/99/199/399k, gói 4 mở;
// không set (production) → giá thật hiện hành 99/219/599k, gói 4 vẫn chờ giá. Đổi chỉ bằng env, không cần sửa code.
const TEST_PRICES = process.env.COIN_TEST_PRICES === 'true'
const PRICE = TEST_PRICES
  ? { COIN001: 69000, COIN002: 99000, COIN003: 199000, COIN004: 399000 }
  : { COIN001: 99000, COIN002: 219000, COIN003: 599000, COIN004: 399000 }
const COINS = TEST_PRICES
  ? { COIN001: 250, COIN002: 450, COIN003: 800, COIN004: 2000 }
  : { COIN001: 300, COIN002: 900, COIN003: 2000, COIN004: 2000 }

export const COIN_PACKAGES: CoinPackage[] = [
  // COIN000 (test 2k) ẩn khỏi UI — vẫn giữ getPackage hoạt động nếu cần test thủ công.
  { code: 'COIN000', coins: 1000,          amountVnd: 2000,           enabled: false,      hidden: true, label: 'Test SePay (2k)' },
  { code: 'COIN001', coins: COINS.COIN001, amountVnd: PRICE.COIN001,  enabled: true,                     label: 'Gói 1' },
  { code: 'COIN002', coins: COINS.COIN002, amountVnd: PRICE.COIN002,  enabled: true,                     label: 'Gói 2' },
  { code: 'COIN003', coins: COINS.COIN003, amountVnd: PRICE.COIN003,  enabled: true,                     label: 'Gói 3' },
  { code: 'COIN004', coins: COINS.COIN004, amountVnd: PRICE.COIN004,  enabled: TEST_PRICES,              label: 'Gói 4' },
  // Mã ưu đãi "Thanhphuong" — ẩn khỏi UI mặc định, chỉ lộ ra sau khi nhập đúng mã ở trang nạp xu.
  { code: 'PROMO001', coins: 300, amountVnd: 50000, enabled: true, hidden: true, label: 'Ưu đãi mã Thanhphuong', promoCode: 'thanhphuong' },
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
