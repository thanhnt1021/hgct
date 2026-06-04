// Coin top-up packages. Anh chốt 3 gói (Excel), gói 4 chờ giá.

export interface CoinPackage {
  code: string
  coins: number
  amountVnd: number
  enabled: boolean
  label: string
  hidden?: boolean   // true = không hiện trong UI nạp xu
}

// Giá theo môi trường (runtime): COIN_TEST_PRICES=true (demo) → giá test 5/10/15k;
// không set (production) → giá thật 99/219/599k. Đổi chỉ bằng env, không cần sửa code.
const TEST_PRICES = process.env.COIN_TEST_PRICES === 'true'
const PRICE = TEST_PRICES
  ? { COIN001: 5000, COIN002: 10000, COIN003: 15000 }
  : { COIN001: 99000, COIN002: 219000, COIN003: 599000 }

export const COIN_PACKAGES: CoinPackage[] = [
  // COIN000 (test 2k) ẩn khỏi UI — vẫn giữ getPackage hoạt động nếu cần test thủ công.
  { code: 'COIN000', coins: 1000, amountVnd: 2000,           enabled: false, hidden: true, label: 'Test SePay (2k)' },
  { code: 'COIN001', coins: 300,  amountVnd: PRICE.COIN001,  enabled: true,  label: 'Gói 1' },
  { code: 'COIN002', coins: 900,  amountVnd: PRICE.COIN002,  enabled: true,  label: 'Gói 2' },
  { code: 'COIN003', coins: 2000, amountVnd: PRICE.COIN003,  enabled: true,  label: 'Gói 3' },
  { code: 'COIN004', coins: 0,    amountVnd: 0,              enabled: false, label: 'Gói 4 — Sắp ra mắt' },
]

export function getPackage(code: string): CoinPackage | null {
  return COIN_PACKAGES.find(p => p.code === code) ?? null
}

export function packageByAmount(amount: number): CoinPackage | null {
  return COIN_PACKAGES.find(p => p.enabled && p.amountVnd === amount) ?? null
}
