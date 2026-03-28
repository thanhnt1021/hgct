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
- [ ] Nếu commit này hoàn thành milestone → `docs/GOAL.md` đã được update (tick `[x]`, cập nhật "Hiện tại đang ở đâu")

_Lý do: đây là quality gate vì code và docs phải đi cùng nhau trong một commit. Nếu merge code mà docs cũ, người deploy server mới sau này sẽ thiếu thông tin và app sẽ crash._

## 5. Vietnamese Diacritics Check (Dự án tiếng Việt)

- [ ] Grep tất cả strings tiếng Việt trong files vừa sửa
- [ ] Mọi user-facing string đều có dấu đầy đủ (messages, buttons, captions, image labels, AI prompts)
- [ ] Không có string nào dạng "Trai bai", "Quay lai", "Khach hang" (thiếu dấu)

→ **ZERO TOLERANCE.** Chi tiết: xem `BOT_COMMAND_RULES.md` mục 7.

_Lý do: Tiếng Việt không dấu là lỗi phổ biến nhất khi AI viết code. Mỗi commit phải verify -- không tin vào "đã viết đúng từ đầu"._

## 6. Commit Message

Format:
```
type: short description (imperative, present tense)

Longer explanation if needed — tập trung vào WHY, không phải WHAT.

Co-Authored-By: Claude <model> <noreply@anthropic.com>
```

Thay `<model>` bằng model đang dùng: Opus 4.6, Sonnet 4.6, Haiku 4.5.

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

### [BOT/API — Node]
- [ ] Unit tests pass (nếu có)
- [ ] Health check endpoint respond 200
- [ ] **Command Registration Check:** Mọi CommandHandler đều có BotCommand tương ứng trong menu (xem `BOT_COMMAND_RULES.md` mục 1 + 4). Số handler phải khớp số menu command (trừ /start).

### [BOT/API — Python]
- [ ] `python -m py_compile <main_file>` pass (syntax check)
- [ ] `pip install -r requirements.txt` thành công trong venv
- [ ] Service restart thành công: `sudo systemctl restart <service> && sudo systemctl status <service>`
- [ ] **Command Registration Check:** Tương tự Node — xem `BOT_COMMAND_RULES.md` mục 1 + 4.

## 7. RRI-T Quality Audit (Khi user yêu cầu)

Khi user gọi `check quality` hoặc `check RRI-T` → chạy kiểm thử toàn diện theo **TDK Pipeline**:

1. **Đọc** `docs/tdk/RRI-T_v1.md` — nắm methodology + multi-pass protocol
2. **Chọn mode:** Lite (solo dev, 3 personas) hoặc Full (5 personas)
3. **MULTI-PASS bắt buộc** (không chạy gộp personas):
   - Pass 0: Phase 1.5 Code-Path Analysis → output Code-Path Map → user review
   - Pass 1: 👤 End User (D1 UI/UX + D7 Edge) → output test cases
   - Pass 2: 🔍 QA Destroyer (D2 API + D7 Edge) → output test cases
   - Pass 3: 🔒 Security Auditor (D4 Security) → output test cases
   - [Full mode: Pass 4-5 thêm 📋 BA + 🔧 DevOps]
   - Pass Final: Self-Check (Common Misses checklist per dimension)
4. **Output:** Test suite by pass, scoring dashboard, P0-P3 priority, recommended fixes

_Lý do: RRI-T bổ sung cho unit test bằng cách kiểm thử từ góc nhìn người dùng thật + phá hệ thống + security + infrastructure. Multi-pass đảm bảo mỗi persona được 100% focus, không bị lướt._

> **File cũ `RRI-T_METHODOLOGY.md` trong universal_rules/ đã được thay thế bởi `docs/tdk/RRI-T_v1.md`** — bản mới có multi-pass enforcement, common misses registry, và self-check protocol.