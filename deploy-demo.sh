#!/bin/bash
# Deploy script for HGCT Demo (demo.hatgiongchiemtinh.com)
# Usage: bash /root/hgct/deploy-demo.sh [branch-name]
# Run as root

set -e

APP_DIR="/root/hgct"
DEMO_DIR="/root/hgct-demo"
BRANCH="${1:-$(git -C $APP_DIR branch --show-current)}"

echo "=== HGCT Demo Deploy (branch: $BRANCH) ==="

# 0. Allow root to access hgct-owned repo
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
git config --global --add safe.directory "$DEMO_DIR" 2>/dev/null || true

# 0b. Ensure required directories exist
mkdir -p /var/hgct/pdfs
chmod 755 /var/hgct/pdfs

# 1. Setup demo dir as git clone if not exists
if [ ! -d "$DEMO_DIR/.git" ]; then
  echo "[1/6] Cloning repo to $DEMO_DIR..."
  git clone "$APP_DIR" "$DEMO_DIR"
fi
echo "[1/6] Switching demo to branch: $BRANCH..."
git -C "$DEMO_DIR" fetch origin
git -C "$DEMO_DIR" checkout "$BRANCH" 2>/dev/null || git -C "$DEMO_DIR" checkout -b "$BRANCH" "origin/$BRANCH"
git -C "$DEMO_DIR" reset --hard "origin/$BRANCH"

# 2. Install dependencies if needed
if [ ! -d "$DEMO_DIR/node_modules" ]; then
  echo "[2/6] Installing dependencies..."
  cd "$DEMO_DIR" && npm install --production=false
else
  echo "[2/6] Dependencies OK"
fi

# 3. Create demo .env.local if not exists
if [ ! -f "$DEMO_DIR/.env.local" ]; then
  echo "[3/6] Creating demo .env.local..."
  cp "$APP_DIR/.env.local" "$DEMO_DIR/.env.local"
  sed -i 's|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://demo.hatgiongchiemtinh.com|' "$DEMO_DIR/.env.local"
  sed -i 's|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://demo.hatgiongchiemtinh.com|' "$DEMO_DIR/.env.local"
  sed -i 's|APP_PORT=.*|APP_PORT=65499|' "$DEMO_DIR/.env.local"
  echo "    !! Edit $DEMO_DIR/.env.local if needed"
else
  echo "[3/6] Demo .env.local exists"
fi

# 4. Build
echo "[4/6] Building..."
cd "$DEMO_DIR"
rm -rf .next
npx next build

# 5. Copy static assets
echo "[5/6] Copying static assets..."
cp "$DEMO_DIR/.env.local" "$DEMO_DIR/.next/standalone/.env.local"
rm -rf "$DEMO_DIR/.next/standalone/.next/static"
cp -r "$DEMO_DIR/.next/static" "$DEMO_DIR/.next/standalone/.next/static"
rm -rf "$DEMO_DIR/.next/standalone/public"
cp -r "$DEMO_DIR/public" "$DEMO_DIR/.next/standalone/public"

# 6. Install and restart systemd service
echo "[6/6] Updating systemd service..."
cp "$APP_DIR/server_conf/hgct-demo.service" /etc/systemd/system/hgct-demo.service
fuser -k 65499/tcp 2>/dev/null || true
sleep 2
systemctl daemon-reload
systemctl restart hgct-demo.service
systemctl enable hgct-demo.service
sleep 3

# 7. Setup nginx
echo "[7/7] Configuring nginx..."
cp "$APP_DIR/server_conf/demo.hatgiongchiemtinh.com.conf" /etc/nginx/sites-available/hgct-demo.conf
ln -sf /etc/nginx/sites-available/hgct-demo.conf /etc/nginx/sites-enabled/hgct-demo.conf
# Also ensure main production nginx config is in place
cp "$APP_DIR/server_conf/hgct.conf" /etc/nginx/sites-available/hgct.conf
ln -sf /etc/nginx/sites-available/hgct.conf /etc/nginx/sites-enabled/hgct.conf
nginx -t && nginx -s reload

echo ""
echo "=== Demo Deploy complete ==="
echo "URL: https://demo.hatgiongchiemtinh.com"
systemctl status hgct-demo.service --no-pager | head -12
