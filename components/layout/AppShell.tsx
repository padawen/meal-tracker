'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import { AuthGuard, useAuth } from '@/components/auth/AuthGuard'
import { TopBar } from '@/components/layout/TopBar'

type SectionKey = 'kaja' | 'stats' | 'admin'

function getCurrentSection(pathname: string): SectionKey {
  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname.startsWith('/statistics')) return 'stats'
  return 'kaja'
}

function ShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { isAdmin } = useAuth()

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <TopBar currentPage={getCurrentSection(pathname)} isAdmin={isAdmin} />
      <main className="pt-32 pb-8 px-4 max-w-lg mx-auto">{children}</main>
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <ShellContent>{children}</ShellContent>
    </AuthGuard>
  )
}
