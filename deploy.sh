#!/bin/bash
# Deploy script for HGCT Next.js app
# Run as root: sudo bash /home/hgct/hgct/deploy.sh
# SECURITY: build chạy với quyền hgct (không phải root) để ngăn supply chain attack.
# Root chỉ dùng cho: systemd, chromium chmod, cron.

set -e

APP_DIR="/home/hgct/hgct"

echo "=== HGCT Deploy ==="

# 0. Ensure required directories exist (cần root)
mkdir -p /var/hgct/pdfs
chmod 755 /var/hgct/pdfs
chown -R hgct:hgct "$APP_DIR/.next" 2>/dev/null || true

# 1. Clean previous build then build fresh — CHẠY LÀ hgct, không phải root
# Lý do: build chạy với root → compiled files owned by root → attacker có thể inject
# vào source trước khi deploy rồi code độc được compile với quyền root (Apr 2026 attack)
cd "$APP_DIR"
echo "[1/5] Cleaning old build & building as hgct..."
su -s /bin/bash hgct -c "cd $APP_DIR && rm -rf .next && npx next build"

# 2. Copy static assets to standalone (REQUIRED — Next.js does not do this automatically)
echo "[2/5] Copying static assets to standalone..."
su -s /bin/bash hgct -c "
  cp $APP_DIR/.env.local $APP_DIR/.next/standalone/.env.local
  rm -rf $APP_DIR/.next/standalone/.next/static
  cp -r $APP_DIR/.next/static $APP_DIR/.next/standalone/.next/static
  rm -rf $APP_DIR/.next/standalone/public
  cp -r $APP_DIR/public $APP_DIR/.next/standalone/public
"
echo "    CSS: $(ls $APP_DIR/.next/standalone/.next/static/css/ 2>/dev/null | head -1)"

# 3. Update systemd service
echo "[3/5] Updating systemd service..."
cat > /etc/systemd/system/hgct.service << 'EOF'
[Unit]
Description=HGCT Next.js App
After=network.target postgresql.service

[Service]
Type=simple
User=hgct
Group=hgct
WorkingDirectory=/home/hgct/hgct/.next/standalone
Environment="PORT=65498"
Environment="NODE_ENV=production"
EnvironmentFile=/home/hgct/hgct/.env.local
ExecStartPre=/bin/sh -c 'fuser -k 65498/tcp 2>/dev/null || true'
ExecStartPre=/bin/sleep 1
ExecStart=/usr/bin/node /home/hgct/hgct/.next/standalone/server.js
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

# Fix chromium permissions: chromium-hash.js extracts /tmp/chromium as root (rwx------).
# Service runs as hgct (not root) → EACCES on first PDF job. Must chmod before service uses it.
chmod 755 /tmp/chromium 2>/dev/null || true

# Update chromium hash in security monitor (auto-detects new version after npm install)
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

# Register cron jobs (cleanup 2AM daily, order-check every minute)
CRON_SECRET_VAL=$(grep '^CRON_SECRET=' "$APP_DIR/.env.local" | cut -d= -f2- | tr -d '"')
if [ -n "$CRON_SECRET_VAL" ]; then
  (crontab -l 2>/dev/null | grep -v 'api/cron' ; \
   echo "0 2 * * * curl -s -H 'Authorization: Bearer ${CRON_SECRET_VAL}' http://localhost:65498/api/cron/cleanup >> /var/log/hgct-cron.log 2>&1" ; \
   echo "* * * * * curl -s -H 'Authorization: Bearer ${CRON_SECRET_VAL}' http://localhost:65498/api/cron/order-check >> /var/log/hgct-cron.log 2>&1" ; \
   echo "0 9 * * * curl -s -H 'Authorization: Bearer ${CRON_SECRET_VAL}' http://localhost:65498/api/cron/retention >> /var/log/hgct-cron.log 2>&1") | crontab -
  echo "Cron jobs registered (cleanup: 2AM, order-check: every minute, retention: 9AM daily)"
else
  echo "CRON_SECRET not set — skipping cron registration"
fi
