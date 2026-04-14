#!/bin/bash
# Patch security monitor: thêm check udev rules (điểm 29)
# Chạy bằng root: sudo bash /home/hgct/hgct/patch-monitor.sh

set -e
MONITOR="/opt/security-monitor/monitor.py"

# 1. Bỏ immutable flag
chattr -i "$MONITOR"

# 2. Backup
cp "$MONITOR" "${MONITOR}.bak.$(date +%Y%m%d%H%M%S)"

# 3. Insert check_udev_rules function sau check_system_bashrc (dòng 929)
python3 << 'PYEOF'
import re

path = "/opt/security-monitor/monitor.py"
content = open(path).read()

new_function = '''

def check_udev_rules() -> list:
    """Phát hiện udev rules độc hại trong /etc/udev/rules.d/ có chứa shell command."""
    issues = []
    udev_dir = "/etc/udev/rules.d"
    # Patterns nghi ngờ trong RUN+= của udev rule
    SUSPICIOUS = [
        r"base64",
        r"/bin/sh",
        r"/bin/bash",
        r"curl\s",
        r"wget\s",
        r"python3?\s",
        r"perl\s",
        r"nc\s",
        r"ncat\s",
        r"chmod\s",
        r"cron\.d",
        r"crontab",
    ]
    try:
        import os, re as _re
        for fname in os.listdir(udev_dir):
            fpath = os.path.join(udev_dir, fname)
            if not os.path.isfile(fpath):
                continue
            try:
                text = open(fpath).read()
            except Exception:
                continue
            # Chỉ quan tâm đến rules có RUN+=
            if "RUN+=" not in text:
                continue
            for pat in SUSPICIOUS:
                if _re.search(pat, text):
                    issues.append(f"udev rule độc hại [{fname}]: chứa '{pat}'")
                    break
    except Exception:
        pass
    return issues

'''

# Insert sau dòng cuối của check_system_bashrc (trước check_sudo_group)
insert_before = "\ndef check_sudo_group() -> list:"
content = content.replace(insert_before, new_function + "\ndef check_sudo_group() -> list:")

# Thêm vào checks list (sau dòng "/etc/bash.bashrc bị inject")
old_checks_entry = '        ("/etc/bash.bashrc bị inject", check_system_bashrc),'
new_checks_entry = old_checks_entry + '\n        ("udev rule độc hại", check_udev_rules),'
content = content.replace(old_checks_entry, new_checks_entry)

# Thêm emoji
old_emoji = '        "/etc/bash.bashrc bị inject": "💉",'
new_emoji = old_emoji + '\n        "udev rule độc hại": "🎯",'
content = content.replace(old_emoji, new_emoji)

open(path, "w").write(content)
print("✅ Patch applied")
PYEOF

# 4. Verify syntax
python3 -m py_compile "$MONITOR" && echo "✅ Syntax OK"

# 5. Restore immutable flag
chattr +i "$MONITOR"

echo "✅ Done. Restart monitor:"
echo "   systemctl restart security-monitor-bot.service"
