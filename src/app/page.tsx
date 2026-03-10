import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import StarField from '@/components/layout/StarField'
import HeroSection from '@/components/home/HeroSection'
import FeaturesSection from '@/components/home/FeaturesSection'
import ProcessSection from '@/components/home/ProcessSection'
import CTASection from '@/components/home/CTASection'
import FloatingButtons from '@/components/home/FloatingButtons'

export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      <StarField />
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <ProcessSection />
      <CTASection />
      <Footer />
      <FloatingButtons />
    </main>
  )
}
