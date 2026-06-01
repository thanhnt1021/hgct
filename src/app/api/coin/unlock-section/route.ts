// Unlock one section of an essay.
// Lazy-generates the essay on the first unlock (cache miss); subsequent
// unlocks of the same profile/service slice from the cache instantly.
// Persists per-section content in DB so revisits don't re-charge.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { getCatalog, getSection } from '@/lib/catalog/sections'
import { deductCoin, InsufficientCoinError } from '@/lib/coin/service'
import { generateAndCacheEssay } from '@/lib/essay/generate'
import { unlockRefId, type InputData } from '@/lib/essay/key'
import { getSectionByIndex } from '@/lib/essay/parse'
import { validateInputData } from '@/lib/preview-validation'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // allow up to 5min for lazy LLM gen

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userUid = (session?.user as { uid?: string } | undefined)?.uid
  if (!userUid) {
    return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 })
  }

  let body: {
    service?: unknown; sectionId?: unknown
    inputData?: unknown; inputDataB?: unknown
    startDate?: unknown; endDate?: unknown
  }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const service = typeof body.service === 'string' ? body.service : ''
  const sectionId = typeof body.sectionId === 'string' ? body.sectionId : ''
  if (!service || !sectionId) {
    return NextResponse.json({ error: 'Thiếu tham số' }, { status: 400 })
  }
  if (!/^[a-z0-9-]+$/.test(service) || !/^[a-z0-9-]+$/.test(sectionId)) {
    return NextResponse.json({ error: 'Tham số không hợp lệ' }, { status: 400 })
  }

  const catalog = getCatalog(service)
  const section = getSection(service, sectionId)
  if (!catalog || !section) {
    return NextResponse.json({ error: 'Section không tồn tại' }, { status: 404 })
  }

  const inputErr = validateInputData(body.inputData)
  if (inputErr) {
    return NextResponse.json({ error: 'inputData không hợp lệ: ' + inputErr }, { status: 400 })
  }
  const inputData = body.inputData as InputData
  let inputDataB: InputData | undefined
  if (body.inputDataB !== undefined && body.inputDataB !== null) {
    const e = validateInputData(body.inputDataB)
    if (e) return NextResponse.json({ error: 'inputDataB không hợp lệ: ' + e }, { status: 400 })
    inputDataB = body.inputDataB as InputData
  }

  // Step 1: generate (or load from cache) the full essay; compute profile hash
  let hash: string
  let essay: string
  try {
    const r = await generateAndCacheEssay({
      userUid, service,
      inputData, inputDataB,
      startDate: body.startDate as string | undefined,
      endDate: body.endDate as string | undefined,
    })
    hash = r.hash
    essay = r.essay
  } catch (e) {
    return NextResponse.json({ error: 'Sinh nội dung lỗi: ' + (e as Error).message }, { status: 500 })
  }

  const content = getSectionByIndex(essay, section.index)
  if (!content) {
    return NextResponse.json(
      { error: 'Không tách được nội dung mục — vui lòng thử lại.' },
      { status: 500 },
    )
  }

  // Step 2: check DB for prior unlock — no charge if already paid
  const profileUid = hash // 16-char hash doubles as profile identifier for now
  const prior = await prisma.reading.findUnique({
    where: {
      userUid_profileUid_service_sectionId: { userUid, profileUid, service, sectionId },
    },
    select: { content: true },
  })
  if (prior) {
    return NextResponse.json({
      content: prior.content,
      sectionId,
      coinsCharged: 0,
      alreadyUnlocked: true,
    })
  }

  // Step 3: atomic deduct + persist Reading row
  const refId = unlockRefId(service, hash, sectionId)
  try {
    await prisma.$transaction(async (tx) => {
      await deductCoin({
        userUid,
        amount: section.coinPrice,
        reason: `unlock-${sectionId}`,
        refType: 'deduct',
        refId,
        tx,
      })
      await tx.reading.create({
        data: { userUid, profileUid, service, sectionId, content },
      })
    })
  } catch (e) {
    if (e instanceof InsufficientCoinError) {
      return NextResponse.json(
        { error: `Không đủ xu — cần ${e.need}, hiện có ${e.have}` },
        { status: 402 },
      )
    }
    throw e
  }

  return NextResponse.json({
    content,
    sectionId,
    coinsCharged: section.coinPrice,
    alreadyUnlocked: false,
  })
}
