import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

// Derive the stable premiumToken stored alongside the user row — used to resume
// premium sessions without re-entering the code. Derived from the env hash so
// the token remains stable as long as the hash doesn't rotate.
function premiumToken(secret: string): string {
  return createHash('sha256').update(secret + ':hgct-premium').digest('hex')
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
    const trimmed = (code || '').toString().trim()
    const hash = process.env.UPGRADE_CODE_HASH

    if (!hash) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    if (!trimmed) {
      return NextResponse.json({ error: 'Mã nâng cấp không hợp lệ' }, { status: 401 })
    }

    const ok = await bcrypt.compare(trimmed, hash)
    if (!ok) {
      return NextResponse.json({ error: 'Mã nâng cấp không hợp lệ' }, { status: 401 })
    }

    // Unified code grants lifetime.
    const token = premiumToken(hash)
    const uid = (session.user as { uid?: string }).uid
    const planType = 'lifetime'

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
