'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase/client'
import type { AuthProfile } from '@/components/auth/types'

function isProtectedRoute(pathname: string) {
  return pathname === '/' || pathname.startsWith('/statistics') || pathname.startsWith('/admin')
}

function isAdminRoute(pathname: string) {
  return pathname.startsWith('/admin')
}

function isPendingApprovalRoute(pathname: string) {
  return pathname === '/pending-approval'
}

export function ProfileRouteSync() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    let isMounted = true
    let profileChannel: ReturnType<typeof supabase.channel> | null = null

    const syncRouteWithProfile = (profile: AuthProfile) => {
      const isApproved = profile.is_admin || profile.is_approved

      if (!isApproved && isProtectedRoute(pathname) && !isPendingApprovalRoute(pathname)) {
        router.refresh()
        router.replace('/pending-approval')
        return
      }

      if (isPendingApprovalRoute(pathname) && isApproved) {
        router.refresh()
        router.replace('/')
        return
      }

      if (isAdminRoute(pathname) && !profile.is_admin) {
        router.refresh()
        router.replace('/')
      }
    }

    const loadProfile = async (userId: string) => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, is_admin, is_approved')
        .eq('id', userId)
        .maybeSingle<AuthProfile>()

      if (error || !profile || !isMounted) {
        return
      }

      syncRouteWithProfile(profile)
    }

    const subscribeToProfile = (userId: string) => {
      if (profileChannel) {
        supabase.removeChannel(profileChannel)
      }

      profileChannel = supabase
        .channel(`route-sync:profiles:id=eq.${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`,
          },
          async () => {
            await loadProfile(userId)
          }
        )
        .subscribe()
    }

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user || !isMounted) {
        return
      }

      await loadProfile(session.user.id)
      subscribeToProfile(session.user.id)
    }

    init().catch((error) => {
      console.error('Profile route sync init failed:', error)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        if (profileChannel) {
          supabase.removeChannel(profileChannel)
          profileChannel = null
        }
        return
      }

      void loadProfile(session.user.id)
      subscribeToProfile(session.user.id)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
      if (profileChannel) {
        supabase.removeChannel(profileChannel)
      }
    }
  }, [pathname, router])

  return null
}
