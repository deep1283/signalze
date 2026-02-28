"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { isTrialExpired } from "@/lib/client/billing"
import {
  ACTIVE_PLATFORMS,
  PLATFORM_FILTERS,
  PLATFORM_LABELS,
  platformPillClass,
  type ActivePlatform,
  type PlatformFilter,
} from "@/lib/platforms"
import { PLAN_CONFIG, type PlanId } from "@/lib/plans"
import {
  ensureProfile,
  getValidSession,
  insertBrand,
  insertKeyword,
  listBrands,
  listKeywords,
  updateBrand,
  updateKeyword,
  type BillingMode,
  type BrandRow,
  type KeywordRow,
  type SessionData,
} from "@/lib/supabase-lite"

type Mention = {
  platform: ActivePlatform
  externalId: string
  url: string
  title: string
  excerpt: string
  author: string | null
  community: string | null
  publishedAt: string
  matchedTerms: string[]
}

type MentionsApiResponse = {
  fetchedAt: string
  mentions: Mention[]
}

function cleanInput(input: string): string {
  return input.trim().replace(/\s+/g, " ")
}

function formatTime(isoTime: string): string {
  const date = new Date(isoTime)
  if (Number.isNaN(date.getTime())) {
    return "Unknown time"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

export default function DashboardPage() {
  const [session, setSession] = useState<SessionData | null>(null)
  const [plan, setPlan] = useState<PlanId>("starter_9")
  const [billing, setBilling] = useState<BillingMode>("trial")
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)

  const [brandInput, setBrandInput] = useState("")
  const [keywordInput, setKeywordInput] = useState("")
  const [brandRows, setBrandRows] = useState<BrandRow[]>([])
  const [keywordRows, setKeywordRows] = useState<KeywordRow[]>([])

  const [activePlatform, setActivePlatform] = useState<PlatformFilter>("all")
  const [enabledPlatforms, setEnabledPlatforms] = useState<Record<ActivePlatform, boolean>>(() =>
    Object.fromEntries(ACTIVE_PLATFORMS.map((platform) => [platform, true])) as Record<
      ActivePlatform,
      boolean
    >,
  )

  const [mentions, setMentions] = useState<Mention[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshingMentions, setIsRefreshingMentions] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function bootstrap() {
      try {
        const validSession = await getValidSession()
        if (!validSession) {
          window.location.replace("/login")
          return
        }
        setSession(validSession)

        const profile = await ensureProfile(validSession)
        if (!profile?.plan_selected_at) {
          window.location.replace("/pricing")
          return
        }

        if (isTrialExpired(profile.billing_mode, profile.trial_ends_at)) {
          window.location.replace("/upgrade")
          return
        }

        if (!profile.onboarding_completed) {
          window.location.replace("/onboarding")
          return
        }

        setPlan(profile.plan_tier)
        setBilling(profile.billing_mode ?? "trial")
        setTrialEndsAt(profile.trial_ends_at ?? null)

        const [brands, keywords] = await Promise.all([listBrands(validSession), listKeywords(validSession)])
        setBrandRows(brands)
        setKeywordRows(keywords)
      } catch (bootstrapError) {
        const message = bootstrapError instanceof Error ? bootstrapError.message : "Failed to load dashboard"
        if (message.toLowerCase().includes("trial has ended")) {
          window.location.replace("/upgrade")
          return
        }
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    void bootstrap()
  }, [])

  const planConfig = PLAN_CONFIG[plan]
  const activeBrands = useMemo(() => brandRows.filter((item) => item.is_active), [brandRows])
  const activeKeywords = useMemo(() => keywordRows.filter((item) => item.is_active), [keywordRows])

  const selectedPlatforms = useMemo(
    () => ACTIVE_PLATFORMS.filter((platform) => enabledPlatforms[platform]),
    [enabledPlatforms],
  )

  const filteredMentions = useMemo(() => {
    if (activePlatform === "all") {
      return mentions
    }
    return mentions.filter((mention) => mention.platform === activePlatform)
  }, [mentions, activePlatform])

  const counts = useMemo(() => {
    const byPlatform = Object.fromEntries(
      ACTIVE_PLATFORMS.map((platform) => [platform, 0]),
    ) as Record<ActivePlatform, number>
    for (const mention of mentions) {
      byPlatform[mention.platform] += 1
    }
    return {
      total: mentions.length,
      byPlatform,
    }
  }, [mentions])

  async function addBrand() {
    if (!session) {
      return
    }

    setError(null)
    const normalized = cleanInput(brandInput)
    if (!normalized) {
      return
    }

    const existing = brandRows.find((brand) => brand.name.toLowerCase() === normalized.toLowerCase())
    if (existing?.is_active) {
      setBrandInput("")
      return
    }

    setIsSaving(true)
    try {
      if (existing) {
        const updated = await updateBrand(session, existing.id, { is_active: true, name: normalized })
        if (updated) {
          setBrandRows((current) => current.map((row) => (row.id === updated.id ? updated : row)))
        }
      } else {
        const inserted = await insertBrand(session, normalized)
        setBrandRows((current) => [...current, inserted])
      }
      setBrandInput("")
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Failed to add brand")
    } finally {
      setIsSaving(false)
    }
  }

  async function addKeyword() {
    if (!session) {
      return
    }

    setError(null)
    const normalized = cleanInput(keywordInput)
    if (!normalized) {
      return
    }

    const existing = keywordRows.find((keyword) => keyword.query.toLowerCase() === normalized.toLowerCase())
    if (existing?.is_active) {
      setKeywordInput("")
      return
    }

    setIsSaving(true)
    try {
      if (existing) {
        const updated = await updateKeyword(session, existing.id, { is_active: true, query: normalized })
        if (updated) {
          setKeywordRows((current) => current.map((row) => (row.id === updated.id ? updated : row)))
        }
      } else {
        const inserted = await insertKeyword(session, normalized)
        setKeywordRows((current) => [...current, inserted])
      }
      setKeywordInput("")
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Failed to add keyword")
    } finally {
      setIsSaving(false)
    }
  }

  async function removeBrand(brand: BrandRow) {
    if (!session) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const updated = await updateBrand(session, brand.id, { is_active: false })
      if (updated) {
        setBrandRows((current) => current.map((row) => (row.id === updated.id ? updated : row)))
      }
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Failed to remove brand")
    } finally {
      setIsSaving(false)
    }
  }

  async function removeKeyword(keyword: KeywordRow) {
    if (!session) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const updated = await updateKeyword(session, keyword.id, { is_active: false })
      if (updated) {
        setKeywordRows((current) => current.map((row) => (row.id === updated.id ? updated : row)))
      }
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Failed to remove keyword")
    } finally {
      setIsSaving(false)
    }
  }

  async function fetchMentions() {
    setError(null)

    if (!selectedPlatforms.length) {
      setError("Enable at least one platform.")
      return
    }

    setIsRefreshingMentions(true)
    try {
      const response = await fetch("/api/mentions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platforms: selectedPlatforms,
          limit: 150,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? "Failed to fetch mentions")
      }

      const payload = (await response.json()) as MentionsApiResponse
      setMentions(payload.mentions)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch mentions")
    } finally {
      setIsRefreshingMentions(false)
    }
  }

  function togglePlatform(platform: ActivePlatform) {
    setEnabledPlatforms((current) => ({
      ...current,
      [platform]: !current[platform],
    }))
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined)
    window.location.replace("/login")
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 sm:px-6 md:py-12">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading dashboard...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 md:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Signalze Mention Dashboard</p>
              <h1 className="font-serif text-3xl text-foreground sm:text-4xl">Track your brand mentions</h1>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Link
                href="/pricing"
                className="inline-flex h-10 items-center justify-center rounded-full border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Manage plan
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex h-10 items-center justify-center rounded-full border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Log out
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-card-foreground">Current plan</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {planConfig.name} · {planConfig.price}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <p className="text-xs text-muted-foreground">Brands</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{planConfig.maxBrands === null ? "Multiple" : planConfig.maxBrands}</p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <p className="text-xs text-muted-foreground">Keywords</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{planConfig.maxKeywords}</p>
              </div>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              Billing mode: <span className="font-medium text-foreground">{billing === "trial" ? "2-day free trial" : "Paid from day 1"}</span>
            </p>
            {billing === "trial" && trialEndsAt ? (
              <p className="text-sm text-muted-foreground">
                Trial ends: <span className="font-medium text-foreground">{formatTime(trialEndsAt)}</span>
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-card-foreground">Platform coverage</h2>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {ACTIVE_PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  onClick={() => togglePlatform(platform)}
                  className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                    enabledPlatforms[platform]
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {PLATFORM_LABELS[platform]}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-card-foreground">Brands</h2>
              <span className="text-xs text-muted-foreground">
                {activeBrands.length}/{planConfig.maxBrands ?? "∞"}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={brandInput}
                onChange={(event) => setBrandInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    void addBrand()
                  }
                }}
                placeholder="e.g. Signalze"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              />
              <button
                onClick={() => void addBrand()}
                disabled={isSaving}
                className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add brand
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {activeBrands.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => void removeBrand(brand)}
                  className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                >
                  {brand.name} ×
                </button>
              ))}
              {!activeBrands.length ? <p className="text-sm text-muted-foreground">No brands added yet.</p> : null}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-card-foreground">Niche keywords</h2>
              <span className="text-xs text-muted-foreground">
                {activeKeywords.length}/{planConfig.maxKeywords}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    void addKeyword()
                  }
                }}
                placeholder="e.g. social listening"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              />
              <button
                onClick={() => void addKeyword()}
                disabled={isSaving}
                className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add keyword
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {activeKeywords.map((keyword) => (
                <button
                  key={keyword.id}
                  onClick={() => void removeKeyword(keyword)}
                  className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
                >
                  {keyword.query} ×
                </button>
              ))}
              {!activeKeywords.length ? <p className="text-sm text-muted-foreground">No keywords added yet.</p> : null}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-card-foreground">Mentions</h2>
            </div>
            <button
              onClick={() => void fetchMentions()}
              disabled={isRefreshingMentions}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-5 text-sm font-semibold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isRefreshingMentions ? "Refreshing..." : "Refresh feed"}
            </button>
          </div>

          {error ? <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Total" value={counts.total} />
            {ACTIVE_PLATFORMS.map((platform) => (
              <StatCard key={platform} label={PLATFORM_LABELS[platform]} value={counts.byPlatform[platform]} />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {PLATFORM_FILTERS.map((platform) => (
              <button
                key={platform}
                onClick={() => setActivePlatform(platform)}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  activePlatform === platform
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:opacity-90"
                }`}
              >
                {platform === "all" ? "All" : PLATFORM_LABELS[platform]}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {filteredMentions.map((mention) => (
              <article key={`${mention.platform}:${mention.externalId}`} className="rounded-xl border border-border bg-background p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${platformPillClass(mention.platform)}`}>
                    {PLATFORM_LABELS[mention.platform]}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatTime(mention.publishedAt)}</span>
                </div>

                <a
                  href={mention.url}
                  target="_blank"
                  rel="noreferrer"
                  className="line-clamp-2 text-base font-semibold text-foreground hover:underline"
                >
                  {mention.title}
                </a>

                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{mention.excerpt || "No excerpt available."}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{mention.community ?? "Unknown community"}</span>
                  <span>•</span>
                  <span>{mention.author ?? "Unknown author"}</span>
                </div>

                {mention.matchedTerms.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {mention.matchedTerms.map((term) => (
                      <span key={term} className="rounded-md bg-muted px-2 py-1 text-[11px] text-foreground">
                        {term}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          {!filteredMentions.length ? (
            <p className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No mentions yet.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}
