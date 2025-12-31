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
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                router.push('/login')
                return
            }

            setUser(session.user)

            // Check if user is approved
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_approved, is_admin')
                .eq('id', session.user.id)
                .maybeSingle<{ is_approved: boolean; is_admin: boolean }>()

            // Admins are always approved
            if (profile?.is_admin || profile?.is_approved) {
                setIsApproved(true)
            }

            setLoading(false)
        }

        checkUser()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!session) {
                router.push('/login')
            } else {
                setUser(session.user)

                // Check approval status
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_approved, is_admin')
                    .eq('id', session.user.id)
                    .maybeSingle<{ is_approved: boolean; is_admin: boolean }>()

                if (profile?.is_admin || profile?.is_approved) {
                    setIsApproved(true)
                } else {
                    setIsApproved(false)
                }

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
            console.log('No user ID, skipping realtime subscription')
            return
        }

        console.log('Setting up realtime subscription for user:', user.id)

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
                async (payload) => {
                    console.log('🔥 Profile updated via realtime:', payload)
                    // Refresh approval status
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('is_approved, is_admin')
                        .eq('id', user.id)
                        .maybeSingle<{ is_approved: boolean; is_admin: boolean }>()

                    console.log('Refreshed profile data:', profile)

                    if (profile?.is_admin || profile?.is_approved) {
                        console.log('✅ User is now approved!')
                        setIsApproved(true)
                    } else {
                        console.log('❌ User is not approved')
                        setIsApproved(false)
                    }
                }
            )
            .subscribe((status) => {
                console.log('Realtime subscription status:', status)
            })

        return () => {
            console.log('Unsubscribing from realtime for user:', user.id)
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
            const { data: { session } } = await supabase.auth.getSession()
            setUser(session?.user ?? null)
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
