import { NextRequest } from "next/server"

import { badRequest } from "@/lib/server/errors"

export function getRequestIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) {
      return first
    }
  }

  return request.headers.get("x-real-ip") ?? "unknown"
}

export async function parseJsonBody<T>(request: NextRequest): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw badRequest("Malformed JSON payload.")
  }
}

