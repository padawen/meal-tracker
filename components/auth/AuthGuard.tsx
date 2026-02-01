'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface AuthGuardProps {
    children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
    const router = useRouter()
    // Start with checked=true if we already checked before (sessionStorage)
    const [checked, setChecked] = useState(() => {
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem('auth_checked') === 'yes'
        }
        return false
    })
    const [user, setUser] = useState<User | null>(null)
    const [approved, setApproved] = useState(true) // optimistic

    useEffect(() => {
        const check = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                sessionStorage.removeItem('auth_checked')
                router.push('/login')
                return
            }

            setUser(session.user)

            const { data } = await supabase
                .from('profiles')
                .select('is_approved, is_admin')
                .eq('id', session.user.id)
                .maybeSingle<{ is_approved: boolean; is_admin: boolean }>()

            setApproved(!!(data?.is_admin || data?.is_approved))
            sessionStorage.setItem('auth_checked', 'yes')
            setChecked(true)
        }

        check()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
                sessionStorage.removeItem('auth_checked')
                setUser(null)
                router.push('/login')
            } else {
                setUser(session.user)
            }
        })

        return () => subscription.unsubscribe()
    }, [router])

    if (!checked) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            </div>
        )
    }

    if (!user) return null

    if (!approved) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-4 max-w-md">
                    <h2 className="text-xl font-bold">Jóváhagyásra vár</h2>
                    <p className="text-gray-600 text-sm">Egy adminnak jóvá kell hagynia a hozzáférést.</p>
                    <button
                        onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
                        className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
                    >
                        Kijelentkezés
                    </button>
                </div>
            </div>
        )
    }

    return <>{children}</>
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null)
    const router = useRouter()

    useEffect(() => {
        let isMounted = true;
        
        const fetchSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (isMounted) setUser(session?.user ?? null);
            } catch (err) {
                console.error('Auth check failed:', err);
                if (isMounted) setUser(null);
            }
        };

        fetchSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
            if (isMounted) setUser(s?.user ?? null);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [])

    const signOut = async () => {
        try {
            sessionStorage.removeItem('auth_checked');
            await supabase.auth.signOut();
            router.push('/login');
        } catch (err) {
            console.error('Sign out error:', err);
            // Fallback clear
            sessionStorage.clear();
            router.push('/login');
        }
    };

    return { user, signOut }
}
