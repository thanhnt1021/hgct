// Background unlock jobs for coin readings — same "never-fail" pattern as the
// legacy PDF report flow: gen runs in the background, progress is reported into
// the job (real % from streamed chars), the client polls /api/job/[id]. On
// completion the section/bundle is charged atomically + persisted; the client
// then reads the content from reading-list.

import { randomUUID } from 'crypto'
import prisma from '@/lib/db'
import { createJob, updateJob } from '@/lib/jobs'
import { getCatalog, getSection } from '@/lib/catalog/sections'
import { deductCoin, InsufficientCoinError } from '@/lib/coin/service'
import { generateAndCacheEssay } from '@/lib/essay/generate'
import { unlockRefId, type InputData } from '@/lib/essay/key'
import { getSectionByIndex, splitSections } from '@/lib/essay/parse'

const CHARS_PER_SECTION = 3500 // ước lượng độ dài 1 mục → quy ra % sát thực tế hơn

interface BaseParams {
  userUid: string
  service: string
  profileUid: string
  inputData: InputData
  inputDataB?: InputData
  startDate?: string
  endDate?: string
  name?: string
}

function progressUpdater(jobId: string, expectedChars: number) {
  return (chars: number) => {
    const pct = Math.min(95, Math.max(3, Math.floor((chars / expectedChars) * 95)))
    updateJob(jobId, { progress: pct, label: `Đang tạo nội dung… ${pct}%` })
  }
}

async function genEssay(jobId: string, p: BaseParams): Promise<string> {
  // Cả bài luôn gen đủ các mục → ước lượng độ dài theo số mục của dịch vụ.
  const sectionCount = getCatalog(p.service)?.sections.length ?? 6
  const expectedChars = Math.max(8000, sectionCount * CHARS_PER_SECTION)
  const { essay } = await generateAndCacheEssay({
    userUid: p.userUid, service: p.service,
    inputData: p.inputData, inputDataB: p.inputDataB,
    startDate: p.startDate, endDate: p.endDate,
    onProgress: progressUpdater(jobId, expectedChars),
  })
  return essay
}

function finishError(jobId: string, e: unknown) {
  const err = e instanceof InsufficientCoinError ? 'Không đủ xu' : 'Tạo nội dung lỗi: ' + (e as Error).message
  updateJob(jobId, { status: 'error', error: err })
}

/** Gen full essay (background) → charge 1 section → persist Reading. Returns jobId. */
export function startSectionUnlockJob(p: BaseParams & { sectionId: string }): string {
  const jobId = randomUUID()
  const section = getSection(p.service, p.sectionId)
  createJob(jobId, { userUid: p.userUid, service: p.service, name: p.name })
  ;(async () => {
    try {
      if (!section) throw new Error('Section không tồn tại')
      const essay = await genEssay(jobId, p)
      const content = getSectionByIndex(essay, section.index)
      if (!content) throw new Error('Không tách được nội dung mục')
      await prisma.$transaction(async (tx) => {
        await deductCoin({
          userUid: p.userUid, amount: section.coinPrice,
          reason: `unlock-${p.sectionId}`, refType: 'deduct',
          refId: unlockRefId(p.service, p.profileUid, p.sectionId), tx,
        })
        await tx.reading.create({
          data: { userUid: p.userUid, profileUid: p.profileUid, service: p.service, sectionId: p.sectionId, content },
        })
      })
      updateJob(jobId, { status: 'done', progress: 100, label: 'Hoàn tất' })
    } catch (e) {
      finishError(jobId, e)
    }
  })()
  return jobId
}

/** Gen full essay (background) → charge bundle → persist all Reading rows. Returns jobId. */
export function startBundleUnlockJob(p: BaseParams): string {
  const jobId = randomUUID()
  const catalog = getCatalog(p.service)
  createJob(jobId, { userUid: p.userUid, service: p.service, name: p.name })
  ;(async () => {
    try {
      if (!catalog || catalog.bundlePrice == null) throw new Error('Cục này chưa có giá trọn cục')
      const essay = await genEssay(jobId, p)
      const parsed = splitSections(essay)
      const bundleRefId = unlockRefId(p.service, p.profileUid, 'bundle')

      await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { userUid: p.userUid },
          data: { coin: { decrement: catalog.bundlePrice! }, coinUpdatedAt: new Date() },
          select: { coin: true },
        })
        if (updated.coin < 0) throw new InsufficientCoinError(updated.coin + catalog.bundlePrice!, catalog.bundlePrice!)
        await tx.coinTransaction.create({
          data: {
            userUid: p.userUid, delta: -catalog.bundlePrice!, balanceAfter: updated.coin,
            reason: `unlock-bundle-${p.service}`, refType: 'deduct', refId: bundleRefId,
          },
        })
        for (const sec of catalog.sections) {
          const part = parsed.find(x => x.index === sec.index)
          const refId = unlockRefId(p.service, p.profileUid, sec.id)
          await tx.reading.upsert({
            where: { userUid_profileUid_service_sectionId: { userUid: p.userUid, profileUid: p.profileUid, service: p.service, sectionId: sec.id } },
            create: { userUid: p.userUid, profileUid: p.profileUid, service: p.service, sectionId: sec.id, content: part?.text ?? '' },
            update: {},
          })
          const exists = await tx.coinTransaction.findFirst({ where: { userUid: p.userUid, refType: 'deduct', refId }, select: { id: true } })
          if (!exists) {
            await tx.coinTransaction.create({
              data: { userUid: p.userUid, delta: 0, balanceAfter: updated.coin, reason: `unlock-via-bundle-${sec.id}`, refType: 'deduct', refId },
            })
          }
        }
      })
      updateJob(jobId, { status: 'done', progress: 100, label: 'Hoàn tất' })
    } catch (e) {
      finishError(jobId, e)
    }
  })()
  return jobId
}
