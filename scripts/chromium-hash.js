#!/usr/bin/env node
// Extracts @sparticuz/chromium binary and prints its SHA256 hash to stdout.
// Run as: node scripts/chromium-hash.js
// Used by deploy scripts to keep /etc/security-monitor/chromium_hash.txt up to date.

const { createHash } = require('crypto')
const fs = require('fs')

async function main() {
  const chromium = require('@sparticuz/chromium')
  const execPath = await chromium.executablePath()
  if (!execPath || !fs.existsSync(execPath)) {
    process.stderr.write('chromium binary not found\n')
    process.exit(1)
  }
  const hash = createHash('sha256').update(fs.readFileSync(execPath)).digest('hex')
  process.stdout.write(hash + '\n')
}

main().catch(e => { process.stderr.write(String(e) + '\n'); process.exit(1) })
