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
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'Hạt Giống Chiêm Tinh — Bản đồ sao của bạn nói gì?',
  description: 'Luận giải chiêm tinh cá nhân hóa về Sự Nghiệp, Tình Duyên, Cặp Đôi và Vận Hạn. Báo cáo PDF chi tiết gửi qua email trong vài phút.',
  icons: { icon: '/favicon.ico' },
  metadataBase: new URL('https://hatgiongchiemtinh.com'),
}

// Inline script chạy synchronously khi browser parse HTML, trước React hydration.
// Gắn touchstart listener ngay lập tức → fix zoom ngay cả lần đầu load trang.
const mobileZoomFixScript = `(function(){var m=document.querySelector('meta[name="viewport"]');if(!m)return;var o=m.content,l=o.indexOf('maximum-scale')===-1?o+',maximum-scale=1':o.replace(/maximum-scale=[^,]*/,'maximum-scale=1');document.addEventListener('touchstart',function(e){var t=e.target&&e.target.tagName;if(t&&['INPUT','SELECT','TEXTAREA'].indexOf(t)>-1)m.content=l;},{passive:true});document.addEventListener('focusout',function(e){var t=e.target&&e.target.tagName;if(t&&['INPUT','SELECT','TEXTAREA'].indexOf(t)>-1)m.content=o;});})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontClasses = [
    cinzel.variable,
    playfair.variable,
    beVietnamPro.variable,
  ].join(' ')

  return (
    <html lang="vi" className={`${fontClasses} dark`}>
      <head>
        <link rel="privacy-policy" href="https://hatgiongchiemtinh.com/privacy" />
        <script dangerouslySetInnerHTML={{ __html: mobileZoomFixScript }} />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          <div style={{ textAlign: 'center', padding: '5px 8px', fontSize: '0.68rem', background: '#06060f', borderBottom: '1px solid rgba(201,168,76,0.06)' }}>
            <a href="https://hatgiongchiemtinh.com/privacy" rel="privacy-policy" style={{ color: '#6b6585', fontFamily: 'sans-serif' }}>Chính sách bảo mật</a>
            <span style={{ color: '#3a3555', margin: '0 0.4rem' }}>·</span>
            <a href="https://hatgiongchiemtinh.com/terms" style={{ color: '#6b6585', fontFamily: 'sans-serif' }}>Điều khoản sử dụng</a>
          </div>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  )
}
