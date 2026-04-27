'use client'

import React, { createContext, useContext } from 'react'

import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'
import type { AuthContextValue } from '@/components/auth/types'
import { useAuthSessionProfile } from '@/components/auth/useAuthSessionProfile'

interface AuthGuardProps {
    children: React.ReactNode
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthGuard({ children }: AuthGuardProps) {
    const { loading, profile, refreshProfile, signOut, user } = useAuthSessionProfile()

    if (loading) {
        return <AuthLoadingScreen />
    }

    if (!user || !profile) return null

    const isAdmin = profile.is_admin
    const isApproved = profile.is_admin || profile.is_approved

    const value: AuthContextValue = {
        user,
        profile,
        isAdmin,
        isApproved,
        loading,
        refreshProfile,
        signOut,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const value = useContext(AuthContext)

    if (!value) {
        throw new Error('useAuth must be used within AuthGuard')
    }

    return value
}
