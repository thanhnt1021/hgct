import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Be_Vietnam_Pro, Fraunces } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'
import Providers from '@/components/Providers'

// Cinzel — local variable font. CHỈ dùng cho wordmark "ASTRO S" (thuần Latin).
// KHÔNG dùng cho tiếng Việt (Cinzel thiếu dấu). Xem DESIGN.md §4.
const cinzel = localFont({
  src: '../../public/fonts/Cinzel-VariableFont_wght.ttf',
  variable: '--font-cinzel',
  weight: '400 700',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-playfair',
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-fraunces',
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
  themeColor: '#F7ECD9',
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'AstroS — Bản đồ sao của bạn nói gì?',
  description: 'AstroS — Hạt Giống Chiêm Tinh, Khai Mở Chính Mình. Luận giải chiêm tinh cá nhân hóa về Sự Nghiệp, Tình Duyên, Mối Quan Hệ và Vận Hạn.',
  icons: { icon: '/favicon.ico' },
  metadataBase: new URL('https://hatgiongchiemtinh.com'),
  openGraph: {
    title: 'AstroS — Bản đồ sao của bạn nói gì?',
    description: 'AstroS — Hạt Giống Chiêm Tinh, Khai Mở Chính Mình. Luận giải chiêm tinh cá nhân hóa về Sự Nghiệp, Tình Duyên, Mối Quan Hệ và Vận Hạn.',
    url: 'https://hatgiongchiemtinh.com',
    siteName: 'AstroS',
    type: 'website',
    images: [{ url: 'https://hatgiongchiemtinh.com/api/og', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AstroS — Bản đồ sao của bạn nói gì?',
    description: 'AstroS — Hạt Giống Chiêm Tinh, Khai Mở Chính Mình. Luận giải chiêm tinh cá nhân hóa.',
    images: ['https://hatgiongchiemtinh.com/api/og'],
  },
}

// Inline script chạy synchronously khi browser parse HTML, trước React hydration.
// Gắn touchstart listener ngay lập tức → fix zoom ngay cả lần đầu load trang.
const mobileZoomFixScript = `(function(){var m=document.querySelector('meta[name="viewport"]');if(!m)return;var o=m.content,l=o.indexOf('maximum-scale')===-1?o+',maximum-scale=1':o.replace(/maximum-scale=[^,]*/,'maximum-scale=1');document.addEventListener('touchstart',function(e){var t=e.target&&e.target.tagName;if(t&&['INPUT','SELECT','TEXTAREA'].indexOf(t)>-1)m.content=l;},{passive:true});document.addEventListener('focusout',function(e){var t=e.target&&e.target.tagName;if(t&&['INPUT','SELECT','TEXTAREA'].indexOf(t)>-1)m.content=o;});})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontClasses = [
    cinzel.variable,
    playfair.variable,
    fraunces.variable,
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
          <div style={{ textAlign: 'center', padding: '5px 8px', fontSize: '0.68rem', background: 'var(--as-bg-warm)', borderBottom: '1px solid var(--as-border-soft)' }}>
            <a href="https://hatgiongchiemtinh.com/privacy" rel="privacy-policy" style={{ color: 'var(--as-text-muted)', fontFamily: 'sans-serif' }}>Chính sách bảo mật</a>
            <span style={{ color: 'var(--as-text-muted)', margin: '0 0.4rem' }}>·</span>
            <a href="https://hatgiongchiemtinh.com/terms" style={{ color: 'var(--as-text-muted)', fontFamily: 'sans-serif' }}>Điều khoản sử dụng</a>
          </div>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  )
}
