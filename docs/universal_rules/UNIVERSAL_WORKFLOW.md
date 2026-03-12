# Universal Workflow Rules

File index cho toàn bộ universal rules. Claude đọc file này trước, sau đó đọc các file liên quan theo context.

**Cách dùng:** Copy toàn bộ folder `docs/universal_rules/` vào project mới. Chạy lệnh `check requirements` — Claude tự setup phần còn lại.

---

## Index — Đọc file nào khi nào

| Tình huống | File cần đọc |
|---|---|
| Bắt đầu bất kỳ việc gì | `GIT_WORKFLOW.md` |
| Có liên quan đến file MD | `MD_SYSTEM.md` |
| Trước khi commit | `QUALITY_GATES.md` |
| Project có UI/web/mobile | `UI_MOBILE_RULES.md` |
| Setup project mới / `check requirements` | `NEW_PROJECT_SETUP.md` |

---

## Universal Commands (áp dụng mọi project)

| Lệnh | Hành động |
|---|---|
| `feature: [tên]` | Tạo branch `feature/tên`, code, quick deploy → **DỪNG chờ feedback** |
| `test demo` / `quick deploy` | Build + deploy demo từ code hiện tại, **KHÔNG commit/push** |
| `commit` | Commit + push nhánh hiện tại (update MD files trước) |
| `merge main` / `lên production` | Merge vào main + deploy production |
| `deploy demo` | Full deploy từ GitHub (sau khi đã commit) |
| `check requirements` | Kiểm tra và setup mọi thứ còn thiếu theo `NEW_PROJECT_SETUP.md` |
| `update workflow` | Review + đề xuất cải tiến các file trong `universal_rules/` |

---

## Core Rules (không bao giờ vi phạm)

1. **KHÔNG tự ý** `git commit`, `git push`, `git merge`, hay deploy production — chỉ làm khi được lệnh rõ ràng
2. Sau `quick deploy` → báo cáo kết quả rồi **DỪNG**, không làm gì thêm
3. Mọi file `.md` mới (trừ `CLAUDE.md`) → tạo trong `/docs/`
4. `CLAUDE.md` bắt buộc ở root project (Claude Code CLI yêu cầu)
5. Khi commit: update MD files liên quan + clear `docs/MD_FILES_TO_UPDATE.md`
6. Nếu thêm env var / service / dependency mới → update `docs/REQUIREMENTS_CHECK.md`
7. Nếu có chỉnh sửa bất kỳ file nào trong `docs/universal_rules/` → **push lên repo `universal-workflow` ngay trong cùng session**, trước hoặc cùng lúc với commit project hiện tại
