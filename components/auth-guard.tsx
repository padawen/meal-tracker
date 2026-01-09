'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface AuthGuardProps {
    children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [isApproved, setIsApproved] = useState(false)
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
                                setIsApproved(cached.isApproved)
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

                // Check if user is approved
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('is_approved, is_admin')
                    .eq('id', session.user.id)
                    .maybeSingle<{ is_approved: boolean; is_admin: boolean }>()

                if (profileError) {
                    console.error("Error fetching profile:", profileError)
                }

                // Admins are always approved
                const approved = !!(profile?.is_admin || profile?.is_approved)
                setIsApproved(approved)

                // Cache the auth state
                sessionStorage.setItem('auth_cache', JSON.stringify({
                    user: session.user,
                    isApproved: approved,
                    timestamp: Date.now()
                }))
            } catch (err) {
                console.error("Unexpected error in checkUser:", err)
                sessionStorage.removeItem('auth_cache')
                // Don't await signOut, as it might hang if network is down
                supabase.auth.signOut()
                setUser(null)
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

                    // Check approval status
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('is_approved, is_admin')
                        .eq('id', session.user.id)
                        .maybeSingle<{ is_approved: boolean; is_admin: boolean }>()

                    const approved = !!(profile?.is_admin || profile?.is_approved)
                    setIsApproved(approved)

                    // Update cache
                    sessionStorage.setItem('auth_cache', JSON.stringify({
                        user: session.user,
                        isApproved: approved,
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
                    // Refresh approval status
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('is_approved, is_admin')
                        .eq('id', user.id)
                        .maybeSingle<{ is_approved: boolean; is_admin: boolean }>()

                    const approved = !!(profile?.is_admin || profile?.is_approved)
                    setIsApproved(approved)

                    // Update cache
                    sessionStorage.setItem('auth_cache', JSON.stringify({
                        user,
                        isApproved: approved,
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

    // Show pending approval screen if user is not approved
    if (!isApproved) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950">
                <div className="max-w-md w-full mx-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center space-y-6">
                        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
                            <Loader2 className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Jóváhagyásra vár
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300">
                                A fiókod létrejött, de még egy adminisztrátornak jóvá kell hagynia a hozzáférést.
                            </p>
                        </div>
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-4">
                            <p className="text-sm text-indigo-900 dark:text-indigo-200">
                                <strong>Email:</strong> {user.email}
                            </p>
                        </div>
                        <button
                            onClick={async () => {
                                await supabase.auth.signOut()
                                router.push('/login')
                            }}
                            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
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
