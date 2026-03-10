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
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await request.json()
    const expected = process.env.UPGRADE_CODE

    if (!expected) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    if (!code || code.trim() !== expected) {
      return NextResponse.json({ error: 'Mã nâng cấp không hợp lệ' }, { status: 401 })
    }

    const token = premiumToken(expected)
    const uid = (session.user as any).uid as string

    if (uid) {
      await prisma.user.update({
        where: { userUid: uid },
        data: { isPremium: true, premiumToken: token },
      })
    }

    return NextResponse.json({ token })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
