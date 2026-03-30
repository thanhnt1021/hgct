// Extracted from report/route.ts so both the report API and the SePay webhook
// can call processReport() without duplicating logic.

import { randomUUID } from 'crypto'
import { calculateChart } from '@/lib/astrology/calculations'
import { getKnowledgeFromDB } from '@/lib/astrology/knowledge'
import { getCareerBlocks } from '@/lib/logic/career/manager'
import { buildCareerPrompt } from '@/lib/logic/career/prompt'
import { generateEssayStreaming } from '@/lib/openrouter'
import { generatePdf } from '@/lib/pdf/generator'
import { sendReportEmail, makePdfFilename, sendRecoveryEmail, sendCtvCommissionEmail } from '@/lib/email'
import { createJob, updateJob, isJobCancelled, generateRecoveryToken, STUCK_ERROR } from '@/lib/jobs'
import { chromiumSemaphore } from '@/lib/job-queue'
import prisma from '@/lib/db'
import { sendOrderNotification, sendOrderFailedAlert } from '@/lib/notify'
import fs from 'fs'
import path from 'path'

export const PDF_DIR = '/var/hgct/pdfs'

const SYSTEM_PROMPT =
  'Bạn là một chiêm tinh gia chuyên nghiệp, có kiến thức sâu rộng về chiêm tinh học phương Tây. Bạn viết bằng tiếng Việt, văn phong ấm áp, dễ hiểu, truyền cảm hứng.'

const EXPECTED_CHARS: Record<string, number> = {
  career: 9000,
  love: 9000,
  synastry: 22000,
  transit: 28000,
}

const MIN_CHARS: Record<string, number> = {
  career: 4000,
  love: 4000,
  synastry: 10000,
  transit: 12000,
}

const AI_LABELS = [
  { at: 18, label: 'Vũ trụ đang kết nối...' },
  { at: 30, label: 'Đang giải mã các chòm sao...' },
  { at: 45, label: 'Vũ trụ đang biên soạn luận giải...' },
  { at: 60, label: 'Đang khám phá bản đồ sao của bạn...' },
  { at: 75, label: 'Đang hoàn thiện nội dung...' },
  { at: 83, label: 'Gần xong rồi...' },
]

function aiLabel(pct: number): string {
  let lbl = AI_LABELS[0].label
  for (const { at, label } of AI_LABELS) {
    if (pct >= at) lbl = label
  }
  return lbl
}

function savePdf(
  buffer: Buffer,
  profileUidA?: string,
  profileUidB?: string,
  service?: string,
  orderId?: number,
): string {
  if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true })
  let id: string
  if (profileUidA && service) {
    // Bug #2 fix: append orderId suffix to prevent PDF overwrite when the same
    // profile requests multiple reports of the same service type.
    const base = profileUidB
      ? `${profileUidA}_${profileUidB}_${service}`
      : `${profileUidA}_${service}`
    id = orderId != null ? `${base}_${orderId}` : base
  } else {
    id = randomUUID()
  }
  fs.writeFileSync(path.join(PDF_DIR, `${id}.pdf`), buffer)
  return id
}

export async function processReport(
  jobId: string,
  body: Record<string, unknown>,
  orderId?: number,
  amount?: number,
) {
  const { service, inputData, email } = body as {
    service: string
    inputData: Record<string, unknown>
    email?: string
  }
  const profileUidA = body.profileUid as string | undefined
  const profileUidBBody = body.profileUidB as string | undefined
  const { dob, tob, loc, name, ten, gender } = inputData as {
    dob: { day: number; month: number; year: number }
    tob: { hour: number; minute: number }
    loc: { lat: number; lon: number; tz: string; address: string }
    name: string
    ten?: string
    gender: string
  }

  const fullName = name
  const onlyName = (ten || '').trim() || name

  // Step 1: Calculate chart
  updateJob(jobId, { progress: 5, label: 'Đang xác lập chính xác bản đồ sao của bạn' })
  const dobStr = `${dob.day}/${dob.month}/${dob.year}`
  const tobStr = `${tob.hour}:${String(tob.minute).padStart(2, '0')}`
  const chart = calculateChart(dobStr, tobStr, loc.lat, loc.lon, loc.tz)
  if (!chart) throw new Error('Chart calculation failed')

  const profile = {
    name: fullName,
    fullName,
    onlyName,
    gender: gender || 'Female',
    dob: { day: String(dob.day), month: String(dob.month), year: String(dob.year) },
    tob: tobStr,
  }

  // Step 2: Load knowledge base
  updateJob(jobId, { progress: 10, label: 'Đang xác lập chính xác bản đồ sao của bạn' })
  const kb = await getKnowledgeFromDB()

  // Step 3: Build prompt
  updateJob(jobId, { progress: 15, label: 'Giải mã năng lượng các hành tinh và cung hoàng đạo' })

  let prompt: string
  let coverTitle: string
  let sectionTitle: string
  let nameB = ''
  let coverProfileB:
    | { name: string; dob: { day: string; month: string; year: string }; tob?: string }
    | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let synBrief: any = undefined

  if (service === 'career') {
    const blocks = getCareerBlocks(chart, kb)
    prompt = buildCareerPrompt(blocks, profile, chart)
    coverTitle = 'LUẬN GIẢI HƯỚNG NGHIỆP'
    sectionTitle = 'TỔNG HỢP LUẬN GIẢI HƯỚNG NGHIỆP'
  } else if (service === 'love') {
    const { getLoveBlocks } = await import('@/lib/logic/love/manager')
    const { buildLovePrompt } = await import('@/lib/logic/love/prompt')
    const blocks = getLoveBlocks(chart, kb)
    prompt = buildLovePrompt(chart, blocks, profile)
    coverTitle = 'LUẬN GIẢI TÌNH DUYÊN'
    sectionTitle = 'TỔNG HỢP LUẬN GIẢI TÌNH DUYÊN'
  } else if (service === 'synastry' || service === 'relationship') {
    const inputDataB = body.inputDataB as Record<string, unknown>
    if (!inputDataB) throw new Error('Missing partner data')
    const dobB = inputDataB.dob as { day: number; month: number; year: number }
    const tobB = inputDataB.tob as { hour: number; minute: number }
    const locB = inputDataB.loc as { lat: number; lon: number; tz: string }
    const fullNameB = (inputDataB.name as string) || ''
    const onlyNameB = ((inputDataB.ten as string) || '').trim() || fullNameB
    nameB = fullNameB
    const chartB = calculateChart(
      `${dobB.day}/${dobB.month}/${dobB.year}`,
      `${tobB.hour}:${String(tobB.minute).padStart(2, '0')}`,
      locB.lat,
      locB.lon,
      locB.tz,
    )
    if (!chartB) throw new Error('Partner chart failed')
    const { getRelationshipBlocks } = await import('@/lib/logic/relationship/manager')
    const { buildRelationshipEssayPrompt } = await import('@/lib/logic/relationship/prompt')
    const profileB = {
      name: fullNameB,
      fullName: fullNameB,
      onlyName: onlyNameB,
      gender: (inputDataB.gender as string) || 'Male',
      dob: { day: String(dobB.day), month: String(dobB.month), year: String(dobB.year) },
    }
    const blocks = getRelationshipBlocks(chart, chartB, kb)
    const result = buildRelationshipEssayPrompt(chart, chartB, blocks, profile, profileB)
    prompt = typeof result === 'string' ? result : result.prompt
    synBrief = typeof result === 'string' ? undefined : result.brief
    coverTitle = 'LUẬN GIẢI BẢN ĐỒ CẶP ĐÔI'
    sectionTitle = 'TỔNG HỢP LUẬN GIẢI BẢN ĐỒ CẶP ĐÔI'
    const tobBStr = `${tobB.hour}:${String(tobB.minute).padStart(2, '0')}`
    coverProfileB = { name: fullNameB, dob: profileB.dob, tob: tobBStr }
    console.log(
      `[SYNASTRY] A: fullName="${fullName}" onlyName="${onlyName}" | B: fullName="${fullNameB}" onlyName="${onlyNameB}"`,
    )
    console.log(`[SYNASTRY] cover A="${fullName}", cover B="${fullNameB}"`)
  } else if (service === 'transit') {
    const { buildVanhanEssayPrompt } = await import('@/lib/logic/vanhan/prompt')
    let startDate = (body.startDate as string) || new Date().toISOString().split('T')[0]
    let endDate =
      (body.endDate as string) ||
      new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
    const diffDays = Math.round(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000,
    )
    if (diffDays <= 0 || diffDays > 366) {
      endDate = new Date(new Date(startDate).getTime() + 365 * 86400000)
        .toISOString()
        .split('T')[0]
    }
    prompt = buildVanhanEssayPrompt(chart, startDate, endDate, profile, kb)
    coverTitle = 'LUẬN GIẢI VẬN HẠN'
    sectionTitle = 'TỔNG HỢP LUẬN GIẢI VẬN HẠN'
  } else {
    throw new Error(`Invalid service: ${service}`)
  }

  // Step 4: AI generation with retry
  if (isJobCancelled(jobId)) return
  updateJob(jobId, { progress: 18, label: 'Biên soạn nội dung luận giải cá nhân hoá' })
  const expected = EXPECTED_CHARS[service] || 10000
  const minChars = MIN_CHARS[service] || 2000

  const AI_MAX_RETRIES = 3
  let essayText = ''
  let totalAttempt = 0
  const generationIds: string[] = []
  for (let aiAttempt = 0; aiAttempt < AI_MAX_RETRIES; aiAttempt++) {
    if (aiAttempt > 0) {
      const delay = aiAttempt * 4000
      totalAttempt++
      console.log(
        `[JOB ${jobId}] AI retry ${aiAttempt}/${AI_MAX_RETRIES - 1} (got ${essayText.length} chars, need ${minChars}) — waiting ${delay}ms`,
      )
      updateJob(jobId, {
        progress: 15,
        label: `Kết nối bị gián đoạn — đang thử lại lần ${totalAttempt}...`,
      })
      await new Promise((r) => setTimeout(r, delay))
      if (isJobCancelled(jobId)) return
    }

    essayText = await generateEssayStreaming(
      SYSTEM_PROMPT,
      prompt,
      (charsReceived) => {
        const aiPct = Math.min(Math.floor(18 + (charsReceived / expected) * 67), 85)
        updateJob(jobId, { progress: aiPct, label: aiLabel(aiPct) })
      },
      (innerAttempt) => {
        totalAttempt++
        updateJob(jobId, {
          progress: 15,
          label: `Kết nối bị gián đoạn — đang thử lại lần ${totalAttempt}...`,
        })
        console.log(`[JOB ${jobId}] OpenRouter inner retry ${innerAttempt}`)
      },
      (genId) => generationIds.push(genId),
    )

    if (essayText && essayText.length >= minChars) break
    console.warn(
      `[JOB ${jobId}] AI output too short: ${essayText.length} chars (min ${minChars}) on attempt ${aiAttempt + 1}`,
    )
  }

  if (!essayText || essayText.length < minChars) {
    throw new Error(
      `AI generation incomplete after ${AI_MAX_RETRIES} attempts (${essayText.length} chars, min ${minChars})`,
    )
  }

  if ((service === 'synastry' || service === 'relationship') && synBrief) {
    const { sanitizeRelationshipOutput } = await import('@/lib/logic/relationship/prompt')
    essayText = sanitizeRelationshipOutput(essayText, synBrief)
    console.log(`[SYNASTRY] Sanitized — essay ${essayText.length} chars`)
  }

  // Step 5: Generate PDF (semaphore: max 1 concurrent Chromium to prevent OOM)
  if (isJobCancelled(jobId)) return
  if (chromiumSemaphore.queued > 0) {
    updateJob(jobId, { label: '⏳ Đang chờ xử lý...' })
  }
  await chromiumSemaphore.acquire()
  let pdfBuffer: Buffer | null = null
  try {
    updateJob(jobId, { progress: 90, label: 'Đóng gói thành file PDF' })
    pdfBuffer = await generatePdf(essayText, {
      coverTitle,
      sectionTitle,
      profile,
      profileB: coverProfileB,
      service,
    })
  } finally {
    chromiumSemaphore.release()
  }

  if (!pdfBuffer) {
    throw new Error('PDF generation failed — no buffer returned (likely render timeout)')
  }

  // Step 6: Save PDF
  let pdfUrl: string | null = null
  let pdfFilename: string | null = null
  if (pdfBuffer) {
    const isSynastry = service === 'synastry' || service === 'relationship'
    const pdfId = isSynastry
      ? savePdf(pdfBuffer, profileUidA, profileUidBBody, 'synastry', orderId)
      : savePdf(pdfBuffer, profileUidA, undefined, service, orderId)
    pdfFilename = makePdfFilename(service, name, nameB || undefined)
    pdfUrl = `/api/pdf/${pdfId}?filename=${encodeURIComponent(pdfFilename)}`
  }

  // Step 7: Send email
  updateJob(jobId, { progress: 95, label: 'Gửi đến email của bạn' })
  let emailSent = false
  if (email && pdfBuffer) {
    try {
      await sendReportEmail(email, name, service, pdfBuffer, nameB || undefined)
      emailSent = true
      console.log(`[JOB ${jobId}] Email sent to ${email}`)
    } catch (err) {
      console.error(`[JOB ${jobId}] Email failed:`, err)
    }
  }

  // Bug #8 fix: await order update BEFORE updateJob(done) so DB reflects
  // completed state before the in-memory job record is marked done.
  // smart-retry pdfResent path reads pdfUrl from DB — must be persisted first.
  if (orderId) {
    try {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'completed', pdfUrl: pdfUrl ?? null },
        select: { ctvCode: true, amount: true },
      })

      // CTV commission: create record + notify CTV
      if (updatedOrder.ctvCode && updatedOrder.amount) {
        const ctv = await prisma.ctv.findUnique({
          where: { ctvCode: updatedOrder.ctvCode },
          select: { id: true, email: true, name: true, commissionRate: true, status: true },
        })
        if (ctv && ctv.status === 'active') {
          const commissionAmount = Math.round(updatedOrder.amount * ctv.commissionRate)
          await prisma.ctvCommission.create({
            data: {
              ctvId: ctv.id,
              orderId,
              amount: commissionAmount,
              status: 'pending',
            },
          })
          sendCtvCommissionEmail({
            to: ctv.email,
            ctvName: ctv.name,
            customerName: name,
            service,
            orderAmount: updatedOrder.amount,
            commissionAmount,
            commissionRate: ctv.commissionRate,
          }).catch((err) => console.error(`[JOB ${jobId}] CTV email failed:`, err))
          console.log(`[JOB ${jobId}] CTV commission ${commissionAmount} created for CTV ${ctv.id}`)
        }
      }
    } catch (err) {
      console.error(`[JOB ${jobId}] Order update failed:`, err)
    }
  }

  updateJob(jobId, {
    status: 'done',
    progress: 100,
    label: 'Hoàn thành!',
    result: {
      pdfUrl: pdfUrl ?? undefined,
      pdfFilename: pdfFilename ?? undefined,
      emailSent,
      email: email || '',
    },
  })

  console.log(
    `[JOB ${jobId}] Done — ${service} for ${name}, essay ${essayText.length} chars`,
  )

  // Fire-and-forget: notify via Telegram
  sendOrderNotification({
    service,
    name: fullName,
    email: email ?? '',
    amount: amount ?? 0,
    generationIds,
  }).catch((err) => console.error(`[JOB ${jobId}] Notify failed:`, err))
}

export interface CreateReportJobOptions {
  service: string
  body: Record<string, unknown>
  userUid?: string
  orderId?: number
  amount?: number
}

export function createReportJob(opts: CreateReportJobOptions): string {
  const { service, body, userUid, orderId, amount } = opts
  const jobId = randomUUID()
  const iData = body.inputData as Record<string, unknown> | undefined
  const meta = {
    userUid: userUid || undefined,
    service,
    name:
      typeof body.name === 'string'
        ? body.name
        : typeof iData?.name === 'string'
          ? iData.name
          : undefined,
    email: typeof body.email === 'string' ? body.email : undefined,
    profileUidA: typeof body.profileUid === 'string' ? body.profileUid : undefined,
    profileUidB: typeof body.profileUidB === 'string' ? body.profileUidB : undefined,
  }
  createJob(jobId, meta)

  processReport(jobId, body, orderId, amount).catch(async (err) => {
    console.error(`[JOB ${jobId}] Error:`, err)

    // Alert admin via Telegram
    if (orderId) {
      const iDataForAlert = (body.inputData as Record<string, unknown>) || {}
      sendOrderFailedAlert({
        orderId,
        service,
        name: (iDataForAlert.name as string) || '',
        email: (body.email as string) || '',
        error: String(err).slice(0, 120),
      }).catch(() => {})
    }

    let recoveryToken: string | undefined
    if (orderId) {
      try {
        recoveryToken = generateRecoveryToken()
        const updated = await prisma.order.updateMany({
          where: { id: orderId, status: { not: 'failed' } },
          data: { status: 'failed', recoveryToken },
        })
        if (updated.count > 0) {
          const iData = (body.inputData as Record<string, unknown>) || {}
          const name = (iData.name as string) || ''
          sendRecoveryEmail({ to: body.email as string, service, token: recoveryToken, name }).catch(console.error)
        } else {
          recoveryToken = undefined // order already in failed state (concurrent request)
        }
      } catch (tokenErr) {
        console.error(`[JOB ${jobId}] Recovery token failed:`, tokenErr)
        recoveryToken = undefined
      }
    }

    updateJob(jobId, {
      status: 'error',
      progress: 0,
      label: 'Có lỗi xảy ra',
      error: STUCK_ERROR,
      result: recoveryToken ? { recoveryToken } : undefined,
    })
  })

  return jobId
}
