import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import AstroHero from '@/components/home/AstroHero'
import AstroInputForm from '@/components/home/AstroInputForm'
import AstroExplore from '@/components/home/AstroExplore'
import AstroSeedSocial from '@/components/home/AstroSeedSocial'
import FloatingButtons from '@/components/home/FloatingButtons'

export const dynamic = 'force-dynamic'

// Trang chủ AstroS (redesign — tông sáng).
// S1 Navbar · S2 Hero (auto-slide + vòng hoàng đạo) · S3 Lập lá số + Khám Phá · S4 Seed + Social · Footer.
export default function HomePage() {
  return (
    <main className="relative min-h-screen" style={{ background: 'linear-gradient(180deg, #e3c89a 0%, #edd5b1 50%, #e3c89a 100%)' }}>
      <Navbar />
      <AstroHero />
      <AstroInputForm />
      <AstroExplore />
      <AstroSeedSocial />
      <Footer />
      <FloatingButtons />
    </main>
  )
}
