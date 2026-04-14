# Security Monitor — Tài liệu triển khai

Hệ thống quét bảo mật định kỳ + cảnh báo Telegram với HMAC signature.  
Được thiết kế và chạy thực tế tại `hatgiongchiemtinh.com`.

---

## Kiến trúc

```
systemd timer (interval cấu hình được)
    └─ security-monitor.service  (oneshot, User=root)
           └─ monitor.py         → quét 29 điểm → gửi Telegram alert

security-monitor-bot.service     (luôn chạy, User=root)
    └─ bot_handler.py            → nhận callback từ Telegram button
                                   (đổi interval, đánh dấu IP/port safe...)
```

### Files

| File | Quyền | Mô tả |
|------|-------|-------|
| `/opt/security-monitor/monitor.py` | `chattr +i` | Script quét chính |
| `/opt/security-monitor/bot_handler.py` | `chattr +i` | Bot handler |
| `/etc/security-monitor/config.json` | `chattr +i` | Token + chat_id + HMAC secret |
| `/etc/systemd/system/security-monitor.service` | `chattr +i` | Oneshot service |
| `/etc/systemd/system/security-monitor.timer` | `chattr +i` | Timer base |
| `/etc/systemd/system/security-monitor.timer.d/interval.conf` | writable | Interval override |
| `/etc/systemd/system/security-monitor.timer.d/boot-trigger.conf` | writable | Boot trigger |
| `/etc/security-monitor/state.json` | writable | Trạng thái (seen IPs, ports...) |
| `/etc/security-monitor/safe_ips.json` | writable | IP whitelist từ Telegram |
| `/etc/security-monitor/safe_ports.json` | writable | Port whitelist từ Telegram |
| `/etc/security-monitor/safe_tmp_paths.json` | writable | /tmp path whitelist |
| `/var/log/security-monitor.log` | writable | Log file |

---

## Cài đặt trên server mới

### 1. Tạo Telegram Bot

1. Chat với `@BotFather` → `/newbot`
2. Lấy `BOT_TOKEN`
3. Gửi 1 tin nhắn đến bot
4. Lấy `CHAT_ID`: `curl https://api.telegram.org/bot<TOKEN>/getUpdates`

### 2. Tạo thư mục và copy files

```bash
mkdir -p /opt/security-monitor
mkdir -p /etc/security-monitor

# Copy 2 file scripts
cp monitor.py /opt/security-monitor/
cp bot_handler.py /opt/security-monitor/
chmod 755 /opt/security-monitor/monitor.py
chmod 755 /opt/security-monitor/bot_handler.py
```

### 3. Tạo config.json

```bash
cat > /etc/security-monitor/config.json << 'EOF'
{
  "telegram_bot_token": "YOUR_BOT_TOKEN",
  "telegram_chat_id": "YOUR_CHAT_ID",
  "hmac_secret": "RANDOM_SECRET_32_CHARS"
}
EOF
chmod 600 /etc/security-monitor/config.json
```

Tạo HMAC secret ngẫu nhiên:
```bash
openssl rand -hex 16
```

### 4. Tạo state files rỗng

```bash
echo '[]' > /etc/security-monitor/safe_ips.json
echo '[]' > /etc/security-monitor/safe_ports.json
echo '[]' > /etc/security-monitor/safe_tmp_paths.json
echo '{}' > /etc/security-monitor/state.json
chmod 600 /etc/security-monitor/state.json
```

### 5. Tạo systemd services

```bash
# security-monitor.service
cat > /etc/systemd/system/security-monitor.service << 'EOF'
[Unit]
Description=Security Monitor
After=network.target

[Service]
Type=oneshot
User=root
ExecStart=/usr/bin/python3 /opt/security-monitor/monitor.py
StandardOutput=append:/var/log/security-monitor.log
StandardError=append:/var/log/security-monitor.log
EOF

# security-monitor-bot.service
cat > /etc/systemd/system/security-monitor-bot.service << 'EOF'
[Unit]
Description=Security Monitor Bot Handler
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/python3 /opt/security-monitor/bot_handler.py
Restart=always
RestartSec=10
StandardOutput=append:/var/log/security-monitor.log
StandardError=append:/var/log/security-monitor.log

[Install]
WantedBy=multi-user.target
EOF

# security-monitor.timer
cat > /etc/systemd/system/security-monitor.timer << 'EOF'
[Unit]
Description=Security Monitor Timer

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
AccuracySec=10s

[Install]
WantedBy=timers.target
EOF

# Override interval (mặc định 120 phút)
mkdir -p /etc/systemd/system/security-monitor.timer.d
cat > /etc/systemd/system/security-monitor.timer.d/interval.conf << 'EOF'
[Timer]
OnUnitActiveSec=
OnUnitActiveSec=120min
EOF
```

### 6. Enable và start

```bash
systemctl daemon-reload
systemctl enable security-monitor.timer
systemctl start security-monitor.timer
systemctl enable security-monitor-bot.service
systemctl start security-monitor-bot.service
```

### 7. Chạy lần đầu thủ công để test

```bash
systemctl start security-monitor.service
journalctl -u security-monitor.service -n 30
```

### 8. Set immutable (bảo vệ khỏi attacker sửa)

```bash
chattr +i /opt/security-monitor/monitor.py
chattr +i /opt/security-monitor/bot_handler.py
chattr +i /etc/security-monitor/config.json
chattr +i /etc/systemd/system/security-monitor.service
chattr +i /etc/systemd/system/security-monitor.timer
chattr +i /etc/systemd/system/security-monitor-bot.service
```

---

## Tùy chỉnh cho server mới

Mở `monitor.py`, chỉnh các constant ở đầu file:

```python
# Ports được chấp nhận trên server này
KNOWN_PORTS = {
    22,     # SSH
    80,     # HTTP
    443,    # HTTPS
    # Thêm ports của app bạn vào đây
}

# IP prefix của bạn (dùng để SSH)
KNOWN_IP_PREFIXES = [
    "27.79.", "171.228.",   # ← thay bằng IP prefix của bạn
    "127."
]

# Source code paths để check webshell
# (chỉnh trong hàm check_webshells())
```

### Webshell paths — chỉnh trong `check_webshells()`

```python
scan_dirs = [
    "/home/youruser/app1",
    "/home/youruser/app2",
    # ...
]
```

### SSH keys baseline — chỉnh trong `check_ssh_authorized_keys()`

Lần đầu chạy, nó sẽ tự học baseline. Sau đó alert khi có key mới.

### nginx config baseline — tương tự, tự học lần đầu.

---

## 29 điểm kiểm tra

| # | Tên | Mô tả |
|---|-----|-------|
| 1 | Crontab độc hại | `/etc/crontab`, `/etc/cron.d/*`, `/var/spool/cron/crontabs/*` |
| 2 | File thực thi trong /tmp | `/tmp`, `/var/tmp`, `/dev/shm` |
| 3 | Process đáng ngờ | xmrig, stratum, cpuminer, NEUGLOBALLY... |
| 4 | Port lạ | So với KNOWN_PORTS whitelist |
| 5 | Systemd service đáng ngờ | Service mới không trong whitelist |
| 6 | SSH key lạ | root + app user authorized_keys |
| 7 | /etc/passwd thay đổi | User mới hoặc shell thay đổi |
| 8 | Login từ IP lạ | So với KNOWN_IP_PREFIXES |
| 9 | Shell profile bị inject | `.bashrc`, `.profile`, `.zshrc` — root + user |
| 10 | LD_PRELOAD rootkit | `/etc/ld.so.preload` |
| 11 | Kết nối ra ngoài đáng ngờ | Mining ports (3333, 4444, 14444), IP xấu |
| 12 | Webshell trong source code | PHP/Python/JS patterns trong app dirs |
| 13 | SUID file lạ | Ngoài /usr /bin /sbin /snap |
| 14 | Iptables rule lạ | ACCEPT rule cho port lạ |
| 15 | Kernel module lạ | Module mới load |
| 16 | /etc/profile.d/ bị inject | Script độc hại |
| 17 | /etc/rc.local độc hại | |
| 18 | /etc/init.d/ độc hại | Whitelist các scripts hợp lệ |
| 19 | sshd_config thay đổi | Hash so sánh |
| 20 | sudoers thay đổi | `/etc/sudoers` + `/etc/sudoers.d/` |
| 21 | At job độc hại | `/var/spool/cron/atjobs` |
| 22 | Systemd timer độc hại | `*.timer` không trong whitelist |
| 23 | /etc/hosts thay đổi | Hash so sánh |
| 24 | User mới trong sudo group | `getent group sudo root` |
| 25 | nginx config thay đổi | Hash từng file trong sites-enabled |
| 26 | PAM config thay đổi | Hash `/etc/pam.d/` |
| 27 | MOTD script độc hại | `/etc/update-motd.d/` |
| 28 | /etc/bash.bashrc bị inject | System-wide bashrc |
| **29** | **udev rule độc hại** | **`/etc/udev/rules.d/` có `RUN+=` chứa shell** |

---

## Telegram buttons (interactive)

Khi bot gửi alert, có các nút:

| Button | Hành động |
|--------|-----------|
| ✅ Báo cáo OK | Gửi tin "hệ thống sạch" sau khi xử lý |
| 🕐 Đổi interval | Đổi tần suất quét: 1/2/5/10/15/30/120 phút |
| 🔒 Đánh dấu IP safe | Whitelist IP trong login alert |
| 🔒 Đánh dấu port safe | Whitelist port trong port alert |
| 🗂️ Đánh dấu path safe | Whitelist /tmp path |

---

## HMAC verification

Mỗi alert có dòng:
```
🔐 SIG: f0039dfc9f38ddc5
```

Bot chỉ chấp nhận callback nếu SIG khớp với HMAC tính từ `hmac_secret` trong config.json.  
→ Ngăn attacker giả tin nhắn để thao túng bot.

---

## Cập nhật monitor (khi file bị chattr +i)

```bash
# 1. Bỏ immutable
chattr -i /opt/security-monitor/monitor.py

# 2. Sửa file

# 3. Test syntax
python3 -m py_compile /opt/security-monitor/monitor.py

# 4. Restore immutable
chattr +i /opt/security-monitor/monitor.py
```

---

## Troubleshooting

```bash
# Xem log
tail -f /var/log/security-monitor.log

# Chạy thủ công (test)
python3 /opt/security-monitor/monitor.py

# Kiểm tra bot handler
systemctl status security-monitor-bot.service
journalctl -u security-monitor-bot.service -n 50

# Kiểm tra timer
systemctl list-timers security-monitor.timer

# Reset state (xóa baseline học được, sẽ re-learn lần chạy tiếp)
echo '{}' > /etc/security-monitor/state.json
```

---

## Lưu ý bảo mật quan trọng

- **`chattr +i` tất cả files core** — attacker không thể sửa monitor dù có root
- **HMAC secret** phải đủ mạnh, không để lộ
- **Bot token** giữ bí mật — ai có token có thể spam vào chat của bạn
- **Interval mặc định 120 phút** — đủ để detect attack mà không tốn tài nguyên
- **State.json ghi lại baseline** — lần đầu chạy trên server mới nó sẽ "học" trạng thái hiện tại, từ lần 2 trở đi mới alert khi có thay đổi
