"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { PLAN_CONFIG, type PlanId } from "@/lib/plans"
import { ensureProfile, getValidSession, type SessionData } from "@/lib/supabase-lite"

const PLAN_ORDER: PlanId[] = ["starter_9", "growth_15"]

const SOURCES = ["Hacker News", "Dev.to", "GitHub Discussions"]

type PageState = "loading" | "public" | "choose_plan"

export default function PricingPage() {
  const router = useRouter()

  const [pageState, setPageState] = useState<PageState>("loading")
  const [session, setSession] = useState<SessionData | null>(null)
  const [isChoosing, setIsChoosing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function bootstrap() {
      try {
        const validSession = await getValidSession()

        if (!validSession) {
          setPageState("public")
          return
        }

        setSession(validSession)
        const profile = await ensureProfile(validSession)

        // Already has a plan selected — send to the right place
        if (profile?.plan_selected_at) {
          if (!profile.onboarding_completed) {
            router.replace("/onboarding")
          } else {
            router.replace("/dashboard")
          }
          return
        }

        // Logged in, no plan yet — show the plan chooser
        setPageState("choose_plan")
      } catch {
        // On any error fall back to public view
        setPageState("public")
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
      window.location.href = `/api/dodo/checkout?plan=${planId}&billing=${mode}`
    } catch (chooseError) {
      setError(chooseError instanceof Error ? chooseError.message : "Failed to select plan")
      setIsChoosing(false)
    }
  }

  if (pageState === "loading") {
    return (
      <main className="min-h-screen bg-background px-4 py-8 sm:px-6 md:py-12">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading...
        </div>
      </main>
    )
  }

  // ─── Public view (not logged in) ───────────────────────────────────────────
  if (pageState === "public") {
    return (
      <main className="min-h-screen bg-background px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-10">
          <div className="text-center">
            <h1 className="font-serif text-4xl text-foreground sm:text-5xl">Simple, honest pricing</h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground">
              Track mentions of your brand across Hacker News, Dev.to, and GitHub Discussions.
              Start with a free trial — no credit card required.
            </p>
          </div>

          <div className="grid w-full gap-4 sm:grid-cols-2 max-w-3xl">
            {PLAN_ORDER.map((planId) => {
              const plan = PLAN_CONFIG[planId]
              const isPopular = planId === "growth_15"
              return (
                <article
                  key={plan.id}
                  className={`relative rounded-2xl border bg-card p-6 sm:p-8 flex flex-col gap-6 ${isPopular ? "border-primary" : "border-border"}`}
                >
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                      Most popular
                    </span>
                  )}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{plan.name}</p>
                    <p className="mt-2 text-4xl font-semibold text-foreground">{plan.price}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                  </div>

                  <ul className="flex flex-col gap-2 text-sm text-foreground">
                    <li>✓ {plan.maxBrands === null ? "Multiple brands" : `${plan.maxBrands} brand`}</li>
                    <li>✓ {plan.maxKeywords} keywords</li>
                    <li>✓ {plan.trialDays}-day free trial</li>
                    {SOURCES.map((s) => (
                      <li key={s}>✓ {s}</li>
                    ))}
                    <li>✓ Slack notifications</li>
                  </ul>

                  <Link
                    href="/login"
                    className={`inline-flex h-11 items-center justify-center rounded-lg px-6 text-sm font-medium transition-colors ${
                      isPopular
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border border-border text-foreground hover:bg-secondary"
                    }`}
                  >
                    Start {plan.trialDays}-day free trial
                  </Link>
                </article>
              )
            })}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-foreground hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </main>
    )
  }

  // ─── Authed view — plan chooser (step 2 of onboarding) ────────────────────
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
                  <li>Mentions: Hacker News, Dev.to, GitHub Discussions</li>
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
