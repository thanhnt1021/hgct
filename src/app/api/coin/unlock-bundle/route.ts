// Unlock all sections of a service at once for the bundle price.
// Lazy-generates the essay on first request (same helper as unlock-section).

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { getCatalog } from '@/lib/catalog/sections'
import { getBalance, InsufficientCoinError } from '@/lib/coin/service'
import { generateAndCacheEssay } from '@/lib/essay/generate'
import { readEssay } from '@/lib/essay/cache'
import { startBundleUnlockJob } from '@/lib/coin/unlock-job'
import { profileHash, unlockRefId, type InputData } from '@/lib/essay/key'
import { splitSections } from '@/lib/essay/parse'
import { validateInputData } from '@/lib/preview-validation'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userUid = (session?.user as { uid?: string } | undefined)?.uid
  if (!userUid) {
    return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 })
  }

  let body: {
    service?: unknown
    inputData?: unknown; inputDataB?: unknown
    startDate?: unknown; endDate?: unknown
  }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const service = typeof body.service === 'string' ? body.service : ''
  if (!service) return NextResponse.json({ error: 'Thiếu service' }, { status: 400 })
  if (!/^[a-z0-9-]+$/.test(service)) {
    return NextResponse.json({ error: 'Service không hợp lệ' }, { status: 400 })
  }

  const catalog = getCatalog(service)
  if (!catalog) return NextResponse.json({ error: 'Service không tồn tại' }, { status: 404 })
  if (catalog.bundlePrice == null) {
    return NextResponse.json({ error: 'Cục này chưa có giá trọn cục' }, { status: 400 })
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

  // profileUid = hash, computable without LLM → pre-checks before generation.
  const profileUid = profileHash(inputData, inputDataB)
  const bundleRefId = unlockRefId(service, profileUid, 'bundle')

  // Already bought the bundle? Replay stored sections — no generation, no charge.
  const priorBundle = await prisma.coinTransaction.findFirst({
    where: { userUid, refType: 'deduct', refId: bundleRefId },
    select: { id: true },
  })
  if (priorBundle) {
    const rows = await prisma.reading.findMany({
      where: { userUid, profileUid, service },
      select: { sectionId: true, content: true },
    })
    return NextResponse.json({
      done: true,
      sections: rows,
      coinsCharged: 0,
      alreadyUnlocked: true,
    })
  }

  // GATE — must hold enough coins BEFORE spending any LLM cost.
  const balance = await getBalance(userUid)
  if (balance < catalog.bundlePrice!) {
    return NextResponse.json(
      { error: `Không đủ xu — cần ${catalog.bundlePrice}, hiện có ${balance}`, need: catalog.bundlePrice, have: balance },
      { status: 402 },
    )
  }

  // Chưa có essay → tạo job chạy NGẦM (gen + tính tiền trọn cục), client poll /api/job/[id].
  const cachedEssay = await readEssay(userUid, service, profileUid)
  if (!cachedEssay) {
    const jobId = startBundleUnlockJob({
      userUid, service, profileUid,
      inputData, inputDataB,
      startDate: body.startDate as string | undefined,
      endDate: body.endDate as string | undefined,
      name: inputData.name,
    })
    return NextResponse.json({ done: false, jobId })
  }

  // Đã có essay → tính tiền + lưu ngay (sync, cache hit).
  let essay: string
  try {
    const r = await generateAndCacheEssay({
      userUid, service, inputData, inputDataB,
      startDate: body.startDate as string | undefined,
      endDate: body.endDate as string | undefined,
    })
    essay = r.essay
  } catch (e) {
    return NextResponse.json({ error: 'Sinh nội dung lỗi: ' + (e as Error).message }, { status: 500 })
  }

  const parsed = splitSections(essay)
  const contents: { sectionId: string; content: string }[] = catalog.sections.map(s => {
    const sec = parsed.find(p => p.index === s.index)
    return { sectionId: s.id, content: sec?.text ?? '' }
  })

  // Atomic: deduct bundle price + log + insert all Reading rows + mark each refId as already-paid
  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { userUid },
        data: { coin: { decrement: catalog.bundlePrice! }, coinUpdatedAt: new Date() },
        select: { coin: true },
      })
      if (updated.coin < 0) {
        throw new InsufficientCoinError(updated.coin + catalog.bundlePrice!, catalog.bundlePrice!)
      }
      await tx.coinTransaction.create({
        data: {
          userUid,
          delta: -catalog.bundlePrice!,
          balanceAfter: updated.coin,
          reason: `unlock-bundle-${service}`,
          refType: 'deduct',
          refId: bundleRefId,
        },
      })
      // Insert Reading rows (skip if already exists) + zero-delta coin tx markers
      for (let i = 0; i < catalog.sections.length; i++) {
        const sec = catalog.sections[i]
        const content = contents[i].content
        const refId = unlockRefId(service, profileUid, sec.id)
        await tx.reading.upsert({
          where: {
            userUid_profileUid_service_sectionId: {
              userUid, profileUid, service, sectionId: sec.id,
            },
          },
          create: { userUid, profileUid, service, sectionId: sec.id, content },
          update: {}, // keep existing content if already saved
        })
        const exists = await tx.coinTransaction.findFirst({
          where: { userUid, refType: 'deduct', refId },
          select: { id: true },
        })
        if (!exists) {
          await tx.coinTransaction.create({
            data: {
              userUid,
              delta: 0,
              balanceAfter: updated.coin,
              reason: `unlock-via-bundle-${sec.id}`,
              refType: 'deduct',
              refId,
            },
          })
        }
      }
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
    done: true,
    sections: contents,
    coinsCharged: catalog.bundlePrice,
    alreadyUnlocked: false,
  })
}
