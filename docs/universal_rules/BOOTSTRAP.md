# Bootstrap — Universal Workflow Rules

Repo này chứa bộ workflow rules universal dùng chung cho mọi project làm việc với Claude Code.

## Dùng như thế nào?

### 1. Clone universal rules vào project mới

```bash
# Tạo thư mục docs/universal_rules/ nếu chưa có
mkdir -p docs/universal_rules

# Clone toàn bộ repo rồi copy files (dùng SSH — recommended cho server)
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_rsa" git clone git@github.com:hentaiikidd/universal-workflow.git /tmp/_uw
cp /tmp/_uw/*.md docs/universal_rules/
rm -rf /tmp/_uw
```

> **SSH key khác?** Thay `~/.ssh/id_rsa` bằng path key của bạn. Ví dụ:
> ```bash
> GIT_SSH_COMMAND="ssh -i /home/hgct/.ssh/github_hgct" git clone git@github.com:hentaiikidd/universal-workflow.git /tmp/_uw
> ```

> **Máy local có GitHub credentials (HTTPS)?**
> ```bash
> git clone https://github.com/hentaiikidd/universal-workflow.git /tmp/_uw
> cp /tmp/_uw/*.md docs/universal_rules/
> rm -rf /tmp/_uw
> ```

---

### 2. Tạo hoặc cập nhật CLAUDE.md

`CLAUDE.md` là file bắt buộc của **Claude Code CLI** — Claude đọc file này khi mở project để biết context (tech stack, rules, conventions). Phải đặt ở **root của project**.

**Không bao giờ overwrite CLAUDE.md nếu đã tồn tại.** File đó chứa thông tin project-specific của project đó.

**Nếu CLAUDE.md chưa có** → tạo mới (chỉ khi file chưa tồn tại):

```bash
if [ ! -f CLAUDE.md ]; then
  cat > CLAUDE.md << 'EOF'
# [Tên Project]

## Overview
[Mô tả ngắn về project]

> Đọc docs/universal_rules/UNIVERSAL_WORKFLOW.md để áp dụng universal workflow rules.

## Tech Stack
[Liệt kê tech stack]

## What's DONE ✓
- [x] Project scaffolding

## What's TODO
- [ ] ...
EOF
  echo "✅ Created CLAUDE.md"
fi
```

**Nếu CLAUDE.md đã có** → chỉ thêm dòng reference nếu chưa có (không sửa gì khác):

```bash
if ! grep -q "UNIVERSAL_WORKFLOW" CLAUDE.md; then
  echo "" >> CLAUDE.md
  echo '> Đọc docs/universal_rules/UNIVERSAL_WORKFLOW.md để áp dụng universal workflow rules.' >> CLAUDE.md
  echo "✅ Added reference line to CLAUDE.md"
else
  echo "✅ CLAUDE.md already has reference line"
fi
```

---

### 3. Chạy `check requirements`

Sau khi Claude Code đang chạy trong project, gõ:

```
check requirements
```

Claude sẽ đọc `docs/universal_rules/NEW_PROJECT_SETUP.md` và tự động:
- Kiểm tra + tạo các file còn thiếu (`docs/MD_FILES_TO_UPDATE.md`, `docs/REQUIREMENTS_CHECK.md`)
- Hỏi user input cho những gì cần cấu hình thủ công
- Báo cáo ✅ done / ⚠️ cần làm thêm

---

## Nội dung bộ rules

| File | Mô tả |
|------|-------|
| `UNIVERSAL_WORKFLOW.md` | Index + core rules + command table |
| `GIT_WORKFLOW.md` | Branch strategy, feature flow, deploy modes |
| `MD_SYSTEM.md` | Cấu trúc /docs, quy tắc MD files, templates |
| `UI_MOBILE_RULES.md` | Mobile-first, touch targets, Web Share API, iOS quirks |
| `QUALITY_GATES.md` | TypeScript check, build pass, commit format |
| `NEW_PROJECT_SETUP.md` | check requirements logic + per-project-type checklist |

---

## Cập nhật rules

Khi rules trong repo này thay đổi, copy lại vào project:

```bash
git clone https://github.com/hentaiikidd/universal-workflow.git /tmp/_uw
cp /tmp/_uw/*.md docs/universal_rules/
rm -rf /tmp/_uw
```
