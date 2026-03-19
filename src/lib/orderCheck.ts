// Shared order health-check logic — used by cron route + admin bot manual trigger

import prisma from './db'
import { tgSend, TgKeyboard } from './telegram/bot'
import { getOpenRouterBalance } from './notify'
import { SERVICE_LABELS } from './pricing'
import { sendRetargetEmail } from './email'

const GROUP_CHAT_ID = '-1003849385640'
const GROUP_THREAD_ID = 161
const PENDING_OVERDUE_MINUTES = 15
const RETARGET_HOURS = 12
// Set to true to re-enable sending retarget emails to customers
const RETARGET_EMAIL_ENABLED = false

function fmtDate(d: Date) {
  return d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function timeAgo(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 60) return `${mins}p`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export async function runOrderCheck(): Promise<void> {
  const now = new Date()
  const overdueThreshold = new Date(now.getTime() - PENDING_OVERDUE_MINUTES * 60 * 1000)
  const retargetThreshold = new Date(now.getTime() - RETARGET_HOURS * 60 * 60 * 1000)

  const [errorOrders, suspectOrders, pendingUnpaid, balance] = await Promise.all([
    // ❌ LỖI: paid but not completed or actively processing
    prisma.order.findMany({
      where: {
        paymentStatus: 'paid',
        status: { notIn: ['completed', 'processing', 'retrying', 'cancelled'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, service: true, email: true, retryCount: true, status: true, createdAt: true },
    }),
    // ❓ NGHI VẤN: unpaid but customer claimed already transferred
    prisma.order.findMany({
      where: {
        paymentStatus: 'unpaid',
        claimedAt: { not: null },
        status: 'pending',
      },
      orderBy: { claimedAt: 'desc' },
      take: 5,
      select: { id: true, service: true, email: true, amount: true, claimedAt: true, createdAt: true },
    }),
    // 💤 CHƯA THANH TOÁN: unpaid + no claim + overdue
    prisma.order.findMany({
      where: {
        paymentStatus: 'unpaid',
        claimedAt: null,
        status: 'pending',
        createdAt: { lt: overdueThreshold },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, service: true, email: true, amount: true, createdAt: true,
        retargetEmailSentAt: true, transferCode: true, profileData: true,
      },
    }),
    getOpenRouterBalance(),
  ])

  // Mark orders that have passed the retarget threshold (email disabled via RETARGET_EMAIL_ENABLED)
  const retargetTargets = pendingUnpaid.filter(o =>
    !o.retargetEmailSentAt && o.createdAt < retargetThreshold &&
    o.transferCode && o.amount
  )
  let retargetSentCount = 0
  for (const o of retargetTargets) {
    try {
      if (RETARGET_EMAIL_ENABLED) {
        const name = ((o.profileData as Record<string, unknown>)?.name as string) || ''
        await sendRetargetEmail({
          to: o.email,
          service: o.service,
          name,
          transferCode: o.transferCode!,
          amount: o.amount!,
        })
        console.log(`[ORDERCHECK] Retarget email sent: order ${o.id} (${o.email})`)
      } else {
        console.log(`[ORDERCHECK] Retarget email disabled — marking order ${o.id} as retargeted without sending`)
      }
      await prisma.order.updateMany({
        where: { id: o.id },
        data: { retargetEmailSentAt: now },
      })
      retargetSentCount++
    } catch (err) {
      console.error(`[ORDERCHECK] Retarget failed for order ${o.id}:`, err)
    }
  }

  const timeStr = fmtDate(now)
  const balanceStr = balance != null ? `$${balance.toFixed(2)}` : 'N/A'
  const hasIssues = errorOrders.length > 0 || suspectOrders.length > 0

  if (!hasIssues && pendingUnpaid.length === 0) {
    await tgSend(
      GROUP_CHAT_ID,
      `✅ <b>Kiểm tra đơn — ${timeStr}</b>\nKhông có vấn đề gì.\n💳 OR Balance: ${balanceStr}`,
      { threadId: GROUP_THREAD_ID },
    )
    return
  }

  const lines: string[] = [`🔎 <b>Kiểm tra đơn — ${timeStr}</b>`]
  const keyboard: TgKeyboard = []

  // ❌ LỖI group
  if (errorOrders.length > 0) {
    lines.push(`\n❌ <b>LỖI — đã CK nhưng chưa xong (${errorOrders.length}):</b>`)
    for (const o of errorOrders) {
      const svc = SERVICE_LABELS[o.service] ?? o.service
      const d = new Date(o.createdAt)
      lines.push(`• #${o.id} ${svc} — ${o.email} — ${o.status} — ${fmtTime(d)} (${timeAgo(d)} trước)`)
      keyboard.push([
        { text: `🔄 #${o.id}`, callback_data: `o_retry_${o.id}` },
        { text: `📧 #${o.id}`, callback_data: `o_email_${o.id}` },
        { text: `🗑 #${o.id}`, callback_data: `o_cancel_${o.id}` },
      ])
    }
  }

  // ❓ NGHI VẤN group
  if (suspectOrders.length > 0) {
    lines.push(`\n❓ <b>NGHI VẤN — khách đã báo CK (${suspectOrders.length}):</b>`)
    for (const o of suspectOrders) {
      const svc = SERVICE_LABELS[o.service] ?? o.service
      const amt = o.amount ? `${o.amount.toLocaleString('vi-VN')}đ` : '?đ'
      const claimed = new Date(o.claimedAt!)
      lines.push(`• #${o.id} ${svc} — ${o.email} — ${amt} — báo lúc ${fmtTime(claimed)}`)
      keyboard.push([
        { text: `✅ Paid #${o.id}`, callback_data: `o_pay_${o.id}` },
        { text: `🗑 Hủy #${o.id}`, callback_data: `o_cancel_${o.id}` },
      ])
    }
  }

  // 💤 CHƯA THANH TOÁN group (summary + inline list)
  if (pendingUnpaid.length > 0) {
    const alreadyMarked = pendingUnpaid.filter(o => o.retargetEmailSentAt).length
    const totalRetargeted = alreadyMarked + retargetSentCount
    const notSent = Math.max(0, pendingUnpaid.length - totalRetargeted)
    lines.push(`\n💤 <b>CHƯA THANH TOÁN (${pendingUnpaid.length} đơn):</b>`)
    // Inline list — chỉ hiện đơn CHƯA retarget (max 5)
    const unretargeted = pendingUnpaid.filter(o => !o.retargetEmailSentAt)
    const shown = unretargeted.slice(0, 5)
    for (const o of shown) {
      const svc = SERVICE_LABELS[o.service] ?? o.service
      const amt = o.amount ? `${o.amount.toLocaleString('vi-VN')}đ` : '?đ'
      const ago = timeAgo(new Date(o.createdAt))
      lines.push(`• #${o.id} — ${svc} — ${o.email} — ${amt} — ${ago} trước`)
    }
    if (unretargeted.length > 5) lines.push(`... và ${unretargeted.length - 5} đơn nữa`)
    lines.push(`Đã retarget: ${totalRetargeted} · Chưa gửi: ${notSent}`)
    keyboard.push([
      { text: `📋 Chi tiết ${pendingUnpaid.length} đơn →`, callback_data: 'o_pending_detail' },
    ])
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
