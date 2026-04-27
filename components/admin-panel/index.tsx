"use client"

import { useEffect, useState, useTransition } from "react"
import { Loader2 } from "lucide-react"

import { approveUserAction, rejectUserAction, toggleAdminAction } from "@/app/actions/admin-actions"
import { useAuth } from "@/components/auth/AuthGuard"
import { TabNavigation } from "@/components/shared"
import { supabase } from "@/lib/supabase/client"
import { publicEnv } from "@/lib/env"
import { useToast } from "@/hooks/use-toast"

import { AdminActionDialog } from "./AdminActionDialog"
import { HolidaysManager } from "./HolidaysManager"
import type { AdminConfirmData, UserData } from "./types"
import { UsersManagementSection } from "./UsersManagementSection"

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"users" | "holidays">("users")
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmData, setConfirmData] = useState<AdminConfirmData | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const { profile: currentUserProfile } = useAuth()

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })

        if (error) {
          throw error
        }

        setUsers(data || [])
      } catch (error) {
        console.error("Error fetching users:", error)
        toast({
          title: "Hiba",
          description: "Nem sikerült betölteni a felhasználókat",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    void fetchUsers()
  }, [])

  const handleApprove = async (userId: string) => {
    startTransition(async () => {
      try {
        await approveUserAction(userId)

        setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, is_approved: true } : user)))
        toast({
          title: "Sikeres jóváhagyás",
          description: "A felhasználó hozzáférése engedélyezve lett",
        })
      } catch (error) {
        console.error("Error approving user:", error)
        toast({
          title: "Hiba",
          description: "Nem sikerült jóváhagyni a felhasználót",
          variant: "destructive",
        })
      }
    })
  }

  const handleReject = async (userId: string) => {
    startTransition(async () => {
      try {
        await rejectUserAction(userId)

        setUsers((prev) =>
          prev.map((user) => (user.id === userId ? { ...user, is_approved: false, is_admin: false } : user))
        )
        toast({
          title: "Elutasítva",
          description: "A felhasználó hozzáférése visszavonva",
        })
      } catch (error) {
        console.error("Error rejecting user:", error)
        toast({
          title: "Hiba",
          description: "Nem sikerült elutasítani a felhasználót",
          variant: "destructive",
        })
      }
    })
  }

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    if (userId === currentUserProfile.id) {
      toast({
        title: "Figyelem",
        description: "Saját magadtól nem vonhatod meg az admin jogot",
        variant: "destructive",
      })
      return
    }

    startTransition(async () => {
      try {
        await toggleAdminAction(userId, currentIsAdmin)

        setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, is_admin: !currentIsAdmin } : user)))
        toast({
          title: !currentIsAdmin ? "Admin jog megadva" : "Admin jog visszavonva",
          description: "A felhasználó jogosultságai frissültek",
        })
      } catch (error) {
        console.error("Error toggling admin:", error)
        toast({
          title: "Hiba",
          description: "Nem sikerült módosítani a jogosultságokat",
          variant: "destructive",
        })
      }
    })
  }

  const handleRequestAction = (data: AdminConfirmData) => {
    setConfirmData(data)
    setIsConfirmOpen(true)
  }

  const handleConfirm = (data: AdminConfirmData) => {
    if (data.type === "admin") {
      void handleToggleAdmin(data.id, data.isAdmin || false)
      return
    }

    if (data.type === "approve") {
      void handleApprove(data.id)
      return
    }

    void handleReject(data.id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <TabNavigation
        tabs={[
          { key: "users", label: "Felhasználók" },
          { key: "holidays", label: "Szünnapok" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        size="sm"
      />

      {activeTab === "holidays" ? (
        <HolidaysManager />
      ) : (
        <UsersManagementSection
          currentUserId={currentUserProfile.id}
          isCurrentUserMasterAdmin={publicEnv.masterAdminIds.includes(currentUserProfile.id)}
          masterAdminIds={publicEnv.masterAdminIds}
          onRequestAction={handleRequestAction}
          users={users}
        />
      )}

      <AdminActionDialog
        confirmData={confirmData}
        isOpen={isConfirmOpen}
        isPending={isPending}
        onConfirm={handleConfirm}
        onOpenChange={setIsConfirmOpen}
      />
    </div>
  )
}
