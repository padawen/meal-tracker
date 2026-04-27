function requireEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing ${name}. Please set ${name}.`)
  }

  return value
}

export const publicEnv = {
  supabaseUrl: requireEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  masterAdminIds:
    process.env.NEXT_PUBLIC_MASTER_ADMIN_IDS
      ?.split(',')
      .map((id) => id.trim())
      .filter(Boolean) || [],
}
