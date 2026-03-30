import nodemailer from 'nodemailer'

// Bug #31 fix: escape HTML special chars for user-supplied values inserted into email HTML templates
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const smtpPort = parseInt(process.env.SMTP_PORT || '465')
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
  },
  tls: { rejectUnauthorized: false },
})

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  attachments?: { filename: string; content: Buffer }[]
}

export async function sendEmail({ to, subject, html, attachments }: SendEmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Hạt Giống Chiêm Tinh <support@hatgiongchiemtinh.com>',
      to,
      subject,
      html,
      attachments: attachments?.map(a => ({ filename: a.filename, content: a.content })),
    })
    console.log(`[EMAIL] Sent to ${to}: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('[EMAIL] Send failed:', error)
    return { success: false, error: String(error) }
  }
}

// ------- Service-specific config -------

const SERVICE_CONFIG: Record<string, {
  label: string
  tagline: string
  intro: string
  highlight: string
  color: string
}> = {
  career: {
    label: 'Hướng Nghiệp',
    tagline: 'Con đường sự nghiệp trong bản đồ sao của bạn',
    intro: 'Báo cáo này phân tích chi tiết tài năng thiên bẩm, điểm mạnh cốt lõi và con đường sự nghiệp phù hợp nhất với bản đồ sao của bạn.',
    highlight: 'Khám phá nghề nghiệp phù hợp, thời điểm thuận lợi để thăng tiến và những lĩnh vực bạn có thể tỏa sáng nhất.',
    color: '#c9a84c',
  },
  love: {
    label: 'Tình Duyên',
    tagline: 'Bản đồ tình yêu và duyên số của bạn',
    intro: 'Báo cáo này phân tích sâu về phong cách yêu, nhu cầu tình cảm và kiểu người bạn đời phù hợp nhất theo bản đồ sao.',
    highlight: 'Hiểu rõ bài học tình duyên, những điểm cần chú ý trong mối quan hệ và cách để tình yêu bền vững hơn.',
    color: '#ec4899',
  },
  synastry: {
    label: 'Cặp Đôi',
    tagline: 'Phân tích sự tương hợp giữa hai bản đồ sao',
    intro: 'Báo cáo này so sánh chi tiết hai bản đồ sao, phân tích sự hòa hợp, những điểm bổ sung và thách thức trong mối quan hệ.',
    highlight: 'Khám phá điểm mạnh của cặp đôi, cách vượt qua bất đồng và chìa khóa để xây dựng hạnh phúc lâu dài.',
    color: '#8b5cf6',
  },
  transit: {
    label: 'Vận Hạn',
    tagline: 'Những chuyển động thiên thể ảnh hưởng đến bạn',
    intro: 'Báo cáo này phân tích các transit hiện tại và sắp tới, chỉ ra những giai đoạn thuận lợi và cần thận trọng trong cuộc sống.',
    highlight: 'Nắm bắt cơ hội trong sự nghiệp, tình cảm, tài chính và sức khỏe để chuẩn bị tốt nhất cho giai đoạn sắp tới.',
    color: '#3b82f6',
  },
}

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, '_')
}

export function makePdfFilename(service: string, name: string, nameB?: string): string {
  const suffix: Record<string, string> = {
    career: 'Huong_Nghiep',
    love: 'Tinh_Duyen',
    synastry: 'Cap_Doi',
    transit: 'Van_Han',
  }
  const suf = suffix[service] || service
  if ((service === 'synastry' || service === 'relationship') && nameB) {
    return `${normalize(name)}_va_${normalize(nameB)}_${suf}.pdf`
  }
  return `${normalize(name)}_${suf}.pdf`
}

export function makeEmailSubject(service: string, name: string, nameB?: string): string {
  const svc = SERVICE_CONFIG[service]
  if (!svc) return `✦ Báo cáo Chiêm Tinh của ${name} | Hạt Giống Chiêm Tinh`
  const who = (service === 'synastry' || service === 'relationship') && nameB
    ? `${name} & ${nameB}`
    : name
  return `✦ Báo cáo ${svc.label} — ${who} | Hạt Giống Chiêm Tinh`
}

export function buildReportEmailHtml(name: string, service: string, nameB?: string): string {
  const svc = SERVICE_CONFIG[service] || SERVICE_CONFIG['career']
  const displayName = (service === 'synastry' || service === 'relationship') && nameB
    ? `${name} & ${nameB}`
    : name
  const color = svc.color

  const isSynastry = (service === 'synastry' || service === 'relationship') && !!nameB

  // Fix 4: adaptive font-size — tính theo tên thật (không phải displayName ghép)
  function nameSize(len: number): string {
    if (len <= 8)  return '42px'
    if (len <= 12) return '38px'
    if (len <= 18) return '32px'
    if (len <= 24) return '26px'
    return '22px'
  }
  const nameFontSize = isSynastry
    ? nameSize(Math.max(name.length, nameB!.length))  // Fix 5: sync cả 2 tên theo tên dài hơn
    : nameSize(name.length)

  // HTML block tên khách — synastry căn trái 3 dòng, còn lại 1 dòng
  const nameStyle = `font-size:${nameFontSize};font-weight:600;color:${color};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;`
  // Bug #31 fix: escape user-supplied names before HTML insertion
  const nameHtml = isSynastry
    ? `<p style="margin:0;${nameStyle}">${escHtml(name)}</p>
        <p style="margin:4px 0;font-size:16px;font-weight:400;color:${color};">&amp;</p>
        <p style="margin:0;${nameStyle}">${escHtml(nameB!)}</p>`
    : `<p style="margin:0;${nameStyle}">${escHtml(name)}</p>`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#0a0a1a;font-family:Georgia,serif;">
  <div style="max-width:620px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="text-align:center;padding:36px 16px 28px;background:linear-gradient(135deg,#0f0f28,#1a1535);border-radius:16px 16px 0 0;border:1px solid rgba(201,168,76,0.2);border-bottom:none;">
      <p style="margin:0 0 8px;font-size:24px;letter-spacing:0.3em;color:${color};">✦ ✦ ✦</p>
      <h1 style="margin:0;font-size:22px;font-weight:400;letter-spacing:0.1em;color:#f5f0e8;text-transform:uppercase;white-space:nowrap;font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;">Hạt Giống Chiêm Tinh</h1>
      <p style="margin:8px 0 0;font-size:16px;color:#6b7280;letter-spacing:0.08em;">hatgiongchiemtinh.com</p>
    </div>

    <!-- Gold divider -->
    <div style="height:2px;background:linear-gradient(90deg,transparent,${color},transparent);"></div>

    <!-- Body -->
    <div style="padding:36px 16px;background:#0f0f28;border:1px solid rgba(201,168,76,0.15);border-top:none;border-bottom:none;">

      <!-- Service badge -->
      <div style="display:inline-block;padding:6px 20px;border-radius:999px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.25);margin-bottom:28px;">
        <span style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:${color};">Báo cáo ${svc.label}</span>
      </div>

      <div style="margin:0 0 10px;">
        <p style="margin:0 0 8px;font-size:19px;font-weight:400;color:#9ca3af;white-space:nowrap;line-height:1.4;">Xin chào,</p>
        ${nameHtml}
      </div>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;font-style:italic;">${svc.tagline}</p>

      <div style="height:1px;background:rgba(201,168,76,0.15);margin:0 0 24px;"></div>

      <p style="margin:0 0 16px;font-size:16px;line-height:1.8;color:#b8a99a;">
        ${svc.intro}
      </p>
      <p style="margin:0 0 28px;font-size:16px;line-height:1.8;color:#b8a99a;">
        ${svc.highlight}
      </p>

      <!-- Attachment notice -->
      <div style="padding:20px 24px;background:rgba(201,168,76,0.06);border-radius:12px;border:1px solid rgba(201,168,76,0.2);margin-bottom:28px;">
        <p style="margin:0;font-size:15px;color:#f5f0e8;">
          <span style="color:${color};">📎</span>&nbsp;
          File PDF báo cáo đã được đính kèm trong email này.
          Bạn có thể lưu lại để đọc bất cứ lúc nào.
        </p>
      </div>

      <p style="margin:0;font-size:14px;line-height:1.8;color:#6b7280;">
        Liên hệ hỗ trợ:<br>
        <a href="mailto:support@hatgiongchiemtinh.com" style="color:${color};text-decoration:none;font-weight:600;font-size:15px;">support@hatgiongchiemtinh.com</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:24px 32px;background:#060612;border-radius:0 0 16px 16px;border:1px solid rgba(201,168,76,0.1);border-top:none;text-align:center;">
      <!-- Fix 1: màu sáng hơn để readable trên nền tối -->
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#6b7280;">Hạt Giống Chiêm Tinh © 2026</p>
      <p style="margin:0;font-size:11px;color:#55606e;font-style:italic;">Kết quả chiêm tinh mang tính tham khảo,<br>không thay thế lời khuyên chuyên nghiệp.</p>
    </div>

  </div>
</body>
</html>`
}

export async function sendRecoveryEmail({
  to,
  service,
  token,
  name,
}: {
  to: string
  service: string
  token: string
  name?: string
}) {
  const svc = SERVICE_CONFIG[service] || SERVICE_CONFIG['career']
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hatgiongchiemtinh.com'
  const recoveryUrl = `${appUrl}/recover?token=${token}`
  // Bug #31 fix: escape user-supplied name before HTML insertion
  const greeting = name ? `Xin chào ${escHtml(name)},` : 'Xin chào,'

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0a0a1a;font-family:Georgia,serif;">
  <div style="max-width:620px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;padding:36px 16px 28px;background:linear-gradient(135deg,#0f0f28,#1a1535);border-radius:16px 16px 0 0;border:1px solid rgba(201,168,76,0.2);border-bottom:none;">
      <p style="margin:0 0 8px;font-size:24px;letter-spacing:0.3em;color:#c9a84c;">✦ ✦ ✦</p>
      <h1 style="margin:0;font-size:22px;font-weight:400;letter-spacing:0.1em;color:#f5f0e8;text-transform:uppercase;font-family:Georgia,serif;">Hạt Giống Chiêm Tinh</h1>
      <p style="margin:8px 0 0;font-size:16px;color:#6b7280;letter-spacing:0.08em;">hatgiongchiemtinh.com</p>
    </div>
    <div style="height:2px;background:linear-gradient(90deg,transparent,#c9a84c,transparent);"></div>
    <div style="padding:36px 16px;background:#0f0f28;border:1px solid rgba(201,168,76,0.15);border-top:none;border-bottom:none;">
      <div style="display:inline-block;padding:6px 20px;border-radius:999px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);margin-bottom:24px;">
        <span style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#ef4444;">Thông báo khôi phục đơn hàng</span>
      </div>
      <p style="margin:0 0 8px;font-size:17px;color:#9ca3af;">${greeting}</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:#b8a99a;">
        Đơn hàng <strong style="color:#f5f0e8;">Báo cáo ${svc.label}</strong> của bạn đã gặp sự cố kỹ thuật trong quá trình xử lý.
        Bạn <strong>không bị trừ tiền thêm</strong> — chúng tôi sẽ xử lý lại miễn phí cho bạn.
      </p>
      <div style="padding:24px;background:rgba(201,168,76,0.06);border-radius:12px;border:1px solid rgba(201,168,76,0.2);margin-bottom:24px;text-align:center;">
        <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;color:#6b7280;">Mã khôi phục của bạn</p>
        <p style="margin:0 0 16px;font-size:32px;font-weight:700;letter-spacing:0.3em;color:#c9a84c;font-family:'Courier New',monospace;">${token}</p>
        <a href="${recoveryUrl}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#c8943f,#f0cc78);color:#06060f;font-weight:700;font-size:14px;text-decoration:none;border-radius:8px;letter-spacing:0.05em;">Khôi phục báo cáo ngay →</a>
      </div>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.8;color:#6b7280;">
        Hoặc truy cập <strong style="color:#c9a84c;">${appUrl}/recover</strong> và nhập mã trên.
      </p>
      <p style="margin:0;font-size:14px;line-height:1.8;color:#6b7280;">
        Liên hệ hỗ trợ:<br>
        <a href="mailto:support@hatgiongchiemtinh.com" style="color:#c9a84c;text-decoration:none;font-weight:600;font-size:15px;">support@hatgiongchiemtinh.com</a>
      </p>
    </div>
    <div style="padding:24px 32px;background:#060612;border-radius:0 0 16px 16px;border:1px solid rgba(201,168,76,0.1);border-top:none;text-align:center;">
      <p style="margin:0;font-size:11px;color:#55606e;font-style:italic;">Mã khôi phục có hiệu lực vĩnh viễn.<br>Hạt Giống Chiêm Tinh © 2026</p>
    </div>
  </div>
</body>
</html>`

  return sendEmail({
    to,
    subject: `⚠ Khôi phục báo cáo ${svc.label} — Mã: ${token} | Hạt Giống Chiêm Tinh`,
    html,
  })
}

export async function sendAutoRetryEmail({
  to,
  service,
  name,
  jobId,
}: {
  to: string
  service: string
  name?: string
  jobId: string
}) {
  const svc = SERVICE_CONFIG[service] || SERVICE_CONFIG['career']
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hatgiongchiemtinh.com'
  const trackingUrl = `${appUrl}/processing?job=${jobId}&service=${service}&name=${encodeURIComponent(name || '')}`
  // Bug #31 fix: escape user-supplied name before HTML insertion
  const greeting = name ? `Xin chào ${escHtml(name)},` : 'Xin chào,'

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0a0a1a;font-family:Georgia,serif;">
  <div style="max-width:620px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;padding:36px 16px 28px;background:linear-gradient(135deg,#0f0f28,#1a1535);border-radius:16px 16px 0 0;border:1px solid rgba(201,168,76,0.2);border-bottom:none;">
      <p style="margin:0 0 8px;font-size:24px;letter-spacing:0.3em;color:#c9a84c;">✦ ✦ ✦</p>
      <h1 style="margin:0;font-size:22px;font-weight:400;letter-spacing:0.1em;color:#f5f0e8;text-transform:uppercase;font-family:Georgia,serif;">Hạt Giống Chiêm Tinh</h1>
      <p style="margin:8px 0 0;font-size:16px;color:#6b7280;letter-spacing:0.08em;">hatgiongchiemtinh.com</p>
    </div>
    <div style="height:2px;background:linear-gradient(90deg,transparent,#c9a84c,transparent);"></div>
    <div style="padding:36px 16px;background:#0f0f28;border:1px solid rgba(201,168,76,0.15);border-top:none;border-bottom:none;">
      <div style="display:inline-block;padding:6px 20px;border-radius:999px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.25);margin-bottom:24px;">
        <span style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#60a5fa;">Đang tạo lại tự động</span>
      </div>
      <p style="margin:0 0 8px;font-size:17px;color:#9ca3af;">${greeting}</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:#b8a99a;">
        Báo cáo <strong style="color:#f5f0e8;">${svc.label}</strong> của bạn bị gián đoạn do sự cố kỹ thuật.
        Chúng tôi đã <strong style="color:#c9a84c;">tự động tạo lại</strong> — bạn không bị trừ thêm phí.
      </p>
      <div style="padding:24px;background:rgba(201,168,76,0.06);border-radius:12px;border:1px solid rgba(201,168,76,0.2);margin-bottom:24px;text-align:center;">
        <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.6;">
          Nhấn nút bên dưới để theo dõi tiến trình.<br>
          Bạn sẽ nhận email kèm file PDF khi báo cáo hoàn thành.
        </p>
        <a href="${trackingUrl}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#c8943f,#f0cc78);color:#06060f;font-weight:700;font-size:14px;text-decoration:none;border-radius:8px;letter-spacing:0.05em;">Theo dõi tiến trình →</a>
      </div>
      <p style="margin:0;font-size:14px;line-height:1.8;color:#6b7280;">
        Liên hệ hỗ trợ:<br>
        <a href="mailto:support@hatgiongchiemtinh.com" style="color:#c9a84c;text-decoration:none;font-weight:600;font-size:15px;">support@hatgiongchiemtinh.com</a>
      </p>
    </div>
    <div style="padding:24px 32px;background:#060612;border-radius:0 0 16px 16px;border:1px solid rgba(201,168,76,0.1);border-top:none;text-align:center;">
      <p style="margin:0;font-size:11px;color:#55606e;font-style:italic;">Hạt Giống Chiêm Tinh © 2026</p>
    </div>
  </div>
</body>
</html>`

  return sendEmail({
    to,
    subject: `🔄 Đang tạo lại báo cáo ${svc.label} | Hạt Giống Chiêm Tinh`,
    html,
  })
}

export async function sendRetargetEmail({
  to, service, name, transferCode, amount,
}: {
  to: string
  service: string
  name: string
  transferCode: string
  amount: number
}) {
  const svc = SERVICE_CONFIG[service] || SERVICE_CONFIG['career']
  const amountStr = amount.toLocaleString('vi-VN') + 'đ'

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0a0a1a;font-family:Georgia,serif;">
  <div style="max-width:620px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;padding:36px 16px 28px;background:linear-gradient(135deg,#0f0f28,#1a1535);border-radius:16px 16px 0 0;border:1px solid rgba(201,168,76,0.2);border-bottom:none;">
      <p style="margin:0 0 8px;font-size:24px;letter-spacing:0.3em;color:#c9a84c;">✦ ✦ ✦</p>
      <h1 style="margin:0;font-size:22px;font-weight:400;letter-spacing:0.1em;color:#f5f0e8;text-transform:uppercase;font-family:Georgia,serif;">Hạt Giống Chiêm Tinh</h1>
      <p style="margin:8px 0 0;font-size:16px;color:#6b7280;letter-spacing:0.08em;">hatgiongchiemtinh.com</p>
    </div>
    <div style="height:2px;background:linear-gradient(90deg,transparent,#c9a84c,transparent);"></div>
    <div style="padding:36px 16px;background:#0f0f28;border:1px solid rgba(201,168,76,0.15);border-top:none;border-bottom:none;">
      <div style="display:inline-block;padding:6px 20px;border-radius:999px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.25);margin-bottom:24px;">
        <span style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#c9a84c;">Nhắc nhở đơn hàng</span>
      </div>
      <p style="margin:0 0 8px;font-size:17px;color:#9ca3af;">${name ? `Xin chào ${escHtml(name)},` : 'Xin chào,'}</p>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.8;color:#b8a99a;">
        Bạn đã đặt <strong style="color:#f5f0e8;">Báo cáo ${svc.label}</strong> nhưng chưa hoàn tất thanh toán.
        Đơn hàng vẫn đang chờ — chỉ cần chuyển khoản để nhận báo cáo ngay.
      </p>
      <div style="padding:24px;background:rgba(201,168,76,0.06);border-radius:12px;border:1px solid rgba(201,168,76,0.2);margin-bottom:24px;text-align:center;">
        <p style="margin:0 0 6px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;">Nội dung chuyển khoản</p>
        <p style="margin:0 0 10px;font-size:28px;font-weight:700;letter-spacing:0.25em;color:#c9a84c;font-family:'Courier New',monospace;">${transferCode}</p>
        <p style="margin:0;font-size:20px;font-weight:700;color:#c8410a;">${amountStr}</p>
      </div>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#6b7280;">
        Hệ thống sẽ tự động xác nhận và tạo báo cáo ngay khi nhận được tiền.<br>
        Không cần làm thêm gì sau khi chuyển khoản.
      </p>
      <p style="margin:0;font-size:14px;line-height:1.8;color:#6b7280;">
        Liên hệ hỗ trợ:<br>
        <a href="mailto:support@hatgiongchiemtinh.com" style="color:#c9a84c;text-decoration:none;font-weight:600;font-size:15px;">support@hatgiongchiemtinh.com</a>
      </p>
    </div>
    <div style="padding:24px 32px;background:#060612;border-radius:0 0 16px 16px;border:1px solid rgba(201,168,76,0.1);border-top:none;text-align:center;">
      <p style="margin:0;font-size:11px;color:#55606e;font-style:italic;">Hạt Giống Chiêm Tinh © 2026</p>
    </div>
  </div>
</body>
</html>`

  return sendEmail({
    to,
    subject: `✦ Hoàn tất đơn ${svc.label} của bạn | Hạt Giống Chiêm Tinh`,
    html,
  })
}

export async function sendCtvCommissionEmail({
  to,
  ctvName,
  customerName,
  service,
  orderAmount,
  commissionAmount,
  commissionRate,
}: {
  to: string
  ctvName: string
  customerName: string
  service: string
  orderAmount: number
  commissionAmount: number
  commissionRate: number
}) {
  const svc = SERVICE_CONFIG[service] || SERVICE_CONFIG['career']
  const orderAmountStr = orderAmount.toLocaleString('vi-VN') + 'đ'
  const commissionStr = commissionAmount.toLocaleString('vi-VN') + 'đ'
  const rateStr = Math.round(commissionRate * 100) + '%'
  const daisuUrl = process.env.NEXT_PUBLIC_DAISU_URL || 'https://daisu.hatgiongchiemtinh.com'

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0a0a1a;font-family:Georgia,serif;">
  <div style="max-width:620px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;padding:36px 16px 28px;background:linear-gradient(135deg,#0f0f28,#1a1535);border-radius:16px 16px 0 0;border:1px solid rgba(201,168,76,0.2);border-bottom:none;">
      <p style="margin:0 0 8px;font-size:24px;letter-spacing:0.3em;color:#c9a84c;">✦ ✦ ✦</p>
      <h1 style="margin:0;font-size:22px;font-weight:400;letter-spacing:0.1em;color:#f5f0e8;text-transform:uppercase;font-family:Georgia,serif;">Hạt Giống Chiêm Tinh</h1>
      <p style="margin:8px 0 0;font-size:16px;color:#6b7280;letter-spacing:0.08em;">hatgiongchiemtinh.com</p>
    </div>
    <div style="height:2px;background:linear-gradient(90deg,transparent,#c9a84c,transparent);"></div>
    <div style="padding:36px 16px;background:#0f0f28;border:1px solid rgba(201,168,76,0.15);border-top:none;border-bottom:none;">
      <div style="display:inline-block;padding:6px 20px;border-radius:999px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.25);margin-bottom:24px;">
        <span style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#4ade80;">Hoa hồng mới từ đơn hàng</span>
      </div>
      <p style="margin:0 0 8px;font-size:17px;color:#9ca3af;">Xin chào ${escHtml(ctvName)},</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:#b8a99a;">
        Bạn vừa nhận được hoa hồng từ một đơn hàng mới qua mã giới thiệu của bạn!
      </p>
      <div style="padding:24px;background:rgba(201,168,76,0.06);border-radius:12px;border:1px solid rgba(201,168,76,0.2);margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#b8a99a;">
          <tr><td style="padding:6px 0;color:#6b7280;">Dịch vụ</td><td style="padding:6px 0;text-align:right;color:#f5f0e8;">Báo cáo ${svc.label}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Khách hàng</td><td style="padding:6px 0;text-align:right;color:#f5f0e8;">${escHtml(customerName)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Giá trị đơn</td><td style="padding:6px 0;text-align:right;color:#f5f0e8;">${orderAmountStr}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Tỷ lệ hoa hồng</td><td style="padding:6px 0;text-align:right;color:#c9a84c;">${rateStr}</td></tr>
          <tr style="border-top:1px solid rgba(201,168,76,0.2);">
            <td style="padding:12px 0 6px;font-size:16px;font-weight:600;color:#f5f0e8;">Hoa hồng của bạn</td>
            <td style="padding:12px 0 6px;text-align:right;font-size:20px;font-weight:700;color:#4ade80;">${commissionStr}</td>
          </tr>
        </table>
      </div>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.8;color:#6b7280;">
        Hoa hồng sẽ được thanh toán định kỳ theo thỏa thuận.<br>
        Xem chi tiết và theo dõi tất cả đơn hàng tại trang Đại Sứ.
      </p>
      <div style="text-align:center;">
        <a href="${daisuUrl}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#c8943f,#f0cc78);color:#06060f;font-weight:700;font-size:14px;text-decoration:none;border-radius:8px;letter-spacing:0.05em;">Xem trang Đại Sứ →</a>
      </div>
    </div>
    <div style="padding:24px 32px;background:#060612;border-radius:0 0 16px 16px;border:1px solid rgba(201,168,76,0.1);border-top:none;text-align:center;">
      <p style="margin:0;font-size:11px;color:#55606e;font-style:italic;">Hạt Giống Chiêm Tinh © 2026</p>
    </div>
  </div>
</body>
</html>`

  return sendEmail({
    to,
    subject: `💰 Hoa hồng mới ${commissionStr} — Báo cáo ${svc.label} | Hạt Giống Chiêm Tinh`,
    html,
  })
}

export async function sendReportEmail(
  email: string,
  name: string,
  service: string,
  pdfBuffer: Buffer,
  nameB?: string,
) {
  return sendEmail({
    to: email,
    subject: makeEmailSubject(service, name, nameB),
    html: buildReportEmailHtml(name, service, nameB),
    attachments: [{
      filename: makePdfFilename(service, name, nameB),
      content: pdfBuffer,
    }],
  })
}
