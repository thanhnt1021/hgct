import { NextResponse } from 'next/server'
import { handleCallback, handleCommand } from '@/lib/telegram/admin'
import { tgAnswer } from '@/lib/telegram/bot'

const WEBHOOK_SECRET = process.env.TELEGRAM_ADMIN_WEBHOOK_SECRET || ''
const WEBHOOK_SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN || ''
const ADMIN_USER_ID = parseInt(process.env.ADMIN_TELEGRAM_USER_ID || '0', 10)

export async function POST(
  request: Request,
  { params }: { params: Promise<{ secret: string }> },
) {
  const { secret } = await params

  // Layer 1: secret in URL path (identifies webhook)
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 403 })
  }

  // Layer 2: secret_token header (Telegram standard — only Telegram server knows this)
  if (WEBHOOK_SECRET_TOKEN) {
    const receivedToken = request.headers.get('x-telegram-bot-api-secret-token')
    if (receivedToken !== WEBHOOK_SECRET_TOKEN) {
      return NextResponse.json({ ok: false }, { status: 403 })
    }
  }

  // Layer 3: admin user ID must be configured
  if (!ADMIN_USER_ID) {
    console.error('[TelegramAdmin] ADMIN_TELEGRAM_USER_ID not set — all requests rejected')
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  let update: Record<string, unknown>
  try {
    update = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  // ── Handle callback_query (inline button taps) ────────────────────────────
  const callbackQuery = update.callback_query as Record<string, unknown> | undefined
  if (callbackQuery) {
    const cbFrom = callbackQuery.from as Record<string, unknown> | undefined
    const cbSenderId = cbFrom?.id as number | undefined
    const cbQueryId = callbackQuery.id as string
    const cbData = (callbackQuery.data as string | undefined) || ''
    const cbMessage = callbackQuery.message as Record<string, unknown> | undefined
    const cbChatId = (cbMessage?.chat as Record<string, unknown>)?.id as number
    const cbThreadId = cbMessage?.message_thread_id as number | undefined
    const cbMessageId = cbMessage?.message_id as number | undefined

    if (cbSenderId !== ADMIN_USER_ID) {
      await tgAnswer(cbQueryId, '⛔ Không có quyền')
      return NextResponse.json({ ok: true })
    }

    await handleCallback(cbData, cbChatId, cbThreadId, cbQueryId, cbMessageId ?? 0)
    return NextResponse.json({ ok: true })
  }

  // ── Handle message ────────────────────────────────────────────────────────
  const message = update.message as Record<string, unknown> | undefined
  if (!message) return NextResponse.json({ ok: true })

  const from = message.from as Record<string, unknown> | undefined
  const senderId = from?.id as number | undefined
  const text = (message.text as string | undefined)?.trim() || ''
  const chatId = (message.chat as Record<string, unknown>)?.id as number
  const threadId = message.message_thread_id as number | undefined
  const replyToMessage = message.reply_to_message as Record<string, unknown> | undefined

  if (senderId !== ADMIN_USER_ID) {
    console.warn(`[TelegramAdmin] Unauthorized user ${senderId} attempted: ${text}`)
    return NextResponse.json({ ok: true })
  }

  await handleCommand(text, chatId, threadId, replyToMessage)
  return NextResponse.json({ ok: true })
}
