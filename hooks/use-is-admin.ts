'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useIsAdmin() {
    const [isAdmin, setIsAdmin] = useState(false)
    const [isApproved, setIsApproved] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            
            if (!session?.user) {
                setLoading(false)
                return
            }

            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('is_admin, is_approved')
                    .eq('id', session.user.id)
                    .maybeSingle<{ is_admin: boolean; is_approved: boolean }>()

                setIsAdmin(data?.is_admin ?? false)
                setIsApproved(data?.is_approved ?? false)
            } catch (err) {
                console.error('Error checking admin:', err)
            } finally {
                setLoading(false)
            }
        }

        checkAdmin()
    }, [])

    return { isAdmin, isApproved, loading }
}
