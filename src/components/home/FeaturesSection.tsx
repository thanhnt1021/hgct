// VISUAL ONLY — features/services section, Celestial Sanctum design (Server Component)

import Link from 'next/link'
import { Fingerprint, Mail, Lock, Briefcase, Heart, Users, TrendingUp, type LucideIcon } from 'lucide-react'

type Feature = { Icon: LucideIcon; title: string; description: string }
type Service = { type: string; Icon: LucideIcon; title: string; desc: string; tag: string; accentColor: string; borderColor: string; tagColor: string }

const features: Feature[] = [
  { Icon: Fingerprint, title: 'Luận giải cá nhân hóa', description: 'Phân tích bản đồ sao được viết riêng cho bạn, dựa trên ngày – giờ – nơi sinh, giúp bạn hiểu rõ tính cách, tiềm năng và hướng đi của mình.' },
  { Icon: Mail, title: 'Nhận qua email, đọc mọi lúc', description: 'Bản luận giải PDF được gửi thẳng vào email trong vài phút. Chi tiết, gần gũi – lưu lại để đọc đi đọc lại bất cứ lúc nào.' },
  { Icon: Lock, title: 'Kết nối với chuyên gia', description: 'Có thể đặt lịch coaching 1:1 để được giải đáp sâu hơn và hiểu rõ bản đồ sao của mình.' },
]

const services: Service[] = [
  { type: 'career',   Icon: Briefcase,  title: 'Sự nghiệp & Tiền bạc',     desc: 'Hiểu rõ điểm mạnh của bản thân, định hướng nghề nghiệp phù hợp và những lĩnh vực tài chính thuận lợi để phát triển.',                                                                                  tag: 'Xác định đúng hướng đi',   accentColor: 'rgba(200,148,63,0.08)',  borderColor: 'rgba(200,148,63,0.22)', tagColor: '#c8943f' },
  { type: 'love',     Icon: Heart,      title: 'Tình yêu & hôn nhân',       desc: 'Bạn yêu theo cách nào? Vì sao các mối quan hệ thường lặp lại một mô thức? Kiểu người phù hợp và cách xây dựng một mối quan hệ bền chặt.',                                                                   tag: 'Hiểu rõ phong cách yêu',   accentColor: 'rgba(185,77,112,0.08)',  borderColor: 'rgba(185,77,112,0.22)', tagColor: '#e87da0' },
  { type: 'synastry', Icon: Users,      title: 'Bản đồ sao cặp đôi',        desc: 'Khám phá lý do hai người gặp nhau, những điểm đồng điệu và khác biệt trong mối quan hệ, cùng chìa khóa để xây dựng một mối quan hệ hạnh phúc và phát triển.',                                               tag: 'Thương yêu để đồng hành', accentColor: 'rgba(120,77,186,0.08)',  borderColor: 'rgba(120,77,186,0.22)', tagColor: '#b08ce8' },
  { type: 'transit',  Icon: TrendingUp, title: 'Vận hạn sắp tới',           desc: 'Nhìn trước những xu hướng trong thời gian tới, lĩnh vực thuận lợi để phát triển và những điều cần lưu ý để chủ động chuẩn bị tốt hơn cho các quyết định quan trọng.',                                       tag: 'Chuẩn bị để sẵn sàng',    accentColor: 'rgba(64,112,184,0.08)',  borderColor: 'rgba(64,112,184,0.22)', tagColor: '#78a8f0' },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="relative z-10 py-28 sm:py-36">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="text-center mb-20 flex flex-col items-center">
          <p className="section-eyebrow mb-4">Tại sao lựa chọn chúng tôi?</p>
          <h2 className="mb-6 leading-tight flex flex-col items-center">
            <span
              className="block"
              style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontWeight: 700, fontSize: 'clamp(2rem, 5vw, 3.4rem)', letterSpacing: '0.04em', textTransform: 'uppercase' }}
            >
              Hạt giống chiêm tinh
            </span>
            <span
              className="block mt-2"
              style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', textTransform: 'uppercase', color: '#d9ab55' }}
            >
              hiểu mình - đánh thức - phát triển
            </span>
          </h2>
          <div className="divider-ornament w-32 mx-auto mb-7">
            <span style={{ fontSize: '0.5rem' }}>✦</span>
          </div>
          <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '1.05rem', lineHeight: 1.9, maxWidth: '48rem', margin: '0 auto', textAlign: 'center' }}>
            Một bản phân tích thực sự đi vào chiều sâu. Không phải những luận giải chung chung, mà là phân tích bản đồ sao chi tiết, cá nhân hoá giúp bạn hiểu rõ bản thân mình. Để từ đó chọn đúng nghề, yêu đúng người và sống đúng hướng. Trải nghiệm đơn giản, nhanh chóng và luôn đảm bảo bảo mật thông tin.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-32">
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
                href={`/services?type=${s.type}`}
                className="service-card-link p-7"
                style={{ background: s.accentColor, border: `1px solid ${s.borderColor}` }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full" style={{ background: 'rgba(6,6,15,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <s.Icon size={20} style={{ color: s.tagColor }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <span className="inline-block mb-2.5" style={{ color: s.tagColor, fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
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
