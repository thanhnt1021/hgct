const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_CHAT_ID = '-1003849385640'
const TELEGRAM_THREAD_ID = 161
const OPENROUTER_MANAGEMENT_KEY = process.env.OPENROUTER_MANAGEMENT_KEY || ''

const SERVICE_NAMES: Record<string, string> = {
  career: 'Hướng Nghiệp',
  love: 'Tình Duyên',
  synastry: 'Cặp Đôi',
  relationship: 'Cặp Đôi',
  transit: 'Vận Hạn',
}

export async function getOpenRouterBalance(): Promise<number | null> {
  if (!OPENROUTER_MANAGEMENT_KEY) return null
  try {
    const res = await fetch('https://openrouter.ai/api/v1/credits', {
      headers: { Authorization: `Bearer ${OPENROUTER_MANAGEMENT_KEY}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    const { total_credits, total_usage } = data.data ?? {}
    if (total_credits == null) return null
    return total_credits - (total_usage ?? 0)
  } catch {
    return null
  }
}

async function getUsdToVndSellRate(): Promise<number | null> {
  // Primary: VCB Sell rate (bán USD) — rate unfavorable for buyer, most VND per USD
  try {
    const res = await fetch(
      'https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx?b=10',
      { signal: AbortSignal.timeout(5000) },
    )
    if (res.ok) {
      const xml = await res.text()
      const match = xml.match(/CurrencyCode="USD"[^/]*Sell="([^"]+)"/)
      if (match) {
        const rate = parseFloat(match[1].replace(/,/g, ''))
        if (rate > 0) return rate
      }
    }
  } catch { /* fallback */ }

  // Fallback: open.er-api.com mid-market
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      const data = await res.json()
      const rate = data.rates?.VND
      if (rate > 0) return rate
    }
  } catch { /* ignore */ }

  return null
}

async function getGenerationCost(generationIds: string[]): Promise<number | null> {
  if (!OPENROUTER_MANAGEMENT_KEY || generationIds.length === 0) return null
  try {
    // Wait 15s for OR to populate cost, then retry 2x with 10s gaps
    const delays = [15000, 10000, 10000]
    for (let attempt = 0; attempt < delays.length; attempt++) {
      await new Promise((r) => setTimeout(r, delays[attempt]))
      let totalCost = 0
      for (const id of generationIds) {
        const res = await fetch(`https://openrouter.ai/api/v1/generation?id=${id}`, {
          headers: { Authorization: `Bearer ${OPENROUTER_MANAGEMENT_KEY}` },
        })
        if (res.ok) {
          const data = await res.json()
          totalCost += data.data?.total_cost ?? 0
        }
      }
      if (totalCost > 0) return totalCost
    }
    return null
  } catch {
    return null
  }
}

// ── Alert helpers (send to same notification group) ─────────────────────────

async function sendToGroup(text: string, keyboard?: Array<Array<{ text: string; callback_data: string }>>) {
  if (!TELEGRAM_BOT_TOKEN) return
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        message_thread_id: TELEGRAM_THREAD_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
      }),
    })
  } catch (err) {
    console.error('[Notify] sendToGroup failed:', err)
  }
}

export async function sendAdminAlert(
  text: string,
  keyboard?: Array<Array<{ text: string; callback_data: string }>>,
): Promise<void> {
  await sendToGroup(text, keyboard)
}

export async function sendOrderFailedAlert(params: {
  orderId: number
  service: string
  name: string
  email: string
  error: string
}): Promise<void> {
  const { orderId, service, name, email, error } = params
  const svcName = SERVICE_NAMES[service] || service
  const text = [
    `❌ <b>Đơn #${orderId} bị lỗi!</b>`,
    `📦 ${svcName} — ${name}`,
    `📧 ${email}`,
    `💥 ${error.slice(0, 120)}`,
  ].join('\n')
  const keyboard = [[
    { text: '🔄 Retry ngay', callback_data: `o_retry_${orderId}` },
    { text: '📧 Gửi email recovery', callback_data: `o_email_${orderId}` },
  ]]
  await sendToGroup(text, keyboard)
}

export async function sendUnderpaymentAlert(params: {
  orderId: number
  transferCode: string
  expected: number
  received: number
}): Promise<void> {
  const { orderId, transferCode, expected, received } = params
  const text = [
    `⚠️ <b>Underpayment — Đơn #${orderId}</b>`,
    `Mã CK: <code>${transferCode}</code>`,
    `Cần: <b>${expected.toLocaleString('vi-VN')}đ</b>`,
    `Nhận: <b>${received.toLocaleString('vi-VN')}đ</b>`,
    `Thiếu: ${(expected - received).toLocaleString('vi-VN')}đ`,
  ].join('\n')
  const keyboard = [[
    { text: '✅ Mark Paid & Tạo báo cáo', callback_data: `o_pay_${orderId}` },
  ]]
  await sendToGroup(text, keyboard)
}

// ── Order success notification (original) ────────────────────────────────────

export async function sendOrderNotification(params: {
  service: string
  name: string
  email: string
  amount: number
  generationIds: string[]
}): Promise<void> {
  const { service, name, email, amount, generationIds } = params

  // Sequential: fee first (waits for OR to populate), then balance + rate in parallel
  const fee = await getGenerationCost(generationIds)
  const [balance, vndRate] = await Promise.all([getOpenRouterBalance(), getUsdToVndSellRate()])

  const serviceName = SERVICE_NAMES[service] || service
  const amountStr = amount > 0 ? `${amount.toLocaleString('vi-VN')}đ` : '0đ'
  const feeStr = fee != null ? `$${fee.toFixed(4)}` : 'N/A'
  const feeVndStr =
    fee != null && vndRate != null
      ? `${Math.round(fee * vndRate).toLocaleString('vi-VN')}đ`
      : 'N/A'
  const balanceStr = balance != null ? `$${balance.toFixed(2)}` : 'N/A'

  const text = [
    '🔔 <b>Đơn hàng mới hoàn thành!</b>',
    `📦 Dịch vụ: Luận giải ${serviceName}`,
    `👤 Khách: ${name}`,
    `📧 Email: ${email}`,
    `💰 Số tiền: ${amountStr}`,
    `💸 OR Fee: ${feeStr}`,
    `🇻🇳 OR VND: ${feeVndStr}`,
    `💳 OR Balance: ${balanceStr}`,
  ].join('\n')

  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('[Notify] TELEGRAM_BOT_TOKEN not set — skipping notification')
    return
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          message_thread_id: TELEGRAM_THREAD_ID,
          text,
          parse_mode: 'HTML',
        }),
      },
    )
    if (!res.ok) {
      const err = await res.text()
      console.error('[Notify] Telegram error:', err)
    }
  } catch (err) {
    console.error('[Notify] Telegram send failed:', err)
  }
}
