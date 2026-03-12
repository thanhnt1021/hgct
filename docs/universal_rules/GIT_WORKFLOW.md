# Git Workflow Rules

## Branch Strategy

- Làm việc trên nhánh `feature/[tên]` — KHÔNG làm trực tiếp trên `main`
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
- **Không cần git push**
- Script: `sudo bash deploy-demo-local.sh`

### Full Deploy (sau khi commit)
- Pull từ GitHub → build → deploy
- Dùng khi muốn share link demo hoặc sau khi commit
- Script: `sudo bash deploy-demo.sh [branch]`

### Production Deploy
- Chỉ khi user nói "merge main" hoặc "lên production"
- Script: `sudo bash deploy.sh`

## Git Rules

- KHÔNG dùng `git add -A` hay `git add .` blindly — stage từng file cụ thể
- KHÔNG skip hooks (`--no-verify`)
- KHÔNG force push lên main
- Commit message: ngắn gọn, tiếng Anh, mô tả "why" không chỉ "what"
- Luôn thêm `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` vào commit
