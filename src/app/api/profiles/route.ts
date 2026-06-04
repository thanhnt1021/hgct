import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { randomUUID } from 'crypto'
import { encryptProfileData, decryptProfileData } from '@/lib/profileCrypto'
import { updateJob } from '@/lib/jobs'
import fs from 'fs'
import path from 'path'

const PDF_DIR = '/var/hgct/pdfs'
const SOON_DELETE_DIR = '/var/hgct/pdfs/soon_delete'
const EXPIRY_DAYS = 30

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const uid = (session.user as Record<string, unknown>).uid as string
  const user = await prisma.user.findUnique({ where: { userUid: uid } })
  if (!user) {
    const byName = await prisma.user.findUnique({ where: { username: session.user.name || '' } })
    if (!byName) return NextResponse.json({ profiles: [] })
    const profiles = await prisma.profile.findMany({ where: { userUid: byName.userUid, isTemp: false }, orderBy: { id: 'desc' } })
    return NextResponse.json({ profiles: profiles.map(p => ({ ...p, data: decryptProfileData(p.data) })) })
  }

  const profiles = await prisma.profile.findMany({ where: { userUid: uid, isTemp: false }, orderBy: { id: 'desc' } })
  return NextResponse.json({ profiles: profiles.map(p => ({ ...p, data: decryptProfileData(p.data) })) })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const uid = (session.user as Record<string, unknown>).uid as string
  const body = await request.json()

  const isTemp = body.isTemp === true
  const tempExpiry = isTemp ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null

  // Chữ ký dữ liệu hồ sơ — để chống lưu trùng (cùng user nhập cùng 1 người nhiều lần).
  const sig = (d: Record<string, unknown> | null | undefined): string => {
    const o = (d || {}) as Record<string, unknown>
    const dob = (o.dob || {}) as Record<string, number>
    const tob = (o.tob || {}) as Record<string, number | boolean>
    const loc = (o.loc || {}) as Record<string, number | string>
    const num = (v: unknown) => (typeof v === 'number' ? v : 0)
    return JSON.stringify({
      ho: String(o.ho || '').trim(), dem: String(o.dem || '').trim(), ten: String(o.ten || '').trim(),
      g: String(o.gender || ''),
      d: `${dob.day || 0}-${dob.month || 0}-${dob.year || 0}`,
      t: tob.unknown ? 'u' : `${num(tob.hour)}:${num(tob.minute)}`,
      l: `${num(loc.lat).toFixed(4)},${num(loc.lon).toFixed(4)}`,
    })
  }

  // Permanent: nếu đã có hồ sơ trùng dữ liệu → trả lại bản cũ (duplicate), KHÔNG tạo mới.
  if (!isTemp) {
    const existingList = await prisma.profile.findMany({ where: { userUid: uid, isTemp: false } })
    const incomingSig = sig(body.data)
    for (const p of existingList) {
      const pd = decryptProfileData(p.data)
      if (sig(pd as Record<string, unknown>) === incomingSig) {
        return NextResponse.json({ profile: { ...p, data: pd }, duplicate: true })
      }
    }
  }

  const profile = await prisma.profile.create({
    data: {
      userUid: uid,
      profileUid: randomUUID(),
      name: body.name,
      gender: body.gender || 'Female',
      data: encryptProfileData(body.data || {}) as object,
      createdAt: new Date().toISOString(),
      isTemp,
      ...(tempExpiry ? { tempExpiry } : {}),
    },
  })

  return NextResponse.json({ profile: { ...profile, data: decryptProfileData(profile.data) } })
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const uid = (session.user as Record<string, unknown>).uid as string
  const body = await request.json()
  const { id, name, gender, data } = body

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  // Bug #16 fix: verify ownership before update (IDOR)
  const existing = await prisma.profile.findUnique({ where: { id: parseInt(id) }, select: { userUid: true } })
  if (!existing || existing.userUid !== uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const profile = await prisma.profile.update({
    where: { id: parseInt(id) },
    data: { name, gender, data: encryptProfileData(data) as object },
  })

  return NextResponse.json({ profile: { ...profile, data: decryptProfileData(profile.data) } })
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const uid = (session.user as Record<string, unknown>).uid as string
  const { searchParams } = new URL(request.url)
  const id = parseInt(searchParams.get('id') || '0')

  if (id) {
    // Bug #16 fix: verify ownership before delete (IDOR)
    const profile = await prisma.profile.findUnique({ where: { id }, select: { profileUid: true, name: true, userUid: true } })
    if (!profile || profile.userUid !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (profile?.profileUid) {
      const deletedUid = profile.profileUid
      const deletedName = profile.name
      if (!fs.existsSync(SOON_DELETE_DIR)) fs.mkdirSync(SOON_DELETE_DIR, { recursive: true })

      // Find all jobs linked to this profile
      const linkedJobs = await prisma.job.findMany({
        where: { OR: [{ profileUidA: deletedUid }, { profileUidB: deletedUid }] },
        select: { id: true, service: true, profileUidA: true, profileUidB: true, pdfExpiresAt: true },
      })

      for (const job of linkedJobs) {
        if (job.pdfExpiresAt) continue  // already soft-deleted

        const isSynastry = job.service === 'synastry' || job.service === 'relationship'
        const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000)
        const expiresStr = expiresAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

        if (!isSynastry) {
          // Career / love / transit — move PDF to soon_delete
          const pdfName = `${deletedUid}_${job.service}.pdf`
          const srcPath = path.join(PDF_DIR, pdfName)
          const dstPath = path.join(SOON_DELETE_DIR, pdfName)
          if (fs.existsSync(srcPath)) {
            try { fs.renameSync(srcPath, dstPath) } catch {}
          }
          const note = `Hồ sơ đã bị xóa — PDF hết hạn ${expiresStr}`
          await prisma.job.update({ where: { id: job.id }, data: { pdfExpiresAt: expiresAt, pdfNote: note } })
          updateJob(job.id, { pdfExpiresAt: expiresAt.toISOString(), pdfNote: note })
        } else {
          // Synastry — check if the other profile still exists
          const otherUid = job.profileUidA === deletedUid ? job.profileUidB : job.profileUidA
          const otherExists = otherUid
            ? !!(await prisma.profile.findUnique({ where: { profileUid: otherUid }, select: { id: true } }))
            : false

          if (otherExists) {
            // Other profile still exists — keep PDF, just note which profile was deleted
            const note = `Hồ sơ ${deletedName} đã bị xóa`
            await prisma.job.update({ where: { id: job.id }, data: { pdfNote: note } })
            updateJob(job.id, { pdfNote: note })
          } else {
            // Both profiles gone — move PDF to soon_delete
            const pdfName = job.profileUidB
              ? `${job.profileUidA}_${job.profileUidB}_synastry.pdf`
              : `${job.profileUidA}_synastry.pdf`
            const srcPath = path.join(PDF_DIR, pdfName)
            const dstPath = path.join(SOON_DELETE_DIR, pdfName)
            if (fs.existsSync(srcPath)) {
              try { fs.renameSync(srcPath, dstPath) } catch {}
            }
            const note = otherUid
              ? `Cả hai hồ sơ đã bị xóa — PDF hết hạn ${expiresStr}`
              : `Hồ sơ đã bị xóa — PDF hết hạn ${expiresStr}`
            await prisma.job.update({ where: { id: job.id }, data: { pdfExpiresAt: expiresAt, pdfNote: note } })
            updateJob(job.id, { pdfExpiresAt: expiresAt.toISOString(), pdfNote: note })
          }
        }
      }
    }
    await prisma.profile.delete({ where: { id } })
  }

  return NextResponse.json({ success: true })
}
