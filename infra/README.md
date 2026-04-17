# HGCT — Docker Infrastructure

Các file trong thư mục này là **snapshot** của infrastructure đang chạy production tại `/home/hgct/` trên server `185.197.30.234`. Mục đích: cho phép fresh clone tái tạo full stack mà không mất context.

## Nội dung

| File | Đích trên server | Mô tả |
|---|---|---|
| `docker-compose.yml` | `/home/hgct/docker-compose.yml` | Orchestrate 5 container: postgres, hgct-prod, hgct-demo, nginx, hgct-cron |
| `nginx/conf.d/00-cloudflare-realip.conf` | `/home/hgct/nginx/conf.d/` | CF real IP ranges + `CF-Connecting-IP` header |
| `nginx/conf.d/00-ratelimit.conf` | `/home/hgct/nginx/conf.d/` | Nginx rate limit zone |
| `nginx/conf.d/hgct.conf` | `/home/hgct/nginx/conf.d/` | SSL + server blocks + Telegram webhook IP allowlist |
| `cron/start.sh` | `/home/hgct/cron/start.sh` | Cron sidecar (alpine + crond) gọi 4 API endpoints qua `CRON_SECRET` |

## Setup fresh server

### 1. Clone repos

```bash
# hgct prod
git clone git@github.com:hentaiikidd/hgct.git /home/hgct/hgct

# hgct demo (same repo, separate checkout)
git clone git@github.com:hentaiikidd/hgct.git /home/hgct/hgct-demo
```

### 2. Copy infra files

```bash
cp /home/hgct/hgct/infra/docker-compose.yml /home/hgct/docker-compose.yml
mkdir -p /home/hgct/nginx/conf.d /home/hgct/cron /home/hgct/volumes/{pdfs-prod,pdfs-demo,avatars,nginx-logs}
cp /home/hgct/hgct/infra/nginx/conf.d/*.conf /home/hgct/nginx/conf.d/
cp /home/hgct/hgct/infra/cron/start.sh /home/hgct/cron/
chmod +x /home/hgct/cron/start.sh
```

### 3. SSL certs (Cloudflare Origin Cert)

Generate Origin Cert từ Cloudflare dashboard → Full Strict mode. Paste vào:

```
/home/hgct/nginx/certs/hgct.crt  (full chain)
/home/hgct/nginx/certs/hgct.key  (private key)
chmod 600 /home/hgct/nginx/certs/hgct.key
```

### 4. Environment variables

Copy `.env.example` → `.env.local` cho cả 2 repo + điền secrets:

```bash
cp /home/hgct/hgct/.env.example /home/hgct/hgct/.env.local
cp /home/hgct/hgct/.env.example /home/hgct/hgct-demo/.env.local
# Edit both files with production secrets (see ENV VARS section below)
```

### 5. Postgres DB restore

```bash
# Start postgres only first
docker compose up -d postgres

# Restore DB dump
docker exec -i hgct-postgres psql -U nguydev -d zodiacdb < /path/to/backup.sql
```

### 6. Deploy stack

```bash
cd /home/hgct
docker compose build hgct-prod hgct-demo
docker compose up -d
docker compose logs -f hgct-prod  # verify
```

### 7. Configure Telegram webhook

```bash
curl -s "https://api.telegram.org/bot$TELEGRAM_ADMIN_BOT_TOKEN/setWebhook" \
  -d "url=https://hatgiongchiemtinh.com/api/telegram-admin/$TELEGRAM_ADMIN_WEBHOOK_SECRET/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET_TOKEN"
```

## ENV vars required

Xem `.env.example` ở root — list đầy đủ các env vars + comment từng var. Secrets phải regenerate riêng:

- `NEXTAUTH_SECRET` — 32 bytes base64 (`openssl rand -base64 32`)
- `PROFILE_ENCRYPTION_KEY` — 32 bytes hex (`openssl rand -hex 32`)
- `CRON_SECRET` — 32 bytes hex (same)
- `CTV_JWT_SECRET` — same value as `NEXTAUTH_SECRET` (backward compat)
- `SEPAY_API_KEY` — config từ SePay dashboard
- `OPENROUTER_API_KEY` — OpenRouter.ai
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_BOT_TOKEN` — BotFather
- `TELEGRAM_ADMIN_WEBHOOK_SECRET` — random 64 hex (URL secret)
- `TELEGRAM_WEBHOOK_SECRET_TOKEN` — random 64 hex (header secret)
- `GOOGLE_SERVICE_ACCOUNT_BASE64` — base64-encoded Google SA JSON (for Sheets KB sync)
- `GOOGLE_CLIENT_ID/SECRET` — Google OAuth
- `SMTP_HOST/PORT/USER/PASS` — Hostinger SMTP
- `BANK_ACCOUNT_NUMBER/NAME`, `BANK_NAME` — SePay bank info
- `ADMIN_TELEGRAM_USER_ID` — admin's Telegram user ID

## Sync workflow

**Khi sửa infra trên server:** edit file tại `/home/hgct/docker-compose.yml` (hoặc nginx/cron), TEST kỹ, rồi copy sang `hgct/infra/`:

```bash
cp /home/hgct/docker-compose.yml /home/hgct/hgct/infra/docker-compose.yml
cp /home/hgct/nginx/conf.d/*.conf /home/hgct/hgct/infra/nginx/conf.d/
cp /home/hgct/cron/start.sh /home/hgct/hgct/infra/cron/
cd /home/hgct/hgct && git add infra/ && git commit -m "chore: sync infra snapshot"
```

**Khi pull về và infra đã update:** copy ngược lại:

```bash
cd /home/hgct/hgct && git pull
cp /home/hgct/hgct/infra/docker-compose.yml /home/hgct/docker-compose.yml
# similar for nginx + cron
docker compose up -d --force-recreate
```

## Security notes

- `docker-compose.yml` mount `/var/run/docker.sock` vào hgct-prod (để admin bot restart containers qua Docker API). Container user `node` uid 1000 + supplementary group 988 (host docker GID). Security mitigation: 4-layer auth cho Telegram webhook (URL secret + secret_token header + admin user_id + nginx IP allowlist).
- Host bind-mount volumes chown 1000:1000 (match container `node` user) — container có rwx, host `hgct` user (cùng uid 1000) đọc được native.
- `.env.local` chứa secrets — không commit. Rotate 15 secrets sau mỗi security incident (xem `docs/FIXES_HISTORY.md`).
