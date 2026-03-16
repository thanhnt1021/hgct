// VISUAL ONLY — CTA section, Celestial Sanctum design (Server Component)

import Link from 'next/link'

export default function CTASection() {
  return (
    <section className="relative z-10 py-28 sm:py-36">
      <div className="max-w-4xl mx-auto px-4">

        <div className="relative overflow-hidden rounded-2xl p-px" style={{ background: 'linear-gradient(180deg, rgba(200,148,63,0.7) 0%, rgba(200,148,63,0.2) 50%, rgba(200,148,63,0.6) 100%)' }}>
          <div className="rounded-[15px] px-8 sm:px-16 py-16 text-center relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #0d0d26 0%, #080818 100%)' }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% -20%, rgba(200,148,63,0.09) 0%, transparent 65%)' }} />

            <div className="relative z-10 flex flex-col items-center">
              <div className="divider-ornament mb-8">
                <span>✦</span>
              </div>

              <h2 className="mb-8 leading-tight">
                <span className="block mb-2" style={{ color: '#c8943f', fontFamily: 'var(--font-vietnam)', fontSize: 'clamp(1.4rem, 2.8vw, 1.8rem)', letterSpacing: '0.1em', fontWeight: 600 }}>
                  Bạn đã sẵn sàng muốn biết
                </span>
                <span
                  className="block"
                  style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(2.5rem, 5vw, 4rem)', textTransform: 'uppercase', background: 'linear-gradient(135deg, #c8943f, #f0cc78, #d9ab55)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1.1 }}
                >
                  Bầu trời lúc bạn<br />chào đời nói gì về<br />bạn?
                </span>
              </h2>

              <div className="mb-8" style={{ width: '60px', height: '1px', background: 'linear-gradient(90deg, transparent, #d9ab55, transparent)' }} />

              <p className="mb-10 max-w-2xl" style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '1.05rem', lineHeight: 1.9 }}>
                Bạn không tình cờ lạc vào trang này đâu. Có thể vũ trụ đã sắp xếp một chút... hoặc một người bạn nào đó đưa bạn đến đây..<br />
                Nhưng nếu bạn đang đọc đến dòng này, có lẽ trong lòng bạn cũng đang có vài câu hỏi băn khoăn về bản thân, tình yêu hay con đường phía trước. Và biết đâu, câu trả lời đó đang nằm trong bản đồ sao của bạn.
              </p>

              <Link href="/services" className="btn-cta-main mb-6">
                Khám phá tại đây
              </Link>

              <p style={{ color: '#9090a8', fontSize: '0.85rem', fontFamily: 'var(--font-vietnam)' }}>
                Nhận báo cáo trong vài phút · Giao qua email · PDF lưu được
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
