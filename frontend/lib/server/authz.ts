import { NextRequest } from "next/server"

import { ensureActiveEntitlement } from "@/lib/server/validation"
import { ensureProfile } from "@/lib/server/supabase"
import { requireSession } from "@/lib/server/session"

type SessionResult = Awaited<ReturnType<typeof requireSession>>

export type AuthContext = {
  sessionResult: SessionResult
  accessToken: string
  userId: string
  email?: string
}

export async function requireAuth(request: NextRequest): Promise<AuthContext> {
  const sessionResult = await requireSession(request)
  return {
    sessionResult,
    accessToken: sessionResult.session.accessToken,
    userId: sessionResult.session.user.id,
    email: sessionResult.session.user.email,
  }
}

export async function requireEntitledAuth(request: NextRequest) {
  const auth = await requireAuth(request)
  const profile = await ensureProfile(auth.accessToken, auth.userId, auth.email)
  ensureActiveEntitlement(profile)
  return { ...auth, profile }
}
