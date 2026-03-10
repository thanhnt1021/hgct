import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calculateChart } from '@/lib/astrology/calculations'
import { getKnowledgeFromDB } from '@/lib/astrology/knowledge'
import { getCareerBlocks } from '@/lib/logic/career/manager'
import { buildCareerPrompt } from '@/lib/logic/career/prompt'
import { generateEssayStreaming } from '@/lib/openrouter'
import { generatePdf } from '@/lib/pdf/generator'
import { sendReportEmail, makePdfFilename } from '@/lib/email'
import { createJob, updateJob } from '@/lib/jobs'
import fs from 'fs'
import path from 'path'

const PDF_DIR = '/var/hgct/pdfs'

const SYSTEM_PROMPT = 'Bạn là một chiêm tinh gia chuyên nghiệp, có kiến thức sâu rộng về chiêm tinh học phương Tây. Bạn viết bằng tiếng Việt, văn phong ấm áp, dễ hiểu, truyền cảm hứng.'

// Expected AI output length per service (chars) — used for progress %
const EXPECTED_CHARS: Record<string, number> = {
  career: 9000,
  love: 9000,
  synastry: 22000,
  transit: 28000,
}

// AI writing labels by progress %
const AI_LABELS = [
  { at: 18, label: 'Vũ trụ đang kết nối...' },
  { at: 30, label: 'Đang giải mã các chòm sao...' },
  { at: 45, label: 'AI đang biên soạn luận giải...' },
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

function savePdf(buffer: Buffer): string {
  if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true })
  const id = randomUUID()
  fs.writeFileSync(path.join(PDF_DIR, `${id}.pdf`), buffer)
  return id
}

// ── Background processing ─────────────────────────────────────────

async function processReport(jobId: string, body: Record<string, unknown>) {
  const { service, inputData, email } = body as {
    service: string
    inputData: Record<string, unknown>
    email?: string
  }
  const { dob, tob, loc, name, gender } = inputData as {
    dob: { day: number; month: number; year: number }
    tob: { hour: number; minute: number }
    loc: { lat: number; lon: number; tz: string; address: string }
    name: string
    gender: string
  }

  // Step 1: Calculate chart
  updateJob(jobId, { progress: 5, label: 'Đang tính toán bản đồ sao...' })
  const dobStr = `${dob.day}/${dob.month}/${dob.year}`
  const tobStr = `${tob.hour}:${String(tob.minute).padStart(2, '0')}`
  const chart = calculateChart(dobStr, tobStr, loc.lat, loc.lon, loc.tz)
  if (!chart) throw new Error('Chart calculation failed')

  const profile = {
    name,
    gender: gender || 'Female',
    dob: { day: String(dob.day), month: String(dob.month), year: String(dob.year) },
  }

  // Step 2: Load knowledge base
  updateJob(jobId, { progress: 10, label: 'Đang tải dữ liệu chiêm tinh...' })
  const kb = await getKnowledgeFromDB()

  // Step 3: Build prompt
  updateJob(jobId, { progress: 15, label: 'Đang phân tích bản đồ sao...' })

  let prompt: string
  let coverTitle: string
  let sectionTitle: string
  let nameB = ''

  if (service === 'career') {
    const blocks = getCareerBlocks(chart, kb)
    prompt = buildCareerPrompt(blocks, profile)
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
    nameB = (inputDataB.name as string) || ''
    const chartB = calculateChart(
      `${dobB.day}/${dobB.month}/${dobB.year}`,
      `${tobB.hour}:${String(tobB.minute).padStart(2, '0')}`,
      locB.lat, locB.lon, locB.tz
    )
    if (!chartB) throw new Error('Partner chart failed')
    const { getRelationshipBlocks } = await import('@/lib/logic/relationship/manager')
    const { buildRelationshipEssayPrompt } = await import('@/lib/logic/relationship/prompt')
    const profileB = {
      name: nameB,
      gender: (inputDataB.gender as string) || 'Male',
      dob: { day: String(dobB.day), month: String(dobB.month), year: String(dobB.year) },
    }
    const blocks = getRelationshipBlocks(chart, chartB, kb)
    const result = buildRelationshipEssayPrompt(chart, chartB, blocks, profile, profileB)
    prompt = typeof result === 'string' ? result : result.prompt
    coverTitle = 'LUẬN GIẢI BẢN ĐỒ CẶP ĐÔI'
    sectionTitle = 'TỔNG HỢP LUẬN GIẢI BẢN ĐỒ CẶP ĐÔI'

  } else if (service === 'transit') {
    const { buildVanhanEssayPrompt } = await import('@/lib/logic/vanhan/prompt')
    const startDate = (body.startDate as string) || new Date().toISOString().split('T')[0]
    const endDate = (body.endDate as string) || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
    prompt = buildVanhanEssayPrompt(chart, startDate, endDate, profile)
    coverTitle = 'LUẬN GIẢI VẬN HẠN'
    sectionTitle = 'TỔNG HỢP LUẬN GIẢI VẬN HẠN'

  } else {
    throw new Error(`Invalid service: ${service}`)
  }

  // Step 4: AI generation with real streaming progress
  updateJob(jobId, { progress: 18, label: 'Vũ trụ đang kết nối...' })
  const expected = EXPECTED_CHARS[service] || 10000

  const essayText = await generateEssayStreaming(
    SYSTEM_PROMPT,
    prompt,
    (charsReceived) => {
      const aiPct = Math.min(Math.floor(18 + (charsReceived / expected) * 67), 85)
      updateJob(jobId, { progress: aiPct, label: aiLabel(aiPct) })
    },
  )

  if (!essayText || essayText.length < 500) throw new Error('AI generation failed or too short')

  // Step 5: Generate PDF
  updateJob(jobId, { progress: 90, label: 'Đang tạo file PDF...' })
  const pdfBuffer = await generatePdf(essayText, { coverTitle, sectionTitle, profile })

  // Step 6: Save PDF
  let pdfUrl: string | null = null
  let pdfFilename: string | null = null
  if (pdfBuffer) {
    const pdfId = savePdf(pdfBuffer)
    pdfFilename = makePdfFilename(service, name, nameB || undefined)
    pdfUrl = `/api/pdf/${pdfId}?filename=${encodeURIComponent(pdfFilename)}`
  }

  // Step 7: Send email
  updateJob(jobId, { progress: 95, label: 'Đang gửi email...' })
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

  // Done
  updateJob(jobId, {
    status: 'done',
    progress: 100,
    label: 'Hoàn thành!',
    result: { pdfUrl: pdfUrl ?? undefined, pdfFilename: pdfFilename ?? undefined, emailSent, email: email || '' },
  })

  console.log(`[JOB ${jobId}] Done — ${service} for ${name}, essay ${essayText.length} chars`)
}

// ── Route handler — returns jobId immediately ──────────────────────

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const isPremium = (session?.user as any)?.isPremium === true

    if (!isPremium) {
      return NextResponse.json(
        { error: 'Chỉ tài khoản Premium mới có thể tạo báo cáo. Vui lòng nâng cấp tài khoản.', requiresPremium: true },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { service, inputData } = body

    if (!service || !inputData) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const jobId = randomUUID()
    createJob(jobId)

    // Fire and forget — background continues after response is sent
    processReport(jobId, body).catch(err => {
      console.error(`[JOB ${jobId}] Error:`, err)
      updateJob(jobId, {
        status: 'error',
        progress: 0,
        label: 'Có lỗi xảy ra',
        error: String(err),
      })
    })

    return NextResponse.json({ jobId })
  } catch (error) {
    console.error('Report route error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
