#!/usr/bin/env python3
"""Install Claude Code hooks into ~/.claude/settings.json.

Merges hook entries without overwriting existing ones.
Safe to run multiple times (idempotent).

Usage:
  python3 install_hooks.py
  python3 install_hooks.py --hooks-dir /path/to/hooks
"""
import json
import os
import stat
import sys

SETTINGS_PATH = os.path.expanduser("~/.claude/settings.json")


def get_hooks_dir() -> str:
    if "--hooks-dir" in sys.argv:
        idx = sys.argv.index("--hooks-dir")
        return sys.argv[idx + 1]
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
    for entry in hooks_list:
        for h in entry.get("hooks", []):
            if h.get("command") == command:
                return True
    return False


def ensure_hook(settings: dict, event: str, matcher: str, command: str, timeout: int = 5) -> bool:
    if "hooks" not in settings:
        settings["hooks"] = {}
    if event not in settings["hooks"]:
        settings["hooks"][event] = []

    hooks_list = settings["hooks"][event]

    if is_registered(hooks_list, command):
        return False

    hooks_list.append({
        "matcher": matcher,
        "hooks": [{"type": "command", "command": command, "timeout": timeout}]
    })
    return True


def ensure_executable(path: str) -> None:
    """Bug fix: ensure hook script is executable (rwxr-xr-x)."""
    if os.path.exists(path):
        st = os.stat(path)
        os.chmod(path, st.st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)


def main() -> None:
    hooks_dir = get_hooks_dir()
    settings = load_settings()
    added = []

    notify = os.path.join(hooks_dir, "claude_notify.sh")

    if os.path.exists(notify):
        ensure_executable(notify)
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

    save_settings(settings)

    if added:
        for entry in added:
            print(f"  + {entry}")
        print(f"  => {SETTINGS_PATH} updated ({len(added)} entries added)")
    else:
        print(f"  => {SETTINGS_PATH} already up to date (no changes)")


if __name__ == "__main__":
    main()
