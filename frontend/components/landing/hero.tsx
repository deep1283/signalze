import Image from "next/image"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-16 md:pt-24 md:pb-32">
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <h1 className="font-serif text-5xl leading-tight text-foreground md:text-6xl lg:text-7xl text-balance">
            Your brand, tracked everywhere
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
            Never miss a mention on Hacker News, Dev.to, or GitHub Discussions. Get real-time alerts and actionable insights.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-all hover:brightness-95"
            >
              Start tracking for free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <div className="flex -space-x-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 border-2 border-background" />
              <div className="h-8 w-8 rounded-full bg-accent/60 border-2 border-background" />
              <div className="h-8 w-8 rounded-full bg-primary/30 border-2 border-background" />
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">500+</span> brands already tracking
            </p>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          {/* Decorative 3D platform */}
          <div className="absolute bottom-0 h-16 w-64 rounded-full bg-secondary/80 blur-sm" />
          <div className="relative z-10">
            <Image
              src="/images/hero-phone.jpg"
              alt="Mention app dashboard showing brand mentions from Hacker News, Dev.to, and GitHub Discussions"
              width={380}
              height={600}
              className="rounded-3xl shadow-2xl"
              priority
            />
            {/* Floating pills */}
            <div className="absolute -right-4 top-12 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-card-foreground shadow-lg md:-right-16">
              Real-time alerts
            </div>
            <div className="absolute -left-4 bottom-40 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-card-foreground shadow-lg md:-left-12">
              Sentiment analysis
            </div>
            <div className="absolute -right-2 bottom-20 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-card-foreground shadow-lg md:-right-10">
              HN + Dev.to + GitHub
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
