// VISUAL ONLY — features/services section, Celestial Sanctum design (Server Component)

import { Facebook, Youtube, type LucideIcon } from 'lucide-react'
import ServicesGrid from './ServicesGrid'

type Social = { Icon?: LucideIcon; IconSvg?: React.ReactNode; title: string; href: string; description: string; color: string }

// TikTok inline SVG (lucide doesn't ship a tiktok icon)
const TikTokIcon = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8.5a8.5 8.5 0 0 1-5-1.6V16a6 6 0 1 1-6-6c.34 0 .67.03 1 .08v3.18a3 3 0 1 0 2 2.82V2h3a5.5 5.5 0 0 0 5 5.5v1z" />
  </svg>
)

const socials: Social[] = [
  { Icon: Facebook, title: 'Facebook', href: 'https://www.facebook.com/hatgiongchiemtinh', description: 'Theo dõi câu chuyện chiêm tinh hàng ngày, mẹo đọc bản đồ sao và lịch sự kiện.', color: '#1877f2' },
  { IconSvg: TikTokIcon, title: 'TikTok', href: 'https://www.tiktok.com/@hatgiongchiemtinh', description: 'Video ngắn về 12 cung hoàng đạo, luận giải nhanh & vận hạn theo tuần.', color: '#69c9d0' },
  { Icon: Youtube, title: 'YouTube', href: 'https://www.youtube.com/@hatgiongchiemtinh', description: 'Buổi học chiêm tinh chiều sâu — podcast, workshop và phân tích case thật.', color: '#ff0000' },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="relative z-10 py-28 sm:py-36">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Services grid — moved to top, 4 cục cha */}
        <div className="mb-32">
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

          <ServicesGrid />
        </div>

        {/* Section header — AstroS */}
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

        {/* Social cards (replaces old 3 feature cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {socials.map((s, i) => (
            <a
              key={i}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="feature-card block"
            >
              <div className="mb-5 flex items-center justify-center w-12 h-12 rounded-full" style={{ background: 'rgba(200,148,63,0.1)', border: '1px solid rgba(200,148,63,0.2)' }}>
                {s.Icon ? <s.Icon size={22} style={{ color: s.color }} strokeWidth={1.5} /> : <span style={{ color: s.color }}>{s.IconSvg}</span>}
              </div>
              <h3 className="mb-3 font-semibold" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.1rem', letterSpacing: '0.01em' }}>
                {s.title}
              </h3>
              <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', lineHeight: 1.85, fontSize: '1rem' }}>
                {s.description}
              </p>
            </a>
          ))}
        </div>

      </div>
    </section>
  )
}
