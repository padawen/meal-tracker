'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase/client'
import type { AuthProfile } from '@/components/auth/types'

export function useAuthSessionProfile() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const activeUser = useRef<string | null>(null)
  const requestVersion = useRef(0)
  const currentProfile = useRef<AuthProfile | null>(null)
  const pendingProfile = useRef<{
    userId: string; version: number; again: boolean; promise: Promise<void>
  } | null>(null)

  // INITIAL_SESSION is the single initialization path; repeated SIGNED_IN and
  // TOKEN_REFRESHED events for this user do not recreate the profile channel.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null
      if (activeUser.current !== (nextUser?.id ?? null)) {
        activeUser.current = nextUser?.id ?? null
        requestVersion.current++
        currentProfile.current = null
        setProfile(null)
        setLoading(Boolean(nextUser))
      }
      setUser(nextUser)
      if (!nextUser) {
        setLoading(false)
        router.replace('/login')
      }
    })
    return () => {
      subscription.unsubscribe()
      activeUser.current = null
      requestVersion.current++
    }
  }, [router])

  const userId = user?.id
  const loadProfile = useCallback((): Promise<void> => {
    if (!userId || activeUser.current !== userId) return Promise.resolve()
    const pending = pendingProfile.current
    if (pending?.userId === userId && pending.version === requestVersion.current) {
      // One authoritative result for manual refresh and Realtime. Queue one
      // trailing read if an UPDATE arrived after the current read started.
      pending.again = true
      return pending.promise
    }
    const request = { userId, version: ++requestVersion.current, again: false, promise: Promise.resolve() }
    pendingProfile.current = request
    request.promise = (async () => {
      let nextProfile: AuthProfile
      do {
        request.again = false
        const { data, error } = await supabase.from('profiles')
          .select('id, email, full_name, avatar_url, is_admin, is_approved')
          .eq('id', userId).maybeSingle<AuthProfile>()
        if (activeUser.current !== userId || request.version !== requestVersion.current) return
        if (error || !data) throw error || new Error('Profile not found')
        nextProfile = data
      } while (request.again)
      currentProfile.current = nextProfile
      setProfile(nextProfile)
      setLoading(false)
    })().finally(() => {
      if (pendingProfile.current === request) pendingProfile.current = null
    })
    return request.promise
  }, [userId])

  useEffect(() => {
    if (!userId) return
    let active = true
    const refresh = () => {
      void loadProfile().catch((error) => {
        if (!active) return
        console.error('Failed to load auth profile:', error)
        setLoading(false)
        // A temporary background failure must not destroy an already loaded
        // session or the profile editor's draft/retry state.
        if (!currentProfile.current) router.replace('/login')
      })
    }
    // A unique topic also isolates Strict Mode's delayed asynchronous cleanup.
    const channel = supabase.channel(`profile:${userId}:${crypto.randomUUID()}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}`,
      }, refresh).subscribe()
    refresh()
    return () => {
      active = false
      requestVersion.current++
      void supabase.removeChannel(channel)
    }
  }, [loadProfile, router, userId])

  const avatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture
  useEffect(() => {
    if (!userId || !profile || !avatar || profile.avatar_url === avatar) return
    void supabase.from('profiles').update({ avatar_url: avatar }).eq('id', userId)
      .then(({ error }) => { if (error) console.error('Failed background avatar sync:', error) })
  }, [avatar, profile, userId])

  const signOut = useCallback(async () => {
    activeUser.current = null
    requestVersion.current++
    currentProfile.current = null
    setUser(null)
    setProfile(null)
    await supabase.auth.signOut()
    router.replace('/login')
  }, [router])

  return { loading, profile, refreshProfile: loadProfile, signOut, user }
}
