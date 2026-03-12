# Quality Gates

Checklist BẮT BUỘC trước mỗi commit. Không pass → không commit.

## 1. Type / Lint Check

```bash
# TypeScript
npx tsc --noEmit

# ESLint (nếu có)
npx eslint . --ext .ts,.tsx
```

→ Zero errors. Warnings có thể chấp nhận nếu không critical.

## 2. Build Pass

```bash
npm run build   # Next.js / React
# hoặc tương đương theo stack
```

→ Build thành công, không có error.

## 3. Runtime Test

- Chạy `test demo` (quick deploy) và verify tính năng mới hoạt động
- Kiểm tra không có regression ở tính năng cũ liên quan

## 4. MD Files Updated

- [ ] `docs/MD_FILES_TO_UPDATE.md` đã được populate với đúng files cần update
- [ ] Tất cả files trong list đã được update
- [ ] `docs/MD_FILES_TO_UPDATE.md` đã được clear sau khi update xong
- [ ] Nếu có env var / service / dependency mới → `docs/REQUIREMENTS_CHECK.md` đã update

## 5. Commit Message

Format:
```
type: short description (imperative, present tense)

Longer explanation if needed.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `style`, `test`

## Per Project Type

### [WEB/Next.js]
- [ ] `npx tsc --noEmit` pass
- [ ] `npm run build` pass
- [ ] Test trên mobile browser (nếu có UI thay đổi)

### [MOBILE]
- [ ] Build debug pass
- [ ] Test trên device thật

### [BOT/API]
- [ ] Unit tests pass (nếu có)
- [ ] Health check endpoint respond 200
