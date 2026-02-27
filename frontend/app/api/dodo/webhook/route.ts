import { createHmac, timingSafeEqual } from "crypto"

import { NextRequest, NextResponse } from "next/server"

import { AppError, badRequest, toErrorResponse, unauthorized } from "@/lib/server/errors"
import { parsePlanId } from "@/lib/server/validation"

type Metadata = Record<string, unknown>

type DodoEvent = {
  type?: string
  event?: string
  metadata?: Metadata
  data?: {
    metadata?: Metadata
    customer?: {
      email?: string
    }
    payment?: {
      metadata?: Metadata
      customer?: {
        email?: string
      }
    }
    subscription?: {
      metadata?: Metadata
      customer?: {
        email?: string
      }
    }
  }
  customer?: {
    email?: string
  }
}

function getServiceEnv() {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const webhookSecret = process.env.DODO_WEBHOOK_SECRET ?? process.env.DODO_PAYMENTS_WEBHOOK_SECRET

  if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
    throw new AppError(500, "Webhook is not configured.")
  }

  return { supabaseUrl, serviceRoleKey, webhookSecret }
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8")
  const right = Buffer.from(b, "utf8")
  if (left.length !== right.length) {
    return false
  }
  return timingSafeEqual(left, right)
}

function parseSignatureCandidates(signatureHeader: string | null): string[] {
  if (!signatureHeader) {
    return []
  }

  const tokens = signatureHeader
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)

  const values: string[] = []
  for (const token of tokens) {
    if (token.startsWith("v1,")) {
      values.push(token.slice(3))
      continue
    }
    if (token.startsWith("v1=")) {
      values.push(token.slice(3))
      continue
    }
    values.push(token)
  }

  return values
}

function verifyWebhookSignature(request: NextRequest, rawBody: string, secret: string): boolean {
  const webhookId = request.headers.get("webhook-id")
  const webhookTimestamp = request.headers.get("webhook-timestamp")
  const webhookSignature = request.headers.get("webhook-signature")

  if (webhookId && webhookTimestamp && webhookSignature) {
    const signedPayload = `${webhookId}.${webhookTimestamp}.${rawBody}`
    const expected = createHmac("sha256", secret).update(signedPayload, "utf8").digest("base64")
    const candidates = parseSignatureCandidates(webhookSignature)
    return candidates.some((candidate) => safeEqual(candidate, expected))
  }

  const fallbackSignature =
    request.headers.get("x-dodo-signature") ??
    request.headers.get("x-webhook-signature") ??
    request.headers.get("x-signature")
  if (!fallbackSignature) {
    return false
  }

  const normalized = fallbackSignature.startsWith("sha256=")
    ? fallbackSignature.slice("sha256=".length)
    : fallbackSignature

  const expectedHex = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")
  return safeEqual(normalized, expectedHex)
}

function getEventType(payload: DodoEvent): string {
  return String(payload.type ?? payload.event ?? "").toLowerCase()
}

function isSuccessfulEvent(type: string): boolean {
  return type.includes("success") || type.includes("completed") || type.includes("active")
}

function getMetadata(payload: DodoEvent): Metadata {
  return (
    payload.data?.payment?.metadata ??
    payload.data?.subscription?.metadata ??
    payload.data?.metadata ??
    payload.metadata ??
    {}
  )
}

function inferPlanId(payload: DodoEvent): "starter_9" | "growth_15" {
  const metadata = getMetadata(payload)
  const raw =
    String(metadata.planId ?? metadata.plan_id ?? metadata.plan ?? metadata.tier ?? "").toLowerCase() ||
    String(metadata.product ?? metadata.product_id ?? "").toLowerCase()

  if (raw.includes("growth") || raw.includes("pro") || raw.includes("15")) {
    return parsePlanId("growth_15")
  }
  return parsePlanId("starter_9")
}

function getUserId(payload: DodoEvent): string | null {
  const metadata = getMetadata(payload)
  const candidate = metadata.userId ?? metadata.user_id ?? metadata.supabase_user_id
  if (typeof candidate !== "string" || !candidate.trim()) {
    return null
  }
  return candidate.trim()
}

function getEmail(payload: DodoEvent): string | null {
  const value =
    payload.data?.payment?.customer?.email ??
    payload.data?.subscription?.customer?.email ??
    payload.data?.customer?.email ??
    payload.customer?.email
  if (!value || typeof value !== "string") {
    return null
  }
  return value.trim().toLowerCase()
}

function getMetadataValue(metadata: Metadata, keys: string[]): string {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }
  return ""
}

function inferBillingMode(payload: DodoEvent): "trial" | "paid" {
  const metadata = getMetadata(payload)
  const raw = getMetadataValue(metadata, ["billing_mode", "billingMode"]).toLowerCase()
  return raw === "paid" ? "paid" : "trial"
}

function inferTrialDays(payload: DodoEvent): number {
  const metadata = getMetadata(payload)
  const raw = getMetadataValue(metadata, ["trial_days", "trialDays"])
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }
  return Math.min(Math.floor(parsed), 30)
}

async function patchProfileByFilter(
  supabaseUrl: string,
  serviceRoleKey: string,
  filter: string,
  patch: Record<string, unknown>,
) {
  const response = await fetch(`${supabaseUrl}/rest/v1/profiles?${filter}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Supabase webhook patch failed (${response.status})`)
  }

  return (await response.json().catch(() => [])) as Array<Record<string, unknown>>
}

export async function POST(request: NextRequest) {
  try {
    const { supabaseUrl, serviceRoleKey, webhookSecret } = getServiceEnv()
    const rawBody = await request.text()

    if (!verifyWebhookSignature(request, rawBody, webhookSecret)) {
      throw unauthorized("Invalid webhook signature.")
    }

    const payload = JSON.parse(rawBody) as DodoEvent
    const eventType = getEventType(payload)
    if (!eventType) {
      throw badRequest("Missing webhook event type.")
    }

    if (!isSuccessfulEvent(eventType)) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const now = new Date().toISOString()
    const checkoutBillingMode = inferBillingMode(payload)
    const checkoutTrialDays = inferTrialDays(payload)
    const isPaidEvent =
      eventType.includes("payment.succeeded") || eventType.includes("subscription.renewed") || eventType.includes("invoice.paid")

    const patch: Record<string, unknown> = {
      plan_tier: inferPlanId(payload),
      plan_selected_at: now,
      billing_mode: "paid",
      trial_started_at: null,
      trial_ends_at: null,
    }

    if (!isPaidEvent && checkoutBillingMode === "trial" && checkoutTrialDays > 0) {
      patch.billing_mode = "trial"
      patch.trial_started_at = now
      patch.trial_ends_at = new Date(Date.now() + checkoutTrialDays * 24 * 60 * 60 * 1000).toISOString()
    }

    const userId = getUserId(payload)
    if (userId) {
      await patchProfileByFilter(supabaseUrl, serviceRoleKey, `id=eq.${encodeURIComponent(userId)}`, patch)
      return NextResponse.json({ ok: true })
    }

    const email = getEmail(payload)
    if (!email) {
      throw badRequest("Webhook payload missing user identifier.")
    }

    await patchProfileByFilter(supabaseUrl, serviceRoleKey, `email=eq.${encodeURIComponent(email)}`, patch)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return toErrorResponse("api/dodo/webhook", error, "Webhook processing failed.")
  }
}
