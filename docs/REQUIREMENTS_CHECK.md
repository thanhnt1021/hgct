# Server Requirements Checklist

Dùng file này khi migrate sang server mới.
Sau khi `git clone`, mở Claude CLI và yêu cầu: **"check requirements"** — Claude sẽ tự đọc file này, kiểm tra từng mục, hỏi input cần thiết và setup tự động những gì có thể.

**⚠️ Quy tắc bảo trì:** Mỗi khi project có tính năng mới cần thêm env var, service, hoặc dependency mới → **phải update file này ngay khi commit**.

---

## 1. System Packages

| Package | Yêu cầu | Cách cài |
|---|---|---|
| Node.js | >= 20.x | `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo -E bash - && sudo apt install nodejs` |
| npm | >= 10.x | đi kèm Node.js |
| PostgreSQL | >= 16.x | `sudo apt install postgresql postgresql-contrib` |
| Nginx | >= 1.24 | `sudo apt install nginx` |
| Certbot | any | `sudo apt install certbot python3-certbot-nginx` |
| Git | any | `sudo apt install git` |

---

## 2. User & SSH

- [ ] User `hgct` tồn tại: `id hgct` — nếu chưa: `sudo useradd -m hgct`
- [ ] SSH key cho GitHub tại `/home/hgct/.ssh/github_hgct` (private key) — **tạo thủ công, copy từ server cũ hoặc tạo mới rồi add vào GitHub Deploy Keys**
- [ ] `/home/hgct/.ssh/config` có entry cho github.com dùng key trên
- [ ] User `hgct` có sudo NOPASSWD: `sudo visudo` → thêm `hgct ALL=(ALL) NOPASSWD: ALL`

---

## 3. Thư mục & Permissions

- [ ] `/var/hgct/pdfs/` tồn tại và writable: `sudo mkdir -p /var/hgct/pdfs && sudo chmod 755 /var/hgct/pdfs`
- [ ] `/var/hgct/backups/` tồn tại: `sudo mkdir -p /var/hgct/backups && sudo chown hgct:hgct /var/hgct/backups`
- [ ] `/root/hgct/` — thư mục project (git clone về đây)
- [ ] `/root/hgct-demo/` — sẽ được tạo tự động bởi `deploy-demo.sh` lần đầu

---

## 4. Node Dependencies

- [ ] `npm install` trong `/root/hgct/`
- [ ] `npx prisma generate` (sau khi có DATABASE_URL trong .env.local)

---

## 5. PostgreSQL

Cần hỏi user các thông tin sau khi setup:
- **DB name** (mặc định: `zodiacdb`)
- **DB user** (mặc định: `nguydev`)
- **DB password**

```bash
sudo -u postgres psql -c "CREATE USER nguydev WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "CREATE DATABASE zodiacdb OWNER nguydev;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE zodiacdb TO nguydev;"
```

Sau đó chạy migrate:
```bash
cd /root/hgct && npx prisma migrate deploy
```

---

## 6. File `.env.local`

Tạo `/root/hgct/.env.local` với các biến sau. **Hỏi user từng giá trị:**

```env
# App
APP_PORT=                        # port production (mặc định: 65498)
NEXTAUTH_URL=                    # https://yourdomain.com
NEXT_PUBLIC_APP_URL=             # https://yourdomain.com
NEXTAUTH_SECRET=                 # random string dài, dùng: openssl rand -base64 32

# Database
DATABASE_URL=postgresql://nguydev:PASSWORD@localhost:5432/zodiacdb

# Google OAuth
GOOGLE_CLIENT_ID=                # từ Google Cloud Console
GOOGLE_CLIENT_SECRET=            # từ Google Cloud Console

# OpenRouter AI
OPENROUTER_API_KEY=              # từ openrouter.ai

# SMTP (Hostinger)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=                       # email SMTP
SMTP_PASS=                       # mật khẩu SMTP
EMAIL_FROM=                      # tên hiển thị + email, vd: "Hạt Giống Chiêm Tinh <no-reply@...>"

# Misc
UPGRADE_CODE=                    # code bí mật để upgrade account thủ công
CRON_SECRET=                     # secret cho /api/cron/cleanup — tạo: openssl rand -hex 32

# Security
PROFILE_ENCRYPTION_KEY=          # AES-256-GCM key (64 hex chars) — tạo: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# SePay Payment (tích hợp thanh toán QR chuyển khoản)
SEPAY_API_KEY=                   # API Key tự tạo, điền cùng giá trị vào SePay Dashboard → Webhook → Chứng thực API Key
BANK_ACCOUNT_NUMBER=             # Số tài khoản ngân hàng đã liên kết trên SePay
BANK_ACCOUNT_NAME=               # Tên chủ tài khoản (viết hoa, đúng như ngân hàng)
BANK_NAME=                       # Tên ngân hàng đúng format SePay (vd: TPBank, MBBank, Vietcombank, ACB...)

# OpenRouter Management (query cost + balance)
OPENROUTER_MANAGEMENT_KEY=       # Management Key từ openrouter.ai/settings/keys (KHÁC với OPENROUTER_API_KEY)

# Telegram — ĐỌC KỸ: 2 bot KHÁC NHAU, không được nhầm lẫn
# Bot 1: @nguyclaudebot — gửi notifications vào group "Nhật Ký Bóc Lột"
TELEGRAM_BOT_TOKEN=              # Token của @nguyclaudebot (notify bot)
# Bot 2: @hatgiongchiemtinhbot — admin bot nhận lệnh qua webhook
TELEGRAM_ADMIN_BOT_TOKEN=        # Token của @hatgiongchiemtinhbot (admin bot)
TELEGRAM_ADMIN_WEBHOOK_SECRET=   # Random hex: node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
# Chi tiết setup cả 2 bot: xem docs/telegram_bot_spec.md
```

Sau khi tạo `.env.local`, copy vào standalone:
```bash
cp /root/hgct/.env.local /root/hgct/.next/standalone/.env.local
```

---

## 7. Nginx

Cần hỏi user:
- **Production domain** (vd: `hatgiongchiemtinh.com`)
- **Demo domain** (vd: `demo.hatgiongchiemtinh.com`)
- **Production port** (mặc định: `65498`)
- **Demo port** (mặc định: `65500`)

Template configs có sẵn tại `server_conf/`:
```bash
sudo cp /root/hgct/server_conf/hgct.conf /etc/nginx/sites-available/hgct.conf
sudo cp /root/hgct/server_conf/demo.hatgiongchiemtinh.com.conf /etc/nginx/sites-available/hgct-demo.conf
# Sửa domain + port trong 2 file trên cho khớp với server mới
sudo ln -sf /etc/nginx/sites-available/hgct.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/hgct-demo.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo nginx -s reload
```

---

## 8. SSL (Certbot)

```bash
sudo certbot --nginx -d yourdomain.com -d demo.yourdomain.com
```

---

## 9. Systemd Services

Template có sẵn tại `server_conf/`:
```bash
sudo cp /root/hgct/server_conf/hgct.service /etc/systemd/system/
sudo cp /root/hgct/server_conf/hgct-demo.service /etc/systemd/system/
# Kiểm tra port trong 2 file service khớp với .env.local
sudo systemctl daemon-reload
sudo systemctl enable hgct hgct-demo
```

---

## 10. Crontab

Setup cron check đơn định kỳ (chạy mỗi phút, endpoint tự check interval trong DB):
```bash
CRON_SECRET=<giá trị CRON_SECRET trong .env.local>
(crontab -l 2>/dev/null | grep -v 'order-check'; echo "* * * * * curl -s -H \"Authorization: Bearer ${CRON_SECRET}\" \"https://hatgiongchiemtinh.com/api/cron/order-check\" > /dev/null 2>&1") | crontab -
# Verify:
crontab -l | grep order-check
```

---

## 11. First Deploy

```bash
sudo bash /root/hgct/deploy.sh                          # production (tự re-register Telegram webhook)
sudo bash /root/hgct/deploy-demo.sh main                # demo
```

---

## 12. Kiểm tra cuối

- [ ] `curl -I https://yourdomain.com` → 200
- [ ] `curl -I https://demo.yourdomain.com` → 200
- [ ] `systemctl status hgct` → active (running)
- [ ] `systemctl status hgct-demo` → active (running)
- [ ] Tạo thử 1 báo cáo → PDF sinh được + email gửi được
- [ ] Admin bot `/start` → menu hiện bình thường
- [ ] `crontab -l | grep order-check` → cron entry tồn tại
