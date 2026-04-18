# Claude Code Hooks — Telegram Notifications + TMUX Menu

Reusable setup cho mọi server chạy Claude Code CLI. Gồm:

1. **Telegram notifications** — bot gửi tin nhắn khi Claude xong task / hỏi câu / cần permission
2. **TMUX auto-menu** — SSH vào → menu tương tác để attach/tạo/kill session

---

## Files

| File | Mô tả |
|---|---|
| `claude_notify.sh` | Hook script, gọi bởi Claude CLI trên 4 event |
| `install_hooks.py` | Register hooks vào `~/.claude/settings.json` (idempotent) |
| `telegram_config.env.example` | Template config — copy sang `telegram_config.env` rồi điền values |
| `tmux-menu.sh` | Auto-menu khi SSH + aliases (`t`, `a`, `k`, `d`, `n`, `m`) |

---

## Install (trên server mới)

```bash
# 1. Dependencies
sudo apt install -y tmux jq curl python3

# 2. Clone universal-workflow
git clone git@github.com:hentaiikidd/universal-workflow.git /tmp/universal-workflow

# 3. Telegram hooks
mkdir -p ~/.claude/hooks
cp /tmp/universal-workflow/scripts/claude-hooks/claude_notify.sh ~/.claude/hooks/
cp /tmp/universal-workflow/scripts/claude-hooks/install_hooks.py ~/.claude/hooks/
cp /tmp/universal-workflow/scripts/claude-hooks/telegram_config.env.example \
   ~/.claude/hooks/telegram_config.env

# 4. Fill in BOT_TOKEN + CHAT_ID
nano ~/.claude/hooks/telegram_config.env
chmod 600 ~/.claude/hooks/telegram_config.env

# 5. Register hooks
python3 ~/.claude/hooks/install_hooks.py

# 6. TMUX auto-menu
echo "set -g mouse on" > ~/.tmux.conf
cp /tmp/universal-workflow/scripts/claude-hooks/tmux-menu.sh ~/.tmux-menu.sh

# Add to ~/.bashrc if not already:
if ! grep -q "tmux-menu.sh" ~/.bashrc; then
  echo '[ -f ~/.tmux-menu.sh ] && source ~/.tmux-menu.sh' >> ~/.bashrc
fi

# 7. Test Telegram send
source ~/.claude/hooks/telegram_config.env
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d "chat_id=${CHAT_ID}" \
  -d "text=✅ Claude hooks installed on $(hostname)"

# 8. Reload
source ~/.bashrc
```

---

## Bot setup (nếu chưa có bot)

1. Chat với `@BotFather` trên Telegram → `/newbot` → đặt tên → nhận token
2. Chat với bot vừa tạo 1 câu bất kỳ (để bot seen you)
3. Lấy chat_id: `curl https://api.telegram.org/bot<TOKEN>/getUpdates` → tìm `chat.id`
4. Group chat_id có dấu `-` phía trước (supergroup là `-100...`)
5. Dán token + chat_id vào `telegram_config.env`

Có thể reuse 1 bot cho nhiều server (bot send-only, zero risk). Không reuse bot có webhook/command — sẽ conflict.

---

## Events captured

| Event | Khi nào | Tin nhắn |
|---|---|---|
| `UserPromptSubmit` | Bắt đầu task | (silent, lưu start time) |
| `PreToolUse(AskUserQuestion)` | Claude hỏi user interactive | "Wait for Answers" |
| `Notification(permission_prompt)` | Claude cần permission | "Permission needed" |
| `Stop` | Kết thúc task | "Task completed" + duration (skip nếu <3s) |

---

## Troubleshooting

**Hook không fire:**
```bash
cat ~/.claude/settings.json | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin).get('hooks', {}), indent=2))"
```
Phải thấy 4 entry UserPromptSubmit/PreToolUse/Notification/Stop.

**Test thủ công:**
```bash
mkdir -p /tmp/claude_hooks
START=$(($(date +%s) - 10))
echo "${START}|Test message" > /tmp/claude_hooks/test-session
echo '{"hook_event_name":"Stop","session_id":"test-session","cwd":"'$(pwd)'"}' | \
  bash ~/.claude/hooks/claude_notify.sh
```

Nếu không có Telegram đến → check `BOT_TOKEN`, `CHAT_ID` trong config, chạy curl test thủ công.

**Telegram "message thread not found":**
`TELEGRAM_THREAD_ID` phải là thread_id thật của forum topic, không phải message_id. Nếu group chưa bật topics → để trống.
