# Git Workflow Rules

## Branch Strategy

- Làm việc trên nhánh `feature/[tên]` — **KHÔNG làm trực tiếp trên `main`**.
  _Lý do: `main` là production. Commit thẳng vào main = deploy thẳng lên production không qua review/test._
- Tên branch: `feature/short-kebab-description`
- Main branch luôn là `main` (dùng cho PR nếu có)

## Feature Flow

```
feature: [tên]
  → git checkout -b feature/[tên]
  → code + fix
  → quick deploy (KHÔNG commit/push)
  → DỪNG, báo cáo, chờ feedback

[lặp lại: fix → quick deploy → chờ]

commit
  → update docs/MD_FILES_TO_UPDATE.md trước
  → update tất cả MD files trong list
  → clear docs/MD_FILES_TO_UPDATE.md
  → git commit + push nhánh feature

merge main / lên production
  → git merge feature/... vào main
  → git push origin main
  → deploy production
```

## Deploy — 2 chế độ

### Quick Deploy (iterate nhanh, chưa commit)
- Build từ code hiện tại (uncommitted OK)
- Sync build sang demo dir, restart service
- **Không cần git push** — dùng khi đang iterate/debug, chưa muốn lưu vào git history
- Script: `sudo bash deploy-demo-local.sh`

### Full Deploy (sau khi commit)
- Pull từ GitHub → build → deploy
- Dùng khi muốn share link demo với người khác hoặc sau khi đã commit
- Script: `sudo bash deploy-demo.sh [branch]`

### Production Deploy
- Chỉ khi user nói "merge main" hoặc "lên production"
- Script: `sudo bash deploy.sh`

## Git Rules

- **KHÔNG dùng `git add -A` hay `git add .` blindly** — stage từng file cụ thể.
  _Lý do: `git add -A` có thể vô tình commit file `.env`, credentials, file binary lớn, hoặc file debug tạm thời vào repo — một khi đã push lên GitHub (kể cả private repo) thì coi như đã lộ._

- **KHÔNG skip hooks (`--no-verify`)**.
  _Lý do: hooks chạy lint/type-check/test trước khi commit. Skip là bypass safety net — code broken sẽ vào repo._

- **KHÔNG force push lên `main`**.
  _Lý do: force push xóa git history của người khác đã pull về. Trên production branch, điều này có thể làm mất code không thể recover._

- **Commit message: mô tả "why" không chỉ "what"**.
  _Lý do: "what" đã có trong diff. "why" là thứ 6 tháng sau cần biết khi debug — "fix bug" vô nghĩa, "fix iOS zoom khi focus input vì font-size < 16px" mới có giá trị._

- **Luôn thêm `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`** vào cuối commit message.
  _Lý do: ghi nhận AI đã tham gia viết code trong commit history — minh bạch về cách code được tạo ra._
