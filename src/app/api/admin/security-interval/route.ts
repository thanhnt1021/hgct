import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdminSession } from '@/lib/dashboard-auth'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!isAdminSession(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Read current interval from timer file
    const { stdout } = await execFileAsync('systemctl', ['cat', 'security-monitor.timer'])
    // systemctl cat shows base file first, then drop-in overrides — use last match
    const matches = Array.from(stdout.matchAll(/OnUnitActiveSec=(\d+)min/g))
    const interval = matches.length > 0 ? parseInt(matches[matches.length - 1][1]) : 5
    return NextResponse.json({ interval })
  } catch {
    return NextResponse.json({ interval: 5 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!isAdminSession(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { interval } = await req.json()
  const n = parseInt(interval)
  if (!n || n < 5 || n > 1440) {
    return NextResponse.json({ error: 'interval phải từ 5–1440 phút' }, { status: 400 })
  }

  try {
    const { stdout } = await execFileAsync('sudo', ['/usr/local/bin/set-security-interval.sh', String(n)])
    if (!stdout.trim().startsWith('OK')) {
      return NextResponse.json({ error: 'Script failed: ' + stdout }, { status: 500 })
    }
    return NextResponse.json({ ok: true, interval: n })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
