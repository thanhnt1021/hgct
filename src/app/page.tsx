import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import StarField from '@/components/layout/StarField'
import HeroSection from '@/components/home/HeroSection'
import FeaturesSection from '@/components/home/FeaturesSection'
import ProcessSection from '@/components/home/ProcessSection'
import CTASection from '@/components/home/CTASection'
import FloatingButtons from '@/components/home/FloatingButtons'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const rows = await prisma.config.findMany({
    where: { key: { in: ['hero_subtitle', 'hero_cta_text', 'cta_body', 'cta_button_text'] } },
  }).catch(() => [])
  const cfg = Object.fromEntries(rows.map((r) => [r.key, r.value]))

  return (
    <main className="relative min-h-screen">
      <StarField />
      <Navbar />
      <HeroSection subtitle={cfg.hero_subtitle} ctaText={cfg.hero_cta_text} />
      <FeaturesSection />
      <ProcessSection />
      <CTASection body={cfg.cta_body} buttonText={cfg.cta_button_text} />
      <Footer />
      <FloatingButtons />
    </main>
  )
}
