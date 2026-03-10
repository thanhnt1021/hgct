import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  try {
    const { to } = await req.json()
    if (!to) return NextResponse.json({ error: 'Email người nhận là bắt buộc' }, { status: 400 })

    const host = process.env.SMTP_HOST || 'smtp.hostinger.com'
    const port = parseInt(process.env.SMTP_PORT || '465')
    const user = process.env.SMTP_USER || process.env.EMAIL_FROM || ''
    const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.EMAIL_PASS || ''
    const from = process.env.EMAIL_FROM || user

    if (!user || !pass) {
      return NextResponse.json({
        error: 'Chưa cấu hình SMTP',
        details: 'Thiếu SMTP_USER hoặc SMTP_PASS trong .env.local',
        config: { host, port, user: user || '(trống)', hasPass: !!pass },
      }, { status: 500 })
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    })

    // Verify SMTP connection first
    await transporter.verify()

    const info = await transporter.sendMail({
      from: `Hạt Giống Chiêm Tinh <${from}>`,
      to,
      subject: 'Test email — Hạt Giống Chiêm Tinh',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#0a0a1a;color:#f5f0e8;">
          <h1 style="color:#c9a84c;font-size:22px;margin-bottom:16px;">✦ Hạt Giống Chiêm Tinh</h1>
          <p style="font-size:16px;line-height:1.6;">Xin chào,</p>
          <p style="font-size:16px;line-height:1.6;">Email này được gửi để kiểm tra kết nối SMTP. Nếu bạn nhận được email này, cấu hình email đang hoạt động bình thường.</p>
          <hr style="border:none;border-top:1px solid rgba(201,168,76,0.3);margin:24px 0;">
          <p style="font-size:13px;color:#94a3b8;">Gửi từ: ${from}<br>SMTP: ${host}:${port}<br>Thời gian: ${new Date().toLocaleString('vi-VN')}</p>
        </div>
      `,
    })

    return NextResponse.json({
      ok: true,
      message: `Email đã gửi thành công đến ${to}`,
      messageId: info.messageId,
      config: { host, port, user },
    })
  } catch (e: unknown) {
    const err = e as Error & { code?: string; command?: string }
    const code = err.code || ''
    let hint = ''
    if (code === 'ECONNREFUSED') hint = 'Không thể kết nối SMTP server. Kiểm tra host/port.'
    else if (code === 'EAUTH') hint = 'Sai username/password SMTP.'
    else if (code === 'ESOCKET') hint = 'Lỗi kết nối TLS/SSL.'
    else if (err.message?.includes('Invalid login')) hint = 'Thông tin đăng nhập SMTP không đúng.'

    return NextResponse.json({
      error: err.message || 'Lỗi gửi email',
      code,
      hint,
      config: {
        host: process.env.SMTP_HOST || 'smtp.hostinger.com',
        port: process.env.SMTP_PORT || '465',
        user: process.env.SMTP_USER || '(trống)',
        hasPass: !!(process.env.SMTP_PASS || process.env.EMAIL_PASS),
      },
    }, { status: 500 })
  }
}
