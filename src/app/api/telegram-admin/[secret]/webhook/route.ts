import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import prisma from '@/lib/db'

const ADMIN_BOT_TOKEN = process.env.TELEGRAM_ADMIN_BOT_TOKEN || ''
const WEBHOOK_SECRET = process.env.TELEGRAM_ADMIN_WEBHOOK_SECRET || ''
const ADMIN_USER_ID = 1247334831

const PRESET_PRICES = [3333, 5000, 7000, 10000, 15000, 20000]

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

async function sendMenu(chatId: number, text: string, threadId?: number) {
  if (!ADMIN_BOT_TOKEN) return
  // Build rows: 3 prices per row, then custom button
  const priceRows: Array<Array<{ text: string; callback_data: string }>> = []
  for (let i = 0; i < PRESET_PRICES.length; i += 3) {
    priceRows.push(
      PRESET_PRICES.slice(i, i + 3).map((p) => ({
        text: `${p.toLocaleString('vi-VN')}đ`,
        callback_data: `setprice_${p}`,
      })),
    )
  }

  const keyboard = [
    [{ text: '💰 Xem giá hiện tại', callback_data: 'getprice' }],
    ...priceRows,
    [{ text: '✏️ Nhập giá tùy chỉnh...', callback_data: 'setprice_custom' }],
  ]

  await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      ...(threadId ? { message_thread_id: threadId } : {}),
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard },
    }),
  }).catch(() => {})
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  if (!ADMIN_BOT_TOKEN) return
  await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, ...(text ? { text } : {}) }),
  }).catch(() => {})
}

function restartServicesInBackground() {
  // Fire-and-forget: restart demo first, then production (kills current process)
  const cmd = `(sleep 2 && systemctl restart hgct-demo.service && sleep 8 && systemctl restart hgct.service) &`
  exec(cmd, { shell: '/bin/bash' })
}

async function applySetPrice(
  newPrice: number,
  chatId: number,
  threadId: number | undefined,
  callbackQueryId?: string,
) {
  try {
    await prisma.config.upsert({
      where: { key: 'service_price' },
      update: { value: String(newPrice) },
      create: { key: 'service_price', value: String(newPrice) },
    })

    if (callbackQueryId) {
      await answerCallbackQuery(callbackQueryId, `✅ Đã đặt ${newPrice.toLocaleString('vi-VN')}đ`)
    }

    await sendMenu(
      chatId,
      `✅ Đã cập nhật giá: <b>${newPrice.toLocaleString('vi-VN')}đ</b> cho tất cả dịch vụ.\n⏳ Đang restart services...`,
      threadId,
    )

    restartServicesInBackground()
  } catch (err) {
    console.error('[TelegramAdmin] setprice error:', err)
    if (callbackQueryId) await answerCallbackQuery(callbackQueryId, '❌ Lỗi DB')
    await botReply(chatId, '❌ Lỗi khi cập nhật giá. Kiểm tra logs.', threadId)
  }
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

  // ── Handle callback_query (inline button taps) ──────────────────────────
  const callbackQuery = update.callback_query as Record<string, unknown> | undefined
  if (callbackQuery) {
    const cbFrom = callbackQuery.from as Record<string, unknown> | undefined
    const cbSenderId = cbFrom?.id as number | undefined
    const cbQueryId = callbackQuery.id as string
    const cbData = (callbackQuery.data as string | undefined) || ''
    const cbMessage = callbackQuery.message as Record<string, unknown> | undefined
    const cbChatId = (cbMessage?.chat as Record<string, unknown>)?.id as number
    const cbThreadId = cbMessage?.message_thread_id as number | undefined

    if (cbSenderId !== ADMIN_USER_ID) {
      await answerCallbackQuery(cbQueryId, '⛔ Không có quyền')
      return NextResponse.json({ ok: true })
    }

    // getprice
    if (cbData === 'getprice') {
      try {
        const cfg = await prisma.config.findUnique({ where: { key: 'service_price' } })
        const price = cfg ? parseInt(cfg.value, 10) : 3333
        await answerCallbackQuery(cbQueryId)
        await sendMenu(cbChatId, `💰 Giá hiện tại: <b>${price.toLocaleString('vi-VN')}đ</b>`, cbThreadId)
      } catch {
        await answerCallbackQuery(cbQueryId, '❌ Lỗi')
        await botReply(cbChatId, '❌ Không lấy được giá.', cbThreadId)
      }
      return NextResponse.json({ ok: true })
    }

    // setprice_<number>
    const setPriceMatch = cbData.match(/^setprice_(\d+)$/)
    if (setPriceMatch) {
      const newPrice = parseInt(setPriceMatch[1], 10)
      await applySetPrice(newPrice, cbChatId, cbThreadId, cbQueryId)
      return NextResponse.json({ ok: true })
    }

    // setprice_custom
    if (cbData === 'setprice_custom') {
      await answerCallbackQuery(cbQueryId)
      await botReply(
        cbChatId,
        '✏️ Gửi lệnh: <code>/setprice &lt;số tiền&gt;</code>\n\n' +
          'Ví dụ: <code>/setprice 8000</code> → đặt giá 8.000đ\n' +
          '<i>(chỉ nhập số nguyên dương, đơn vị là đồng)</i>',
        cbThreadId,
      )
      return NextResponse.json({ ok: true })
    }

    await answerCallbackQuery(cbQueryId)
    return NextResponse.json({ ok: true })
  }

  // ── Handle message ───────────────────────────────────────────────────────
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
      await botReply(chatId, '❌ Giá không hợp lệ. Ví dụ: <code>/setprice 5000</code> (= 5.000đ)', threadId)
      return NextResponse.json({ ok: true })
    }
    await applySetPrice(newPrice, chatId, threadId)
    return NextResponse.json({ ok: true })
  }

  // /getprice
  if (text.match(/^\/getprice$/i)) {
    try {
      const cfg = await prisma.config.findUnique({ where: { key: 'service_price' } })
      const price = cfg ? parseInt(cfg.value, 10) : 3333
      await sendMenu(chatId, `💰 Giá hiện tại: <b>${price.toLocaleString('vi-VN')}đ</b>`, threadId)
    } catch {
      await botReply(chatId, '❌ Không lấy được giá.', threadId)
    }
    return NextResponse.json({ ok: true })
  }

  // /help or /start — show menu
  if (text.match(/^\/help$/i) || text.match(/^\/start$/i)) {
    await sendMenu(
      chatId,
      '🌟 <b>HGCT Admin Bot</b>\n\nChọn thao tác bên dưới:',
      threadId,
    )
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}
