// VISUAL ONLY — process section restyled to Celestial Sanctum design

const steps = [
  { num: '01', title: 'Nhập thông tin ngày giờ sinh' },
  { num: '02', title: 'Chọn điều bạn muốn khám phá' },
  { num: '03', title: 'Nhận luận giải PDF qua email' },
]

export default function ProcessSection() {
  return (
    <section id="process" className="relative z-10 py-28 sm:py-36" style={{ background: 'rgba(6,6,15,0.6)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-20">
          <p className="section-eyebrow mb-4">Thao tác dễ dàng</p>
          <h2
            style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: 'clamp(1.5rem, 4vw, 2.6rem)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.75rem' }}
          >
            Chỉ 3 bước đơn giản
          </h2>
          <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '1.05rem' }}>
            Bạn sẽ tìm ra giải pháp, tháo gỡ những khúc mắc hiện tại
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
          <div
            className="hidden md:block absolute"
            style={{ top: '2.5rem', left: 'calc(33% - 20px)', right: 'calc(33% - 20px)', height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(200,148,63,0.2) 20%, rgba(200,148,63,0.35) 50%, rgba(200,148,63,0.2) 80%, transparent 100%)' }}
          />
          {steps.map((step, i) => (
            <div key={i} className="relative text-center">
              <div className="relative inline-block mb-3">
                <div style={{ width: '7rem', height: '7rem', borderRadius: '50%', background: 'rgba(18,13,46,0.9)', border: '1px solid rgba(200,148,63,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 0 32px rgba(200,148,63,0.1), inset 0 0 20px rgba(0,0,0,0.5)' }}>
                  {/* Step numbers are pure digits — Cinzel OK here */}
                  <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '1.9rem', fontWeight: 700, color: '#d9ab55', letterSpacing: '0.05em' }}>
                    {step.num}
                  </span>
                </div>
              </div>
              <h3 className="font-semibold" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.15rem', letterSpacing: '0.01em' }}>
                {step.title}
              </h3>
            </div>
          ))}
        </div>

        {/* Testimonial */}
        <div className="mt-14 max-w-3xl mx-auto">
          <div className="relative p-10 rounded-2xl" style={{ background: 'rgba(18,13,46,0.6)', border: '1px solid rgba(200,148,63,0.14)', backdropFilter: 'blur(20px)' }}>
            <div style={{ position: 'absolute', top: '1.5rem', left: '2rem', fontFamily: 'var(--font-playfair)', fontSize: '5rem', lineHeight: 1, color: 'rgba(200,148,63,0.15)', fontWeight: 400, userSelect: 'none' }}>
              &ldquo;
            </div>
            <div className="relative pt-8">
              {/* Testimonial — Playfair italic 400 (weight 300 không tồn tại) */}
              <p className="italic mb-8" style={{ color: '#c9c3d6', fontFamily: 'var(--font-playfair)', fontSize: '1.15rem', lineHeight: 1.9, fontWeight: 400 }}>
                Mình không tin tưởng chiêm tinh lắm cho đến khi đọc bản phân tích về sự nghiệp — nó mô tả đúng đến mức mình phải đọc lại hai lần. Giờ mình hiểu tại sao mình luôn bị thu hút bởi những ngành sáng tạo dù học kỹ thuật.
              </p>
              <div className="flex items-center gap-4">
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'linear-gradient(135deg, #c8943f, #f0cc78)', color: '#06060f', fontFamily: 'var(--font-cinzel)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  T
                </div>
                <div>
                  <p style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontWeight: 600, fontSize: '0.95rem' }}>Thanh N.</p>
                  <p style={{ color: '#9090a8', fontFamily: 'var(--font-vietnam)', fontStyle: 'italic', fontSize: '0.85rem', marginTop: '0.1rem' }}>Hà Nội · Báo cáo hướng nghiệp</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
