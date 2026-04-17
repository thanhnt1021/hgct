#!/bin/sh
# Cron sidecar: hit internal API endpoints with CRON_SECRET bearer token.
# Uses curl --config file so Authorization header doesn't appear in process list.

set -e

if [ -z "$CRON_SECRET" ]; then
  echo "ERROR: CRON_SECRET not set" >&2
  exit 1
fi

apk add --no-cache --quiet curl tzdata >/dev/null

# Ho Chi Minh TZ for human-readable log timestamps
export TZ="Asia/Ho_Chi_Minh"

# Write curl config — Authorization header + defaults.
# chmod 600 so nobody else in container can read.
cat > /root/.curlrc <<EOF
silent
show-error
max-time = 300
header = "Authorization: Bearer ${CRON_SECRET}"
EOF
chmod 600 /root/.curlrc

# Wait for hgct-prod to be reachable before starting cron loop
echo "[cron] Waiting for hgct-prod:65498 ..."
for i in $(seq 1 60); do
  if curl -sf -o /dev/null --max-time 3 http://hgct-prod:65498/ 2>/dev/null; then
    echo "[cron] hgct-prod reachable"
    break
  fi
  sleep 2
done

# Write crontab — URLs only (no secret in command line)
cat > /etc/crontabs/root <<'EOF'
# order-check: every minute (critical cho payment flow)
* * * * * curl -o /dev/null http://hgct-prod:65498/api/cron/order-check 2>&1 | logger -t cron-order
# cleanup: 2 AM daily
0 2 * * * curl -o /dev/null http://hgct-prod:65498/api/cron/cleanup 2>&1 | logger -t cron-cleanup
# retention: 9 AM daily
0 9 * * * curl -o /dev/null http://hgct-prod:65498/api/cron/retention 2>&1 | logger -t cron-retention
# kb-sync: 15 phut 1 lan
*/15 * * * * curl -o /dev/null http://hgct-prod:65498/api/cron/kb-sync 2>&1 | logger -t cron-kbsync
EOF

echo "[cron] Starting crond (stdout logs)..."
exec crond -f -l 8 -L /dev/stdout
