'use client'

import { useState, useRef, useEffect } from 'react'

type DeployTarget = 'demo' | 'production'

function DeployButton({
  target,
  label,
  description,
  onStart,
  disabled,
}: {
  target: DeployTarget
  label: string
  description: string
  onStart: (target: DeployTarget) => void
  disabled: boolean
}) {
  return (
    <div style={{
      background: '#13131f',
      border: '1px solid rgba(201,168,76,0.12)',
      borderRadius: 10,
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    }}>
      <div>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e8e0f0', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: '0.78rem', color: '#6b6585' }}>{description}</div>
      </div>
      <button
        onClick={() => onStart(target)}
        disabled={disabled}
        style={{
          padding: '8px 20px',
          borderRadius: 6,
          border: target === 'production'
            ? '1px solid rgba(239,68,68,0.4)'
            : '1px solid rgba(201,168,76,0.35)',
          background: target === 'production'
            ? 'rgba(239,68,68,0.1)'
            : 'rgba(201,168,76,0.1)',
          color: target === 'production' ? '#f87171' : '#c9a84c',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '0.82rem',
          fontWeight: 600,
          opacity: disabled ? 0.5 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        🚀 Deploy
      </button>
    </div>
  )
}

export default function DeployUI() {
  const [running, setRunning] = useState(false)
  const [activeTarget, setActiveTarget] = useState<DeployTarget | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [exitCode, setExitCode] = useState<number | null>(null)
  const [reloading, setReloading] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // After production deploy exits, poll /api/health until server is back
  useEffect(() => {
    if (!reloading) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        if (res.ok) {
          clearInterval(interval)
          setReloading(false)
          setLogs((prev) => [...prev, '[health] Server back online — reloading…'])
          setTimeout(() => window.location.reload(), 800)
        }
      } catch { /* server not up yet */ }
    }, 3000)
    return () => clearInterval(interval)
  }, [reloading])

  async function startDeploy(target: DeployTarget) {
    if (running) return
    if (target === 'production') {
      const ok = window.confirm('Deploy lên PRODUCTION? Người dùng sẽ gặp downtime ~30 giây.')
      if (!ok) return
    }

    setRunning(true)
    setActiveTarget(target)
    setLogs([`[start] Bắt đầu deploy ${target}…`])
    setExitCode(null)

    try {
      const res = await fetch('/api/admin/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      })

      if (!res.ok) {
        setLogs((prev) => [...prev, `[error] HTTP ${res.status}`])
        setRunning(false)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          const json = JSON.parse(part.slice(6))
          if (json.line) {
            setLogs((prev) => [...prev, json.line])
          }
          if (json.done) {
            setExitCode(json.code)
            setRunning(false)
            if (target === 'production' && json.code === 0) {
              setLogs((prev) => [...prev, '[health] Đợi server khởi động lại…'])
              setReloading(true)
            }
          }
        }
      }
    } catch (err: any) {
      // Production deploy kills the server — SSE connection drops
      if (target === 'production') {
        setLogs((prev) => [...prev, '[health] Connection lost — đợi server khởi động lại…'])
        setExitCode(0)
        setRunning(false)
        setReloading(true)
      } else {
        setLogs((prev) => [...prev, `[error] ${err.message}`])
        setRunning(false)
      }
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        <DeployButton
          target="demo"
          label="Deploy Demo"
          description="deploy-demo-local.sh — build từ code hiện tại, restart hgct-demo.service"
          onStart={startDeploy}
          disabled={running}
        />
        <DeployButton
          target="production"
          label="Deploy Production"
          description="deploy.sh — build + restart hgct.service (downtime ~30s)"
          onStart={startDeploy}
          disabled={running}
        />
      </div>

      {/* Log viewer */}
      {logs.length > 0 && (
        <div style={{
          background: '#080810',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
          padding: '16px',
          fontFamily: 'monospace',
          fontSize: '0.78rem',
          color: '#a0a0c0',
          maxHeight: 420,
          overflowY: 'auto',
          lineHeight: 1.6,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 10,
            fontSize: '0.72rem',
            color: '#4a4560',
          }}>
            <span>
              {activeTarget && `${activeTarget} deploy`}
              {running && ' • đang chạy…'}
              {reloading && ' • đợi server…'}
              {!running && !reloading && exitCode !== null && (
                <span style={{ color: exitCode === 0 ? '#4ade80' : '#f87171' }}>
                  {' '}• exit {exitCode} {exitCode === 0 ? '✓' : '✗'}
                </span>
              )}
            </span>
            <button
              onClick={() => { setLogs([]); setExitCode(null); setActiveTarget(null) }}
              style={{ background: 'none', border: 'none', color: '#4a4560', cursor: 'pointer' }}
            >
              clear
            </button>
          </div>
          {logs.map((line, i) => (
            <div key={i} style={{
              color: line.startsWith('[error]') ? '#f87171'
                : line.startsWith('[done]') ? (line.includes('exit code: 0') ? '#4ade80' : '#f87171')
                : line.startsWith('[health]') ? '#c9a84c'
                : '#a0a0c0',
            }}>
              {line}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  )
}
