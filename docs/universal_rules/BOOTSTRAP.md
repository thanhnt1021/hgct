# Bootstrap — Universal Workflow Rules

Bộ workflow rules dùng chung cho mọi project làm việc với **Claude Code CLI**.

---

## 3 cách để bootstrap project mới

### Cách 1 — Nhanh nhất: chạy script (curl)

```bash
curl -fsSL https://raw.githubusercontent.com/hentaiikidd/universal-workflow/main/bootstrap.sh | bash
```

Script tự động:
- Copy toàn bộ rules vào `docs/universal_rules/`
- Tạo hoặc cập nhật `CLAUDE.md`
- Dọn dẹp file thừa

> **SSH key khác mặc định?**
> ```bash
> curl -fsSL https://raw.githubusercontent.com/hentaiikidd/universal-workflow/main/bootstrap.sh \
>   | BOOTSTRAP_SSH_KEY=~/.ssh/my_key bash
> ```

---

### Cách 2 — Copy file này vào root project, rồi chạy từng bước

Paste `BOOTSTRAP.md` vào root project → chạy từng lệnh bên dưới → script tự xóa file này sau khi xong.

**Bước 1 — Copy rules:**

```bash
mkdir -p docs/universal_rules

# SSH (recommended cho server)
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_rsa" \
  git clone git@github.com:hentaiikidd/universal-workflow.git /tmp/_uw
cp /tmp/_uw/*.md docs/universal_rules/
rm -rf /tmp/_uw
```

> **SSH key khác?** Thay `~/.ssh/id_rsa` bằng path key của bạn.
>
> **Máy local / có HTTPS credentials?**
> ```bash
> git clone https://github.com/hentaiikidd/universal-workflow.git /tmp/_uw
> cp /tmp/_uw/*.md docs/universal_rules/
> rm -rf /tmp/_uw
> ```

**Bước 2 — Tạo hoặc cập nhật CLAUDE.md:**

`CLAUDE.md` là file bắt buộc của Claude Code CLI — phải đặt ở root project. **Không bao giờ overwrite nếu đã tồn tại.**

```bash
# Nếu chưa có CLAUDE.md
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
  echo "✅ Created CLAUDE.md"
fi

# Nếu đã có CLAUDE.md — chỉ thêm reference line nếu chưa có
if ! grep -q "UNIVERSAL_WORKFLOW" CLAUDE.md; then
  echo "" >> CLAUDE.md
  echo '> Đọc docs/universal_rules/UNIVERSAL_WORKFLOW.md để áp dụng universal workflow rules.' >> CLAUDE.md
  echo "✅ Added reference line"
else
  echo "✅ CLAUDE.md already has reference line"
fi
```

**Bước 3 — Dọn dẹp:** xóa file BOOTSTRAP.md ở root (canonical copy đã có trong `docs/universal_rules/`):

```bash
if [ -f "BOOTSTRAP.md" ] && [ -f "docs/universal_rules/BOOTSTRAP.md" ]; then
  rm -f BOOTSTRAP.md
  echo "✅ Removed BOOTSTRAP.md from project root"
fi
```

---

### Cách 3 — 1 lệnh git clone (không cần curl)

```bash
mkdir -p docs/universal_rules
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_rsa" \
  git clone git@github.com:hentaiikidd/universal-workflow.git /tmp/_uw \
  && cp /tmp/_uw/*.md docs/universal_rules/ \
  && rm -rf /tmp/_uw
```

Sau đó chạy bước 2 ở Cách 2 để setup CLAUDE.md.

---

### Bước cuối (mọi cách) — Trong Claude Code CLI

```
check requirements
```

Claude tự tạo các file còn thiếu (`docs/MD_FILES_TO_UPDATE.md`, `docs/REQUIREMENTS_CHECK.md`) và hướng dẫn cấu hình thủ công.

---

## Nội dung bộ rules

| File | Mô tả |
|------|-------|
| `UNIVERSAL_WORKFLOW.md` | Index + core rules + command table |
| `GIT_WORKFLOW.md` | Branch strategy, feature flow, deploy modes |
| `MD_SYSTEM.md` | Cấu trúc /docs, quy tắc MD files, templates |
| `UI_MOBILE_RULES.md` | Mobile-first, touch targets, Web Share API, iOS quirks |
| `QUALITY_GATES.md` | TypeScript check, build pass, commit format |
| `NEW_PROJECT_SETUP.md` | Logic của lệnh `check requirements` |

---

## Cập nhật rules

Chạy lại Cách 1 hoặc Cách 3 — các file trong `docs/universal_rules/` sẽ được overwrite bằng version mới nhất.
