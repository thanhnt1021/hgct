import { NextResponse } from 'next/server'
import { createHash } from 'crypto'

function premiumToken(upgradeCode: string): string {
  return createHash('sha256').update(upgradeCode + ':hgct-premium').digest('hex')
}

export async function POST(request: Request) {
  try {
    const { code } = await request.json()
    const expected = process.env.UPGRADE_CODE

    if (!expected) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    if (!code || code.trim() !== expected) {
      return NextResponse.json({ error: 'Mã nâng cấp không hợp lệ' }, { status: 401 })
    }

    return NextResponse.json({ token: premiumToken(expected) })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
