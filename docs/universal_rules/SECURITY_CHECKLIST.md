# Security Checklist — App-level Security

_Bổ sung `INFRA_v1.md` (server-level). File này focus vào application-level security._
_Dùng khi project có auth, payment, file upload, hoặc xử lý dữ liệu nhạy cảm._

---

## 1. OWASP Top 10 — Checklist thực dụng

### A01: Broken Access Control
```
□ Mọi API endpoint có auth check (middleware/decorator)
□ Không dùng client-side check thay server-side
□ Verify ownership: user chỉ truy cập được data của mình
□ Admin routes có role check riêng
□ CORS config chỉ allow domains cần thiết
```

### A02: Cryptographic Failures
```
□ Passwords hash bằng bcrypt/argon2 (KHÔNG MD5/SHA)
□ Sensitive data encrypted at rest (DB encryption, file encryption)
□ Tokens (JWT, session) có expiry hợp lý
□ HTTPS everywhere — không có mixed content
□ Secrets KHÔNG hardcode trong code (xem ENV_RULES.md)
```

### A03: Injection
```
□ SQL: Dùng parameterized queries / ORM — KHÔNG string concatenation
□ NoSQL: Validate input type trước khi query
□ Command injection: KHÔNG truyền user input vào shell commands
□ XSS: Escape/sanitize mọi user input trước khi render HTML
□ Template injection: Dùng auto-escaping (Jinja2, React JSX)
```

### A04: Insecure Design
```
□ Rate limiting trên auth endpoints (login, register, forgot password)
□ Rate limiting trên API endpoints tốn resource (AI calls, file processing)
□ Brute force protection: lockout sau N lần sai
□ Business logic validation ở server-side, không chỉ client
```

### A05: Security Misconfiguration
```
□ Debug mode OFF trong production
□ Default credentials đã đổi (DB, admin panel)
□ Error messages KHÔNG leak stack trace / internal info cho user
□ Unnecessary features/endpoints disabled
□ Security headers trong response (xem Section 3)
```

### A06: Vulnerable Components
```
□ npm audit / pip audit — KHÔNG có critical/high vulnerabilities
□ Dependencies update định kỳ (ít nhất monthly)
□ KHÔNG dùng packages bị abandoned (>2 năm không update)
□ Lock file (package-lock.json / requirements.txt) commit vào repo
```

### A07: Authentication Failures
```
□ Password policy: minimum 8 chars
□ Session tokens regenerate sau login
□ Logout invalidate session ở server-side
□ "Remember me" token riêng, không dùng session token
□ Multi-factor auth cho admin accounts (nếu applicable)
```

### A08: Data Integrity Failures
```
□ Verify integrity của packages (lock files)
□ CI/CD pipeline có security scan
□ KHÔNG deserialize untrusted data (pickle, eval, JSON.parse từ user)
```

### A09: Logging & Monitoring Failures
```
□ Log auth events (login success/fail, password change)
□ Log access to sensitive data
□ Logs KHÔNG chứa passwords, tokens, hoặc PII
□ Log rotation configured (tránh disk full)
□ Alert cho suspicious activities (nhiều login fail, unusual patterns)
```

### A10: Server-Side Request Forgery (SSRF)
```
□ Validate/whitelist URLs khi app fetch external resources
□ KHÔNG cho user input trực tiếp vào URL fetch
□ Block internal IPs (127.0.0.1, 10.x, 192.168.x) nếu app fetch user-provided URLs
```

---

## 2. File Upload Security

```
□ Validate file type (check magic bytes, KHÔNG chỉ extension)
□ Limit file size (server-side, không chỉ client)
□ Rename uploaded files (KHÔNG dùng original filename)
□ Store ngoài webroot (không serve trực tiếp qua URL)
□ Scan malware nếu file sẽ được download bởi users khác
□ Restrict executable file types (.php, .py, .sh, .exe)
```

---

## 3. Security Headers (nginx / response)

```nginx
# Thêm vào nginx server block hoặc app response
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
# CSP tuỳ project — bắt đầu report-only, tune dần
# add_header Content-Security-Policy "default-src 'self'; ..." always;
```

---

## 4. Dependency Audit

```bash
# Node.js
npm audit                    # Check vulnerabilities
npm audit fix               # Auto-fix (minor/patch)
npm audit --audit-level=high  # Fail nếu có high/critical

# Python
pip audit                    # Cần install: pip install pip-audit
pip audit --fix             # Suggest fixes
pip audit --strict          # Fail nếu có bất kỳ vulnerability nào

# Chạy audit ÍT NHẤT mỗi tháng hoặc trước mỗi production deploy
```

---

## 5. Template `docs/SECURITY.md` (project-level)

```markdown
# Security — [Project Name]

_Last reviewed: YYYY-MM-DD_

## Authentication
[Mô tả auth method: JWT/session/OAuth, token storage, expiry]

## Authorization
[Roles, permissions, ownership checks]

## Data Protection
[Encryption at rest/transit, PII handling, backup encryption]

## Known Risks & Mitigations
| Risk | Severity | Mitigation | Status |
|------|----------|------------|--------|
| ... | High/Med/Low | ... | Done/TODO |

## Audit Log
| Date | Action | Result |
|------|--------|--------|
| YYYY-MM-DD | npm audit | 0 vulnerabilities |
| YYYY-MM-DD | Security review | [summary] |
```

---

## References

- Server-level security: `INFRA_v1.md` §1 (SSH, firewall, fail2ban) + §11 (Security Audit)
- Secrets management: `ENV_RULES.md`
- Quality gate: `QUALITY_GATES.md` — dependency audit gate
