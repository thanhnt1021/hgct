// Unlock one section of an essay.
// Lazy-generates the essay on the first unlock (cache miss); subsequent
// unlocks of the same profile/service slice from the cache instantly.
// Persists per-section content in DB so revisits don't re-charge.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { getCatalog, getSection } from '@/lib/catalog/sections'
import { deductCoin, getBalance, InsufficientCoinError } from '@/lib/coin/service'
import { readEssay } from '@/lib/essay/cache'
import { startSectionUnlockJob } from '@/lib/coin/unlock-job'
import { profileHash, unlockRefId, type InputData } from '@/lib/essay/key'
import { getSectionByIndex } from '@/lib/essay/parse'
import { validateInputData } from '@/lib/preview-validation'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // background gen may run a few minutes

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

  // profileUid = stable hash of the input — computable WITHOUT any LLM call,
  // so we can run all pre-checks before spending generation cost.
  const profileUid = profileHash(inputData, inputDataB)

  // Step 1: already unlocked? Return cached content — no generation, no charge.
  const prior = await prisma.reading.findUnique({
    where: {
      userUid_profileUid_service_sectionId: { userUid, profileUid, service, sectionId },
    },
    select: { content: true },
  })
  if (prior) {
    return NextResponse.json({
      done: true,
      content: prior.content,
      sectionId,
      coinsCharged: 0,
      alreadyUnlocked: true,
    })
  }

  // Step 2: GATE — must hold enough coins BEFORE we spend any LLM cost.
  const balance = await getBalance(userUid)
  if (balance < section.coinPrice) {
    return NextResponse.json(
      { error: `Bạn đang thiếu ${section.coinPrice - balance} xu để mở mục này (cần ${section.coinPrice}, hiện có ${balance}) 💛`, need: section.coinPrice, have: balance },
      { status: 402 },
    )
  }

  // Step 3: essay ĐÃ tạo trước đó → mở mục ngay (sync, không cần job/modal).
  const cachedEssay = await readEssay(userUid, service, profileUid)
  if (cachedEssay) {
    const content = getSectionByIndex(cachedEssay, section.index)
    if (!content) {
      return NextResponse.json({ error: 'Không tách được nội dung mục — vui lòng thử lại.' }, { status: 500 })
    }
    try {
      await prisma.$transaction(async (tx) => {
        await deductCoin({ userUid, amount: section.coinPrice, reason: `unlock-${sectionId}`, refType: 'deduct', refId: unlockRefId(service, profileUid, sectionId), tx })
        await tx.reading.create({ data: { userUid, profileUid, service, sectionId, content } })
      })
    } catch (e) {
      if (e instanceof InsufficientCoinError) {
        return NextResponse.json({ error: `Bạn đang thiếu ${e.need - e.have} xu để mở mục này (cần ${e.need}, hiện có ${e.have}) 💛`, need: e.need, have: e.have }, { status: 402 })
      }
      throw e
    }
    return NextResponse.json({ done: true, content, sectionId, coinsCharged: section.coinPrice, alreadyUnlocked: false })
  }

  // Step 4: chưa có essay → tạo job chạy NGẦM (gen + tính tiền), client poll /api/job/[id].
  const jobId = startSectionUnlockJob({
    userUid, service, profileUid, sectionId,
    inputData, inputDataB,
    startDate: body.startDate as string | undefined,
    endDate: body.endDate as string | undefined,
    name: inputData.name,
  })
  return NextResponse.json({ done: false, jobId })
}
