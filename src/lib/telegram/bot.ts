// Base Telegram Bot API helpers

export type TgButton = { text: string; callback_data: string }
export type TgKeyboard = TgButton[][]

async function tgCall(method: string, body: Record<string, unknown>): Promise<unknown> {
  const token = process.env.TELEGRAM_ADMIN_BOT_TOKEN
  if (!token) return {}
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json() as Record<string, unknown>
    if (!res.ok) console.error(`[TG] ${method}:`, JSON.stringify(data).slice(0, 200))
    return data.result ?? {}
  } catch (err) {
    console.error(`[TG] ${method} exception:`, err)
    return {}
  }
}

export async function tgSend(
  chatId: number | string,
  text: string,
  opts?: { threadId?: number; keyboard?: TgKeyboard; parseMode?: string },
): Promise<{ message_id?: number }> {
  return tgCall('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: opts?.parseMode ?? 'HTML',
    ...(opts?.threadId ? { message_thread_id: opts.threadId } : {}),
    ...(opts?.keyboard ? { reply_markup: { inline_keyboard: opts.keyboard } } : {}),
    disable_web_page_preview: true,
  }) as Promise<{ message_id?: number }>
}

/** Returns true if edit succeeded. */
export async function tgEdit(
  chatId: number | string,
  messageId: number,
  text: string,
  opts?: { keyboard?: TgKeyboard; parseMode?: string },
): Promise<boolean> {
  try {
    await tgCall('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: opts?.parseMode ?? 'HTML',
      ...(opts?.keyboard ? { reply_markup: { inline_keyboard: opts.keyboard } } : {}),
      disable_web_page_preview: true,
    })
    return true
  } catch {
    return false
  }
}

export async function tgAnswer(cbQueryId: string, text?: string): Promise<void> {
  await tgCall('answerCallbackQuery', {
    callback_query_id: cbQueryId,
    ...(text ? { text, show_alert: text.length > 30 } : {}),
  })
}

/** Send a message with ForceReply markup — prompts admin to reply directly. */
export async function tgSendForceReply(
  chatId: number | string,
  text: string,
  opts?: { threadId?: number; placeholder?: string; parseMode?: string },
): Promise<{ message_id?: number }> {
  return tgCall('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: opts?.parseMode ?? 'HTML',
    ...(opts?.threadId ? { message_thread_id: opts.threadId } : {}),
    reply_markup: {
      force_reply: true,
      selective: true,
      ...(opts?.placeholder ? { input_field_placeholder: opts.placeholder } : {}),
    },
    disable_web_page_preview: true,
  }) as Promise<{ message_id?: number }>
}
