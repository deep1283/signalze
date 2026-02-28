import { NextRequest, NextResponse } from "next/server"

import { PLAN_CONFIG } from "@/lib/plans"
import { requireEntitledAuth } from "@/lib/server/authz"
import { badRequest, toErrorResponse, tooManyRequests } from "@/lib/server/errors"
import { getRequestIp, parseJsonBody } from "@/lib/server/request"
import { takeRateLimit } from "@/lib/server/rate-limit"
import { insertBrand, listBrands, updateBrand } from "@/lib/server/supabase"
import { withSessionCookie } from "@/lib/server/session"
import { normalizeInput } from "@/lib/server/validation"

type CreateBrandBody = {
  name?: string
}

type UpdateBrandBody = {
  id?: string
  name?: string
  isActive?: boolean
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireEntitledAuth(request)
    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true"
    const brands = await listBrands(auth.accessToken, auth.userId, includeInactive)
    const response = NextResponse.json({ brands })
    return withSessionCookie(response, auth.sessionResult)
  } catch (error) {
    return toErrorResponse("api/tracking/brands:get", error, "Unable to load brands.")
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireEntitledAuth(request)
    const ip = getRequestIp(request)
    const rate = await takeRateLimit(`tracking:brands:create:${auth.userId}:${ip}`, 30, 60_000)
    if (!rate.allowed) {
      throw tooManyRequests()
    }

    const body = await parseJsonBody<CreateBrandBody>(request)
    const name = normalizeInput(body.name ?? "")
    if (name.length < 2 || name.length > 80) {
      throw badRequest("Brand name must be between 2 and 80 characters.")
    }

    const existingBrands = await listBrands(auth.accessToken, auth.userId, true)
    const existing = existingBrands.find((brand) => brand.name.toLowerCase() === name.toLowerCase())
    if (existing?.is_active) {
      const response = NextResponse.json({ brand: existing })
      return withSessionCookie(response, auth.sessionResult)
    }

    const activeCount = existingBrands.filter((brand) => brand.is_active).length
    const plan = PLAN_CONFIG[auth.profile.plan_tier]
    if (plan.maxBrands !== null && activeCount >= plan.maxBrands) {
      throw badRequest(`Your ${plan.name} plan supports up to ${plan.maxBrands} brand.`)
    }

    const brand = existing
      ? await updateBrand(auth.accessToken, auth.userId, existing.id, { is_active: true, name })
      : await insertBrand(auth.accessToken, auth.userId, name)

    const response = NextResponse.json({ brand })
    return withSessionCookie(response, auth.sessionResult)
  } catch (error) {
    return toErrorResponse("api/tracking/brands:post", error, "Unable to add brand.")
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireEntitledAuth(request)
    const ip = getRequestIp(request)
    const rate = await takeRateLimit(`tracking:brands:update:${auth.userId}:${ip}`, 40, 60_000)
    if (!rate.allowed) {
      throw tooManyRequests()
    }

    const body = await parseJsonBody<UpdateBrandBody>(request)
    if (typeof body.id !== "string" || !body.id) {
      throw badRequest("Brand id is required.")
    }

    const patch: { is_active?: boolean; name?: string } = {}
    if (typeof body.isActive === "boolean") {
      patch.is_active = body.isActive
    }
    if (typeof body.name === "string") {
      const normalized = normalizeInput(body.name)
      if (normalized.length < 2 || normalized.length > 80) {
        throw badRequest("Brand name must be between 2 and 80 characters.")
      }
      patch.name = normalized
    }
    if (!Object.keys(patch).length) {
      throw badRequest("No valid brand changes provided.")
    }

    if (patch.is_active) {
      const existingBrands = await listBrands(auth.accessToken, auth.userId, true)
      const activeCount = existingBrands.filter((brand) => brand.is_active && brand.id !== body.id).length
      const plan = PLAN_CONFIG[auth.profile.plan_tier]
      if (plan.maxBrands !== null && activeCount >= plan.maxBrands) {
        throw badRequest(`Your ${plan.name} plan supports up to ${plan.maxBrands} brand.`)
      }
    }

    const brand = await updateBrand(auth.accessToken, auth.userId, body.id, patch)
    const response = NextResponse.json({ brand })
    return withSessionCookie(response, auth.sessionResult)
  } catch (error) {
    return toErrorResponse("api/tracking/brands:patch", error, "Unable to update brand.")
  }
}
