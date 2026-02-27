"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"

import { ensureProfile, signInWithPassword, signUpWithPassword } from "@/lib/supabase-lite"

type AuthMode = "signin" | "signup"

export default function LoginPage() {
  const router = useRouter()

  const [mode, setMode] = useState<AuthMode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      if (!profile?.plan_selected_at) {
        router.push("/pricing")
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

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 md:py-12">
      <div className="mx-auto grid w-full max-w-5xl gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <p className="text-sm text-muted-foreground">Step 1 of 4</p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">Login</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in first. We will route you to pricing only if you have not selected a plan yet.</p>

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
            Need to compare plans first? <Link href="/pricing" className="underline">Open pricing</Link>
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <p className="text-sm text-muted-foreground">Flow</p>
          <h2 className="mt-1 text-2xl font-semibold text-foreground">Login-gated onboarding</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>1. Login</li>
            <li>2. Pricing only if plan is not selected yet</li>
            <li>3. Onboarding (brand + keywords)</li>
            <li>4. Dashboard + Slack notifications</li>
          </ul>
        </section>
      </div>
    </main>
  )
}
