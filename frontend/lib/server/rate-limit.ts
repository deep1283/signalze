type Bucket = {
  count: number
  resetAt: number
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

type RemoteRateLimitRow = {
  allowed: boolean
  remaining: number
  retry_after_seconds: number
}

const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 10_000
const REMOTE_TIMEOUT_MS = 2_000

function prune(now: number) {
  if (buckets.size < MAX_BUCKETS) {
    return
  }

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key)
    }
    if (buckets.size < MAX_BUCKETS) {
      break
    }
  }
}

function takeRateLimitLocal(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  prune(now)

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    })
    return {
      allowed: true,
      remaining: Math.max(limit - 1, 0),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    }
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1),
    }
  }

  bucket.count += 1
  return {
    allowed: true,
    remaining: Math.max(limit - bucket.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1),
  }
}

function getRemoteConfig(): { supabaseUrl: string; serviceRoleKey: string } | null {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return { supabaseUrl, serviceRoleKey }
}

function parseRemoteResult(payload: unknown): RateLimitResult | null {
  const row = Array.isArray(payload) ? payload[0] : payload
  if (!row || typeof row !== "object") {
    return null
  }

  const record = row as Partial<RemoteRateLimitRow>
  if (
    typeof record.allowed !== "boolean" ||
    typeof record.remaining !== "number" ||
    typeof record.retry_after_seconds !== "number"
  ) {
    return null
  }

  return {
    allowed: record.allowed,
    remaining: Math.max(Math.floor(record.remaining), 0),
    retryAfterSeconds: Math.max(Math.floor(record.retry_after_seconds), 1),
  }
}

async function takeRateLimitRemote(key: string, limit: number, windowMs: number): Promise<RateLimitResult | null> {
  const config = getRemoteConfig()
  if (!config) {
    return null
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS)

  try {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/take_rate_limit`, {
      method: "POST",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_bucket: key,
        p_limit: Math.max(Math.floor(limit), 1),
        p_window_seconds: Math.max(Math.ceil(windowMs / 1000), 1),
      }),
      cache: "no-store",
      signal: controller.signal,
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json().catch(() => null)) as unknown
    return parseRemoteResult(payload)
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function takeRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const remote = await takeRateLimitRemote(key, limit, windowMs)
  if (remote) {
    return remote
  }

  return takeRateLimitLocal(key, limit, windowMs)
}
