import type { Metadata } from 'next'
import StarField from '@/components/layout/StarField'

export const metadata: Metadata = {
  title: 'Coming Soon — Hạt Giống Chiêm Tinh',
  robots: { index: false, follow: false },
}

export default function ComingSoonPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center">
      <StarField />
      <div className="relative z-10 text-center px-6 max-w-2xl">
        <h1 className="font-playfair italic text-5xl md:text-7xl text-gold-base mb-6">
          Xin chào
        </h1>
        <p className="font-vietnam text-base md:text-lg text-white/70 leading-relaxed mb-8">
          Chúng tôi đang chuẩn bị nội dung cho trang này.
          <br />
          Quay lại sau nhé!
        </p>
        <a
          href="https://hatgiongchiemtinh.com"
          className="inline-block font-vietnam text-sm text-gold-base/90 hover:text-gold-base underline underline-offset-4 transition"
        >
          Về Hạt Giống Chiêm Tinh →
        </a>
      </div>
    </main>
  )
}
