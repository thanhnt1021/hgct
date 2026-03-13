import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { updateJob } from '@/lib/jobs'
import fs from 'fs'
import path from 'path'

const PDF_DIR = '/var/hgct/pdfs'
const SOON_DELETE_DIR = '/var/hgct/pdfs/soon_delete'
const GRACE_DAYS = 7  // days to keep PDF in soon_delete after temp profile expires

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results = { phase1: { profiles: 0, pdfs: 0, jobs: 0 }, phase2: { deleted: 0 }, errors: [] as string[] }

  // ── Phase 1: expired temp profiles ────────────────────────────────
  const expiredProfiles = await prisma.profile.findMany({
    where: { isTemp: true, tempExpiry: { lte: now } },
    select: { id: true, profileUid: true, name: true },
  })

  for (const profile of expiredProfiles) {
    try {
      if (!fs.existsSync(SOON_DELETE_DIR)) fs.mkdirSync(SOON_DELETE_DIR, { recursive: true })

      const expiresAt = new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000)
      const expiresStr = expiresAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

      // Find all jobs linked to this temp profile
      const linkedJobs = await prisma.job.findMany({
        where: {
          OR: [{ profileUidA: profile.profileUid }, { profileUidB: profile.profileUid }],
          pdfExpiresAt: null,  // not already soft-deleted
        },
        select: { id: true, service: true, profileUidA: true, profileUidB: true },
      })

      for (const job of linkedJobs) {
        const isSynastry = job.service === 'synastry' || job.service === 'relationship'

        // Determine PDF filename
        let pdfName: string
        if (isSynastry) {
          pdfName = job.profileUidB
            ? `${job.profileUidA}_${job.profileUidB}_synastry.pdf`
            : `${job.profileUidA}_synastry.pdf`
        } else {
          pdfName = `${profile.profileUid}_${job.service}.pdf`
        }

        // Move PDF to soon_delete if exists in main dir
        const srcPath = path.join(PDF_DIR, pdfName)
        const dstPath = path.join(SOON_DELETE_DIR, pdfName)
        if (fs.existsSync(srcPath)) {
          try { fs.renameSync(srcPath, dstPath); results.phase1.pdfs++ } catch {}
        }

        const note = `Hồ sơ tạm thời đã hết hạn — PDF hết hạn ${expiresStr}`
        await prisma.job.update({ where: { id: job.id }, data: { pdfExpiresAt: expiresAt, pdfNote: note } })
        updateJob(job.id, { pdfExpiresAt: expiresAt.toISOString(), pdfNote: note })
        results.phase1.jobs++
      }

      await prisma.profile.delete({ where: { id: profile.id } })
      results.phase1.profiles++
    } catch (err) {
      results.errors.push(`profile ${profile.profileUid}: ${err}`)
    }
  }

  // ── Phase 2: delete PDFs in soon_delete where job.pdfExpiresAt has passed ─
  const expiredJobs = await prisma.job.findMany({
    where: { pdfExpiresAt: { lte: now } },
    select: { id: true, profileUidA: true, profileUidB: true, service: true },
  })

  for (const job of expiredJobs) {
    try {
      const isSynastry = job.service === 'synastry' || job.service === 'relationship'
      const pdfName = isSynastry
        ? (job.profileUidB ? `${job.profileUidA}_${job.profileUidB}_synastry.pdf` : `${job.profileUidA}_synastry.pdf`)
        : `${job.profileUidA}_${job.service}.pdf`

      const filePath = path.join(SOON_DELETE_DIR, pdfName)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        results.phase2.deleted++
      }
    } catch (err) {
      results.errors.push(`job ${job.id} cleanup: ${err}`)
    }
  }

  console.log('[CRON cleanup]', JSON.stringify(results))
  return NextResponse.json({ ok: true, ...results })
}
