// Docker API client via /var/run/docker.sock (mounted into hgct-prod container).
// Replaces legacy systemctl calls after Docker migration.

import http from 'node:http'

const DOCKER_SOCKET = '/var/run/docker.sock'

function dockerRequest<T = unknown>(
  method: 'GET' | 'POST',
  path: string,
): Promise<{ status: number; body: T | null; raw: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath: DOCKER_SOCKET,
        method,
        path,
        timeout: 15_000,
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        let raw = ''
        res.on('data', (chunk) => (raw += chunk))
        res.on('end', () => {
          let body: T | null = null
          if (raw) {
            try { body = JSON.parse(raw) as T } catch { body = null }
          }
          resolve({ status: res.statusCode ?? 0, body, raw })
        })
      },
    )
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(new Error('docker socket timeout')) })
    req.end()
  })
}

export async function restartContainer(name: string): Promise<void> {
  const { status, raw } = await dockerRequest('POST', `/containers/${encodeURIComponent(name)}/restart`)
  if (status !== 204 && status !== 200) {
    throw new Error(`restart ${name} failed: HTTP ${status} ${raw}`)
  }
}

export async function getContainerStatus(name: string): Promise<string> {
  const { status, body } = await dockerRequest<{ State?: { Status?: string } }>(
    'GET',
    `/containers/${encodeURIComponent(name)}/json`,
  )
  if (status !== 200 || !body) {
    throw new Error(`inspect ${name} failed: HTTP ${status}`)
  }
  return body.State?.Status ?? 'unknown'
}
