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

  // INITIAL_SESSION is the single initialization path; repeated SIGNED_IN and
  // TOKEN_REFRESHED events for this user do not recreate the profile channel.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null
      if (activeUser.current !== (nextUser?.id ?? null)) {
        activeUser.current = nextUser?.id ?? null
        requestVersion.current++
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
  const loadProfile = useCallback(async () => {
    if (!userId || activeUser.current !== userId) return
    const version = ++requestVersion.current
    const { data, error } = await supabase.from('profiles')
      .select('id, email, full_name, avatar_url, is_admin, is_approved')
      .eq('id', userId).maybeSingle<AuthProfile>()
    if (activeUser.current !== userId || version !== requestVersion.current) return
    if (error || !data) throw error || new Error('Profile not found')
    setProfile(data)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    let active = true
    const refresh = () => {
      void loadProfile().catch((error) => {
        if (!active) return
        console.error('Failed to load auth profile:', error)
        setLoading(false)
        router.replace('/login')
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
    setUser(null)
    setProfile(null)
    await supabase.auth.signOut()
    router.replace('/login')
  }, [router])

  return { loading, profile, refreshProfile: loadProfile, signOut, user }
}
