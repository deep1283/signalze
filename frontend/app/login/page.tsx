"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, Suspense, useEffect, useState } from "react"

import { isTrialExpired } from "@/lib/client/billing"
import { isPlanId } from "@/lib/plans"
import { ensureProfile, getValidSession, signInWithPassword, signUpWithPassword } from "@/lib/supabase-lite"

type AuthMode = "signin" | "signup"

type StartTrialResponse = {
  nextRoute?: string
}

async function startTrial(planId: string): Promise<StartTrialResponse> {
  const response = await fetch("/api/billing/start-trial", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plan: planId }),
  })

  const payload = (await response.json().catch(() => null)) as { error?: string; nextRoute?: string } | null
  if (!response.ok) {
    throw new Error(payload?.error ?? "Unable to start free trial.")
  }

  return { nextRoute: payload?.nextRoute }
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const planParam = searchParams.get("plan")
  const isCheckoutReturn = searchParams.get("checkout") === "return"
  const preSelectedPlan = !isCheckoutReturn && isPlanId(planParam) ? planParam : null

  const [mode, setMode] = useState<AuthMode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function bootstrap() {
      try {
        const session = await getValidSession()
        if (!session) {
          return
        }

        const profile = await ensureProfile(session)
        if (!profile.plan_selected_at && preSelectedPlan) {
          await startTrial(preSelectedPlan)
          router.replace("/onboarding")
          return
        }

        if (!profile.plan_selected_at) {
          router.replace("/pricing")
          return
        }

        if (isTrialExpired(profile.billing_mode, profile.trial_ends_at)) {
          router.replace("/upgrade")
          return
        }

        router.replace(profile.onboarding_completed ? "/dashboard" : "/onboarding")
      } catch (bootstrapError) {
        setError(bootstrapError instanceof Error ? bootstrapError.message : "Unable to continue.")
      } finally {
        setIsCheckingSession(false)
      }
    }

    void bootstrap()
  }, [preSelectedPlan, router])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const normalizedEmail = email.trim().toLowerCase()
      const session =
        mode === "signin"
          ? await signInWithPassword(normalizedEmail, password)
          : await signUpWithPassword(normalizedEmail, password)

      const profile = await ensureProfile(session)

      if (!profile.plan_selected_at && preSelectedPlan) {
        await startTrial(preSelectedPlan)
        router.push("/onboarding")
        return
      }

      if (!profile.plan_selected_at) {
        router.push("/pricing")
        return
      }

      if (isTrialExpired(profile.billing_mode, profile.trial_ends_at)) {
        router.push("/upgrade")
        return
      }

      if (!profile.onboarding_completed) {
        router.push("/onboarding")
        return
      }

      router.push("/dashboard")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCheckingSession) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 sm:px-6 md:py-12">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 md:py-12">
      <div className="mx-auto grid w-full max-w-5xl gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <p className="text-sm text-muted-foreground">Step 2 of 4</p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">{preSelectedPlan ? "Start your 2-day trial" : "Login"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {preSelectedPlan ? "Sign in or create an account to activate your trial." : "Sign in or create an account to continue."}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-secondary p-1">
            <button
              onClick={() => setMode("signin")}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                mode === "signin" ? "bg-background text-foreground" : "text-muted-foreground"
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                mode === "signup" ? "bg-background text-foreground" : "text-muted-foreground"
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
            <label className="text-sm text-foreground">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                placeholder="you@company.com"
              />
            </label>

            <label className="text-sm text-foreground">
              Password
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                placeholder="••••••••"
              />
            </label>

            {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Continuing..." : mode === "signin" ? "Login" : "Create account"}
            </button>
          </form>

          <p className="mt-3 text-xs text-muted-foreground">
            Need to compare plans first?{" "}
            <Link href="/pricing" className="underline">
              Open pricing
            </Link>
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <p className="text-sm text-muted-foreground">Flow</p>
          <h2 className="mt-1 text-2xl font-semibold text-foreground">How it works</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>1. Choose your plan on pricing</li>
            <li>2. Login or create account</li>
            <li>3. Free trial starts (no card required)</li>
            <li>4. Onboarding then dashboard</li>
          </ul>
        </section>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
