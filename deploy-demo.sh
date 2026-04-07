#!/bin/bash
# Deploy script for HGCT Demo (demo.hatgiongchiemtinh.com)
# Usage: bash /home/hgct/hgct/deploy-demo.sh [branch-name]
# Run as root

set -e

APP_DIR="/home/hgct/hgct"
DEMO_DIR="/home/hgct/hgct-demo"
GITHUB_REPO="git@github.com:hentaiikidd/hgct.git"
BRANCH="${1:-$(git -C $APP_DIR branch --show-current)}"

echo "=== HGCT Demo Deploy (branch: $BRANCH) ==="

# 0. Use hgct SSH key for GitHub (works even when running as root via sudo)
export GIT_SSH_COMMAND="ssh -i /home/hgct/.ssh/github_hgct -o StrictHostKeyChecking=no"
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
git config --global --add safe.directory "$DEMO_DIR" 2>/dev/null || true

# 0b. Ensure required directories exist
mkdir -p /var/hgct/pdfs
chmod 755 /var/hgct/pdfs

# 1. Clone from GitHub if not exists, else fetch latest
if [ ! -d "$DEMO_DIR/.git" ]; then
  echo "[1/6] Cloning from GitHub to $DEMO_DIR..."
  git clone "$GITHUB_REPO" "$DEMO_DIR"
else
  echo "[1/6] Fetching latest from GitHub..."
  git -C "$DEMO_DIR" fetch origin
fi
git -C "$DEMO_DIR" checkout "$BRANCH" 2>/dev/null || git -C "$DEMO_DIR" checkout -b "$BRANCH" "origin/$BRANCH"
git -C "$DEMO_DIR" reset --hard "origin/$BRANCH"
echo "    Branch: $BRANCH @ $(git -C $DEMO_DIR rev-parse --short HEAD)"

# 2. Install dependencies (always run to pick up new packages)
echo "[2/6] Installing dependencies..."
cd "$DEMO_DIR" && npm install --production=false

# 3. Always re-sync .env.local from production to pick up latest DB password + all keys,
#    then patch the two demo-specific vars. Never trust old $DEMO_DIR/.env.local creds.
echo "[3/6] Syncing .env.local from production (patching demo vars)..."
cp "$APP_DIR/.env.local" "$DEMO_DIR/.env.local"
# NEXTAUTH_URL keeps production value — shares same Google OAuth callback domain
sed -i 's|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://demo.hatgiongchiemtinh.com|' "$DEMO_DIR/.env.local"
sed -i 's|^APP_PORT=.*|APP_PORT=65500|' "$DEMO_DIR/.env.local"

# 4. Build
echo "[4/6] Building..."
cd "$DEMO_DIR"
rm -rf .next
# Regenerate Prisma client in case schema changed
DATABASE_URL=$(grep DATABASE_URL "$DEMO_DIR/.env.local" | cut -d= -f2- | tr -d '"') npx prisma generate
npx next build

# 5. Copy static assets to standalone
echo "[5/6] Copying static assets..."
cp "$DEMO_DIR/.env.local" "$DEMO_DIR/.next/standalone/.env.local"
rm -rf "$DEMO_DIR/.next/standalone/.next/static"
cp -r "$DEMO_DIR/.next/static" "$DEMO_DIR/.next/standalone/.next/static"
rm -rf "$DEMO_DIR/.next/standalone/public"
cp -r "$DEMO_DIR/public" "$DEMO_DIR/.next/standalone/public"

# 6. Systemd service
echo "[6/6] Starting hgct-demo service..."
cp "$APP_DIR/server_conf/hgct-demo.service" /etc/systemd/system/hgct-demo.service
fuser -k 65500/tcp 2>/dev/null || true
sleep 1
systemctl daemon-reload
systemctl restart hgct-demo.service
systemctl enable hgct-demo.service
sleep 3

# 7. Nginx
cp "$APP_DIR/server_conf/demo.hatgiongchiemtinh.com.conf" /etc/nginx/sites-available/hgct-demo.conf
ln -sf /etc/nginx/sites-available/hgct-demo.conf /etc/nginx/sites-enabled/hgct-demo.conf
nginx -t && nginx -s reload

# Register cron jobs for demo (cleanup 2AM daily, order-check every minute)
CRON_SECRET_VAL=$(grep '^CRON_SECRET=' "$DEMO_DIR/.env.local" | cut -d= -f2- | tr -d '"')
if [ -n "$CRON_SECRET_VAL" ]; then
  (crontab -l 2>/dev/null | grep -v 'api/cron' ; \
   echo "0 2 * * * curl -s -H 'Authorization: Bearer ${CRON_SECRET_VAL}' http://localhost:65500/api/cron/cleanup >> /var/log/hgct-cron.log 2>&1" ; \
   echo "* * * * * curl -s -H 'Authorization: Bearer ${CRON_SECRET_VAL}' http://localhost:65500/api/cron/order-check >> /var/log/hgct-cron.log 2>&1") | crontab -
  echo "Cron jobs registered (demo port 65500)"
else
  echo "CRON_SECRET not set — skipping cron registration"
fi

echo ""
echo "=== Demo Deploy complete ==="
echo "URL: https://demo.hatgiongchiemtinh.com | branch: $BRANCH"
systemctl status hgct-demo.service --no-pager | head -8
