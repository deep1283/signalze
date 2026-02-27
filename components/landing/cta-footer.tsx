import { ArrowRight } from "lucide-react"
import Link from "next/link"

export function CTAFooter() {
  return (
    <>
      <section className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl bg-primary px-8 py-16 text-center md:px-16">
            <h2 className="font-serif text-4xl text-primary-foreground md:text-5xl text-balance">
              Start tracking your brand today
            </h2>
            <p className="mx-auto mt-4 max-w-md text-primary-foreground/80">
              Join hundreds of teams using Mention to stay on top of every Hacker News and Reddit conversation about their brand.
            </p>
            <a
              href="#"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3.5 text-sm font-semibold text-accent-foreground transition-all hover:brightness-95"
            >
              Get started for free <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
          <Link href="/" className="font-serif text-xl text-foreground">
            mention
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              FAQ
            </Link>
            <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Terms
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Mention. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  )
}
