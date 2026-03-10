// VISUAL ONLY — features/services section, Celestial Sanctum design (Server Component)

import Link from 'next/link'
import { Fingerprint, Mail, Lock, Briefcase, Heart, Users, TrendingUp, type LucideIcon } from 'lucide-react'

type Feature = { Icon: LucideIcon; title: string; description: string }
type Service = { type: string; Icon: LucideIcon; title: string; desc: string; tag: string; accentColor: string; borderColor: string; tagColor: string }

const features: Feature[] = [
  { Icon: Fingerprint, title: 'Luận giải riêng cho bạn', description: 'Không có hai bản đồ sao nào giống nhau. Mỗi báo cáo được viết riêng dựa trên ngày, giờ và nơi sinh — không phải nhận xét chung chung theo cung hoàng đạo.' },
  { Icon: Mail, title: 'Nhận qua email, đọc mọi lúc', description: 'Báo cáo PDF được gửi thẳng vào hộp thư trong vài phút. Dài, chi tiết, dễ đọc — lưu lại để đọc đi đọc lại bất cứ lúc nào.' },
  { Icon: Lock, title: 'Riêng tư & bảo mật', description: 'Thông tin của bạn chỉ dùng để tính toán và viết báo cáo. Chúng tôi không chia sẻ dữ liệu với bên thứ ba, không hiển thị công khai.' },
]

const services: Service[] = [
  { type: 'career',   Icon: Briefcase,  title: 'Sự nghiệp & hướng nghiệp',   desc: 'Bạn sinh ra để làm gì? Điểm mạnh nào nên phát huy, nghề nào phù hợp, thời điểm nào thuận lợi để bứt phá.',          tag: 'Hướng nghiệp', accentColor: 'rgba(200,148,63,0.08)',  borderColor: 'rgba(200,148,63,0.22)', tagColor: '#c8943f' },
  { type: 'love',     Icon: Heart,      title: 'Tình duyên & hôn nhân',       desc: 'Bạn yêu như thế nào, cần gì trong mối quan hệ, người phù hợp là kiểu người nào và cách để tình yêu bền vững.',       tag: 'Tình duyên',   accentColor: 'rgba(185,77,112,0.08)',  borderColor: 'rgba(185,77,112,0.22)', tagColor: '#e87da0' },
  { type: 'synastry', Icon: Users,      title: 'Hai người hợp nhau đến đâu?', desc: 'So sánh bản đồ sao của hai người — điểm ăn ý, điểm ma sát, cách vượt qua bất đồng và xây dựng hạnh phúc.',           tag: 'Cặp đôi',      accentColor: 'rgba(120,77,186,0.08)',  borderColor: 'rgba(120,77,186,0.22)', tagColor: '#b08ce8' },
  { type: 'transit',  Icon: TrendingUp, title: 'Vận hạn sắp tới',             desc: 'Trong 12 tháng tới, lĩnh vực nào được hỗ trợ, lĩnh vực nào cần thận trọng? Biết trước để chuẩn bị tốt hơn.',           tag: 'Vận hạn',      accentColor: 'rgba(64,112,184,0.08)',  borderColor: 'rgba(64,112,184,0.22)', tagColor: '#78a8f0' },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="relative z-10 py-28 sm:py-36">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="text-center mb-20">
          <p className="section-eyebrow mb-5">Tại sao chọn chúng tôi</p>
          <h2 className="mb-6 leading-tight">
            <span
              className="block"
              style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontWeight: 700, fontSize: 'clamp(2rem, 5vw, 3.4rem)', letterSpacing: '0.04em', textTransform: 'uppercase' }}
            >
              Chiêm tinh đúng nghĩa —
            </span>
            {/* Italic decorative — Playfair uppercase */}
            <span
              className="block mt-2"
              style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', textTransform: 'uppercase', color: '#d9ab55' }}
            >
              không phải đọc cung hàng ngày
            </span>
          </h2>
          <div className="divider-ornament w-32 mx-auto mb-7">
            <span style={{ fontSize: '0.5rem' }}>✦</span>
          </div>
          <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '1.05rem', lineHeight: 1.9, maxWidth: '38rem', margin: '0 auto' }}>
            Một bản phân tích thực sự đi vào chiều sâu, giúp bạn hiểu mình hơn và đưa ra quyết định tốt hơn.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          {features.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="mb-5 flex items-center justify-center w-12 h-12 rounded-full" style={{ background: 'rgba(200,148,63,0.1)', border: '1px solid rgba(200,148,63,0.2)' }}>
                <f.Icon size={22} style={{ color: '#d9ab55' }} strokeWidth={1.5} />
              </div>
              <h3 className="mb-3 font-semibold" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.1rem', letterSpacing: '0.01em' }}>
                {f.title}
              </h3>
              <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', lineHeight: 1.85, fontSize: '1rem' }}>
                {f.description}
              </p>
            </div>
          ))}
        </div>

        {/* Services grid */}
        <div>
          <div className="text-center mb-14">
            <p className="section-eyebrow mb-4">Bốn góc nhìn chiêm tinh</p>
            <h2
              className="mb-3"
              style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: 'clamp(1.5rem, 4vw, 2.4rem)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}
            >
              Bạn muốn biết điều gì?
            </h2>
            <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '1rem' }}>
              Chọn một trong bốn góc nhìn chiêm tinh chuyên sâu dưới đây
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {services.map(s => (
              <Link
                key={s.tag}
                href="/services"
                className="service-card-link p-7"
                style={{ background: s.accentColor, border: `1px solid ${s.borderColor}` }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full" style={{ background: s.accentColor, border: `1px solid ${s.borderColor}` }}>
                    <s.Icon size={20} style={{ color: s.tagColor }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <span className="inline-block mb-2.5" style={{ color: s.tagColor, fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em' }}>
                      {s.tag}
                    </span>
                    <h3 className="font-semibold mb-2" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.25rem' }}>
                      {s.title}
                    </h3>
                    <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem', lineHeight: 1.85 }}>
                      {s.desc}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
