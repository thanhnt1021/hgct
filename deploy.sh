#!/bin/bash
# Deploy script for HGCT Next.js app
# Run as root: bash /root/hgct/deploy.sh

set -e

APP_DIR="/root/hgct"

echo "=== HGCT Deploy ==="

# 0. Allow root to access hgct-owned repo
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

# 0b. Ensure required directories exist
mkdir -p /var/hgct/pdfs
chmod 755 /var/hgct/pdfs

# 1. Clean previous build then build fresh
cd "$APP_DIR"
echo "[1/5] Cleaning old build & building..."
rm -rf "$APP_DIR/.next"
npx next build

# 2. Copy static assets to standalone (REQUIRED — Next.js does not do this automatically)
echo "[2/5] Copying static assets to standalone..."
cp "$APP_DIR/.env.local" "$APP_DIR/.next/standalone/.env.local"
rm -rf "$APP_DIR/.next/standalone/.next/static"
cp -r "$APP_DIR/.next/static" "$APP_DIR/.next/standalone/.next/static"
rm -rf "$APP_DIR/.next/standalone/public"
cp -r "$APP_DIR/public" "$APP_DIR/.next/standalone/public"
echo "    CSS: $(ls $APP_DIR/.next/standalone/.next/static/css/ 2>/dev/null | head -1)"

# 3. Update systemd service
echo "[3/5] Updating systemd service..."
cat > /etc/systemd/system/hgct.service << 'EOF'
[Unit]
Description=HGCT Next.js App
After=network.target postgresql.service

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/root/hgct/.next/standalone
Environment="PORT=65498"
Environment="NODE_ENV=production"
EnvironmentFile=/root/hgct/.env.local
ExecStartPre=/bin/sh -c 'fuser -k 65498/tcp 2>/dev/null || true'
ExecStartPre=/bin/sleep 1
ExecStart=/usr/bin/node /root/hgct/.next/standalone/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 4. Kill old server + reload
echo "[4/5] Killing old server on :65498..."
fuser -k 65498/tcp 2>/dev/null || true
sleep 2

# 5. Restart service
echo "[5/5] Starting service..."
systemctl daemon-reload
systemctl restart hgct.service
systemctl enable hgct.service
sleep 3

echo ""
echo "=== Deploy complete ==="
systemctl status hgct.service --no-pager | head -12

# Verify CSS is served
CSS_FILE=$(ls "$APP_DIR/.next/static/css/" | head -1)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:65498/_next/static/css/$CSS_FILE")
echo "CSS check: $HTTP_CODE (should be 200)"

# Re-register Telegram admin webhook (fixes sync errors caused by deploy downtime)
TG_TOKEN=$(grep '^TELEGRAM_ADMIN_BOT_TOKEN=' "$APP_DIR/.env.local" | cut -d= -f2-)
TG_SECRET=$(grep '^TELEGRAM_ADMIN_WEBHOOK_SECRET=' "$APP_DIR/.env.local" | cut -d= -f2-)
if [ -n "$TG_TOKEN" ] && [ -n "$TG_SECRET" ]; then
  WEBHOOK_RESULT=$(curl -s "https://api.telegram.org/bot${TG_TOKEN}/setWebhook?url=https://hatgiongchiemtinh.com/api/telegram-admin/${TG_SECRET}/webhook&drop_pending_updates=true")
  echo "Telegram webhook: $(echo $WEBHOOK_RESULT | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("description","?"))'  2>/dev/null || echo 'registered')"
fi
