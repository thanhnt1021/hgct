import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import prisma from '@/lib/db'

const ADMIN_BOT_TOKEN = process.env.TELEGRAM_ADMIN_BOT_TOKEN || ''
const WEBHOOK_SECRET = process.env.TELEGRAM_ADMIN_WEBHOOK_SECRET || ''
const ADMIN_USER_ID = 1247334831

async function botReply(chatId: number, text: string, threadId?: number) {
  if (!ADMIN_BOT_TOKEN) return
  await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      ...(threadId ? { message_thread_id: threadId } : {}),
      text,
      parse_mode: 'HTML',
    }),
  }).catch(() => {})
}

function restartServicesInBackground() {
  // Fire-and-forget: restart demo first, then production (kills current process)
  const cmd = `(sleep 2 && systemctl restart hgct-demo.service && sleep 8 && systemctl restart hgct.service) &`
  exec(cmd, { shell: '/bin/bash' })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ secret: string }> },
) {
  const { secret } = await params

  // Verify URL secret
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 403 })
  }

  let update: Record<string, unknown>
  try {
    update = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const message = update.message as Record<string, unknown> | undefined
  if (!message) return NextResponse.json({ ok: true })

  const from = message.from as Record<string, unknown> | undefined
  const senderId = from?.id as number | undefined
  const text = (message.text as string | undefined)?.trim() || ''
  const chatId = (message.chat as Record<string, unknown>)?.id as number
  const threadId = message.message_thread_id as number | undefined

  // Security: reject non-admin
  if (senderId !== ADMIN_USER_ID) {
    console.warn(`[TelegramAdmin] Unauthorized user ${senderId} attempted: ${text}`)
    return NextResponse.json({ ok: true })
  }

  // /setprice <amount>
  const setPriceMatch = text.match(/^\/setprice\s+(\d+)$/i)
  if (setPriceMatch) {
    const newPrice = parseInt(setPriceMatch[1], 10)
    if (isNaN(newPrice) || newPrice <= 0) {
      await botReply(chatId, '❌ Giá không hợp lệ. Dùng: <code>/setprice 5000</code>', threadId)
      return NextResponse.json({ ok: true })
    }

    try {
      await prisma.config.upsert({
        where: { key: 'service_price' },
        update: { value: String(newPrice) },
        create: { key: 'service_price', value: String(newPrice) },
      })

      await botReply(
        chatId,
        `✅ Đã cập nhật giá: <b>${newPrice.toLocaleString('vi-VN')}đ</b> cho tất cả dịch vụ.\n⏳ Đang restart services...`,
        threadId,
      )

      restartServicesInBackground()
    } catch (err) {
      console.error('[TelegramAdmin] setprice error:', err)
      await botReply(chatId, '❌ Lỗi khi cập nhật giá. Kiểm tra logs.', threadId)
    }

    return NextResponse.json({ ok: true })
  }

  // /getprice
  if (text.match(/^\/getprice$/i)) {
    try {
      const cfg = await prisma.config.findUnique({ where: { key: 'service_price' } })
      const price = cfg ? parseInt(cfg.value, 10) : 3333
      await botReply(chatId, `💰 Giá hiện tại: <b>${price.toLocaleString('vi-VN')}đ</b>`, threadId)
    } catch {
      await botReply(chatId, '❌ Không lấy được giá.', threadId)
    }
    return NextResponse.json({ ok: true })
  }

  // /help
  if (text.match(/^\/help$/i) || text.match(/^\/start$/i)) {
    await botReply(
      chatId,
      '🌟 <b>HGCT Admin Bot</b>\n\n' +
        '<code>/setprice 5000</code> — Đặt giá tất cả dịch vụ\n' +
        '<code>/getprice</code> — Xem giá hiện tại\n' +
        '<code>/help</code> — Hiện menu này',
      threadId,
    )
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}
