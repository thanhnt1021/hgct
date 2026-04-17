// Admin Bot — business logic: menus, handlers, order actions, system control

// Escape HTML special chars for Telegram parse_mode: 'HTML'
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

import prisma from '@/lib/db'
import { tgSend, tgEdit, tgAnswer, tgSendForceReply, TgKeyboard } from './bot'
import {
  SERVICES,
  SERVICE_LABELS,
  SERVICE_ICONS,
  getAllPrices,
  getPrice,
  setPrice,
  setAllPrices,
} from '@/lib/pricing'
import { generateRecoveryToken, STUCK_ERROR } from '@/lib/jobs'
import { createReportJob } from '@/lib/astrology/reportProcessor'
import { sendRecoveryEmail } from '@/lib/email'
import { smartRetryOrder } from '@/lib/smart-retry'
import { getOpenRouterBalance } from '@/lib/notify'
import { runOrderCheck, getCheckInterval, setCheckInterval } from '@/lib/orderCheck'
import { restartContainer, getContainerStatus } from '@/lib/docker'

// ── Types ────────────────────────────────────────────────────────────────────

interface Ctx {
  chatId: number
  threadId?: number
  messageId?: number   // present for callback_query
  cbQueryId?: string   // present for callback_query
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Edit if possible (navigation), else send new message. */
async function respond(ctx: Ctx, text: string, keyboard?: TgKeyboard) {
  if (ctx.cbQueryId) await tgAnswer(ctx.cbQueryId)
  if (ctx.messageId) {
    const ok = await tgEdit(ctx.chatId, ctx.messageId, text, { keyboard })
    if (ok) return
  }
  await tgSend(ctx.chatId, text, { threadId: ctx.threadId, keyboard })
}

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + 'đ'
}

function timeAgoStr(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return '<1p'
  if (diffMins < 60) return `${diffMins}p`
  const h = Math.floor(diffMins / 60)
  const m = diffMins % 60
  if (h < 24) return m > 0 ? `${h}h${m}p` : `${h}h`
  const d = Math.floor(h / 24)
  const rh = h % 24
  return rh > 0 ? `${d}d${rh}h` : `${d}d`
}

function fmtTimeVN(date: Date): string {
  return date.toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusEmoji(status: string) {
  if (status === 'completed') return '✅'
  if (status === 'processing' || status === 'retrying') return '🔄'
  if (status === 'failed') return '❌'
  if (status === 'cancelled') return '🚫'
  return '⏳'
}

// ── PRESETS ───────────────────────────────────────────────────────────────────

const PRESETS = [3333, 5000, 7000, 10000, 15000, 20000]

function presetRows(svcCode: string): TgKeyboard {
  const rows: TgKeyboard = []
  for (let i = 0; i < PRESETS.length; i += 3) {
    rows.push(
      PRESETS.slice(i, i + 3).map(p => ({
        text: fmt(p),
        callback_data: `p_${svcCode}_${p}`,
      })),
    )
  }
  rows.push([{ text: '✏️ Nhập giá khác', callback_data: `p_${svcCode}_cust` }])
  rows.push([{ text: '↩️ Quay lại', callback_data: 'm_price' }])
  return rows
}

// svc short codes: c=career l=love s=synastry t=transit a=all
const SVC_CODE: Record<string, string> = {
  career: 'c', love: 'l', synastry: 's', transit: 't',
}
const CODE_SVC: Record<string, string> = {
  c: 'career', l: 'love', s: 'synastry', t: 'transit', a: 'all',
}

// ── MENUS ─────────────────────────────────────────────────────────────────────

export async function showMainMenu(ctx: Ctx) {
  await respond(
    ctx,
    '🌟 <b>HGCT Admin Bot</b>\n\nChọn thao tác:',
    [
      [{ text: '💰 Quản lý giá', callback_data: 'm_price' }],
      [
        { text: '📦 Đơn hàng', callback_data: 'm_orders' },
        { text: '🔧 Hệ thống', callback_data: 'm_system' },
      ],
    ],
  )
}

export async function showPriceMenu(ctx: Ctx) {
  const prices = await getAllPrices()
  const lines = SERVICES.map(
    svc => `${SERVICE_ICONS[svc]} ${SERVICE_LABELS[svc]}: <b>${fmt(prices[svc])}</b>`,
  )
  const text = `💰 <b>Quản lý giá dịch vụ</b>\n\n${lines.join('\n')}`
  const keyboard: TgKeyboard = [
    SERVICES.slice(0, 2).map(svc => ({
      text: `${SERVICE_ICONS[svc]} ${SERVICE_LABELS[svc]}`,
      callback_data: `m_price_svc_${SVC_CODE[svc]}`,
    })),
    SERVICES.slice(2).map(svc => ({
      text: `${SERVICE_ICONS[svc]} ${SERVICE_LABELS[svc]}`,
      callback_data: `m_price_svc_${SVC_CODE[svc]}`,
    })),
    [{ text: '📋 Đặt tất cả cùng lúc', callback_data: 'm_price_svc_a' }],
    [{ text: '↩️ Quay lại', callback_data: 'main' }],
  ]
  await respond(ctx, text, keyboard)
}

export async function showPriceSvcMenu(ctx: Ctx, code: string) {
  const svc = CODE_SVC[code]
  const isAll = svc === 'all'
  const label = isAll ? 'Tất cả dịch vụ' : `${SERVICE_ICONS[svc] ?? ''} ${SERVICE_LABELS[svc] ?? svc}`
  let currentStr = ''
  if (!isAll) {
    const cur = await getPrice(svc)
    currentStr = `\nHiện tại: <b>${fmt(cur)}</b>`
  }
  await respond(ctx, `💰 <b>Đặt giá ${label}</b>${currentStr}`, presetRows(code))
}

export async function showOrdersMenu(ctx: Ctx) {
  await respond(
    ctx,
    '📦 <b>Quản lý đơn hàng</b>',
    [
      [{ text: '📊 Thống kê hôm nay', callback_data: 'o_stats' }],
      [
        { text: '⏳ Đơn pending', callback_data: 'o_pending' },
        { text: '❌ Đơn lỗi', callback_data: 'o_failed' },
      ],
      [{ text: '📜 5 đơn gần nhất', callback_data: 'o_recent' }],
      [{ text: '↩️ Quay lại', callback_data: 'main' }],
    ],
  )
}

export async function showSystemMenu(ctx: Ctx) {
  const interval = await getCheckInterval()
  await respond(
    ctx,
    `🔧 <b>Hệ thống</b>\n\n⏱ Check đơn mỗi: <b>${interval} phút</b>`,
    [
      [
        { text: '🔄 Restart Production', callback_data: 's_rst_prod' },
        { text: '🔄 Restart Demo', callback_data: 's_rst_demo' },
      ],
      [
        { text: '📡 Health Check', callback_data: 's_health' },
        { text: '💳 OR Balance', callback_data: 's_balance' },
      ],
      [
        { text: '🔍 Check đơn ngay', callback_data: 's_check' },
        { text: '⏱ Set interval', callback_data: 's_set_interval' },
      ],
      [{ text: '↩️ Quay lại', callback_data: 'main' }],
    ],
  )
}

// ── PRICE ACTIONS ─────────────────────────────────────────────────────────────

export async function applyPrice(ctx: Ctx, code: string, price: number) {
  const svc = CODE_SVC[code]
  const isAll = svc === 'all'
  try {
    if (isAll) {
      await setAllPrices(price)
    } else {
      await setPrice(svc, price)
    }
    const label = isAll ? 'tất cả dịch vụ' : SERVICE_LABELS[svc]
    await respond(
      ctx,
      `✅ <b>Đã cập nhật giá ${label}: ${fmt(price)}</b>`,
      [[{ text: '↩️ Quay lại menu giá', callback_data: 'm_price' }]],
    )
  } catch (err) {
    console.error('[AdminBot] applyPrice error:', err)
    await respond(ctx, '❌ Lỗi khi cập nhật giá. Kiểm tra logs.')
  }
}

// ── ORDER VIEWS ────────────────────────────────────────────────────────────────

export async function showOrderStats(ctx: Ctx) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  try {
    const [completed, pending, processing, failed, revenue] = await Promise.all([
      prisma.order.count({ where: { status: 'completed', createdAt: { gte: today } } }),
      prisma.order.count({ where: { status: 'pending', createdAt: { gte: today } } }),
      prisma.order.count({ where: { status: { in: ['processing', 'retrying'] }, createdAt: { gte: today } } }),
      prisma.order.count({ where: { status: 'failed', createdAt: { gte: today } } }),
      prisma.order.findMany({
        where: { status: 'completed', createdAt: { gte: today } },
        select: { amount: true },
      }),
    ])
    const totalRevenue = revenue.reduce((s, o) => s + (o.amount ?? 0), 0)
    const d = today.toLocaleDateString('vi-VN')
    const text = [
      `📊 <b>Thống kê hôm nay (${d})</b>`,
      `✅ Hoàn thành: <b>${completed}</b> đơn`,
      `🔄 Đang xử lý: <b>${processing}</b> đơn`,
      `⏳ Chờ thanh toán: <b>${pending}</b> đơn`,
      `❌ Lỗi: <b>${failed}</b> đơn`,
      `💰 Doanh thu: <b>${fmt(totalRevenue)}</b>`,
    ].join('\n')
    await respond(ctx, text, [[{ text: '↩️ Quay lại', callback_data: 'm_orders' }]])
  } catch (err) {
    console.error('[AdminBot] stats error:', err)
    await respond(ctx, '❌ Lỗi khi lấy thống kê.')
  }
}

export async function showPendingOrders(ctx: Ctx) {
  try {
    const baseSelect = { id: true, service: true, email: true, amount: true, createdAt: true } as const
    const [uncontacted, contacted] = await Promise.all([
      prisma.order.findMany({
        where: { paymentStatus: 'unpaid', status: 'pending', retargetEmailSentAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: baseSelect,
      }),
      prisma.order.findMany({
        where: { paymentStatus: 'unpaid', status: 'pending', retargetEmailSentAt: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: baseSelect,
      }),
    ])

    const total = uncontacted.length + contacted.length
    if (total === 0) {
      await respond(ctx, '✅ Không có đơn nào đang chờ thanh toán.', [
        [{ text: '↩️ Quay lại', callback_data: 'm_orders' }],
      ])
      return
    }

    const fmtLine = (o: { id: number; service: string; email: string; amount: number | null; createdAt: Date }) => {
      const d = new Date(o.createdAt)
      return `#${o.id} — ${SERVICE_LABELS[o.service] ?? o.service} — ${escHtml(o.email)} — ${fmt(o.amount ?? 0)} — ${fmtTimeVN(d)} (${timeAgoStr(d)} trước)`
    }

    const sections: string[] = []
    if (uncontacted.length > 0) {
      sections.push(`📋 <b>Chưa gửi mail (${uncontacted.length})</b>`)
      uncontacted.forEach(o => sections.push(fmtLine(o)))
    }
    if (contacted.length > 0) {
      if (sections.length > 0) sections.push('')
      sections.push(`✉️ <b>Đã gửi mail / đã đánh dấu (${contacted.length})</b>`)
      contacted.forEach(o => sections.push(fmtLine(o)))
    }

    const allOrders = [...uncontacted, ...contacted]
    const buttons: TgKeyboard = allOrders.map(o => [
      { text: `✅ Paid #${o.id}`, callback_data: `o_pay_${o.id}` },
      { text: `🗑 Hủy #${o.id}`, callback_data: `o_cancel_${o.id}` },
    ])
    buttons.push([{ text: '🗑 Hủy tất cả pending', callback_data: 'o_cancel_all_pending' }])
    buttons.push([{ text: '↩️ Quay lại', callback_data: 'm_orders' }])
    await respond(ctx, `⏳ <b>Đơn chờ thanh toán (${total})</b>\n\n${sections.join('\n')}`, buttons)
  } catch (err) {
    console.error('[AdminBot] pending orders error:', err)
    await respond(ctx, '❌ Lỗi khi lấy danh sách.')
  }
}

export async function showFailedOrders(ctx: Ctx) {
  try {
    const orders = await prisma.order.findMany({
      where: { status: 'failed' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, service: true, email: true, retryCount: true, createdAt: true },
    })
    if (orders.length === 0) {
      await respond(ctx, '✅ Không có đơn nào bị lỗi.', [
        [{ text: '↩️ Quay lại', callback_data: 'm_orders' }],
      ])
      return
    }
    const lines = orders.map(o => {
      const d = new Date(o.createdAt)
      return `#${o.id} — ${SERVICE_LABELS[o.service] ?? o.service} — ${o.email} — Retry: ${o.retryCount}/3 — ${fmtTimeVN(d)} (${timeAgoStr(d)} trước)`
    })
    const buttons: TgKeyboard = orders.map(o => [
      { text: `🔄 #${o.id}`, callback_data: `o_retry_${o.id}` },
      { text: `📧 #${o.id}`, callback_data: `o_email_${o.id}` },
      { text: `🗑 #${o.id}`, callback_data: `o_cancel_${o.id}` },
    ])
    buttons.push([{ text: '↩️ Quay lại', callback_data: 'm_orders' }])
    await respond(ctx, `❌ <b>Đơn bị lỗi (${orders.length})</b>\n\n${lines.join('\n')}`, buttons)
  } catch (err) {
    console.error('[AdminBot] failed orders error:', err)
    await respond(ctx, '❌ Lỗi khi lấy danh sách.')
  }
}

export async function showRecentOrders(ctx: Ctx) {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, service: true, email: true, status: true, amount: true, createdAt: true },
    })
    if (orders.length === 0) {
      await respond(ctx, 'Chưa có đơn nào.', [[{ text: '↩️ Quay lại', callback_data: 'm_orders' }]])
      return
    }
    const lines = orders.map(
      o =>
        `${statusEmoji(o.status)} #${o.id} — ${SERVICE_LABELS[o.service] ?? o.service} — ${escHtml(o.email)} — ${fmt(o.amount ?? 0)}`,
    )
    await respond(
      ctx,
      `📜 <b>5 đơn gần nhất</b>\n\n${lines.join('\n')}`,
      [[{ text: '↩️ Quay lại', callback_data: 'm_orders' }]],
    )
  } catch (err) {
    console.error('[AdminBot] recent orders error:', err)
    await respond(ctx, '❌ Lỗi khi lấy danh sách.')
  }
}

// ── ORDER ACTIONS ─────────────────────────────────────────────────────────────

export async function handleMarkPaid(ctx: Ctx, orderId: number) {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) { await respond(ctx, `❌ Không tìm thấy đơn #${orderId}.`); return }
    if (order.adminCancelledAt) { await respond(ctx, `❌ Đơn #${orderId} đã bị admin hủy — không thể mark paid.`); return }
    if (order.paymentStatus === 'paid') { await respond(ctx, `⚠️ Đơn #${orderId} đã được thanh toán rồi.`); return }
    if (order.status === 'completed') { await respond(ctx, `⚠️ Đơn #${orderId} đã hoàn thành rồi.`); return }

    // Mark paid first (paid status is prerequisite for retry to proceed)
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'paid', paidAt: new Date(), status: 'failed' },
    })

    // Use smartRetryOrder with admin privileges (resets retryCount, checks PDF)
    const result = await smartRetryOrder(orderId, 'admin')

    if (result.pdfResent) {
      await respond(
        ctx,
        `✅ <b>Đơn #${orderId} đã được mark paid</b>\nPDF đã có sẵn — gửi lại email thành công.`,
        [[{ text: '↩️ Quay lại', callback_data: 'm_orders' }]],
      )
      return
    }

    await respond(
      ctx,
      `✅ <b>Đơn #${orderId} đã được mark paid</b>\nJob đang chạy — khách nhận PDF qua email khi xong.`,
      [[{ text: '↩️ Quay lại', callback_data: 'm_orders' }]],
    )
  } catch (err) {
    console.error('[AdminBot] markPaid error:', err)
    await respond(ctx, `❌ Lỗi khi mark paid đơn #${orderId}.`)
  }
}

export async function handleRetryOrder(ctx: Ctx, orderId: number) {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) { await respond(ctx, `❌ Không tìm thấy đơn #${orderId}.`); return }
    if (order.paymentStatus !== 'paid') { await respond(ctx, `⚠️ Đơn #${orderId} chưa thanh toán — dùng Mark Paid trước.`); return }
    if (order.status === 'completed') { await respond(ctx, `✅ Đơn #${orderId} đã hoàn thành rồi.`); return }
    if (order.status === 'cancelled') { await respond(ctx, `❌ Đơn #${orderId} đã bị hủy — không thể retry.`); return }

    const result = await smartRetryOrder(orderId, 'admin')

    if (result.skipped) {
      await respond(ctx, `⚠️ Đơn #${orderId} đang retry. Chờ xong.`); return
    }
    if (result.pdfResent) {
      await respond(
        ctx,
        `📧 <b>Đơn #${orderId} — PDF đã có, gửi lại email thành công.</b>`,
        [[{ text: '↩️ Quay lại', callback_data: 'm_orders' }]],
      )
      return
    }

    await respond(
      ctx,
      `🔄 <b>Đang retry đơn #${orderId}</b>\nJob đã khởi động — khách nhận PDF qua email khi xong.`,
      [[{ text: '↩️ Quay lại', callback_data: 'm_orders' }]],
    )
  } catch (err) {
    console.error('[AdminBot] retryOrder error:', err)
    await respond(ctx, `❌ Lỗi khi retry đơn #${orderId}.`)
  }
}

export async function handleResendEmail(ctx: Ctx, orderId: number) {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) { await respond(ctx, `❌ Không tìm thấy đơn #${orderId}.`); return }

    let token = order.recoveryToken
    if (!token) {
      token = generateRecoveryToken()
      await prisma.order.update({ where: { id: orderId }, data: { recoveryToken: token } })
    }

    const iData = (order.profileData as Record<string, unknown>) || {}
    await sendRecoveryEmail({
      to: order.email,
      service: order.service,
      token,
      name: (iData.name as string) || '',
    })

    await respond(
      ctx,
      `📧 <b>Đã gửi email recovery đến ${order.email}</b>\nToken: <code>${token}</code>`,
      [[{ text: '↩️ Quay lại', callback_data: 'm_orders' }]],
    )
  } catch (err) {
    console.error('[AdminBot] resendEmail error:', err)
    await respond(ctx, `❌ Lỗi khi gửi email đơn #${orderId}.`)
  }
}

export async function handleCancelOrder(ctx: Ctx, orderId: number) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, adminCancelledAt: true },
    })
    if (!order) {
      if (ctx.cbQueryId) await tgAnswer(ctx.cbQueryId, `❌ Không tìm thấy đơn #${orderId}`)
      return
    }
    if (order.adminCancelledAt) {
      // Ensure status is also set to 'cancelled' (may have been set before status update existed)
      if (order.status !== 'cancelled') {
        await prisma.order.update({ where: { id: orderId }, data: { status: 'cancelled' } })
      }
      if (ctx.cbQueryId) await tgAnswer(ctx.cbQueryId, '✅ Đã hủy đơn #' + orderId)
      // Refresh the list so the button disappears
      const editCtx: Ctx = { chatId: ctx.chatId, threadId: ctx.threadId, messageId: ctx.messageId }
      await showFailedOrders(editCtx)
      return
    }
    if (order.status === 'processing' || order.status === 'retrying') {
      if (ctx.cbQueryId) await tgAnswer(ctx.cbQueryId, '❌ Đơn đang xử lý — không thể hủy')
      return
    }
    if (order.status === 'completed') {
      if (ctx.cbQueryId) await tgAnswer(ctx.cbQueryId, '❌ Đơn đã hoàn thành — không thể hủy')
      return
    }
    const wasPending = order.status === 'pending'
    const now = new Date()
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'cancelled', adminCancelledAt: now },
    })
    if (ctx.cbQueryId) await tgAnswer(ctx.cbQueryId, `✅ Đã hủy đơn #${orderId}`)
    // Edit message in-place with refreshed list (no cbQueryId to avoid double-answer)
    const editCtx: Ctx = { chatId: ctx.chatId, threadId: ctx.threadId, messageId: ctx.messageId }
    if (wasPending) {
      await showPendingOrders(editCtx)
    } else {
      await showFailedOrders(editCtx)
    }
  } catch (err) {
    console.error('[AdminBot] cancelOrder error:', err)
    if (ctx.cbQueryId) await tgAnswer(ctx.cbQueryId, '❌ Lỗi khi hủy đơn')
  }
}

export async function confirmCancelAllPending(ctx: Ctx) {
  try {
    const count = await prisma.order.count({ where: { status: 'pending', paymentStatus: 'unpaid' } })
    if (count === 0) {
      await respond(ctx, '✅ Không có đơn pending nào.', [
        [{ text: '↩️ Quay lại', callback_data: 'm_orders' }],
      ])
      return
    }
    await respond(
      ctx,
      `⚠️ <b>Xác nhận hủy tất cả?</b>\nSẽ hủy <b>${count}</b> đơn pending chưa thanh toán.`,
      [
        [
          { text: '✅ Xác nhận hủy tất cả', callback_data: 'o_cancel_all_confirm' },
          { text: '↩️ Hủy', callback_data: 'o_pending' },
        ],
      ],
    )
  } catch (err) {
    console.error('[AdminBot] confirmCancelAll error:', err)
    await respond(ctx, '❌ Lỗi.')
  }
}

export async function handleCancelAllPending(ctx: Ctx) {
  try {
    const result = await prisma.order.updateMany({
      where: { status: 'pending', paymentStatus: 'unpaid' },
      data: { status: 'cancelled', adminCancelledAt: new Date() },
    })
    await respond(
      ctx,
      `✅ <b>Đã hủy ${result.count} đơn pending</b>`,
      [[{ text: '↩️ Quay lại', callback_data: 'm_orders' }]],
    )
  } catch (err) {
    console.error('[AdminBot] cancelAllPending error:', err)
    await respond(ctx, '❌ Lỗi khi hủy đơn.')
  }
}

// ── SYSTEM ─────────────────────────────────────────────────────────────────────

export async function handleRestartProd(ctx: Ctx, force = false) {
  try {
    const activeCount = await prisma.order.count({
      where: { status: { in: ['processing', 'retrying'] } },
    })

    if (activeCount > 0 && !force) {
      await respond(
        ctx,
        `⚠️ <b>Có ${activeCount} đơn đang xử lý!</b>\n\nRestart ngay sẽ gây lỗi cho khách đang chờ báo cáo.\nSau restart, hệ thống tự tạo recovery tokens cho các đơn bị gián đoạn.`,
        [
          [
            { text: '⚡ Force restart', callback_data: 's_rst_prod_f' },
            { text: '↩️ Hủy', callback_data: 'm_system' },
          ],
        ],
      )
      return
    }

    if (force && activeCount > 0) {
      await forceRecoverActiveOrders()
    }

    await respond(
      ctx,
      `🔄 <b>Đang restart Production...</b>\nContainer hgct-prod sẽ restart trong ~3 giây.`,
    )
    setTimeout(() => {
      restartContainer('hgct-prod').catch((err) => {
        console.error('[AdminBot] restartProd docker API error:', err)
      })
    }, 3000)
  } catch (err) {
    console.error('[AdminBot] restartProd error:', err)
    await respond(ctx, '❌ Lỗi khi restart. Kiểm tra logs.')
  }
}

export async function handleRestartDemo(ctx: Ctx) {
  try {
    await respond(ctx, '🔄 <b>Đang restart Demo...</b>')
    restartContainer('hgct-demo').catch((err) => {
      console.error('[AdminBot] restartDemo docker API error:', err)
    })
  } catch (err) {
    console.error('[AdminBot] restartDemo error:', err)
    await respond(ctx, '❌ Lỗi khi restart demo.')
  }
}

async function forceRecoverActiveOrders() {
  const activeOrders = await prisma.order.findMany({
    where: { status: { in: ['processing', 'retrying'] } },
    select: { id: true, email: true, service: true, profileData: true, jobId: true },
  })
  for (const order of activeOrders) {
    try {
      const token = generateRecoveryToken()
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'failed', recoveryToken: token },
      })
      if (order.jobId) {
        await prisma.job
          .update({
            where: { id: order.jobId },
            data: { status: 'error', label: 'Lỗi', error: STUCK_ERROR },
          })
          .catch(() => {})
      }
      const iData = (order.profileData as Record<string, unknown>) || {}
      await sendRecoveryEmail({
        to: order.email,
        service: order.service,
        token,
        name: (iData.name as string) || '',
      }).catch(() => {})
    } catch (err) {
      console.error(`[AdminBot] forceRecover order ${order.id} failed:`, err)
    }
  }
}

export async function handleCheckOrders(ctx: Ctx) {
  if (ctx.cbQueryId) await tgAnswer(ctx.cbQueryId, '🔍 Đang kiểm tra...')
  else await tgSend(ctx.chatId, '🔍 Đang check đơn...', { threadId: ctx.threadId })
  try {
    await runOrderCheck()
    // Notify admin in their own chat that check was triggered
    await tgSend(ctx.chatId, '✅ Đã gửi kết quả kiểm tra vào nhóm.', {
      threadId: ctx.threadId,
      keyboard: [[{ text: '↩️ Quay lại', callback_data: 'm_system' }]],
    })
  } catch (err) {
    console.error('[AdminBot] checkOrders error:', err)
    await tgSend(ctx.chatId, '❌ Lỗi khi check đơn.', { threadId: ctx.threadId })
  }
}

export async function handleSetCheckInterval(ctx: Ctx) {
  const interval = await getCheckInterval()
  return respond(
    ctx,
    `⏱ <b>Interval check đơn</b>\nHiện tại: <b>${interval} phút</b>\n\nChọn nhanh hoặc gõ <code>/setcheckinterval &lt;số&gt;</code>:`,
    [
      [
        { text: '5p', callback_data: 's_interval_5' },
        { text: '10p', callback_data: 's_interval_10' },
        { text: '15p', callback_data: 's_interval_15' },
      ],
      [
        { text: '30p', callback_data: 's_interval_30' },
        { text: '60p', callback_data: 's_interval_60' },
      ],
      [{ text: '↩️ Quay lại', callback_data: 'm_system' }],
    ],
  )
}

export async function handleHealthCheck(ctx: Ctx) {
  const results: string[] = ['📡 <b>Health Check</b>']

  // DB
  try {
    await prisma.$queryRaw`SELECT 1`
    results.push('✅ Database: OK')
  } catch (err) {
    results.push(`❌ Database: ${String(err).slice(0, 50)}`)
  }

  // Production container
  try {
    const st = await getContainerStatus('hgct-prod')
    results.push(`${st === 'running' ? '✅' : '⚠️'} Production: ${st}`)
  } catch {
    results.push('❌ Production: không lấy được')
  }

  // Demo container
  try {
    const st = await getContainerStatus('hgct-demo')
    results.push(`${st === 'running' ? '✅' : '⚠️'} Demo: ${st}`)
  } catch {
    results.push('❌ Demo: không lấy được')
  }

  // Active orders
  try {
    const active = await prisma.order.count({ where: { status: { in: ['processing', 'retrying'] } } })
    results.push(`📊 Đơn đang xử lý: ${active}`)
  } catch { /* ignore */ }

  await respond(ctx, results.join('\n'), [[{ text: '↩️ Quay lại', callback_data: 'm_system' }]])
}

export async function handleORBalance(ctx: Ctx) {
  try {
    const balance = await getOpenRouterBalance()
    const text =
      balance != null
        ? `💳 <b>OpenRouter Balance</b>\n<b>$${balance.toFixed(2)}</b>`
        : '💳 Không lấy được balance. Kiểm tra OPENROUTER_MANAGEMENT_KEY.'
    await respond(ctx, text, [[{ text: '↩️ Quay lại', callback_data: 'm_system' }]])
  } catch (err) {
    await respond(ctx, `❌ Lỗi: ${String(err).slice(0, 60)}`)
  }
}

// ── MAIN DISPATCHERS ──────────────────────────────────────────────────────────

export async function handleCallback(
  cbData: string,
  chatId: number,
  threadId: number | undefined,
  cbQueryId: string,
  messageId: number,
): Promise<void> {
  const ctx: Ctx = { chatId, threadId, messageId, cbQueryId }

  if (cbData === 'main') return showMainMenu(ctx)
  if (cbData === 'm_price') return showPriceMenu(ctx)
  if (cbData === 'm_orders') return showOrdersMenu(ctx)
  if (cbData === 'm_system') return showSystemMenu(ctx)

  // Price sub-menus: m_price_svc_c / m_price_svc_l / etc.
  const priceSvcMatch = cbData.match(/^m_price_svc_([clsta])$/)
  if (priceSvcMatch) return showPriceSvcMenu(ctx, priceSvcMatch[1])

  // Price apply: p_c_3333 / p_l_5000 / p_a_10000
  const priceApplyMatch = cbData.match(/^p_([clsta])_(\d+)$/)
  if (priceApplyMatch) {
    const price = parseInt(priceApplyMatch[2], 10)
    if (!isNaN(price) && price > 0) return applyPrice(ctx, priceApplyMatch[1], price)
  }

  // Price custom: p_c_cust / p_l_cust / etc.
  const priceCustMatch = cbData.match(/^p_([clsta])_cust$/)
  if (priceCustMatch) {
    const code = priceCustMatch[1]
    const svc = CODE_SVC[code]
    const label = svc === 'all' ? 'tất cả dịch vụ' : (SERVICE_LABELS[svc] ?? svc)
    if (ctx.cbQueryId) await tgAnswer(ctx.cbQueryId)
    await tgSendForceReply(
      ctx.chatId,
      `<tg-spoiler>CUSTPRICE:${code}</tg-spoiler>\n💰 Nhập giá mới cho <b>${label}</b> (chỉ gõ số):`,
      { threadId: ctx.threadId, placeholder: 'VD: 8000' },
    )
    return
  }

  if (cbData === 'o_stats') return showOrderStats(ctx)
  if (cbData === 'o_pending') return showPendingOrders(ctx)
  if (cbData === 'o_pending_detail') return showPendingOrders(ctx)
  if (cbData === 'o_failed') return showFailedOrders(ctx)
  if (cbData === 'o_recent') return showRecentOrders(ctx)

  if (cbData === 'o_cancel_all_pending') return confirmCancelAllPending(ctx)
  if (cbData === 'o_cancel_all_confirm') return handleCancelAllPending(ctx)

  const orderIdMatch = cbData.match(/^o_(pay|retry|email|cancel)_(\d+)$/)
  if (orderIdMatch) {
    const orderId = parseInt(orderIdMatch[2], 10)
    if (orderIdMatch[1] === 'pay') return handleMarkPaid(ctx, orderId)
    if (orderIdMatch[1] === 'retry') return handleRetryOrder(ctx, orderId)
    if (orderIdMatch[1] === 'email') return handleResendEmail(ctx, orderId)
    if (orderIdMatch[1] === 'cancel') return handleCancelOrder(ctx, orderId)
  }

  if (cbData === 's_rst_prod') return handleRestartProd(ctx, false)
  if (cbData === 's_rst_prod_f') return handleRestartProd(ctx, true)
  if (cbData === 's_rst_demo') return handleRestartDemo(ctx)
  if (cbData === 's_health') return handleHealthCheck(ctx)
  if (cbData === 's_balance') return handleORBalance(ctx)
  if (cbData === 's_check') return handleCheckOrders(ctx)
  if (cbData === 's_set_interval') return handleSetCheckInterval(ctx)

  const intervalPresetMatch = cbData.match(/^s_interval_(\d+)$/)
  if (intervalPresetMatch) {
    const minutes = parseInt(intervalPresetMatch[1], 10)
    await setCheckInterval(minutes)
    return respond(
      ctx,
      `✅ <b>Interval check đơn: ${minutes} phút</b>`,
      [[{ text: '↩️ Quay lại System', callback_data: 'm_system' }]],
    )
  }

  // Unknown — dismiss spinner silently
  await tgAnswer(cbQueryId)
}

export async function handleCommand(
  text: string,
  chatId: number,
  threadId: number | undefined,
  replyToMessage?: Record<string, unknown>,
): Promise<void> {
  const ctx: Ctx = { chatId, threadId }

  // Handle ForceReply responses (admin replied to a bot prompt)
  // Note: skip is_bot check — only ADMIN_USER_ID reaches here, safe to match by text marker alone
  if (replyToMessage) {
    const replyText = (replyToMessage.text as string | undefined) ?? ''
    const custMatch = replyText.match(/CUSTPRICE:([clsta])/)
    if (custMatch) {
      const code = custMatch[1]
      const priceNum = parseInt(text.trim(), 10)
      if (isNaN(priceNum) || priceNum <= 0) {
        const svc = CODE_SVC[code]
        const label = svc === 'all' ? 'tất cả dịch vụ' : (SERVICE_LABELS[svc] ?? svc)
        await tgSend(chatId, '❌ Chỉ nhập số nguyên dương. VD: 8000', { threadId })
        await tgSendForceReply(
          chatId,
          `<tg-spoiler>CUSTPRICE:${code}</tg-spoiler>\n💰 Nhập giá mới cho <b>${label}</b> (chỉ gõ số):`,
          { threadId, placeholder: 'VD: 8000' },
        )
        return
      }
      return applyPrice(ctx, code, priceNum)
    }

    if (replyText.includes('CHECKINTERVAL')) {
      const minutes = parseInt(text.trim(), 10)
      if (isNaN(minutes) || minutes < 1) {
        await tgSend(chatId, '❌ Nhập số phút nguyên dương (tối thiểu 1). VD: 30', { threadId })
        await tgSendForceReply(chatId, '<tg-spoiler>CHECKINTERVAL</tg-spoiler>\n⏱ Nhập số phút mới:', {
          threadId, placeholder: 'VD: 30',
        })
        return
      }
      await setCheckInterval(minutes)
      await tgSend(chatId, `✅ Interval check đơn: <b>${minutes} phút</b>`, {
        threadId,
        keyboard: [[{ text: '↩️ Quay lại System', callback_data: 'm_system' }]],
      })
      return
    }
  }

  if (text.match(/^\/start$/i) || text.match(/^\/help$/i)) {
    return showMainMenu(ctx)
  }

  // /setprice <amount>               → set all services
  // /setprice <service> <amount>     → set specific service
  const setPriceMatch = text.match(/^\/setprice(?:\s+(career|love|synastry|transit|all))?\s+(\d+)$/i)
  if (setPriceMatch) {
    const svcArg = (setPriceMatch[1] ?? 'all').toLowerCase()
    const price = parseInt(setPriceMatch[2], 10)
    if (isNaN(price) || price <= 0) {
      await tgSend(chatId, '❌ Giá không hợp lệ.', { threadId })
      return
    }
    const code = SVC_CODE[svcArg] ?? 'a'
    return applyPrice(ctx, code, price)
  }

  // /setprice (no args) — show menu
  if (text.match(/^\/setprice$/i)) {
    return showPriceMenu(ctx)
  }

  // /getprice — show all prices
  if (text.match(/^\/getprice$/i)) {
    return showPriceMenu(ctx)
  }

  // /pay <orderId>
  const payMatch = text.match(/^\/pay\s+(\d+)$/i)
  if (payMatch) {
    const orderId = parseInt(payMatch[1], 10)
    return handleMarkPaid(ctx, orderId)
  }

  // /check — manual order check
  if (text.match(/^\/check(@\w+)?$/i)) {
    return handleCheckOrders(ctx)
  }

  // /setcheckinterval <minutes>
  const setIntervalMatch = text.match(/^\/setcheckinterval(@\w+)?\s+(\d+)$/i)
  if (setIntervalMatch) {
    const minutes = parseInt(setIntervalMatch[2], 10)
    if (isNaN(minutes) || minutes < 1) {
      await tgSend(chatId, '❌ Nhập số phút nguyên dương. VD: /setcheckinterval 30', { threadId })
      return
    }
    await setCheckInterval(minutes)
    await tgSend(chatId, `✅ Interval check đơn = <b>${minutes} phút</b>`, { threadId })
    return
  }

  // Unknown command — show main menu
  return showMainMenu(ctx)
}
