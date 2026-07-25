// Coin top-up packages. Bảng giá chốt 2026-07-09 (go-live prod): 69k/99k/199k/399k, gói 4 mở.
// Mã ưu đãi (P001 — docs/ticket/P001-mo-uu-dai-quan-ly-db.md): đã chuyển sang bảng DB
// `PromoCode`, KHÔNG còn hardcode ở đây — dùng getPackageByPromoCode() (async, query DB).

import prisma from '@/lib/db'

export interface CoinPackage {
  code: string
  coins: number
  amountVnd: number
  enabled: boolean
  label: string
  hidden?: boolean    // true = không hiện trong UI nạp xu
  promoCode?: string  // nếu có: chỉ mua được sau khi nhập đúng mã ưu đãi này
}

// Kết quả redeem 1 mã ưu đãi từ DB — dùng cho cả /api/coin/promo lẫn topup-order.
export interface PromoRedeemResult {
  packageCode: string   // giữ tên field cũ cho FE tương thích (thực ra là PromoCode.code)
  coins: number
  amountVnd: number
  label: string
}

// Lỗi guard khi redeem — 3 loại theo AC5/AC6/AC7.
export type PromoGuardError = 'hết lượt' | 'hết hạn' | 'không hợp lệ'

export const COIN_PACKAGES: CoinPackage[] = [
  // COIN000 (test 2k) ẩn khỏi UI — vẫn giữ getPackage hoạt động nếu cần test thủ công.
  { code: 'COIN000', coins: 1000, amountVnd: 2000,   enabled: false, hidden: true, label: 'Test SePay (2k)' },
  { code: 'COIN001', coins: 250,  amountVnd: 69000,  enabled: true,                label: 'Gói 1' },
  { code: 'COIN002', coins: 450,  amountVnd: 99000,  enabled: true,                label: 'Gói 2' },
  { code: 'COIN003', coins: 800,  amountVnd: 199000, enabled: true,                label: 'Gói 3' },
  { code: 'COIN004', coins: 2000, amountVnd: 399000, enabled: true,                label: 'Gói 4' },
]

export function getPackage(code: string): CoinPackage | null {
  return COIN_PACKAGES.find(p => p.code === code) ?? null
}

export function packageByAmount(amount: number): CoinPackage | null {
  return COIN_PACKAGES.find(p => p.enabled && p.amountVnd === amount) ?? null
}

// Guard hợp lệ dùng chung cho /api/coin/promo + topup-order (AC5/AC6/AC7). Chỉ CHECK ở đây —
// increment redeemedCount thật nằm ở webhook thanh toán thành công (QĐ5), KHÔNG ở đây.
function guardPromo(row: { enabled: boolean; expiresAt: Date | null; maxRedemptions: number | null; redeemedCount: number }): PromoGuardError | null {
  if (!row.enabled) return 'không hợp lệ'
  if (row.expiresAt && row.expiresAt < new Date()) return 'hết hạn'
  if (row.maxRedemptions != null && row.redeemedCount >= row.maxRedemptions) return 'hết lượt'
  return null
}

// Query DB PromoCode theo mã khách nhập. Trả `{ error }` nếu bị chặn (AC5-AC7), `{ pkg }` nếu hợp lệ.
export async function getPackageByPromoCode(
  rawCode: string,
): Promise<{ pkg: PromoRedeemResult; error: null } | { pkg: null; error: PromoGuardError }> {
  const code = rawCode.trim().toLowerCase()
  if (!code) return { pkg: null, error: 'không hợp lệ' }

  const row = await prisma.promoCode.findUnique({ where: { code } })
  if (!row) return { pkg: null, error: 'không hợp lệ' }

  const error = guardPromo(row)
  if (error) return { pkg: null, error }

  return {
    error: null,
    pkg: {
      packageCode: row.code,
      coins: row.coins,
      amountVnd: row.amountVnd,
      label: row.label ?? `Ưu đãi mã ${row.code}`,
    },
  }
}
