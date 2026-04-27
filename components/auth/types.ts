import type { User } from '@supabase/supabase-js'

export interface AuthProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_admin: boolean
  is_approved: boolean
}

export interface AuthContextValue {
  user: User
  profile: AuthProfile
  isAdmin: boolean
  isApproved: boolean
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}
