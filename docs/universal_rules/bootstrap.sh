#!/usr/bin/env bash
# Universal Workflow Bootstrap Script
# https://github.com/hentaiikidd/universal-workflow
#
# Usage (from project root):
#   curl -fsSL https://raw.githubusercontent.com/hentaiikidd/universal-workflow/main/bootstrap.sh | bash
#   or: bash bootstrap.sh
#   or: BOOTSTRAP_SSH_KEY=~/.ssh/my_key bash bootstrap.sh

set -e

SSH_KEY="${BOOTSTRAP_SSH_KEY:-$HOME/.ssh/id_rsa}"

echo ""
echo "=== Universal Workflow Bootstrap ==="
echo ""

# ── Step 1: Clone and copy rules ──────────────────────────────────────────────
echo "[1/4] Copying universal rules to docs/universal_rules/..."
mkdir -p docs/universal_rules/hooks

CLONE_OK=0
if GIT_SSH_COMMAND="ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
   git clone --quiet git@github.com:hentaiikidd/universal-workflow.git /tmp/_uw 2>/dev/null; then
  CLONE_OK=1
  CLONE_METHOD="SSH"
else
  if git clone --quiet https://github.com/hentaiikidd/universal-workflow.git /tmp/_uw 2>/dev/null; then
    CLONE_OK=1
    CLONE_METHOD="HTTPS"
  fi
fi

if [ "$CLONE_OK" -eq 0 ]; then
  echo "❌ Clone failed. Check network / SSH key."
  echo "   SSH key used: $SSH_KEY"
  echo "   Override: BOOTSTRAP_SSH_KEY=/path/to/key bash bootstrap.sh"
  exit 1
fi

cp /tmp/_uw/*.md docs/universal_rules/
cp /tmp/_uw/hooks/*.py docs/universal_rules/hooks/ 2>/dev/null || true
cp /tmp/_uw/bootstrap.sh docs/universal_rules/ 2>/dev/null || true
rm -rf /tmp/_uw
echo "✅ Rules copied (via $CLONE_METHOD)"

# ── Step 2: CLAUDE.md ─────────────────────────────────────────────────────────
echo "[2/4] Checking CLAUDE.md..."
if [ ! -f CLAUDE.md ]; then
  cat > CLAUDE.md << 'CLAUDEEOF'
# [Ten Project]

## CRITICAL WORKFLOW RULES (KHONG BAO GIO vi pham)

1. **`feature: [ten]`** → tao branch → doc context → hoi bang **AskUserQuestion tool** (KHONG output text) → **DUNG cho user confirm ro rang** → moi duoc code.
2. **KHONG tu** `git commit`, `git push`, `git merge`, deploy production — chi khi user ra lenh ro.
3. **Sau quick deploy** → bao cao ket qua → **DUNG**, khong lam gi them.

> Chi tiet day du: docs/universal_rules/UNIVERSAL_WORKFLOW.md

## Overview
[Mo ta ngan ve project]

## Tech Stack
[Liet ke tech stack]

## What's DONE
- [x] Project scaffolding

## What's TODO
- [ ] ...
CLAUDEEOF
  echo "✅ Created CLAUDE.md"
else
  if ! grep -q "AskUserQuestion" CLAUDE.md; then
    # Patch existing CLAUDE.md: replace plain "Q&A" wording if present
    sed -i 's/hỏi Q\&A (BẮT BUỘC/hỏi bằng AskUserQuestion tool — KHÔNG output text (BẮT BUỘC/g' CLAUDE.md 2>/dev/null || true
    sed -i 's/hỏi Q\&A 1 batch/hỏi bằng AskUserQuestion tool (KHÔNG output text)/g' CLAUDE.md 2>/dev/null || true
    echo "✅ Patched CLAUDE.md: added AskUserQuestion tool requirement"
  else
    echo "✅ CLAUDE.md already mentions AskUserQuestion"
  fi
fi

# ── Step 3: Cleanup ───────────────────────────────────────────────────────────
echo "[3/4] Cleanup..."
if [ -f "BOOTSTRAP.md" ] && [ -f "docs/universal_rules/BOOTSTRAP.md" ]; then
  rm -f BOOTSTRAP.md
  echo "✅ Removed BOOTSTRAP.md from project root"
else
  echo "✅ No cleanup needed"
fi

# ── Step 4: Install hooks globally ────────────────────────────────────────────
echo "[4/4] Installing hooks to ~/.claude/hooks/..."
HOOKS_DEST="$HOME/.claude/hooks"
mkdir -p "$HOOKS_DEST"

# Copy hook scripts
HOOKS_SRC="docs/universal_rules/hooks"
INSTALLED=0
for hook in "$HOOKS_SRC"/*.py; do
  [ -f "$hook" ] || continue
  cp "$hook" "$HOOKS_DEST/"
  chmod +x "$HOOKS_DEST/$(basename "$hook")"
  INSTALLED=$((INSTALLED + 1))
done

if [ "$INSTALLED" -eq 0 ]; then
  echo "⚠️  No hook scripts found in $HOOKS_SRC"
else
  echo "   Copied $INSTALLED hook script(s) to $HOOKS_DEST"
fi

# Register hooks in settings.json
if command -v python3 >/dev/null 2>&1; then
  python3 "$HOOKS_DEST/install_hooks.py" --hooks-dir "$HOOKS_DEST"
  echo "✅ Hooks registered in ~/.claude/settings.json"
else
  echo "⚠️  python3 not found — skipping settings.json update."
  echo "   Run manually: python3 $HOOKS_DEST/install_hooks.py"
fi

echo ""
echo "=== Bootstrap complete! ==="
echo ""
echo "Hooks installed globally — enforcement active for ALL Claude Code sessions."
echo ""
echo "Next: open Claude Code in this project and run:"
echo "  check requirements"
echo ""
