#!/bin/bash
set -e

echo "=== Updating hgct ==="
cd /home/hgct/hgct

su -s /bin/bash hgct -c "cd /home/hgct/hgct && npm install --production"
chown -R hgct:hgct /home/hgct/hgct/.next 2>/dev/null || true
su -s /bin/bash hgct -c "cd /home/hgct/hgct && npm run build"
systemctl restart hgct

echo "=== Update complete! ==="
systemctl status hgct --no-pager
