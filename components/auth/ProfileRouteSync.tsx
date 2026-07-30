'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useOptionalAuth } from '@/components/auth/AuthGuard'

function isProtectedRoute(pathname: string) {
  return pathname === '/' || pathname.startsWith('/statistics') || pathname.startsWith('/admin')
}

function isAdminRoute(pathname: string) {
  return pathname.startsWith('/admin')
}

function isPendingApprovalRoute(pathname: string) {
  return pathname === '/pending-approval'
}

export function ProfileRouteSync() {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useOptionalAuth()

  useEffect(() => {
    if (!auth || auth.loading || !auth.profile) return

    const { isApproved, isAdmin } = auth

    if (!isApproved && isProtectedRoute(pathname) && !isPendingApprovalRoute(pathname)) {
      router.replace('/pending-approval')
      return
    }

    if (isPendingApprovalRoute(pathname) && isApproved) {
      router.replace('/')
      return
    }

    if (isAdminRoute(pathname) && !isAdmin) {
      router.replace('/')
    }
  }, [auth, pathname, router])

  return null
}
