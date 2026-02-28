"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { PLAN_CONFIG, type PlanId } from "@/lib/plans"
import {
  ensureProfile,
  getValidSession,
  listBrands,
  listKeywords,
  syncTrackingSetup,
  type BillingMode,
  type SessionData,
} from "@/lib/supabase-lite"

function cleanInput(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

export default function OnboardingPage() {
  const router = useRouter()

  const [session, setSession] = useState<SessionData | null>(null)
  const [planId, setPlanId] = useState<PlanId>("starter_9")
  const [billing, setBilling] = useState<BillingMode>("trial")

  const [brandInput, setBrandInput] = useState("")
  const [keywordInput, setKeywordInput] = useState("")
  const [brands, setBrands] = useState<string[]>([])
  const [keywords, setKeywords] = useState<string[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const plan = PLAN_CONFIG[planId]

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
        if (!profile?.plan_selected_at) {
          router.replace("/pricing")
          return
        }

        setPlanId(profile.plan_tier)
        setBilling(profile.billing_mode ?? "trial")

        const [existingBrands, existingKeywords] = await Promise.all([listBrands(validSession), listKeywords(validSession)])
        setBrands(existingBrands.map((item) => item.name))
        setKeywords(existingKeywords.map((item) => item.query))

        if (profile.onboarding_completed) {
          router.replace("/dashboard")
          return
        }
      } catch (bootstrapError) {
        setError(bootstrapError instanceof Error ? bootstrapError.message : "Failed to load onboarding")
      } finally {
        setIsLoading(false)
      }
    }

    void bootstrap()
  }, [router])

  const hasRequiredData = useMemo(() => brands.length > 0 && keywords.length > 0, [brands.length, keywords.length])

  function addBrand() {
    setError(null)
    const normalized = cleanInput(brandInput)
    if (!normalized) {
      return
    }

    if (brands.some((brand) => brand.toLowerCase() === normalized.toLowerCase())) {
      setBrandInput("")
      return
    }

    setBrands((current) => [...current, normalized])
    setBrandInput("")
  }

  function addKeyword() {
    setError(null)
    const normalized = cleanInput(keywordInput)
    if (!normalized) {
      return
    }

    if (keywords.some((keyword) => keyword.toLowerCase() === normalized.toLowerCase())) {
      setKeywordInput("")
      return
    }

    setKeywords((current) => [...current, normalized])
    setKeywordInput("")
  }

  function removeBrand(brand: string) {
    setBrands((current) => current.filter((item) => item !== brand))
  }

  function removeKeyword(keyword: string) {
    setKeywords((current) => current.filter((item) => item !== keyword))
  }

  async function continueToDashboard() {
    setError(null)

    if (!session) {
      router.replace("/login")
      return
    }

    if (!hasRequiredData) {
      setError("Please add at least one brand and one keyword to continue.")
      return
    }

    setIsSubmitting(true)

    try {
      await syncTrackingSetup(session, brands, keywords)
      router.push("/dashboard")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save onboarding")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 sm:px-6 md:py-12">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading onboarding...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 md:py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <p className="text-sm text-muted-foreground">Step 3 of 4</p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">Onboarding</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your brand and niche keywords. Then we&apos;ll redirect you to the dashboard.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Brands to track</h2>
              <span className="text-xs text-muted-foreground">
                {brands.length}/{plan.maxBrands ?? "∞"}
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={brandInput}
                onChange={(event) => setBrandInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    addBrand()
                  }
                }}
                placeholder="e.g. Signalze"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              />
              <button
                onClick={addBrand}
                className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {brands.map((brand) => (
                <button
                  key={brand}
                  onClick={() => removeBrand(brand)}
                  className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                >
                  {brand} ×
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Keywords to track</h2>
              <span className="text-xs text-muted-foreground">
                {keywords.length}/{plan.maxKeywords}
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    addKeyword()
                  }
                }}
                placeholder="e.g. social listening"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              />
              <button
                onClick={addKeyword}
                className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {keywords.map((keyword) => (
                <button
                  key={keyword}
                  onClick={() => removeKeyword(keyword)}
                  className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
                >
                  {keyword} ×
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <p className="text-sm text-muted-foreground">
            Plan: <span className="font-medium text-foreground">{plan.name}</span> ({plan.price})
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Billing: <span className="font-medium text-foreground">{billing === "trial" ? `${plan.trialDays}-day free trial` : "Paid from day 1"}</span>
          </p>

          {error ? <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

          <button
            onClick={() => void continueToDashboard()}
            disabled={isSubmitting}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-accent px-5 text-sm font-semibold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Saving..." : "Continue to dashboard"}
          </button>
        </section>
      </div>
    </main>
  )
}
