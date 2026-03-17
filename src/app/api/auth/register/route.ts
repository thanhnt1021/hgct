import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Website tạm thời không nhận đăng ký mới' },
    { status: 403 },
  )
}
