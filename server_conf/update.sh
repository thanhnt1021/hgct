#!/bin/bash
set -e

echo "=== Updating hgct ==="
cd /home/hgct/hgct

npm install --production
npm run build
systemctl restart hgct

echo "=== Update complete! ==="
systemctl status hgct --no-pager
