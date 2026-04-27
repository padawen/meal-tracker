import 'server-only'

import { publicEnv } from '@/lib/env'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type ViewerProfile = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_admin: boolean
  is_approved: boolean
}

export async function getAuthenticatedServerUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized')
  }

  return { supabase, user }
}

async function getAuthenticatedViewerProfile() {
  const { supabase, user } = await getAuthenticatedServerUser()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, is_admin, is_approved')
    .eq('id', user.id)
    .maybeSingle<ViewerProfile>()

  if (error || !profile) {
    throw new Error('Unauthorized')
  }

  return {
    supabase,
    user,
    profile,
    isMasterAdmin: publicEnv.masterAdminIds.includes(user.id),
  }
}

export async function requireAdminViewer() {
  const viewer = await getAuthenticatedViewerProfile()

  if (!viewer.profile.is_admin) {
    throw new Error('Unauthorized')
  }

  return viewer
}

export async function requireMasterAdminViewer() {
  const viewer = await requireAdminViewer()

  if (!viewer.isMasterAdmin) {
    throw new Error('Only Master Admin can perform this action')
  }

  return viewer
}

export function isMasterAdmin(userId: string) {
  return publicEnv.masterAdminIds.includes(userId)
}
