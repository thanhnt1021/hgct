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

# Step 1: Clone and copy rules
echo "[1/3] Copying universal rules to docs/universal_rules/..."
mkdir -p docs/universal_rules

if GIT_SSH_COMMAND="ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
   git clone --quiet git@github.com:hentaiikidd/universal-workflow.git /tmp/_uw 2>/dev/null; then
  cp /tmp/_uw/*.md docs/universal_rules/
  rm -rf /tmp/_uw
  echo "✅ Rules copied (via SSH)"
else
  echo "   SSH failed, trying HTTPS..."
  if git clone --quiet https://github.com/hentaiikidd/universal-workflow.git /tmp/_uw 2>/dev/null; then
    cp /tmp/_uw/*.md docs/universal_rules/
    rm -rf /tmp/_uw
    echo "✅ Rules copied (via HTTPS)"
  else
    echo "❌ Clone failed. Check network / SSH key."
    echo "   SSH key used: $SSH_KEY"
    echo "   Override: BOOTSTRAP_SSH_KEY=/path/to/key bash bootstrap.sh"
    exit 1
  fi
fi

# Step 2: CLAUDE.md
echo "[2/3] Checking CLAUDE.md..."
if [ ! -f CLAUDE.md ]; then
  cat > CLAUDE.md << 'CLAUDEEOF'
# [Tên Project]

## Overview
[Mô tả ngắn về project]

> Đọc docs/universal_rules/UNIVERSAL_WORKFLOW.md để áp dụng universal workflow rules.

## Tech Stack
[Liệt kê tech stack]

## What's DONE ✓
- [x] Project scaffolding

## What's TODO
- [ ] ...
CLAUDEEOF
  echo "✅ Created CLAUDE.md (điền thông tin project vào)"
else
  if ! grep -q "UNIVERSAL_WORKFLOW" CLAUDE.md; then
    echo "" >> CLAUDE.md
    echo '> Đọc docs/universal_rules/UNIVERSAL_WORKFLOW.md để áp dụng universal workflow rules.' >> CLAUDE.md
    echo "✅ Added reference line to CLAUDE.md"
  else
    echo "✅ CLAUDE.md already has reference line"
  fi
fi

# Step 3: Cleanup — xóa BOOTSTRAP.md ở root nếu user copy vào thủ công
echo "[3/3] Cleanup..."
if [ -f "BOOTSTRAP.md" ] && [ -f "docs/universal_rules/BOOTSTRAP.md" ]; then
  rm -f BOOTSTRAP.md
  echo "✅ Removed BOOTSTRAP.md from project root (canonical copy in docs/universal_rules/)"
else
  echo "✅ No cleanup needed"
fi

echo ""
echo "=== Bootstrap complete! ==="
echo ""
echo "Next: open Claude Code in this project and run:"
echo "  check requirements"
echo ""
