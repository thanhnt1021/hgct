import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdminSession } from '@/lib/dashboard-auth'
import { spawn } from 'child_process'
import path from 'path'

const ALLOWED_SCRIPTS = {
  demo: '/root/hgct/deploy-demo-local.sh',
  production: '/root/hgct/deploy.sh',
} as const

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const target = body.target as keyof typeof ALLOWED_SCRIPTS
  const scriptPath = ALLOWED_SCRIPTS[target]

  if (!scriptPath) {
    return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const proc = spawn('sudo', ['bash', scriptPath], {
        cwd: path.dirname(scriptPath),
        env: { ...process.env, FORCE_COLOR: '0' },
      })

      const send = (line: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ line })}\n\n`))
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

      proc.on('close', (code) => {
        send(`[done] exit code: ${code}`)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, code })}\n\n`))
        controller.close()
      })

      proc.on('error', (err) => {
        send(`[error] ${err.message}`)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, code: -1 })}\n\n`))
        controller.close()
      })
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
