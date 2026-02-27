type SupabaseEnv = {
  supabaseUrl: string
  supabaseAnonKey: string
}

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function getSupabaseEnv(): SupabaseEnv {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

  return {
    supabaseUrl: requireEnv("SUPABASE_URL", supabaseUrl),
    supabaseAnonKey: requireEnv("SUPABASE_ANON_KEY", supabaseAnonKey),
  }
}
