"use client"

import { ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pb-16 pt-12 sm:px-6 md:pb-28 md:pt-20">
      <div className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-36 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />

      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-12">
        <div className="flex flex-col gap-6">
          <div className="inline-flex w-fit items-center rounded-full border border-border/80 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            AI mention monitoring for fast-moving teams
          </div>
          <h1 className="font-serif text-4xl leading-tight text-balance text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            Your brand, tracked everywhere
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
            Never miss a mention on Hacker News, Dev.to, or GitHub Discussions. Catch spikes in minutes and route the right responses to your team.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-all hover:brightness-95"
            >
              Start tracking for free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-border bg-card/60 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-card"
            >
              See live dashboard
            </Link>
          </div>

          <div className="grid max-w-md grid-cols-2 gap-3 pt-2">
            <div className="rounded-2xl border border-border/70 bg-card/80 px-4 py-3 backdrop-blur">
              <p className="text-xs text-muted-foreground">Monitored sources</p>
              <p className="text-lg font-semibold text-foreground">3 core channels</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card/80 px-4 py-3 backdrop-blur">
              <p className="text-xs text-muted-foreground">Existing customers</p>
              <p className="text-lg font-semibold text-foreground">500+ brands</p>
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-center md:justify-end">
          <div className="relative z-10 w-full max-w-[560px]">
            <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/70 p-2 shadow-[0_35px_80px_-35px_rgba(34,43,22,0.35)] backdrop-blur">
              <Image
                src="/images/hero-phone-static.svg"
                alt="Mobile app preview with quick setup, GDPR compliance, and content rules callouts"
                width={1200}
                height={1000}
                priority
                className="h-auto w-full rounded-[1.5rem]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
