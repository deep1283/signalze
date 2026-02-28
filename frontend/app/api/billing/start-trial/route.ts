import { NextRequest, NextResponse } from "next/server"

import { PLAN_CONFIG } from "@/lib/plans"
import { requireAuth } from "@/lib/server/authz"
import { AppError, badRequest, toErrorResponse, tooManyRequests } from "@/lib/server/errors"
import { getRequestIp, parseJsonBody } from "@/lib/server/request"
import { takeRateLimit } from "@/lib/server/rate-limit"
import { ensureProfile, patchProfile } from "@/lib/server/supabase"
import { withSessionCookie } from "@/lib/server/session"
import { parsePlanId } from "@/lib/server/validation"

type StartTrialBody = {
  plan?: unknown
}

function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const ip = getRequestIp(request)
    const limit = await takeRateLimit(`billing:start-trial:${auth.userId}:${ip}`, 20, 60_000)
    if (!limit.allowed) {
      throw tooManyRequests("Too many trial requests. Please wait and try again.")
    }

    const body = await parseJsonBody<StartTrialBody>(request)
    const planId = parsePlanId(body.plan)
    const trialDays = PLAN_CONFIG[planId].trialDays
    if (trialDays <= 0) {
      throw new AppError(400, "Trial is not available for this plan.")
    }

    const profile = await ensureProfile(auth.accessToken, auth.userId, auth.email)
    if (profile.plan_selected_at) {
      throw badRequest("A plan is already selected for this account.")
    }

    const nowIso = new Date().toISOString()
    const updated = await patchProfile(auth.accessToken, auth.userId, {
      plan_tier: planId,
      billing_mode: "trial",
      plan_selected_at: nowIso,
      trial_started_at: nowIso,
      trial_ends_at: addDaysIso(trialDays),
    })

    const response = NextResponse.json({
      ok: true,
      profile: updated,
      nextRoute: "/onboarding",
    })
    return withSessionCookie(response, auth.sessionResult)
  } catch (error) {
    return toErrorResponse("api/billing/start-trial", error, "Unable to start trial.")
  }
}
