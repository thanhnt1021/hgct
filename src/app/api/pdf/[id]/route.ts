import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const PDF_DIR = '/tmp/hgct-pdfs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // Sanitize: only allow UUID-like filenames
  if (!/^[a-f0-9-]{36}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const filePath = path.join(PDF_DIR, `${id}.pdf`)
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const buffer = fs.readFileSync(filePath)
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bao-cao-chiem-tinh-${id.slice(0, 8)}.pdf"`,
    },
  })
}
