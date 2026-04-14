# Universal Workflow Rules

Bộ workflow rules dùng chung cho mọi project làm việc với **Claude Code CLI**.
Copy một lần, áp dụng cho tất cả project.

---

## Bắt đầu nhanh

```bash
curl -fsSL https://raw.githubusercontent.com/hentaiikidd/universal-workflow/main/bootstrap.sh | bash
```

Chạy từ **root của project**. Script tự động:
- Copy rules vào `docs/universal_rules/`
- Tạo `CLAUDE.md` (nếu chưa có)
- Tạo `README.md` từ template (nếu chưa có)
- Tạo `docs/GOAL.md` từ template (nếu chưa có)

> Chi tiết: xem [BOOTSTRAP.md](./BOOTSTRAP.md)

---

## Cấu trúc sau khi bootstrap

```
my-project/
├── CLAUDE.md                  ← project config cho Claude Code
├── README.md                  ← project README (từ README_TEMPLATE.md)
├── docs/
│   ├── GOAL.md                ← project goal (từ GOAL_TEMPLATE.md)
│   ├── REQUIREMENTS_CHECK.md  ← server requirements
│   ├── MD_FILES_TO_UPDATE.md  ← tracking docs thay đổi
│   └── universal_rules/       ← TẤT CẢ rules files
│       ├── UNIVERSAL_WORKFLOW.md
│       ├── GIT_WORKFLOW.md
│       ├── ENV_RULES.md
│       ├── SECURITY_CHECKLIST.md
│       ├── CI_CD_TEMPLATE.md
│       ├── CONTRIBUTING_TEMPLATE.md
│       ├── ADR_TEMPLATE.md
│       ├── github_templates/
│       ├── GOAL_TEMPLATE.md
│       ├── README_TEMPLATE.md
│       ├── hooks/
│       └── tdk/
└── src/ ...
```

---

## Nội dung bộ rules

### Core (mọi project đều dùng)

| File | Mô tả |
|------|-------|
| `UNIVERSAL_WORKFLOW.md` | Index + core rules + command table |
| `GIT_WORKFLOW.md` | Branch strategy, feature flow, deploy modes |
| `MD_SYSTEM.md` | Cấu trúc /docs, quy tắc MD files |
| `QUALITY_GATES.md` | Type check, build pass, commit format |
| `NEW_PROJECT_SETUP.md` | Logic của lệnh `check requirements` |
| `ASK-BACK.md` | Cơ chế hỏi ngược trước khi thực thi |
| `OUTCOME.md` | Goal tracking protocol |
| `ENV_RULES.md` | Quản lý .env, secrets |
| `SECURITY_CHECKLIST.md` | App-level security (OWASP) |

### Templates (tạo file project-specific)

| Template | Tạo ra | Mô tả |
|----------|--------|-------|
| `GOAL_TEMPLATE.md` | `docs/GOAL.md` | Mục tiêu + milestones project |
| `README_TEMPLATE.md` | `README.md` (root) | GitHub README project |
| `CONTRIBUTING_TEMPLATE.md` | `CONTRIBUTING.md` (root) | Hướng dẫn contribute |
| `ADR_TEMPLATE.md` | `docs/adr/*.md` | Architecture Decision Records |
| `CI_CD_TEMPLATE.md` | `.github/workflows/` | GitHub Actions CI/CD |
| `github_templates/` | `.github/` | PR template + Issue templates |

### Chuyên biệt (dùng khi project cần)

| File | Khi nào dùng |
|------|------|
| `UI_MOBILE_RULES.md` | Web/mobile UI |
| `MOBILE_APP_STRICT_RULES.md` | Webapp native feel |
| `BOT_COMMAND_RULES.md` | Telegram/Discord bot |
| `VIETNAMESE_DIACRITICS.md` | Nội dung tiếng Việt |
| `GOOGLE_OAUTH_SETUP.md` | Google OAuth login |
| `SEPAY_PAYMENT.md` | Thanh toán SePay |

### TDK Pipeline (`tdk/`)

| File | Mô tả |
|------|-------|
| `MASTER_v1.md` | Orchestrator — parse input, route pipeline |
| `PGA_v1.md` | Product Growth Analysis |
| `INFRA_v1.md` | Infrastructure + CI/CD |
| `RRI-T_v1.md` | Quality Assurance Testing |
| `HDSD_v1.md` | Hướng dẫn sử dụng TDK |

### Hooks (`hooks/`)

| File | Mô tả |
|------|-------|
| `askback_enforce.py` | Enforce ASK-BACK trước khi code |
| `viet_diacritics_check.py` | Check tiếng Việt có dấu |
| `install_hooks.py` | Auto-install hooks |

---

## Cập nhật rules

Chạy lại bootstrap — overwrite `docs/universal_rules/` bằng version mới nhất:

```bash
curl -fsSL https://raw.githubusercontent.com/hentaiikidd/universal-workflow/main/bootstrap.sh | bash
```

> **Lưu ý:** Bootstrap KHÔNG overwrite `CLAUDE.md`, `README.md`, `docs/GOAL.md` — chỉ tạo mới nếu chưa có.
