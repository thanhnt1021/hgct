#!/usr/bin/env python3
"""Install universal-workflow hooks into ~/.claude/settings.json.

Merges hook entries without overwriting existing ones.
Safe to run multiple times (idempotent).

Usage:
  python3 install_hooks.py
  python3 install_hooks.py --hooks-dir /path/to/hooks
"""
import json
import os
import sys

SETTINGS_PATH = os.path.expanduser("~/.claude/settings.json")


def get_hooks_dir() -> str:
    if "--hooks-dir" in sys.argv:
        idx = sys.argv.index("--hooks-dir")
        return sys.argv[idx + 1]
    # Default: same directory as this script
    return os.path.dirname(os.path.abspath(__file__))


def load_settings() -> dict:
    if os.path.exists(SETTINGS_PATH):
        with open(SETTINGS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_settings(settings: dict) -> None:
    os.makedirs(os.path.dirname(SETTINGS_PATH), exist_ok=True)
    with open(SETTINGS_PATH, "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=2, ensure_ascii=False)
        f.write("\n")


def is_registered(hooks_list: list, command: str) -> bool:
    """Check if a command is already registered in a hooks list."""
    for entry in hooks_list:
        for h in entry.get("hooks", []):
            if h.get("command") == command:
                return True
    return False


def ensure_hook(settings: dict, event: str, matcher: str, command: str, timeout: int = 5) -> bool:
    """Add hook entry if not already present. Returns True if added."""
    if "hooks" not in settings:
        settings["hooks"] = {}
    if event not in settings["hooks"]:
        settings["hooks"][event] = []

    hooks_list = settings["hooks"][event]

    if is_registered(hooks_list, command):
        return False  # already there

    hooks_list.append({
        "matcher": matcher,
        "hooks": [{"type": "command", "command": command, "timeout": timeout}]
    })
    return True


def main() -> None:
    hooks_dir = get_hooks_dir()
    settings = load_settings()
    added = []

    notify  = os.path.join(hooks_dir, "claude_notify.sh")
    askback = os.path.join(hooks_dir, "askback_enforce.py")
    viet    = os.path.join(hooks_dir, "viet_diacritics_check.py")

    # claude_notify: UserPromptSubmit + PreToolUse(AskUserQuestion) + Notification + Stop
    if os.path.exists(notify):
        config = os.path.join(hooks_dir, "telegram_config.env")
        if not os.path.exists(config):
            print(f"  WARNING: telegram_config.env not found — copy from telegram_config.env.example and fill in BOT_TOKEN + CHAT_ID")
        if ensure_hook(settings, "UserPromptSubmit", "", notify, timeout=5):
            added.append("UserPromptSubmit -> claude_notify.sh")
        if ensure_hook(settings, "PreToolUse", "AskUserQuestion", notify, timeout=5):
            added.append("PreToolUse(AskUserQuestion) -> claude_notify.sh")
        if ensure_hook(settings, "Notification", "", notify, timeout=5):
            added.append("Notification -> claude_notify.sh")
        if ensure_hook(settings, "Stop", "", notify, timeout=10):
            added.append("Stop -> claude_notify.sh")
    else:
        print(f"  WARNING: {notify} not found — skipping notify hooks")

    # askback_enforce: UserPromptSubmit + Stop
    if os.path.exists(askback):
        if ensure_hook(settings, "UserPromptSubmit", "", askback, timeout=5):
            added.append("UserPromptSubmit -> askback_enforce.py")
        if ensure_hook(settings, "Stop", "", askback, timeout=10):
            added.append("Stop -> askback_enforce.py")
    else:
        print(f"  WARNING: {askback} not found — skipping askback hooks")

    # viet_diacritics_check: PreToolUse Write + Edit
    if os.path.exists(viet):
        if ensure_hook(settings, "PreToolUse", "Write", viet, timeout=5):
            added.append("PreToolUse(Write) -> viet_diacritics_check.py")
        if ensure_hook(settings, "PreToolUse", "Edit", viet, timeout=5):
            added.append("PreToolUse(Edit) -> viet_diacritics_check.py")
    else:
        print(f"  WARNING: {viet} not found — skipping diacritics hooks")

    save_settings(settings)

    if added:
        for entry in added:
            print(f"  + {entry}")
        print(f"  => {SETTINGS_PATH} updated ({len(added)} entries added)")
    else:
        print(f"  => {SETTINGS_PATH} already up to date (no changes)")


if __name__ == "__main__":
    main()
