import { NextResponse } from 'next/server'
import { chromiumSemaphore } from '@/lib/job-queue'

const HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1200px; height: 630px;
      background: linear-gradient(135deg, #0a0a1a 0%, #1a0f2e 50%, #0d0720 100%);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      font-family: 'EB Garamond', Georgia, serif;
      overflow: hidden;
    }
    .brand {
      color: #c9a84c; font-size: 22px; letter-spacing: 0.3em;
      text-transform: uppercase; margin-bottom: 28px;
    }
    .heading {
      color: #f5f0e8; font-size: 52px; font-weight: 700;
      text-align: center; line-height: 1.35;
      margin-bottom: 24px; padding: 0 80px;
    }
    .subtitle {
      color: #8a8399; font-size: 20px; text-align: center;
    }
    .domain {
      color: #6b7280; font-size: 17px; margin-top: 28px;
      letter-spacing: 0.08em;
    }
  </style>
</head>
<body>
  <p class="brand">✦ Hạt Giống Chiêm Tinh ✦</p>
  <h1 class="heading">Bầu trời lúc bạn chào đời<br>nói gì về bạn?</h1>
  <p class="subtitle">Luận giải chiêm tinh cá nhân hoá • PDF chi tiết qua email</p>
  <p class="domain">hatgiongchiemtinh.com</p>
</body>
</html>`

export async function GET() {
  await chromiumSemaphore.acquire()
  try {
    const chromium = await import('@sparticuz/chromium')
    const puppeteer = await import('puppeteer-core')
    const execPath = await chromium.default.executablePath()
    const browser = await puppeteer.default.launch({
      args: [...chromium.default.args, '--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: execPath,
      headless: true,
    })
    const page = await browser.newPage()
    await page.setViewport({ width: 1200, height: 630 })
    await page.setContent(HTML, { waitUntil: 'networkidle0' })
    const screenshot = await page.screenshot({ type: 'png' })
    await browser.close()

    return new NextResponse(Buffer.from(screenshot), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      },
    })
  } finally {
    chromiumSemaphore.release()
  }
}
