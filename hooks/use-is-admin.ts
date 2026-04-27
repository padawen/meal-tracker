'use client'

import { useAuth } from '@/components/auth/AuthGuard'

export function useIsAdmin() {
    const { isAdmin, isApproved, loading } = useAuth()
    return { isAdmin, isApproved, loading }
}
