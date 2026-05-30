// Docker API client via tecnativa/docker-socket-proxy (NOT raw /var/run/docker.sock).
//
// Security: hgct-prod container NO LONGER mounts docker.sock. Instead, the proxy
// container has the sock (read-only), and exposes only safe endpoints on
// internal port 2375 (CONTAINERS=1, POST=1 — restart/start/stop, no exec, no
// images, no networks, no volumes, no system info).
//
// Connection: HTTP to hgct-docker-proxy:2375 inside the hgct_hgct-net network.

import http from 'node:http'

const PROXY_HOST = process.env.DOCKER_PROXY_HOST || 'hgct-docker-proxy'
const PROXY_PORT = Number(process.env.DOCKER_PROXY_PORT || 2375)

function dockerRequest<T = unknown>(
  method: 'GET' | 'POST',
  path: string,
): Promise<{ status: number; body: T | null; raw: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: PROXY_HOST,
        port: PROXY_PORT,
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
    req.on('timeout', () => { req.destroy(new Error('docker proxy timeout')) })
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
