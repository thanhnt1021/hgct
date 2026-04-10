#!/bin/bash
# Quick local build + deploy to demo — NO git commit/push needed
# Dùng khi đang iterate nhanh, chưa muốn commit
# Usage: sudo bash /home/hgct/hgct/deploy-demo-local.sh

set -e

APP_DIR="/home/hgct/hgct"
DEMO_DIR="/home/hgct/hgct-demo"

echo "=== HGCT Quick Local Deploy (no git push) ==="

# Ensure demo was set up at least once
if [ ! -d "$DEMO_DIR/.git" ]; then
  echo "ERROR: Demo dir chưa có. Chạy deploy-demo.sh 1 lần trước."
  exit 1
fi
if [ ! -f "$DEMO_DIR/.env.local" ]; then
  echo "ERROR: Demo .env.local chưa có. Chạy deploy-demo.sh 1 lần trước."
  exit 1
fi

# 1. Build from current working directory (uncommitted code OK)
echo "[1/4] Building from local source..."
cd "$APP_DIR"
rm -rf .next
DATABASE_URL=$(grep DATABASE_URL "$APP_DIR/.env.local" | cut -d= -f2- | tr -d '"') npx prisma generate
npx next build

# 2. Prepare standalone bundle
echo "[2/4] Preparing standalone..."
cp "$APP_DIR/.env.local" "$APP_DIR/.next/standalone/.env.local"
rm -rf "$APP_DIR/.next/standalone/.next/static"
cp -r "$APP_DIR/.next/static" "$APP_DIR/.next/standalone/.next/static"
rm -rf "$APP_DIR/.next/standalone/public"
cp -r "$APP_DIR/public" "$APP_DIR/.next/standalone/public"

# 3. Sync build to demo dir (overwrite .next only)
echo "[3/4] Syncing build to demo dir..."
rm -rf "$DEMO_DIR/.next"
cp -r "$APP_DIR/.next" "$DEMO_DIR/.next"
# Build demo .env.local: start from production (always has current DB password + all keys),
# then override only the two demo-specific vars. This prevents stale-credential breakage.
cp "$APP_DIR/.env.local" "$DEMO_DIR/.next/standalone/.env.local"
sed -i 's|^APP_PORT=.*|APP_PORT=65500|' "$DEMO_DIR/.next/standalone/.env.local"
sed -i 's|^NEXTAUTH_URL=.*|NEXTAUTH_URL=https://demo.hatgiongchiemtinh.com|' "$DEMO_DIR/.next/standalone/.env.local"
# Keep $DEMO_DIR/.env.local in sync too (used as reference in future deploys)
cp "$DEMO_DIR/.next/standalone/.env.local" "$DEMO_DIR/.env.local"

# 4. Restart demo service
echo "[4/4] Restarting hgct-demo service..."
fuser -k 65500/tcp 2>/dev/null || true
sleep 1
systemctl daemon-reload
systemctl restart hgct-demo.service
sleep 3

# Fix chromium permissions before hash extraction
chmod 755 /tmp/chromium 2>/dev/null || true

# Update chromium hash in security monitor
CHROMIUM_HASH=$(cd "$APP_DIR" && node scripts/chromium-hash.js 2>/dev/null)
# chmod again in case hash.js re-extracted
chmod 755 /tmp/chromium 2>/dev/null || true
if [ -n "$CHROMIUM_HASH" ]; then
  HASH_FILE="/etc/security-monitor/chromium_hash.txt"
  chattr -i "$HASH_FILE" 2>/dev/null || true
  echo "$CHROMIUM_HASH" > "$HASH_FILE"
  chattr +i "$HASH_FILE"
  echo "Chromium hash updated: $CHROMIUM_HASH"
fi

echo ""
echo "=== Quick Deploy done ==="
echo "URL: https://demo.hatgiongchiemtinh.com"
systemctl status hgct-demo.service --no-pager | head -6
