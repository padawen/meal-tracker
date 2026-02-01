'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface AuthGuardProps {
    children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<{ is_approved: boolean; is_admin: boolean } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkUser = async () => {
            try {
                // Check sessionStorage cache first for faster loading
                const cachedAuth = sessionStorage.getItem('auth_cache')
                if (cachedAuth) {
                    try {
                        const cached = JSON.parse(cachedAuth)
                        // Use cache if it's less than 5 minutes old
                        if (cached.timestamp && Date.now() - cached.timestamp < 5 * 60 * 1000) {
                            if (cached.user) {
                                setUser(cached.user)
                                setProfile(cached.profile)
                                setLoading(false)
                                // Still verify in background but don't block
                            }
                        }
                    } catch {
                        sessionStorage.removeItem('auth_cache')
                    }
                }

                // Create a timeout promise that rejects after 10 seconds
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Auth check timeout')), 10000)
                })

                // Race the session check against the timeout
                const sessionPromise = supabase.auth.getSession()

                // Use Promise.race to prevent infinite loading
                const result = await Promise.race([sessionPromise, timeoutPromise]) as { data: { session: any }, error: any }
                const { data: { session }, error } = result

                if (error) throw error

                if (!session) {
                    sessionStorage.removeItem('auth_cache')
                    setUser(null)
                    setLoading(false)
                    router.push('/login')
                    return
                }

                setUser(session.user)

                // Check if user is approved and has a name
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('full_name, is_approved, is_admin')
                    .eq('id', session.user.id)
                    .maybeSingle<{ full_name: string | null; is_approved: boolean; is_admin: boolean }>()

                if (profileError) {
                    console.error("Error fetching profile:", profileError)
                }

                setProfile(profileData || null)

                // Cache the auth state
                sessionStorage.setItem('auth_cache', JSON.stringify({
                    user: session.user,
                    profile: profileData,
                    timestamp: Date.now()
                }))
            } catch (err) {
                console.error("Unexpected error in checkUser:", err)
                // Clear everything to be safe
                sessionStorage.removeItem('auth_cache')
                localStorage.removeItem('supabase.auth.token') // Clear Supabase's own storage

                // Sign out without awaiting to force local state cleanup
                supabase.auth.signOut().catch(() => { })

                setUser(null)
                setProfile(null)
                router.push('/login')
            } finally {
                setLoading(false)
            }
        }

        checkUser()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            try {
                if (event === 'SIGNED_OUT' || !session) {
                    sessionStorage.removeItem('auth_cache')
                    setUser(null)
                    setLoading(false)
                    router.push('/login')
                } else {
                    setUser(session.user)

                    // Check approval status and name
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('full_name, is_approved, is_admin')
                        .eq('id', session.user.id)
                        .maybeSingle<{ full_name: string | null; is_approved: boolean; is_admin: boolean }>()

                    setProfile(profileData || null)

                    // Update cache
                    sessionStorage.setItem('auth_cache', JSON.stringify({
                        user: session.user,
                        profile: profileData,
                        timestamp: Date.now()
                    }))

                    setLoading(false)
                }
            } catch (err) {
                console.error("Error in auth state change:", err)
                // In case of error during refresh, try to fail safe
                setLoading(false)
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [router])



    // Separate useEffect for realtime subscription - runs when user changes
    useEffect(() => {
        if (!user?.id) {
            return
        }

        // Listen for profile changes (realtime)
        const profileSubscription = supabase
            .channel(`profile-changes-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`
                },
                async () => {
                    // Refresh approval status and name
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('full_name, is_approved, is_admin')
                        .eq('id', user.id)
                        .maybeSingle<{ full_name: string | null; is_approved: boolean; is_admin: boolean }>()

                    setProfile(profileData || null)

                    // Update cache
                    sessionStorage.setItem('auth_cache', JSON.stringify({
                        user,
                        profile: profileData,
                        timestamp: Date.now()
                    }))
                }
            )
            .subscribe()

        return () => {
            profileSubscription.unsubscribe()
        }
    }, [user])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
                    <p className="text-lg text-muted-foreground">Betöltés...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return null
    }

    // Approval Check
    const approved = !!(profile?.is_admin || profile?.is_approved)
    if (!approved) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950 p-4">
                <div className="max-w-md w-full mx-4">
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 text-center space-y-6">
                        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
                            <svg className="h-8 w-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Jóváhagyásra vár
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 text-sm">
                                A fiókod létrejött, de még egy adminisztrátornak jóvá kell hagynia a hozzáférést.
                            </p>
                        </div>
                        <div className="bg-indigo-50/50 dark:bg-indigo-900/20 rounded-lg p-4">
                            <p className="text-xs text-indigo-900 dark:text-indigo-200">
                                <strong>Email:</strong> {user.email}
                            </p>
                        </div>
                        <button
                            onClick={async () => {
                                await supabase.auth.signOut()
                                router.push('/login')
                            }}
                            className="w-full h-12 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer text-sm font-medium"
                        >
                            Kijelentkezés
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return <>{children}</>
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null)

    useEffect(() => {
        const getUser = async () => {
            const { data: { session }, error } = await supabase.auth.getSession()
            if (error) {
                console.error("Auth error in useAuth:", error)
                await supabase.auth.signOut()
                setUser(null)
            } else {
                setUser(session?.user ?? null)
            }
        }

        getUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    const signOut = async () => {
        await supabase.auth.signOut()
    }

    return { user, signOut }
}
