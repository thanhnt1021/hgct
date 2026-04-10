import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Chỉ serve đúng 4 file nền PDF — không cho phép path traversal
const ALLOWED = new Set([
  'pdf-HuongNghiep-02.jpg',
  'pdf-TinhDuyen-02.jpg',
  'pdf-CapDoi-02.jpg',
  'pdf-VanHan-02.jpg',
])

const IMGS_DIR = '/home/hgct/hgct/imgs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params
  if (!ALLOWED.has(filename)) {
    return new NextResponse('Not found', { status: 404 })
  }
  const filePath = path.join(IMGS_DIR, filename)
  try {
    const buffer = fs.readFileSync(filePath)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
