"use client"

import { useState } from "react"
import { TopBar } from "@/components/layout/TopBar"
import { MealTable } from "@/components/meal-table"
import { Statistics } from "@/components/statistics"
import { AdminPanel } from "@/components/admin-panel"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { useIsAdmin } from "@/hooks/use-is-admin"

export default function Home() {
  const [currentPage, setCurrentPage] = useState<"kaja" | "stats" | "admin">("kaja")
  const { isAdmin, loading } = useIsAdmin()

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
          <p className="text-muted-foreground">Betöltés...</p>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F9FAFB]">
        <TopBar currentPage={currentPage} onPageChange={setCurrentPage} isAdmin={isAdmin} />
        <main className="pt-32 pb-8 px-4 max-w-lg mx-auto">
          {currentPage === "kaja" && <MealTable />}
          {currentPage === "stats" && <Statistics />}
          {currentPage === "admin" && isAdmin && <AdminPanel />}
          {currentPage === "admin" && !isAdmin && (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">Nincs jogosultságod az admin panel megtekintéséhez.</p>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
