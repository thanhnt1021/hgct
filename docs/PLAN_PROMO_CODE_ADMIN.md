# Plan — Mã ưu đãi quản lý qua DB + Dashboard admin CRUD

_Ghi lại 2026-07-22. Trạng thái: DRAFT — chưa implement, chưa có ticket chính thức._

> File này là input thô cho Ki-su (`docs/univ3/agents/Ki-su.md`) viết thành phiếu chuẩn (`docs/ticket/P###-*.md` theo `docs/univ3/templates/TICKET_TEMPLATE.md`) khi được giao việc. Không phải spec cuối cùng.

## Vấn đề hiện tại

`src/lib/coin/packages.ts` hardcode mã ưu đãi trong mảng `COIN_PACKAGES` (3 mã hiện tại: `thanhphuongxinhgai` 888xu/29k, `thanhphuonghihi` 666xu/29k, `thanhphuong` 500xu/50k — sort theo xu giảm dần). Mỗi lần thêm/sửa/xoá mã phải sửa code + quick deploy + merge main — không ai ngoài Claude Code sửa được.

**Lỗ hổng đi kèm:** mã hiện là **unlimited-use** — ai biết được chuỗi mã (vd bị share lại) redeem được vô hạn lần, không giới hạn theo user hay tổng lượt. Chưa có ai khai thác nhưng đáng vá khi làm lại hệ thống.

## Research đã làm

Đối chiếu mô hình Stripe Coupon + Promotion Code (tách coupon gốc khỏi code khách nhập, có giới hạn lượt đổi per-code và per-customer, check hết hạn/vượt giới hạn lúc redeem):
- [Coupons & promotion codes – Stripe Docs](https://docs.stripe.com/billing/subscriptions/coupons)
- [Promotion Code API – Stripe](https://docs.stripe.com/api/promotion_codes)
- [What is a promo code – Stripe](https://stripe.com/ae/resources/more/what-is-a-promo-code)

Kết luận: hệ thống của Stripe quá phức tạp cho quy mô hiện tại (vài mã cá nhân/tháng), nhưng đáng mượn 2 ý: (1) tách rõ "giá trị ưu đãi" khỏi "mã khách nhập" (ở đây gộp làm 1 vì mỗi mã chỉ ứng 1 gói, không cần tách), (2) có `maxRedemptions` + `redeemedCount` để chặn unlimited-use.

## Đề xuất schema (Prisma)

```prisma
model PromoCode {
  id             Int       @id @default(autoincrement())
  code           String    @unique
  coins          Int
  amountVnd      Int
  enabled        Boolean   @default(true)
  maxRedemptions Int?      // null = không giới hạn
  redeemedCount  Int       @default(0)
  expiresAt      DateTime?
  note           String?   // vd "tặng Thanh Phương"
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}
```

## Đề xuất triển khai

1. Migration Prisma thêm bảng `PromoCode`, seed 3 mã hiện tại từ `packages.ts` vào DB.
2. `src/lib/coin/packages.ts`: bỏ 3 dòng `PROMO00x` hardcode. `getPackageByPromoCode()` đổi sang query DB (async) thay vì tìm trong mảng tĩnh — cần sửa cả 2 nơi gọi (`/api/coin/promo`, `topup-order`).
3. API admin mới: `GET/POST/PATCH/DELETE /api/admin/promo-codes` — route trong dashboard subdomain, tái dùng session-check admin đã có sẵn (không phải build auth mới).
4. UI admin: 1 bảng đơn giản (list + form thêm/sửa) trong dashboard hiện có — không cần thư viện table mới.
5. Redemption tăng `redeemedCount` khi tạo đơn thành công (`topup-order`), chặn nếu `maxRedemptions` đã đạt hoặc `expiresAt` đã qua.

## Câu hỏi cần chốt trước khi code (Ki-su/Tho-xay cần hỏi lại)

- Giới hạn lượt dùng: theo **tổng lượt** (maxRedemptions toàn mã) hay theo **từng user** (1 user chỉ dùng 1 lần/mã)? Có thể cần cả hai.
- Có cần audit log ai (admin nào) sửa/tạo mã không, hay 1 admin duy nhất nên không cần?
- 3 mã hiện tại (`thanhphuong`, `thanhphuonghihi`, `thanhphuongxinhgai`) migrate nguyên trạng vào DB, hay reset lại từ đầu?
- Áp dụng cho cả `hgct` (prod) lẫn `hgct-demo`, hay chỉ prod (demo hiện hay tụt sync git — xem `docs/PROJECT_SUMMARY.md` gotcha)?

## Liên quan

- `docs/GOAL.md` — mục "Pending / Cần Quyết Định" có trỏ về file này.
- `src/lib/coin/packages.ts`, `src/app/api/coin/promo/route.ts`, `src/app/api/coin/topup-order/route.ts` — code hiện tại cần sửa.
