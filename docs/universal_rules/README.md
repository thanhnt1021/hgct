# Universal Workflow Rules

Bộ workflow rules dùng chung cho mọi project làm việc với **Claude Code CLI**.
Copy một lần, áp dụng cho tất cả project.

---

## Bắt đầu nhanh

### Bước 1 — Copy rules vào project

```bash
cd /your-project

mkdir -p docs/universal_rules

# SSH (recommended cho server)
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_rsa" \
  git clone git@github.com:hentaiikidd/universal-workflow.git /tmp/_uw
cp /tmp/_uw/*.md docs/universal_rules/
rm -rf /tmp/_uw
```

> Máy local dùng HTTPS: `git clone https://github.com/hentaiikidd/universal-workflow.git /tmp/_uw`

---

### Bước 2 — Thiết lập CLAUDE.md

**Nếu chưa có CLAUDE.md:**
```bash
if [ ! -f CLAUDE.md ]; then
  cat > CLAUDE.md << 'EOF'
# [Tên Project]

## Overview
[Mô tả ngắn]

> Đọc docs/universal_rules/UNIVERSAL_WORKFLOW.md để áp dụng universal workflow rules.

## Tech Stack
[Liệt kê tech stack]

## What's DONE ✓
- [x] Project scaffolding

## What's TODO
- [ ] ...
EOF
fi
```

**Nếu CLAUDE.md đã có** — chỉ thêm dòng reference (không sửa gì khác):
```bash
if ! grep -q "UNIVERSAL_WORKFLOW" CLAUDE.md; then
  echo '' >> CLAUDE.md
  echo '> Đọc docs/universal_rules/UNIVERSAL_WORKFLOW.md để áp dụng universal workflow rules.' >> CLAUDE.md
fi
```

---

### Bước 3 — Trong Claude Code CLI

Mở Claude Code trong project, gõ:

```
check requirements
```

Claude sẽ tự động kiểm tra + tạo các file còn thiếu (`docs/MD_FILES_TO_UPDATE.md`, `docs/REQUIREMENTS_CHECK.md`) và hướng dẫn cấu hình thủ công.

> **Không dùng Claude CLI?** Xem [BOOTSTRAP.md](./BOOTSTRAP.md) để setup thủ công hoàn toàn.

---

## Nội dung bộ rules

| File | Khi nào đọc |
|------|-------------|
| [`UNIVERSAL_WORKFLOW.md`](./UNIVERSAL_WORKFLOW.md) | Index — đọc trước mọi thứ |
| [`GIT_WORKFLOW.md`](./GIT_WORKFLOW.md) | Bắt đầu bất kỳ feature nào |
| [`MD_SYSTEM.md`](./MD_SYSTEM.md) | Khi tạo / di chuyển file MD |
| [`QUALITY_GATES.md`](./QUALITY_GATES.md) | Trước mỗi commit |
| [`UI_MOBILE_RULES.md`](./UI_MOBILE_RULES.md) | Project có UI / web / mobile |
| [`NEW_PROJECT_SETUP.md`](./NEW_PROJECT_SETUP.md) | Logic của lệnh `check requirements` |
| [`BOOTSTRAP.md`](./BOOTSTRAP.md) | Hướng dẫn chi tiết + manual setup |

---

## Cập nhật rules

```bash
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_rsa" \
  git clone git@github.com:hentaiikidd/universal-workflow.git /tmp/_uw
cp /tmp/_uw/*.md docs/universal_rules/
rm -rf /tmp/_uw
```
