export function isTrialExpired(billingMode: string | null, trialEndsAt: string | null): boolean {
  if (billingMode !== "trial" || !trialEndsAt) {
    return false
  }

  const expiresAt = new Date(trialEndsAt).getTime()
  return !Number.isNaN(expiresAt) && expiresAt <= Date.now()
}
