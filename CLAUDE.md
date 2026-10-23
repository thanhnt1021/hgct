@AGENTS.md

# HGCT - Hạt Giống Chiêm Tinh (Claude-only)

> Luật luôn-nạp + bản đồ rule: `AGENTS.md` (sinh từ `docs/univ3/SPINE.md`, dùng chung Claude/Codex). File này chỉ có phần Claude Code CLI-specific.

## Nhắc lại CRITICAL RULES (đã có trong AGENTS.md, ghi lại ở đây cho chắc — Claude luôn đọc CLAUDE.md đầu tiên)

1. **`feature: [tên]`** → tạo branch → đọc context → hỏi bằng **AskUserQuestion tool** — KHÔNG output Q1/Q2/Q3 text → **DỪNG chờ user confirm rõ ràng** (`làm đi`, `go ahead`...) → mới được code. Plan đính kèm là INPUT để đối chiếu, **KHÔNG phải lệnh implement**.
2. **KHÔNG tự** `git commit`, `git push`, `git merge`, deploy production — chỉ khi user ra lệnh rõ.
3. **Sau quick deploy** → báo cáo kết quả → **DỪNG**, không làm gì thêm.

**Quy tắc file MD:** Mọi file `.md` mới (trừ `CLAUDE.md`/`AGENTS.md`/`README.md`) đều mặc định tạo trong `/docs/`.

## Đọc gì khi bắt đầu
- `AGENTS.md` (luật + bản đồ rule, luôn nạp đầu phiên qua hook `session_context.py`)
- `docs/PROJECT_SUMMARY.md` (tech stack, kiến trúc, folder structure, deploy — đọc trước khi code feature/fix bug)
- `docs/GOAL.md` (mục tiêu cuối + milestone + pending)
- Chi tiết rule theo tình huống: `docs/univ3/rules/*.md`, skill theo `docs/univ3/skills/*/SKILL.md`

## Universal rules — nguồn (v3)
- SSOT: `github.com/thanhnt1021/univ3` (public) — nhúng tại `docs/univ3/` (không phải nested git repo)
- Cài/đồng bộ: `python3 docs/univ3/install.py --harness all` (hook + skill + agent + git pre-commit)
- Cập nhật từ SSOT / push rule mới ngược lại: xem `docs/univ3/HUONG_DAN.md` mục "Cập nhật từ SSOT" + `docs/univ3/rules/WORKFLOWS.md` §sync-uni
- **v2 cũ** (`docs/universal_rules/`) **giữ nguyên làm bản đối chiếu** — không xoá, không dùng làm nguồn nữa.
