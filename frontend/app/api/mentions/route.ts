import { NextRequest, NextResponse } from "next/server"

import { requireEntitledAuth } from "@/lib/server/authz"
import { badRequest, toErrorResponse, tooManyRequests } from "@/lib/server/errors"
import { getRequestIp, parseJsonBody } from "@/lib/server/request"
import { takeRateLimit } from "@/lib/server/rate-limit"
import { listBrands, listKeywords } from "@/lib/server/supabase"
import { withSessionCookie } from "@/lib/server/session"

export const dynamic = "force-dynamic"

type Platform = "reddit" | "hackernews" | "devto"

type Mention = {
  platform: Platform
  externalId: string
  url: string
  title: string
  excerpt: string
  author: string | null
  community: string | null
  publishedAt: string
  matchedTerms: string[]
}

type MentionBody = {
  platforms?: Platform[]
  limit?: number
}

const ALLOWED_PLATFORMS: Platform[] = ["reddit", "hackernews", "devto"]

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

function sanitizeList(value: unknown, maxItems = 100): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seen = new Set<string>()
  const output: string[] = []

  for (const item of value) {
    if (typeof item !== "string") {
      continue
    }
    const normalized = normalizeText(item)
    if (!normalized) {
      continue
    }
    const key = normalized.toLowerCase()
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    output.push(normalized)
    if (output.length >= maxItems) {
      break
    }
  }

  return output
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
}

function toIso(value: string | number | Date | null | undefined): string {
  if (!value) {
    return new Date().toISOString()
  }

  if (typeof value === "number") {
    return new Date(value * 1000).toISOString()
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function pushMention(map: Map<string, Mention>, mention: Mention, term: string) {
  const key = `${mention.platform}:${mention.externalId}`
  const existing = map.get(key)
  if (!existing) {
    map.set(key, { ...mention, matchedTerms: [term] })
    return
  }

  if (!existing.matchedTerms.includes(term)) {
    existing.matchedTerms.push(term)
  }
}

async function fetchHackerNews(terms: string[], perTermLimit: number): Promise<Mention[]> {
  const mentions = new Map<string, Mention>()

  const jobs = terms.map(async (term) => {
    const url = new URL("https://hn.algolia.com/api/v1/search_by_date")
    url.searchParams.set("query", term)
    url.searchParams.set("tags", "story,comment")
    url.searchParams.set("hitsPerPage", String(perTermLimit))

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "signalze-mention-dashboard",
      },
    })

    if (!response.ok) {
      throw new Error(`HN request failed (${response.status})`)
    }

    const payload = (await response.json()) as {
      hits?: Array<Record<string, unknown>>
    }

    for (const hit of payload.hits ?? []) {
      const objectId = String(hit.objectID ?? "")
      if (!objectId) {
        continue
      }

      const title = normalizeText(String(hit.title ?? hit.story_title ?? "Hacker News mention"))
      const excerpt = stripHtml(String(hit.comment_text ?? hit.story_text ?? ""))
      const urlValue = String(hit.url ?? hit.story_url ?? `https://news.ycombinator.com/item?id=${objectId}`)

      pushMention(
        mentions,
        {
          platform: "hackernews",
          externalId: objectId,
          url: urlValue,
          title: title || "Hacker News mention",
          excerpt: excerpt.slice(0, 450),
          author: hit.author ? String(hit.author) : null,
          community: "Hacker News",
          publishedAt: toIso(hit.created_at as string | undefined),
          matchedTerms: [],
        },
        term,
      )
    }
  })

  const results = await Promise.allSettled(jobs)
  for (const result of results) {
    if (result.status === "rejected") {
      throw result.reason
    }
  }

  return Array.from(mentions.values())
}

async function fetchReddit(terms: string[], perTermLimit: number): Promise<Mention[]> {
  const mentions = new Map<string, Mention>()

  const jobs = terms.map(async (term) => {
    const url = new URL("https://www.reddit.com/search.json")
    url.searchParams.set("q", term)
    url.searchParams.set("sort", "new")
    url.searchParams.set("limit", String(perTermLimit))
    url.searchParams.set("t", "week")

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "signalze-mention-dashboard",
      },
    })

    if (!response.ok) {
      throw new Error(`Reddit request failed (${response.status})`)
    }

    const payload = (await response.json()) as {
      data?: {
        children?: Array<{
          data?: Record<string, unknown>
        }>
      }
    }

    for (const child of payload.data?.children ?? []) {
      const data = child.data ?? {}
      const externalId = String(data.name ?? "")
      if (!externalId) {
        continue
      }

      const permalink = String(data.permalink ?? "")
      const urlValue = permalink ? `https://reddit.com${permalink}` : String(data.url ?? "")
      if (!urlValue) {
        continue
      }

      const title = normalizeText(String(data.title ?? data.link_title ?? "Reddit mention"))
      const body = normalizeText(String(data.selftext ?? data.body ?? ""))
      const subreddit = data.subreddit ? `r/${String(data.subreddit)}` : "Reddit"

      pushMention(
        mentions,
        {
          platform: "reddit",
          externalId,
          url: urlValue,
          title: title || "Reddit mention",
          excerpt: body.slice(0, 450),
          author: data.author ? String(data.author) : null,
          community: subreddit,
          publishedAt: toIso((data.created_utc as number | undefined) ?? null),
          matchedTerms: [],
        },
        term,
      )
    }
  })

  const results = await Promise.allSettled(jobs)
  for (const result of results) {
    if (result.status === "rejected") {
      throw result.reason
    }
  }

  return Array.from(mentions.values())
}

async function fetchDevTo(terms: string[], limit: number): Promise<Mention[]> {
  const mentions = new Map<string, Mention>()
  const response = await fetch(`https://dev.to/api/articles?per_page=${Math.min(Math.max(limit, 20), 100)}&top=7`, {
    cache: "no-store",
    headers: {
      "User-Agent": "signalze-mention-dashboard",
    },
  })

  if (!response.ok) {
    throw new Error(`Dev.to request failed (${response.status})`)
  }

  const payload = (await response.json()) as Array<Record<string, unknown>>
  const loweredTerms = terms.map((term) => term.toLowerCase())

  for (const item of payload) {
    const title = normalizeText(String(item.title ?? "Dev.to mention"))
    const excerpt = normalizeText(String(item.description ?? ""))
    const tags = Array.isArray(item.tag_list) ? item.tag_list.map(String).join(" ") : String(item.tag_list ?? "")
    const haystack = `${title} ${excerpt} ${tags}`.toLowerCase()

    const matchedTerms = loweredTerms.filter((term) => haystack.includes(term))
    if (!matchedTerms.length) {
      continue
    }

    const externalId = String(item.id ?? "")
    const url = String(item.url ?? "")
    if (!externalId || !url) {
      continue
    }

    const authorObj = (item.user as Record<string, unknown> | undefined) ?? {}

    const mention: Mention = {
      platform: "devto",
      externalId,
      url,
      title: title || "Dev.to mention",
      excerpt: excerpt.slice(0, 450),
      author: authorObj.name ? String(authorObj.name) : authorObj.username ? String(authorObj.username) : null,
      community: "dev.to",
      publishedAt: toIso(item.published_at as string | undefined),
      matchedTerms,
    }

    mentions.set(`devto:${externalId}`, mention)
  }

  return Array.from(mentions.values())
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireEntitledAuth(request)
    const ip = getRequestIp(request)
    const rate = takeRateLimit(`mentions:refresh:${auth.userId}:${ip}`, 25, 60_000)
    if (!rate.allowed) {
      throw tooManyRequests()
    }

    const body = await parseJsonBody<MentionBody>(request)
    const selectedPlatforms = (Array.isArray(body.platforms) ? body.platforms : ALLOWED_PLATFORMS).filter((platform) =>
      ALLOWED_PLATFORMS.includes(platform),
    )

    if (!selectedPlatforms.length) {
      throw badRequest("Enable at least one platform.")
    }

    const limit = Math.min(Math.max(Number(body.limit ?? 100), 10), 300)
    const [brandRows, keywordRows] = await Promise.all([
      listBrands(auth.accessToken, auth.userId, false),
      listKeywords(auth.accessToken, auth.userId, false, false),
    ])

    const terms = sanitizeList(
      [...brandRows.map((brand) => brand.name), ...keywordRows.map((keyword) => keyword.query)],
      90,
    )

    if (!terms.length) {
      const empty = NextResponse.json({
        fetchedAt: new Date().toISOString(),
        sourceErrors: [],
        mentions: [],
      })
      return withSessionCookie(empty, auth.sessionResult)
    }

    const perTermLimit = Math.min(Math.max(Math.ceil(limit / Math.max(terms.length, 1)), 6), 30)
    const sourceErrors: string[] = []
    const sourceJobs: Array<Promise<Mention[]>> = []

    if (selectedPlatforms.includes("reddit")) {
      sourceJobs.push(
        fetchReddit(terms, perTermLimit).catch(() => {
          sourceErrors.push("Reddit source is temporarily unavailable.")
          return []
        }),
      )
    }

    if (selectedPlatforms.includes("hackernews")) {
      sourceJobs.push(
        fetchHackerNews(terms, perTermLimit).catch(() => {
          sourceErrors.push("Hacker News source is temporarily unavailable.")
          return []
        }),
      )
    }

    if (selectedPlatforms.includes("devto")) {
      sourceJobs.push(
        fetchDevTo(terms, Math.max(limit, 40)).catch(() => {
          sourceErrors.push("Dev.to source is temporarily unavailable.")
          return []
        }),
      )
    }

    const rawResults = await Promise.all(sourceJobs)
    const merged = new Map<string, Mention>()

    for (const batch of rawResults) {
      for (const mention of batch) {
        const key = `${mention.platform}:${mention.externalId}`
        const existing = merged.get(key)
        if (!existing) {
          merged.set(key, mention)
          continue
        }
        const termSet = new Set([...existing.matchedTerms, ...mention.matchedTerms])
        existing.matchedTerms = Array.from(termSet)
      }
    }

    const mentions = Array.from(merged.values())
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, limit)

    const response = NextResponse.json({
      fetchedAt: new Date().toISOString(),
      sourceErrors,
      mentions,
    })

    return withSessionCookie(response, auth.sessionResult)
  } catch (error) {
    return toErrorResponse("api/mentions", error, "Unable to fetch mentions right now.")
  }
}

