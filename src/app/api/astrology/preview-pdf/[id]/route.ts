import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'

const PREVIEW_DIR = '/tmp/hgct-previews'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // Validate: must be a UUID (prevent path traversal)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const filePath = path.join(PREVIEW_DIR, `${id}.pdf`)
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Preview not found' }, { status: 404 })
  }

  const buf = fs.readFileSync(filePath)
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="preview.pdf"',
      'Cache-Control': 'private, no-store',
    },
  })
}
