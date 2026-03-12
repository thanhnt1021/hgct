import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

function premiumToken(upgradeCode: string): string {
  return createHash('sha256').update(upgradeCode + ':hgct-premium').digest('hex')
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin')
    const allowed = process.env.NEXT_PUBLIC_APP_URL
    if (origin && allowed && origin !== allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await request.json()
    const expected = process.env.UPGRADE_CODE

    if (!expected) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const adminCode = process.env.ADMIN_UPGRADE_CODE || 'TaiKhoanAdmin'
    const trimmed = code?.trim() || ''
    const isLifetime = trimmed === adminCode
    if (!trimmed || (trimmed !== expected && !isLifetime)) {
      return NextResponse.json({ error: 'Mã nâng cấp không hợp lệ' }, { status: 401 })
    }

    const token = premiumToken(expected)
    const uid = (session.user as any).uid as string
    const planType = isLifetime ? 'lifetime' : 'premium'

    if (uid) {
      await prisma.user.update({
        where: { userUid: uid },
        data: { isPremium: true, premiumToken: token, planType },
      })
    }

    return NextResponse.json({ token, planType })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
