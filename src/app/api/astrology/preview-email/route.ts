import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import fs from 'fs'
import path from 'path'
import { verifyTurnstileToken, getClientIp } from '@/lib/turnstile'
import { MAX_BODY_BYTES } from '@/lib/preview-validation'

export const runtime = 'nodejs'

const PREVIEW_DIR = '/tmp/hgct-previews'

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const SERVICE_LABELS: Record<string, string> = {
  career: 'Hướng Nghiệp',
  love: 'Tình Duyên',
  synastry: 'Cặp Đôi',
  transit: 'Vận Hạn',
}

export async function POST(req: NextRequest) {
  // Body size cap
  let raw: string
  try {
    raw = await req.text()
  } catch {
    return NextResponse.json({ error: 'Không đọc được dữ liệu' }, { status: 400 })
  }
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Dữ liệu quá lớn' }, { status: 413 })
  }
  let body: Record<string, unknown>
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Turnstile bot verification
  const ip = getClientIp(req)
  const cfToken = typeof body.cfTurnstileToken === 'string' ? body.cfTurnstileToken : ''
  const turnstile = await verifyTurnstileToken(cfToken, ip)
  if (!turnstile.success) {
    return NextResponse.json(
      { error: 'Xác thực bảo mật thất bại. Vui lòng tải lại trang.', reason: turnstile.reason },
      { status: 403 },
    )
  }

  const id = String(body.id || '')
  const email = String(body.email || '').trim()
  const service = String(body.service || '')
  const name = String(body.name || '').slice(0, 60)

  // Validate id (UUID v4 format — prevents path traversal)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  // Validate email
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 })
  }

  // Validate service (whitelist)
  if (service && !['career', 'love', 'synastry', 'transit'].includes(service)) {
    return NextResponse.json({ error: 'Dịch vụ không hợp lệ' }, { status: 400 })
  }

  const filePath = path.join(PREVIEW_DIR, `${id}.pdf`)
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Preview không tìm thấy' }, { status: 404 })
  }

  const pdfBuf = fs.readFileSync(filePath)
  const serviceLabel = SERVICE_LABELS[service] || 'Chiêm Tinh'
  const safeName = escHtml(name)

  const html = `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:32px 0;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#1a1428;border-radius:12px;overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,#1a1428,#2d1f4e);padding:36px 32px;text-align:center;">
    <div style="font-size:13px;letter-spacing:0.15em;color:#c9a84c;text-transform:uppercase;margin-bottom:8px;">Hạt Giống Chiêm Tinh</div>
    <div style="font-size:22px;font-weight:700;color:#f4efe6;margin-bottom:6px;">Bản Xem Trước · ${escHtml(serviceLabel)}</div>
    ${safeName ? `<div style="font-size:14px;color:#9090a8;">Dành cho ${safeName}</div>` : ''}
  </td></tr>
  <tr><td style="padding:28px 32px 24px;">
    <p style="font-size:15px;line-height:1.7;color:#c9c3d6;margin:0 0 16px;">
      Đây là bản xem trước miễn phí gồm <strong style="color:#f4efe6;">Phần 1</strong> trong bản luận giải <strong style="color:#f4efe6;">${escHtml(serviceLabel)}</strong> của bạn.
    </p>
    <p style="font-size:14px;line-height:1.6;color:#8a8399;margin:0 0 24px;">
      File PDF được đính kèm bên dưới. Báo cáo đầy đủ có thêm 5–6 phần phân tích chuyên sâu hơn.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:8px 0;">
        <a href="https://hatgiongchiemtinh.com/services"
           style="display:inline-block;background:linear-gradient(135deg,#c8943f,#f0cc78);color:#06060f;border-radius:6px;padding:12px 28px;font-weight:700;font-size:14px;text-decoration:none;letter-spacing:0.04em;">
          Nhận báo cáo đầy đủ →
        </a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:16px 32px 24px;border-top:1px solid rgba(201,168,76,0.1);text-align:center;">
    <div style="font-size:12px;color:#4a4560;">
      Liên hệ hỗ trợ:<br/>
      <a href="mailto:support@hatgiongchiemtinh.com" style="color:#c9a84c;">support@hatgiongchiemtinh.com</a>
    </div>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`

  const result = await sendEmail({
    to: email,
    subject: `Bản xem trước ${serviceLabel}${name ? ` · ${name}` : ''} — Hạt Giống Chiêm Tinh`,
    html,
    attachments: [
      {
        filename: `preview-${serviceLabel.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        content: pdfBuf,
      },
    ],
  })

  if (!result.success) {
    return NextResponse.json({ error: 'Gửi email thất bại' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
