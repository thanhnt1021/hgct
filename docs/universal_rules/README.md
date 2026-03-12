# Universal Workflow Rules

Bộ workflow rules dùng chung cho mọi project làm việc với **Claude Code CLI**.
Copy một lần, áp dụng cho tất cả project.

---

## Bắt đầu nhanh

```bash
curl -fsSL https://raw.githubusercontent.com/hentaiikidd/universal-workflow/main/bootstrap.sh | bash
```

Chạy từ **root của project**. Script tự động copy rules, setup CLAUDE.md, dọn dẹp.

> **SSH key không phải `~/.ssh/id_rsa`?**
> ```bash
> curl -fsSL https://raw.githubusercontent.com/hentaiikidd/universal-workflow/main/bootstrap.sh \
>   | BOOTSTRAP_SSH_KEY=~/.ssh/my_key bash
> ```

Sau đó mở **Claude Code CLI** trong project và gõ:

```
check requirements
```

---

## Các cách khác

Xem [BOOTSTRAP.md](./BOOTSTRAP.md) để biết thêm cách setup (thủ công từng bước, copy file, 1-liner git clone).

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
| [`BOOTSTRAP.md`](./BOOTSTRAP.md) | Hướng dẫn bootstrap đầy đủ (3 cách) |

---

## Cập nhật rules

```bash
curl -fsSL https://raw.githubusercontent.com/hentaiikidd/universal-workflow/main/bootstrap.sh | bash
```

Chạy lại từ project root — các file trong `docs/universal_rules/` sẽ được cập nhật.
