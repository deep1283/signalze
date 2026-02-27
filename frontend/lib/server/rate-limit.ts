type Bucket = {
  count: number
  resetAt: number
}

type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 10_000

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

export function takeRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
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

