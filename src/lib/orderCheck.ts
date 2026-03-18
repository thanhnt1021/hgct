// Shared order health-check logic — used by cron route + admin bot manual trigger

import prisma from './db'
import { tgSend, TgKeyboard } from './telegram/bot'
import { getOpenRouterBalance } from './notify'
import { SERVICE_LABELS } from './pricing'

const GROUP_CHAT_ID = '-1003849385640'
const GROUP_THREAD_ID = 161
const PENDING_OVERDUE_MINUTES = 15

function fmtDate(d: Date) {
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

export async function runOrderCheck(): Promise<void> {
  const now = new Date()
  const overdueThreshold = new Date(now.getTime() - PENDING_OVERDUE_MINUTES * 60 * 1000)

  const [failedOrders, pendingOrders, balance] = await Promise.all([
    prisma.order.findMany({
      where: { status: 'failed' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, service: true, email: true, retryCount: true, createdAt: true },
    }),
    prisma.order.findMany({
      where: { status: 'pending', paymentStatus: 'unpaid', createdAt: { lt: overdueThreshold } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, service: true, email: true, amount: true, createdAt: true },
    }),
    getOpenRouterBalance(),
  ])

  const timeStr = fmtDate(now)
  const balanceStr = balance != null ? `$${balance.toFixed(2)}` : 'N/A'

  if (failedOrders.length === 0 && pendingOrders.length === 0) {
    await tgSend(
      GROUP_CHAT_ID,
      `✅ <b>Kiểm tra đơn — ${timeStr}</b>\nKhông có đơn lỗi hoặc pending quá hạn.\n💳 OR Balance: ${balanceStr}`,
      { threadId: GROUP_THREAD_ID },
    )
    return
  }

  const lines: string[] = [`🔎 <b>Kiểm tra đơn — ${timeStr}</b>`]
  const keyboard: TgKeyboard = []

  if (failedOrders.length > 0) {
    lines.push(`\n❌ <b>Đơn failed (${failedOrders.length}):</b>`)
    for (const o of failedOrders) {
      const svc = SERVICE_LABELS[o.service] ?? o.service
      lines.push(`• #${o.id} — ${svc} — ${o.email} — ${fmtDate(new Date(o.createdAt))} — Retry: ${o.retryCount}/3`)
      keyboard.push([
        { text: `🔄 #${o.id}`, callback_data: `o_retry_${o.id}` },
        { text: `📧 #${o.id}`, callback_data: `o_email_${o.id}` },
        { text: `🗑 #${o.id}`, callback_data: `o_cancel_${o.id}` },
      ])
    }
  }

  if (pendingOrders.length > 0) {
    lines.push(`\n⏳ <b>Đơn pending quá ${PENDING_OVERDUE_MINUTES}p (${pendingOrders.length}):</b>`)
    for (const o of pendingOrders) {
      const svc = SERVICE_LABELS[o.service] ?? o.service
      const amt = o.amount ? `${o.amount.toLocaleString('vi-VN')}đ` : '0đ'
      lines.push(`• #${o.id} — ${svc} — ${o.email} — ${amt} — ${fmtDate(new Date(o.createdAt))}`)
      keyboard.push([
        { text: `✅ Paid #${o.id}`, callback_data: `o_pay_${o.id}` },
        { text: `🗑 Hủy #${o.id}`, callback_data: `o_cancel_${o.id}` },
      ])
    }
  }

  lines.push(`\n💳 OR Balance: <b>${balanceStr}</b>`)

  await tgSend(GROUP_CHAT_ID, lines.join('\n'), { threadId: GROUP_THREAD_ID, keyboard })
}

export async function getCheckInterval(): Promise<number> {
  const cfg = await prisma.config.findUnique({ where: { key: 'order_check_interval' } })
  return parseInt(cfg?.value ?? '15', 10)
}

export async function setCheckInterval(minutes: number): Promise<void> {
  await prisma.config.upsert({
    where: { key: 'order_check_interval' },
    update: { value: String(minutes) },
    create: { key: 'order_check_interval', value: String(minutes) },
  })
}
