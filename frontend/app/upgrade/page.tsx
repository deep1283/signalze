"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { isTrialExpired } from "@/lib/client/billing"
import { PLAN_CONFIG, type PlanId } from "@/lib/plans"
import { ensureProfile, getValidSession, type SessionData } from "@/lib/supabase-lite"

const PLAN_ORDER: PlanId[] = ["starter_9", "growth_15"]
const SOURCES = ["Hacker News", "Dev.to", "GitHub Discussions"]

export default function UpgradePage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<SessionData | null>(null)

  useEffect(() => {
    async function bootstrap() {
      try {
        const validSession = await getValidSession()
        if (!validSession) {
          router.replace("/login")
          return
        }

        setSession(validSession)
        const profile = await ensureProfile(validSession)

        if (!profile.plan_selected_at) {
          router.replace("/pricing")
          return
        }

        if (!isTrialExpired(profile.billing_mode, profile.trial_ends_at)) {
          router.replace(profile.onboarding_completed ? "/dashboard" : "/onboarding")
          return
        }

        setReady(true)
      } catch {
        router.replace("/login")
      }
    }
    void bootstrap()
  }, [router])

  if (!ready) {
    return (
      <main className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-10">
        <div className="text-center">
          <h1 className="font-serif text-4xl text-foreground sm:text-5xl">Your trial has ended</h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            Upgrade now to continue tracking mentions and receiving Slack alerts.
          </p>
        </div>

        <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
          {PLAN_ORDER.map((planId) => {
            const plan = PLAN_CONFIG[planId]
            const isPopular = planId === "growth_15"
            const ctaHref = session ? `/api/dodo/checkout?plan=${plan.id}&billing=paid` : "/login"

            return (
              <article
                key={plan.id}
                className={`relative flex flex-col gap-6 rounded-2xl border bg-card p-6 sm:p-8 ${
                  isPopular ? "border-primary" : "border-border"
                }`}
              >
                {isPopular ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                    Most popular
                  </span>
                ) : null}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{plan.name}</p>
                  <p className="mt-2 text-4xl font-semibold text-foreground">{plan.price}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <ul className="flex flex-col gap-2 text-sm text-foreground">
                  <li>✓ {plan.maxBrands === null ? "Multiple brands" : `${plan.maxBrands} brand`}</li>
                  <li>✓ {plan.maxKeywords} keywords</li>
                  {SOURCES.map((s) => (
                    <li key={s}>✓ {s}</li>
                  ))}
                  <li>✓ Slack notifications</li>
                </ul>

                <Link
                  href={ctaHref}
                  className={`inline-flex h-11 items-center justify-center rounded-lg px-6 text-sm font-medium transition-colors ${
                    isPopular ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border text-foreground hover:bg-secondary"
                  }`}
                >
                  Upgrade now
                </Link>
              </article>
            )
          })}
        </div>
      </div>
    </main>
  )
}
