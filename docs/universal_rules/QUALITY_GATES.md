# Quality Gates

Checklist BẮT BUỘC trước mỗi commit. Không pass → không commit.
_Lý do tồn tại: commit broken code vào repo nghĩa là mọi người pull về đều bị broken. Production deploy từ broken code là sự cố thật._

## 1. Type / Lint Check

```bash
# TypeScript
npx tsc --noEmit

# ESLint (nếu có)
npx eslint . --ext .ts,.tsx
```

→ **Zero errors.** Warnings có thể chấp nhận nếu không ảnh hưởng runtime (ví dụ: unused import warning thì OK, `any` type trên critical data flow thì không OK).

_Lý do: TypeScript errors là bug chắc chắn sẽ xảy ra ở runtime — compiler đã phát hiện ra rồi, không có lý do để ignore._

## 2. Build Pass

```bash
npm run build   # Next.js / React
# hoặc tương đương theo stack
```

→ Build thành công, không có error.

_Lý do: type-check pass không đảm bảo build pass. Next.js có thể lỗi ở bước bundle/optimization dù TypeScript OK. Build fail = deploy fail._

## 3. Runtime Test

- Chạy `test demo` (quick deploy) và verify tính năng mới hoạt động trên browser thật
- Kiểm tra không có regression ở tính năng cũ liên quan

_Lý do: build pass không đảm bảo app chạy đúng. Runtime errors (API sai, UI vỡ, logic lỗi) chỉ phát hiện được khi chạy thật._

## 4. MD Files Updated

- [ ] `docs/MD_FILES_TO_UPDATE.md` đã được populate với đúng files cần update
- [ ] Tất cả files trong list đã được update
- [ ] `docs/MD_FILES_TO_UPDATE.md` đã được clear sau khi update xong
- [ ] Nếu có env var / service / dependency mới → `docs/REQUIREMENTS_CHECK.md` đã update

_Lý do: đây là quality gate vì code và docs phải đi cùng nhau trong một commit. Nếu merge code mà docs cũ, người deploy server mới sau này sẽ thiếu thông tin và app sẽ crash._

## 5. Commit Message

Format:
```
type: short description (imperative, present tense)

Longer explanation if needed — tập trung vào WHY, không phải WHAT.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types và ý nghĩa:
| Type | Dùng khi |
|------|----------|
| `feat` | Thêm tính năng mới hoàn toàn |
| `fix` | Sửa bug |
| `docs` | Chỉ thay đổi file tài liệu (.md) |
| `chore` | Config, dependencies, scripts — không ảnh hưởng logic |
| `refactor` | Tái cấu trúc code, không thêm feature không fix bug |
| `style` | Format, whitespace, CSS thuần — không ảnh hưởng logic |
| `test` | Thêm/sửa tests |

## Per Project Type

### [WEB/Next.js]
- [ ] `npx tsc --noEmit` pass
- [ ] `npm run build` pass
- [ ] Test trên mobile browser thật (nếu có UI thay đổi) — DevTools không đủ, iOS Safari có nhiều quirks

### [MOBILE]
- [ ] Build debug pass
- [ ] Test trên device thật — emulator không reproduce được hết lỗi hardware/OS

### [BOT/API]
- [ ] Unit tests pass (nếu có)
- [ ] Health check endpoint respond 200
