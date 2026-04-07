#!/bin/bash
set -e

echo "=== Deploying hgct (hatgiongchiemtinh.com) ==="

cd /home/hgct/hgct

# Install dependencies
echo "[1/5] Installing dependencies..."
npm install --production

# Build Next.js
echo "[2/5] Building Next.js..."
npm run build

# Copy nginx config
echo "[3/5] Setting up nginx..."
cp server_conf/hgct.conf /etc/nginx/sites-available/hgct.conf
ln -sf /etc/nginx/sites-available/hgct.conf /etc/nginx/sites-enabled/hgct.conf
nginx -t && systemctl reload nginx

# Setup systemd service
echo "[4/5] Setting up systemd service..."
cp server_conf/hgct.service /etc/systemd/system/hgct.service
systemctl daemon-reload
systemctl enable hgct
systemctl restart hgct

# SSL (if not already setup)
echo "[5/5] Checking SSL..."
if ! [ -f /etc/letsencrypt/live/hatgiongchiemtinh.com/fullchain.pem ]; then
  certbot --nginx -d hatgiongchiemtinh.com --non-interactive --agree-tos -m admin@hatgiongchiemtinh.com
fi

echo "=== Deploy complete! ==="
systemctl status hgct --no-pager
