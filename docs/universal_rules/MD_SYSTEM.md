# MD File System Rules

## Cấu trúc chuẩn

```
project-root/
  CLAUDE.md                          ← bắt buộc ở root (Claude Code CLI)
  docs/
    universal_rules/                 ← copy nguyên folder này sang project mới
      UNIVERSAL_WORKFLOW.md
      GIT_WORKFLOW.md
      MD_SYSTEM.md
      UI_MOBILE_RULES.md
      NEW_PROJECT_SETUP.md
      QUALITY_GATES.md
    REQUIREMENTS_CHECK.md            ← tạo tự động khi `check requirements`
    MD_FILES_TO_UPDATE.md            ← tạo tự động khi `check requirements`
    [các file MD khác của project]   ← tất cả vào /docs
```

## Quy tắc

- Mọi file `.md` mới **trừ `CLAUDE.md`** → tạo trong `/docs/`
- `CLAUDE.md` ở root, có dòng: `Đọc docs/universal_rules/UNIVERSAL_WORKFLOW.md`
- Files trong `universal_rules/` là universal — không chứa thông tin project-specific

## docs/MD_FILES_TO_UPDATE.md

File tracking — populate khi bắt đầu feature, clear sau khi commit.

Template nội dung:
```
## Current Feature
[tên feature]: [mô tả ngắn]

## Files To Update
- CLAUDE.md (What's DONE)
- docs/REQUIREMENTS_CHECK.md (nếu có env/service mới)
- [các file khác liên quan]
```

## docs/REQUIREMENTS_CHECK.md

Checklist setup server cho project này. Cấu trúc xem `NEW_PROJECT_SETUP.md`.
Phải update mỗi khi có env var / service / dependency mới.

## CLAUDE.md

Chứa thông tin project-specific:
- Tech stack, cấu trúc thư mục
- Env vars, ports, domain
- What's DONE / TODO
- Known fixes
- Dòng bắt buộc: `Đọc docs/universal_rules/UNIVERSAL_WORKFLOW.md để áp dụng universal workflow rules.`
