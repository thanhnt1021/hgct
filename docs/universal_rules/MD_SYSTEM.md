# MD File System Rules

## Cấu trúc chuẩn

```
project-root/
  CLAUDE.md                          ← bắt buộc ở root (Claude Code CLI đọc khi khởi động)
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

- Mọi file `.md` mới **trừ `CLAUDE.md`** → tạo trong `/docs/`.
  _Lý do: giữ root project sạch. Root chỉ chứa config và entry point, không phải tài liệu._

- `CLAUDE.md` ở root, có dòng: `Đọc docs/universal_rules/UNIVERSAL_WORKFLOW.md`.
  _Lý do: Claude Code CLI chỉ đọc `CLAUDE.md` ở root khi khởi động. Nếu không có dòng reference này, Claude sẽ không biết đến bộ universal rules và không apply workflow đúng._

- Files trong `universal_rules/` là universal — **không chứa thông tin project-specific** (tên project, domain, port, env vars...).
  _Lý do: folder này được copy nguyên sang project mới. Nếu có thông tin của project A trong đây, khi copy sang project B sẽ gây nhầm lẫn hoặc lộ thông tin._

## docs/MD_FILES_TO_UPDATE.md

File tracking để đảm bảo docs luôn đồng bộ với code — populate khi bắt đầu feature, clear sau khi commit.

_Vấn đề nó giải quyết: khi làm feature, dễ quên update tài liệu. File này là checklist nhắc "những file MD nào cần update trước khi commit feature này". Không có nó, docs dần dần lỗi thời so với code._

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

Checklist setup server cho project này — phải update mỗi khi có env var / service / dependency mới.

_Vấn đề nó giải quyết: khi deploy lên server mới (hoặc onboard người mới), nếu không có danh sách đầy đủ env vars / services cần thiết, app sẽ crash và rất khó debug tại sao. File này là "recipe" để tái tạo môi trường chạy được._

Cấu trúc xem `NEW_PROJECT_SETUP.md`.

## CLAUDE.md

Chứa thông tin project-specific để Claude có context ngay khi mở session:
- Tech stack, cấu trúc thư mục
- Env vars, ports, domain
- What's DONE / TODO
- Known fixes (những lỗi đã gặp + cách fix — tránh tìm lại)
- Dòng bắt buộc: `Đọc docs/universal_rules/UNIVERSAL_WORKFLOW.md để áp dụng universal workflow rules.`

_Lý do CLAUDE.md quan trọng: Claude không có memory giữa các session. Không có file này, mỗi session mới Claude phải hỏi lại từ đầu về project, mất thời gian và dễ làm sai._
