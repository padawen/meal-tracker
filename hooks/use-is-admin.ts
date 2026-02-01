'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthGuard'

export function useIsAdmin() {
    const { user } = useAuth()
    const [isAdmin, setIsAdmin] = useState(false)
    const [isApproved, setIsApproved] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkAdmin = async () => {
            if (!user) {
                setIsAdmin(false)
                setIsApproved(false)
                setLoading(false)
                return
            }

            setLoading(true)


            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('is_admin, is_approved')
                    .eq('id', user.id)
                    .maybeSingle<{ is_admin: boolean; is_approved: boolean }>()

                if (error) {
                    console.error('Error checking admin status:', error.message)
                    setIsAdmin(false)
                    setIsApproved(false)
                } else {
                    setIsAdmin(data?.is_admin ?? false)
                    setIsApproved(data?.is_approved ?? false)

                    if (!data) {
                        console.warn('Profile not found for user:', user.email)
                    }
                }
            } catch (err) {
                console.error('Unexpected error checking admin:', err)
                setIsAdmin(false)
                setIsApproved(false)
            } finally {
                setLoading(false)
            }
        }

        checkAdmin()
    }, [user])

    return { isAdmin, isApproved, loading }
}
