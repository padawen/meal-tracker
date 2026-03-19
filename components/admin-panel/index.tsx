"use client"

import { useState, useEffect, useTransition } from "react"
import { Shield, Check, X, Clock, Mail, User, Loader2, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HolidaysManager } from "./HolidaysManager"
import { supabase } from '@/lib/supabase/client'
import { useToast } from "@/hooks/use-toast"
import { approveUserAction, rejectUserAction, toggleAdminAction } from "@/app/actions/admin-actions"
import { TabNavigation, UserAvatar } from "@/components/shared"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface UserData {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_admin: boolean
  is_approved: boolean
  created_at: string
}

const MASTER_ADMIN_IDS = process.env.NEXT_PUBLIC_MASTER_ADMIN_IDS?.split(',').map(id => id.trim()) || []

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"users" | "holidays">("users")
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserProfile, setCurrentUserProfile] = useState<UserData | null>(null)
  const [confirmData, setConfirmData] = useState<{ id: string, name: string, type: 'admin' | 'reject' | 'approve', isAdmin?: boolean } | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const fetchCurrentUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setCurrentUserProfile(data)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a felhasználókat",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchCurrentUserProfile()
  }, [])

  const handleApprove = async (userId: string) => {
    if (!currentUserProfile) return

    startTransition(async () => {
      try {
        await approveUserAction(userId, currentUserProfile.id)

        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_approved: true } : u))
        toast({
          title: "Sikeres jóváhagyás",
          description: "A felhasználó hozzáférése engedélyezve lett",
        })
      } catch (error) {
        console.error('Error approving user:', error)
        toast({
          title: "Hiba",
          description: "Nem sikerült jóváhagyni a felhasználót",
          variant: "destructive"
        })
      }
    })
  }

  const handleReject = async (userId: string) => {
    if (!currentUserProfile) return

    startTransition(async () => {
      try {
        await rejectUserAction(userId, currentUserProfile.id)

        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_approved: false, is_admin: false } : u))
        toast({
          title: "Elutasítva",
          description: "A felhasználó hozzáférése visszavonva",
        })
      } catch (error) {
        console.error('Error rejecting user:', error)
        toast({
          title: "Hiba",
          description: "Nem sikerült elutasítani a felhasználót",
          variant: "destructive"
        })
      }
    })
  }

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    if (!currentUserProfile) return

    if (userId === currentUserProfile.id) {
      toast({
        title: "Figyelem",
        description: "Saját magadtól nem vonhatod meg az admin jogot",
        variant: "destructive"
      })
      return
    }

    startTransition(async () => {
      try {
        await toggleAdminAction(userId, currentIsAdmin, currentUserProfile.id)

        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: !currentIsAdmin } : u))
        toast({
          title: !currentIsAdmin ? "Admin jog megadva" : "Admin jog visszavonva",
          description: "A felhasználó jogosultságai frissültek",
        })
      } catch (error) {
        console.error('Error toggling admin:', error)
        toast({
          title: "Hiba",
          description: "Nem sikerült módosítani a jogosultságokat",
          variant: "destructive"
        })
      }
    })
  }

  const getStatusBadge = (user: UserData) => {
    if (user.is_admin) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
          <Shield className="w-3 h-3" />
          Admin
        </span>
      )
    }

    if (user.is_approved) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          <Check className="w-3 h-3" />
          Engedélyezve
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        <Clock className="w-3 h-3" />
        Függőben
      </span>
    )
  }

  const pendingUsers = users.filter((u) => !u.is_approved && !u.is_admin)
  const approvedUsers = users.filter((u) => u.is_approved || u.is_admin)

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
        <>
          <div className="bg-indigo-50 rounded-2xl border border-indigo-200 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-sm text-indigo-800">
                Csak az engedélyezett felhasználók tudják használni az alkalmazást. A függőben lévő kérelmeket itt lehet
                jóváhagyni vagy elutasítani.
              </p>
            </div>
          </div>

          {pendingUsers.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5E7EB] bg-amber-50">
                <h2 className="font-semibold text-[#1F2937] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Függőben lévő kérelmek ({pendingUsers.length})
                </h2>
              </div>
              <div className="divide-y divide-[#E5E7EB]">
                {pendingUsers.map((user) => (
                  <div key={user.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar avatarUrl={user.avatar_url} name={user.full_name || user.email} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#1F2937]">
                            {user.full_name || user.email.split('@')[0]}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-[#6B7280] flex items-center gap-1 break-all">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        {user.email}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setConfirmData({
                              id: user.id,
                              name: user.full_name || user.email.split('@')[0],
                              type: 'approve'
                            })
                            setIsConfirmOpen(true)
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-9 cursor-pointer"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Engedélyez
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setConfirmData({
                              id: user.id,
                              name: user.full_name || user.email.split('@')[0],
                              type: 'reject'
                            })
                            setIsConfirmOpen(true)
                          }}
                          className="flex-1 border-rose-300 text-rose-600 hover:bg-rose-50 rounded-lg h-9 cursor-pointer"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Elutasít
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB]">
              <h2 className="font-semibold text-[#1F2937] flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                Engedélyezett felhasználók ({approvedUsers.length})
              </h2>
            </div>
            {approvedUsers.length > 0 ? (
              <div className="divide-y divide-[#E5E7EB]">
                {approvedUsers.map((user) => (
                  <div key={user.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar avatarUrl={user.avatar_url} name={user.full_name || user.email} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#1F2937]">
                            {user.full_name || user.email.split('@')[0]}
                          </p>
                          {getStatusBadge(user)}
                        </div>
                      </div>
                      <p className="text-sm text-[#6B7280] flex items-center gap-1 break-all">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        {user.email}
                      </p>
                      {(() => {
                        const isMasterAdmin = currentUserProfile && MASTER_ADMIN_IDS.includes(currentUserProfile.id)
                        const isTargetAdmin = user.is_admin
                        const isTargetMaster = MASTER_ADMIN_IDS.includes(user.id)

                        if (isTargetMaster) return null

                        if (isTargetAdmin) {
                          if (isMasterAdmin) {
                            return (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setConfirmData({
                                    id: user.id,
                                    name: user.full_name || user.email.split('@')[0],
                                    type: 'admin',
                                    isAdmin: true
                                  })
                                  setIsConfirmOpen(true)
                                }}
                                className="w-full border-purple-300 text-purple-600 hover:bg-purple-50 rounded-lg h-9 cursor-pointer"
                              >
                                <Shield className="w-4 h-4 mr-1" />
                                Admin jog visszavonása
                              </Button>
                            )
                          }
                          return null
                        }

                        return (
                          <div className="flex gap-2">
                            {isMasterAdmin && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setConfirmData({
                                    id: user.id,
                                    name: user.full_name || user.email.split('@')[0],
                                    type: 'admin',
                                    isAdmin: false
                                  })
                                  setIsConfirmOpen(true)
                                }}
                                className="flex-1 border-purple-300 text-purple-600 hover:bg-purple-50 rounded-lg h-9 cursor-pointer"
                              >
                                <Shield className="w-4 h-4 mr-1" />
                                Admin jog
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setConfirmData({
                                  id: user.id,
                                  name: user.full_name || user.email.split('@')[0],
                                  type: 'reject'
                                })
                                setIsConfirmOpen(true)
                              }}
                              className="flex-1 border-rose-300 text-rose-600 hover:bg-rose-50 rounded-lg h-9 cursor-pointer"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Visszavon
                            </Button>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-[#F3F4F6] flex items-center justify-center mx-auto mb-3">
                  <User className="w-6 h-6 text-[#9CA3AF]" />
                </div>
                <p className="text-sm text-[#6B7280]">Még nincsenek engedélyezett felhasználók.</p>
              </div>
            )}
          </div>
        </>
      )}

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmData?.type === 'admin'
                ? (confirmData?.isAdmin ? "Admin jog visszavonása" : "Admin jog megadása")
                : confirmData?.type === 'approve'
                  ? "Felhasználó jóváhagyása"
                  : "Hozzáférés visszavonása"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmData?.type === 'admin' ? (
                <>
                  Biztosan {confirmData?.isAdmin ? "visszavonod" : "megadod"} az adminisztrátori jogosultságot
                  <span className="font-semibold text-gray-900 mx-1">
                    {confirmData?.name}
                  </span>
                  részére?
                </>
              ) : confirmData?.type === 'approve' ? (
                <>
                  Biztosan jóváhagyod
                  <span className="font-semibold text-gray-900 mx-1">
                    {confirmData?.name}
                  </span>
                  hozzáférését az alkalmazáshoz?
                </>
              ) : (
                <>
                  Biztosan elutasítod vagy visszavonod a hozzáférést
                  <span className="font-semibold text-gray-900 mx-1">
                    {confirmData?.name}
                  </span>
                  felhasználótól? Ezt követően nem tudja majd használni az alkalmazást.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Mégse</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmData) return
                if (confirmData.type === 'admin') {
                  handleToggleAdmin(confirmData.id, confirmData.isAdmin || false)
                } else if (confirmData.type === 'approve') {
                  handleApprove(confirmData.id)
                } else {
                  handleReject(confirmData.id)
                }
              }}
              className={`${confirmData?.type === 'reject' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white cursor-pointer`}
            >
              Mehet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
