'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase/client'
import type { AuthProfile } from '@/components/auth/types'

export function useAuthSessionProfile() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, is_admin, is_approved')
      .eq('id', userId)
      .maybeSingle<AuthProfile>()

    if (error || !data) {
      throw error || new Error('Profile not found')
    }

    setProfile(data)
    return data
  }, [])

  const syncAvatar = useCallback(async (userToSync: User) => {
    const freshAvatar = userToSync.user_metadata?.avatar_url || userToSync.user_metadata?.picture || null
    if (!freshAvatar) return

    await supabase.from('profiles').update({ avatar_url: freshAvatar }).eq('id', userToSync.id)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return
    await loadProfile(user.id)
  }, [loadProfile, user?.id])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    router.push('/login')
  }, [router])

  useEffect(() => {
    let isMounted = true
    let profileChannel: ReturnType<typeof supabase.channel> | null = null

    const subscribeToProfile = (userId: string) => {
      if (profileChannel) {
        supabase.removeChannel(profileChannel)
      }

      profileChannel = supabase
        .channel(`public:profiles:id=eq.${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`,
          },
          async () => {
            if (isMounted) {
              await loadProfile(userId)
            }
          }
        )
        .subscribe()
    }

    const hydrateAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user) {
          if (isMounted) {
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
          router.push('/login')
          return
        }

        if (isMounted) {
          setUser(session.user)
        }

        await loadProfile(session.user.id)
        await syncAvatar(session.user)
        subscribeToProfile(session.user.id)
      } catch (error) {
        console.error('Auth guard initialization failed:', error)
        if (isMounted) {
          setUser(null)
          setProfile(null)
        }
        router.push('/login')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    hydrateAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null)
        setProfile(null)
        if (profileChannel) supabase.removeChannel(profileChannel)
        router.push('/login')
        return
      }

      setUser(session.user)
      loadProfile(session.user.id).catch((error) => {
        console.error('Failed to refresh auth profile:', error)
      })
      subscribeToProfile(session.user.id)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
      if (profileChannel) supabase.removeChannel(profileChannel)
    }
  }, [loadProfile, router, syncAvatar])

  return {
    loading,
    profile,
    refreshProfile,
    signOut,
    user,
  }
}
