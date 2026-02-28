export const ACTIVE_PLATFORMS = ["hackernews", "devto", "github_discussions"] as const

export type ActivePlatform = (typeof ACTIVE_PLATFORMS)[number]
export type PlatformFilter = "all" | ActivePlatform

export const PLATFORM_FILTERS = ["all", ...ACTIVE_PLATFORMS] as const

export const PLATFORM_LABELS: Record<ActivePlatform, string> = {
  hackernews: "Hacker News",
  devto: "Dev.to",
  github_discussions: "GitHub Discussions",
}

export function isActivePlatform(value: string): value is ActivePlatform {
  return (ACTIVE_PLATFORMS as readonly string[]).includes(value)
}

export function platformPillClass(platform: ActivePlatform): string {
  if (platform === "hackernews") {
    return "bg-amber-100 text-amber-900"
  }
  if (platform === "devto") {
    return "bg-blue-100 text-blue-900"
  }
  return "bg-slate-100 text-slate-900"
}
