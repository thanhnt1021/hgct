# Git Commands - Hạt Giống Chiêm Tinh

## Thông tin repo
- GitHub: https://github.com/hentaiikidd/hgct (private)
- SSH key: `/home/hgct/.ssh/github_hgct`
- Production: `main` branch → hatgiongchiemtinh.com (port 65498)
- Demo: feature branches → demo.hatgiongchiemtinh.com (port 65500)

---

## Workflow chuẩn

```
feature branch → push GitHub → deploy demo → test → merge main → deploy production
```

---

## Deploy

```bash
# Deploy lên production (hatgiongchiemtinh.com)
sudo bash /root/hgct/deploy.sh

# Deploy lên demo (demo.hatgiongchiemtinh.com) — chỉ định branch
sudo bash /root/hgct/deploy-demo.sh feature/ten-nhanh
```

---

## Tạo nhánh mới để làm tính năng

```bash
git checkout -b feature/ten-tinh-nang
git push origin feature/ten-tinh-nang

# Deploy lên demo để test
sudo bash /root/hgct/deploy-demo.sh feature/ten-tinh-nang
```

---

## Backup / Push lên GitHub

```bash
git add -A
git commit -m "feat: mô tả ngắn"
git push origin feature/ten-nhanh   # hoặc main
```

---

## Merge feature vào main (sau khi test OK)

```bash
git checkout main
git pull origin main
git merge feature/ten-tinh-nang
git push origin main
git branch -d feature/ten-tinh-nang         # xóa local
git push origin --delete feature/ten-tinh-nang  # xóa remote

# Deploy production
sudo bash /root/hgct/deploy.sh
```

---

## Restore / Undo

```bash
# Lấy code mới nhất từ GitHub
git pull origin main

# Xem lịch sử commit
git log --oneline -10

# Quay về 1 commit cụ thể (xem thôi, không mất code)
git checkout <commit-hash>
git checkout main   # quay lại

# Bỏ thay đổi chưa commit (1 file)
git checkout -- src/path/to/file.ts

# Bỏ toàn bộ thay đổi chưa commit (NGUY HIỂM)
git reset --hard HEAD
```

---

## Kiểm tra trạng thái

```bash
git status                          # file nào thay đổi
git log --oneline --graph --all     # tất cả nhánh
git branch -a                       # danh sách nhánh
ssh -T git@github.com               # test kết nối GitHub
```

---

## Lệnh hay dùng

| Lệnh | Mục đích |
|------|----------|
| `git add -A && git commit -m "..."` | Commit tất cả |
| `git push origin main` | Push lên GitHub |
| `git pull origin main` | Lấy code mới nhất |
| `sudo bash /root/hgct/deploy.sh` | Deploy production |
| `sudo bash /root/hgct/deploy-demo.sh feature/X` | Deploy demo |
| `git log --oneline -10` | 10 commit gần nhất |
