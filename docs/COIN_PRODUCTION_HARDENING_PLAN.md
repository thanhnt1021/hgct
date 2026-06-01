# Coin Rework — Production Hardening Plan

_Lập 2026-06-01 (TDK: RRI-T = đúng chức năng + INFRA = an toàn hệ thống). Plan để execute sau, theo thứ tự._

> **Bối cảnh:** Coin rework đã go-live production nhưng **production đang đóng với new user**. Plan này là điều kiện để **mở lại cho user**. Làm xong A→E rồi mới reopen.

---

## Quyết định đã chốt (qua AskUserQuestion)
- Essay: **gen full 1 lần → lưu DB → cắt mục** (timeless, nhất quán). Bỏ `/tmp`.
- Security: **check đủ xu TRƯỚC khi gen LLM**. **KHÔNG** rate-limit (dựa vào "phải có xu"). **KHÔNG** cap đơn topup.
- Relations: **bỏ context-block runtime dư + tùy biến sâu cả 4 thân bài**.
- QA: **test double-spend**. Sign-off: **chạy /security-review** trên code coin.

---

## A. Essay → lưu DB (thay `/tmp`) + nhất quán  ⟶ RRI-T (chức năng) · BẮT BUỘC

**Vấn đề:** Cache essay ở `/tmp` mất khi restart/deploy/container khác → mục mở sau gen từ bài MỚI (temp 0.75) → các mục trong cùng báo cáo **mâu thuẫn nhau**. Khách trả tiền nhận report không liền mạch.

**Làm:**
1. Migration manual `prisma/migrations/manual/<date>_essays.sql` + thêm model `Essay` vào `schema.prisma`:
   - `essays`: `id`, `user_uid`, `profile_uid`, `service`, `content TEXT`, `created_at`; `@@unique([userUid, profileUid, service])`.
   - Apply vào DB chung `zodiacdb` (`docker exec hgct-postgres psql ...`).
2. Sửa `src/lib/essay/cache.ts`: `readEssay`/`writeEssay` đọc/ghi **bảng essays** thay vì filesystem `/tmp`. Key vẫn `(userUid, profileUid, service)`.
3. `generate.ts`, `unlock-section`, `unlock-bundle`, `full-stream` đều xài qua lớp cache → **sửa 1 chỗ, mọi route hưởng**.

**Kết quả:** Essay gen đúng **1 lần / (user,profile,service)**, lưu vĩnh viễn, mọi mục cắt từ cùng 1 bài → nhất quán + sống qua restart + khách xem lại mãi.

**Verify:** Mở mục 1 → restart container demo → mở mục 2 → 2 mục cùng 1 bài (content khớp essay đã lưu). Reading cũ không bị tính phí lại.

---

## B. Check đủ xu TRƯỚC khi gen LLM  ⟶ INFRA (bảo mật) · BẮT BUỘC

**Vấn đề:** `unlock-section` gọi `generateAndCacheEssay` (LLM, tới 5 phút) **trước** khi check số dư → user 0 xu vẫn trigger gen → đốt credit OpenRouter (cost-DoS).

**Làm:** Trong `unlock-section` (và `unlock-bundle`), đảo thứ tự:
1. auth → validate input → lấy catalog/section → tính `profileUid`.
2. Check `Reading` đã có (đã mua) → trả free, dừng.
3. **NEW: `getBalance(userUid)` ≥ `section.coinPrice` (bundle: ≥ `bundlePrice`)** → nếu thiếu, trả 402 NGAY, **chưa gen**.
4. Lấy essay (DB cache; miss → gen full → lưu DB).
5. Atomic: `deductCoin` + `Reading.create`.

**Lưu ý:** Sau A, nếu essay đã có trong DB thì bước gen bị skip → gate chủ yếu chặn ở lần gen đầu (cache miss). Vẫn đúng.

**Verify:** User 0 xu gọi unlock → 402 tức thì, log KHÔNG có dòng gọi OpenRouter.

---

## C. Relations 4 loại — bỏ dư + tùy biến sâu 4 thân bài  ⟶ RRI-T (chức năng)

**Hiện trạng:** 4 file `relations-*.txt` là file riêng nhưng **chỉ tùy biến phần MỞ ĐẦU (~19 dòng)**; **thân bài (~220 dòng) dùng chung khung synastry "cặp đôi/tình yêu"**, dựa vào note đầu để LLM "diễn giải lại". THÊM: `generate.ts` + `full-stream` còn prepend `relationsContextBlock()` → **context note bị nhân đôi**.

**Làm:**
1. **Bỏ redundancy:** xóa prepend `relationsContextBlock` ở `src/lib/essay/generate.ts` + `src/app/api/astrology/full-stream/route.ts` → file `.txt` là **nguồn duy nhất**. Xóa `src/lib/logic/relations/context.ts` nếu hết tham chiếu.
2. **Tùy biến sâu cả 4 thân bài** — sửa trực tiếp từng file `src/prompts/relations-{parents,children,colleague,friend}.txt`: viết lại hướng dẫn TỪNG MỤC theo đúng ngữ cảnh quan hệ (bỏ khung lãng mạn khỏi thân bài, không chỉ intro). Đặc biệt `relations-colleague.txt`: tuyệt đối không yêu đương/cưới hỏi.

**Verify:** Đọc 1 output mỗi loại (nhất là colleague) → giọng + nội dung đúng ngữ cảnh, không rò "tình yêu/hôn nhân".

---

## D. Test double-spend  ⟶ INFRA/QA · chứng minh atomic

**Hiện trạng:** `deductCoin` + `Reading.create` trong 1 `$transaction`; `readings` có `@@unique` → đã an toàn (lý thuyết).

**Làm:** Test tự động bắn **N request unlock đồng thời cùng (user,profile,service,section)** → assert: chỉ 1 `coin_transactions` delta âm, `users.coin` trừ đúng 1 lần, 1 `Reading` row. Lặp cho deduct lẻ + bundle.

**Verify:** Test pass; thử trên demo bằng script bắn song song.

---

## E. /security-review trên code coin  ⟶ INFRA · SIGN-OFF trước khi reopen

Chạy skill `/security-review` (hoặc `/code-review` security) trên toàn bộ code coin:
`src/lib/coin/`, `src/lib/essay/`, `src/app/api/coin/*`, `src/app/api/payment/sepay-webhook/route.ts`, `src/app/api/astrology/full-stream/route.ts`.

**Soát tối thiểu:** authz/IDOR mọi endpoint coin · race/double-spend · webhook replay + amount tamper · price tamper (client gửi sectionId → server tra giá từ catalog) · input validation · rò thông tin qua error.

**Output:** danh sách finding + fix. Chỉ reopen production cho user **sau khi sign-off sạch**.

---

## KHÔNG làm (đã chốt)
- ❌ Rate-limit `/api/coin/unlock-*` — dựa vào check-balance-trước-gen.
- ❌ Cap đơn topup unpaid — đơn unpaid vô hại về tiền (không gắn profile).
- ✅ Migration coin/readings — đã apply sẵn DB chung.

---

## Thứ tự execute đề xuất
1. **A** (essays DB + cache) — nền cho nhất quán.
2. **B** (check xu trước gen) — sửa cùng vùng `unlock-*` với A.
3. **C** (relations: bỏ dư + 4 thân bài) — độc lập, song song được.
4. **D** (test double-spend).
5. **E** (/security-review) — cổng cuối trước reopen.
6. Mỗi bước: sync `src/`+`prisma/` → `hgct-demo`, build demo, test; xong gom commit + `full update` lên prod.
7. **Reopen production cho new user** chỉ sau khi A–E xong + E sạch.
