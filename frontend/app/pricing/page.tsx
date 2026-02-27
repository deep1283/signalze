"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { PLAN_CONFIG, type PlanId } from "@/lib/plans"
import { ensureProfile, getValidSession, type SessionData } from "@/lib/supabase-lite"

const PLAN_ORDER: PlanId[] = ["starter_9", "growth_15"]

export default function PricingPage() {
  const router = useRouter()

  const [session, setSession] = useState<SessionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isChoosing, setIsChoosing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        if (profile?.plan_selected_at && !profile.onboarding_completed) {
          router.replace("/onboarding")
          return
        }
        if (profile?.plan_selected_at && profile.onboarding_completed) {
          router.replace("/dashboard")
          return
        }
      } catch (bootstrapError) {
        setError(bootstrapError instanceof Error ? bootstrapError.message : "Failed to load pricing")
      } finally {
        setIsLoading(false)
      }
    }

    void bootstrap()
  }, [router])

  async function choosePlan(planId: PlanId, mode: "trial" | "paid") {
    if (!session) {
      router.replace("/login")
      return
    }

    setError(null)
    setIsChoosing(true)

    try {
      if (mode === "paid") {
        window.location.href = `/api/dodo/checkout?plan=${planId}&billing=paid`
      } else {
        window.location.href = `/api/dodo/checkout?plan=${planId}&billing=trial`
      }
    } catch (chooseError) {
      setError(chooseError instanceof Error ? chooseError.message : "Failed to select plan")
    } finally {
      setIsChoosing(false)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 sm:px-6 md:py-12">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading pricing...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 md:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-2xl border border-border bg-card p-5 sm:p-7">
          <p className="text-sm text-muted-foreground">Step 2 of 4</p>
          <h1 className="mt-1 font-serif text-3xl text-foreground sm:text-4xl">Choose your tracking plan</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            You only select this once. Existing trial or paid users will skip this page on future logins.
          </p>

          {error ? <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {PLAN_ORDER.map((planId) => {
            const plan = PLAN_CONFIG[planId]
            return (
              <article key={plan.id} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{plan.name}</p>
                <h2 className="mt-2 text-3xl font-semibold text-foreground">{plan.price}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>

                <ul className="mt-4 space-y-2 text-sm text-foreground">
                  <li>Brands: {plan.maxBrands === null ? "Multiple" : plan.maxBrands}</li>
                  <li>Keywords: {plan.maxKeywords}</li>
                  <li>Free trial: {plan.trialDays} days</li>
                  <li>Mentions: Reddit, Hacker News, Dev.to</li>
                  <li>Notifications: Dashboard + Slack</li>
                </ul>

                <div className="mt-6 flex flex-col gap-2">
                  <button
                    onClick={() => void choosePlan(plan.id, "trial")}
                    disabled={isChoosing}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Start {plan.trialDays}-day free trial
                  </button>

                  <button
                    onClick={() => void choosePlan(plan.id, "paid")}
                    disabled={isChoosing}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Upgrade from day 1 (Dodo)
                  </button>
                </div>
              </article>
            )
          })}
        </section>

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Already selected your plan?</p>
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </main>
  )
}
