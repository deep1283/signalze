import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { HowItWorks } from "@/components/landing/how-it-works"
import { Platforms } from "@/components/landing/platforms"
import { Features } from "@/components/landing/features"
import { UseCases } from "@/components/landing/use-cases"
import { Testimonials } from "@/components/landing/testimonials"
import { CTAFooter } from "@/components/landing/cta-footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Platforms />
      <Features />
      <UseCases />
      <Testimonials />
      <CTAFooter />
    </main>
  )
}
