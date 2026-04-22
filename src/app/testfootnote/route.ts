// /testfootnote — dev-only endpoint that generates a minimal career PDF
// (cover + 1 content page + reference + end) for verifying footer font render.
// Gate: NODE_ENV !== 'production' OR ENABLE_TEST_ROUTES=1 env override (for
// enabling on the demo container without switching to a dev build).

import { NextResponse } from 'next/server'
import { generatePdf } from '@/lib/pdf/generator'

const STUB_ESSAY = `1. Kiểm tra Footer Tiếng Việt

Đây là nội dung mẫu để kiểm tra xem footer "Hạt Giống Chiêm Tinh" có render đầy đủ dấu tiếng Việt hay không.

Các ký tự thường gặp lỗi: ạ ố ế ệ ậ ọ ữ ừ ợ ắ ẩ ọ ỹ.

Nếu footer hiển thị đầy đủ "Hạt Giống Chiêm Tinh" (có dấu nặng dưới ạ và dấu sắc trên ố), fix đã thành công.
`

export async function GET() {
  const allowed = process.env.NODE_ENV !== 'production' || process.env.ENABLE_TEST_ROUTES === '1'
  if (!allowed) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const buf = await generatePdf(STUB_ESSAY, {
      coverTitle: 'Kiểm tra Footer',
      sectionTitle: 'Bản Luận Giải Hướng Nghiệp',
      service: 'career', // has reference page baked in
      profile: {
        name: 'Nguyễn Văn Ạ',
        dob: { day: '12', month: '01', year: '1994' },
        tob: '12:34',
      },
      skipClosing: false,
    })
    if (!buf) {
      return NextResponse.json({ error: 'PDF generation returned null' }, { status: 500 })
    }
    return new NextResponse(buf as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="testfootnote.pdf"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[testfootnote] error:', err)
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 })
  }
}
