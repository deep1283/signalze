import { NextRequest, NextResponse } from "next/server"

import { requireAuth } from "@/lib/server/authz"
import { badRequest, toErrorResponse, tooManyRequests } from "@/lib/server/errors"
import { getRequestIp, parseJsonBody } from "@/lib/server/request"
import { takeRateLimit } from "@/lib/server/rate-limit"
import { patchProfile } from "@/lib/server/supabase"
import { withSessionCookie } from "@/lib/server/session"

type ProfilePatchBody = {
  onboarding_completed?: boolean
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const ip = getRequestIp(request)
    const rate = takeRateLimit(`profile:patch:${auth.userId}:${ip}`, 30, 60_000)
    if (!rate.allowed) {
      throw tooManyRequests()
    }

    const body = await parseJsonBody<ProfilePatchBody>(request)
    const patch: Partial<ProfilePatchBody> = {}

    if (typeof body.onboarding_completed === "boolean") {
      patch.onboarding_completed = body.onboarding_completed
    }

    if (!Object.keys(patch).length) {
      throw badRequest("No allowed profile fields were provided.")
    }

    const profile = await patchProfile(auth.accessToken, auth.userId, patch)
    const response = NextResponse.json({ profile })
    return withSessionCookie(response, auth.sessionResult)
  } catch (error) {
    return toErrorResponse("api/profile:patch", error, "Unable to update profile.")
  }
}

