import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Be_Vietnam_Pro, Cinzel } from 'next/font/google'
import './globals.css'
import Providers from '@/components/Providers'

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  weight: ['400', '700'],
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-playfair',
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-vietnam',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#06060f',
}

export const metadata: Metadata = {
  title: 'Hạt Giống Chiêm Tinh — Bản đồ sao của bạn nói gì?',
  description: 'Luận giải chiêm tinh cá nhân hóa về Sự Nghiệp, Tình Duyên, Cặp Đôi và Vận Hạn. Báo cáo PDF chi tiết gửi qua email trong vài phút.',
  icons: { icon: '/favicon.ico' },
  metadataBase: new URL('https://hatgiongchiemtinh.com'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontClasses = [
    cinzel.variable,
    playfair.variable,
    beVietnamPro.variable,
  ].join(' ')

  return (
    <html lang="vi" className={`${fontClasses} dark`}>
      <body className="font-sans antialiased">
        <Providers>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  )
}
