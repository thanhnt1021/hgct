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
  { type: 'career',   Icon: Briefcase,  title: 'Sự nghiệp & Tiền bạc',     desc: 'Bạn đang loay hoay trong việc lựa chọn ngành nghề phù hợp?\nBạn cảm thấy mắc kẹt trong công việc hiện tại, mông lung về tương lai hoặc nỗ lực rất nhiều nhưng tài chính vẫn không khởi sắc?\nBạn tự hỏi liệu mình có đang đi đúng đường?',                                                                              tag: 'Hướng đi',   accentColor: 'rgba(200,148,63,0.08)',  borderColor: 'rgba(200,148,63,0.22)', tagColor: '#c8943f' },
  { type: 'love',     Icon: Heart,      title: 'Tình yêu & hôn nhân',       desc: 'Bạn mệt mỏi với những mối quan hệ "chẳng đi đến đâu", kịch bản "đổ vỡ" lặp đi lặp lại, cảm giác cô đơn kéo dài khiến bạn bắt đầu nghi ngờ bản thân?\nBạn hoài nghi về cách mình yêu, cách mình xây dựng mối quan hệ?\nBạn muốn tìm ra kiểu người phù hợp – nơi là bến đỗ bình yên dành cho bạn?',        tag: 'Phong cách',   accentColor: 'rgba(185,77,112,0.08)',  borderColor: 'rgba(185,77,112,0.22)', tagColor: '#e87da0' },
  { type: 'synastry', Icon: Users,      title: 'Bản đồ sao cặp đôi',        desc: 'Những tranh cãi bế tắc, im lặng lạnh lùng hay cảm giác không được thấu hiểu đang khiến mối quan hệ của bạn đứng bên bờ vực?\nBạn sợ "chọn sai người" hay "đi sai hướng" và đây chính là rào cản khiến bạn không cảm thấy hạnh phúc?\nBạn cần biết những điều cần cải thiện từ cả hai để mối quan hệ tốt đẹp hơn?', tag: 'Đồng hành', accentColor: 'rgba(120,77,186,0.08)',  borderColor: 'rgba(120,77,186,0.22)', tagColor: '#b08ce8' },
  { type: 'transit',  Icon: TrendingUp, title: 'Vận hạn sắp tới',           desc: 'Thời gian này bạn không biết khi nào là lúc nên tiến lên, khi nào nên lùi lại?\nBạn lo sợ những biến cố bất ngờ hoặc khó ra quyết định trước những thay đổi lớn của cuộc sống?',                                                                                                                               tag: 'Chuẩn bị',    accentColor: 'rgba(64,112,184,0.08)',  borderColor: 'rgba(64,112,184,0.22)', tagColor: '#78a8f0' },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="relative z-10 py-28 sm:py-36">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="text-center mb-20 flex flex-col items-center">
          <p className="section-eyebrow mb-4">Tại sao lựa chọn chúng tôi?</p>
          <h2 className="mb-6 leading-tight flex flex-col items-center">
            <span className="block font-vietnam font-bold text-[clamp(1.3rem,5.5vw,2rem)] sm:text-[clamp(2rem,5vw,3.4rem)] uppercase tracking-[0.04em] text-lunar-bright leading-tight whitespace-nowrap">
              Hạt giống chiêm tinh
            </span>
            <span className="block mt-2 font-playfair italic text-[clamp(1.1rem,4vw,2.5rem)] sm:text-[clamp(1.5rem,4vw,2.5rem)] uppercase text-gold-warm text-center">
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
            <p className="section-eyebrow mb-4">Thời điểm hiện tại</p>
            <h2
              className="mb-3"
              style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: 'clamp(1.5rem, 4vw, 2.4rem)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}
            >
              Bạn đang gặp vấn đề gì cần tháo gỡ?
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
                    <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem', lineHeight: 1.85, whiteSpace: 'pre-line' }}>
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
