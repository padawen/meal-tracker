'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
    const router = useRouter()

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Get the code from URL and exchange it for a session
                const hashParams = new URLSearchParams(window.location.hash.substring(1))
                const code = hashParams.get('access_token')

                if (!code) {
                    // If no code, check if we already have a session
                    const { data: { session }, error } = await supabase.auth.getSession()

                    if (error || !session) {
                        console.error('Error during auth callback:', error)
                        router.push('/login?error=callback_failed')
                        return
                    }
                }

                // Successful authentication, redirect to home
                router.push('/')
            } catch (err) {
                console.error('Unexpected error:', err)
                router.push('/login?error=unexpected')
            }
        }

        handleCallback()
    }, [router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950">
            <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
                <p className="text-lg text-muted-foreground">Bejelentkezés folyamatban...</p>
            </div>
        </div>
    )
}
