# Git Commands - Hạt Giống Chiêm Tinh

## Setup (đã làm 1 lần)
```bash
# SSH key đã tạo tại /home/hgct/.ssh/github_hgct
# Test kết nối GitHub
ssh -T git@github.com
```

---

## Backup lên GitHub (push)
```bash
# Backup toàn bộ code hiện tại lên main
git add -A
git commit -m "backup: mô tả ngắn"
git push origin main
```

---

## Restore về version mới nhất từ GitHub
```bash
git pull origin main
```

## Restore về 1 commit cụ thể
```bash
git log --oneline          # xem danh sách commit
git checkout <commit-hash> # xem code tại commit đó (detached HEAD)
git checkout main          # quay lại main
```

---

## Tạo nhánh mới để test tính năng
```bash
# Tạo và chuyển sang nhánh mới
git checkout -b feature/ten-tinh-nang

# Làm việc, commit bình thường
git add -A
git commit -m "feat: thêm tính năng X"

# Push nhánh lên GitHub
git push origin feature/ten-tinh-nang
```

## Merge nhánh feature vào main
```bash
git checkout main
git pull origin main              # cập nhật main trước
git merge feature/ten-tinh-nang   # merge
git push origin main              # push lên GitHub
git branch -d feature/ten-tinh-nang  # xóa nhánh local sau khi merge
```

---

## Deploy sau khi pull code mới
```bash
git pull origin main
sudo bash /root/hgct/deploy.sh
```

---

## Xem lịch sử thay đổi
```bash
git log --oneline --graph --all   # tất cả nhánh
git log --oneline -10             # 10 commit gần nhất
git diff HEAD~1                   # so sánh với commit trước
```

## Xem trạng thái hiện tại
```bash
git status          # file nào thay đổi
git diff            # chi tiết thay đổi chưa stage
```

---

## Hoàn tác thay đổi
```bash
# Bỏ thay đổi 1 file chưa commit
git checkout -- src/path/to/file.ts

# Bỏ toàn bộ thay đổi chưa commit (NGUY HIỂM)
git reset --hard HEAD

# Undo commit cuối (giữ lại thay đổi)
git reset --soft HEAD~1

# Undo commit cuối (xóa luôn thay đổi - NGUY HIỂM)
git reset --hard HEAD~1
```

---

## Lệnh hay dùng hàng ngày
| Lệnh | Mục đích |
|------|----------|
| `git status` | Xem file nào thay đổi |
| `git add -A && git commit -m "..."` | Commit tất cả |
| `git push origin main` | Backup lên GitHub |
| `git pull origin main` | Lấy code mới nhất |
| `git log --oneline -10` | Xem 10 commit gần nhất |
| `ssh -T git@github.com` | Test kết nối SSH |
