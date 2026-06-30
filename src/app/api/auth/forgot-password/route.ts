import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import prisma from '@/lib/db'
import { sendEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Vui lòng nhập email' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })

    if (!user) {
      // Don't reveal if email exists
      return NextResponse.json({ success: true })
    }

    // Generate token valid 1 hour
    const token = randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hatgiongchiemtinh.com'
    const resetLink = `${appUrl}/auth/reset-password?token=${token}`

    await sendEmail({
      to: email.trim().toLowerCase(),
      subject: 'Đặt lại mật khẩu — AstroS',
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a1a;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;padding:32px;background:linear-gradient(135deg,#0f0f28,#1a1535);border-radius:16px;border:1px solid rgba(201,168,76,0.2);">
      <p style="margin:0 0 8px;font-size:20px;letter-spacing:0.3em;color:#d9ab55;">✦ ✦ ✦</p>
      <h1 style="margin:0 0 24px;font-size:20px;font-weight:400;letter-spacing:0.12em;color:#f5f0e8;">AstroS</h1>
      <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#f4efe6;">Đặt lại mật khẩu</h2>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#b8a99a;">
        Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.<br>
        Nhấn vào nút bên dưới để tiếp tục. Link có hiệu lực trong <strong style="color:#d9ab55;">1 giờ</strong>.
      </p>
      <a href="${resetLink}"
        style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#c8943f,#f0cc78);color:#06060f;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.08em;">
        Đặt lại mật khẩu
      </a>
      <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">
        Nếu bạn không yêu cầu điều này, hãy bỏ qua email này.<br>
        Link: <a href="${resetLink}" style="color:#d9ab55;word-break:break-all;">${resetLink}</a>
      </p>
    </div>
  </div>
</body>
</html>`,
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
