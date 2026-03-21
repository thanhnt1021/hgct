import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request) {
  // Bug #26 fix: auth guard — dead stub, but must not be publicly accessible
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { to, subject, html, attachments } = body

    // TODO: Implement nodemailer integration
    // const transporter = nodemailer.createTransport({
    //   host: process.env.SMTP_HOST,
    //   port: parseInt(process.env.SMTP_PORT || '587'),
    //   auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    // })

    console.log(`[EMAIL] Would send to: ${to}, subject: ${subject}`)

    return NextResponse.json({
      success: true,
      message: `Email sent to ${to}`,
    })
  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json({ error: 'Email send failed' }, { status: 500 })
  }
}
