import { NextRequest, NextResponse } from 'next/server'
import { checkAdminToken } from '@/lib/dashboard-auth'
import { spawn } from 'child_process'
import path from 'path'

const ALLOWED_SCRIPTS = {
  demo: '/root/hgct/deploy-demo-local.sh',
  production: '/root/hgct/deploy.sh',
} as const

export async function POST(req: NextRequest) {
  const authErr = await checkAdminToken(req)
  if (authErr) return authErr

  const body = await req.json()
  const target = body.target as keyof typeof ALLOWED_SCRIPTS
  const scriptPath = ALLOWED_SCRIPTS[target]

  if (!scriptPath) {
    return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      const proc = spawn('sudo', ['bash', scriptPath], {
        cwd: path.dirname(scriptPath),
        env: { ...process.env, FORCE_COLOR: '0' },
      })

      const send = (line: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ line })}\n\n`))
        } catch { /* controller already closed */ }
      }

      // Bug #9 fix: keepalive ping every 20s to prevent Nginx 60s proxy timeout
      const keepalive = setInterval(() => {
        if (closed) { clearInterval(keepalive); return }
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch { clearInterval(keepalive) }
      }, 20_000)

      const cleanup = (code: number | null) => {
        if (closed) return
        closed = true
        clearInterval(keepalive)
        send(`[done] exit code: ${code}`)
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, code })}\n\n`))
          controller.close()
        } catch { /* already closed */ }
      }

      proc.stdout.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n')
        for (const line of lines) {
          if (line) send(line)
        }
      })

      proc.stderr.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n')
        for (const line of lines) {
          if (line) send(`[stderr] ${line}`)
        }
      })

      proc.on('close', (code) => cleanup(code))

      proc.on('error', (err) => {
        send(`[error] ${err.message}`)
        cleanup(-1)
      })
    },
    cancel() {
      // Bug #9 fix: client disconnected — nothing to kill since proc is scoped inside start()
      // The process will finish naturally; keepalive interval will self-clear on next tick.
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
