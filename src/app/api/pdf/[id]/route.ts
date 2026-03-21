import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const PDF_DIR = '/var/hgct/pdfs'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // Validate: UUID | UUID_service | UUID_UUID_service | UUID_service_orderId — prevent path traversal
  // Bug #2 fix: also accept numeric orderId suffix (_\d+) after service name
  const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  if (!new RegExp(`^${UUID}(_${UUID})?(_[a-z]+(_\\d+)?)?$`, 'i').test(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const rawFilename = searchParams.get('filename') || `bao-cao-chiem-tinh-${id.slice(0, 8)}.pdf`
  const filename = rawFilename.replace(/[^\w\u00C0-\u024F\u1E00-\u1EFF._\- ]/g, '_').slice(0, 200)

  // Check main dir first, then soon_delete
  let filePath = path.join(PDF_DIR, `${id}.pdf`)
  if (!fs.existsSync(filePath)) {
    filePath = path.join(PDF_DIR, 'soon_delete', `${id}.pdf`)
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  const buffer = fs.readFileSync(filePath)
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
