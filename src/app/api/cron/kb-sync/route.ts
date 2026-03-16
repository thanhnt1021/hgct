import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import prisma from '@/lib/db'

const IMPORTANT_TABS = ['LÕI TÍNH CÁCH', 'TÀI NĂNG NỔI BẬT', 'love-CẶP ĐÔI', 'VẬN HẠN']

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64
  const spreadsheetId = process.env.KB_SPREADSHEET_ID
  if (!b64 || !spreadsheetId) {
    return NextResponse.json({ error: 'Missing env: GOOGLE_SERVICE_ACCOUNT_BASE64 or KB_SPREADSHEET_ID' }, { status: 500 })
  }

  try {
    // 1. Auth with Google Sheets API
    const credentials = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })
    const sheets = google.sheets({ version: 'v4', auth })

    // 2. Get all sheet names
    const meta = await sheets.spreadsheets.get({ spreadsheetId })
    const sheetNames = meta.data.sheets?.map(s => s.properties?.title).filter(Boolean) as string[]
    if (!sheetNames?.length) {
      return NextResponse.json({ error: 'No sheets found in spreadsheet' }, { status: 500 })
    }

    // 3. Fetch all sheets data in one batch request
    const ranges = sheetNames.map(name => `'${name}'`)
    const batchRes = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
    })

    const data: Record<string, string[][]> = {}
    const warnings: string[] = []

    batchRes.data.valueRanges?.forEach((vr, i) => {
      const name = sheetNames[i]
      data[name] = (vr.values as string[][]) || []
    })

    // 4. Integrity check
    for (const tab of IMPORTANT_TABS) {
      if (!data[tab] || data[tab].length === 0) {
        warnings.push(`Tab quan trọng '${tab}' đang rỗng`)
      }
    }

    // 5. Write to DB via Prisma (delete all + insert all in transaction)
    const now = new Date().toISOString()
    await prisma.$transaction([
      prisma.knowledgeBase.deleteMany(),
      ...Object.entries(data).map(([tabName, content]) =>
        prisma.knowledgeBase.create({
          data: { tabName, data: content, updatedAt: now },
        })
      ),
    ])

    const result = {
      ok: true,
      sheets: sheetNames.length,
      tabs: Object.keys(data),
      warnings,
      syncedAt: now,
    }

    console.log('[CRON kb-sync]', JSON.stringify({ sheets: sheetNames.length, warnings }))
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[CRON kb-sync ERROR]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
