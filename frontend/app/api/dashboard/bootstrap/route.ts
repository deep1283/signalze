import { NextRequest, NextResponse } from "next/server"

import { requireAuth } from "@/lib/server/authz"
import { toErrorResponse } from "@/lib/server/errors"
import { ensureProfile, listBrands, listKeywords } from "@/lib/server/supabase"
import { withSessionCookie } from "@/lib/server/session"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const profile = await ensureProfile(auth.accessToken, auth.userId, auth.email)
    const [brands, keywords] = await Promise.all([
      listBrands(auth.accessToken, auth.userId, false),
      listKeywords(auth.accessToken, auth.userId, false, false),
    ])

    const nextRoute = !profile.plan_selected_at ? "/pricing" : !profile.onboarding_completed ? "/onboarding" : "/dashboard"

    const response = NextResponse.json({
      user: auth.sessionResult.session.user,
      profile,
      brands,
      keywords,
      nextRoute,
    })
    return withSessionCookie(response, auth.sessionResult)
  } catch (error) {
    return toErrorResponse("api/dashboard/bootstrap", error, "Unable to load dashboard.")
  }
}

