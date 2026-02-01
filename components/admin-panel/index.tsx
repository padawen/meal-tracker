"use client"

import { useState, useEffect } from "react"
import { Shield, Check, X, Clock, Mail, User, Loader2, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { HolidaysManager } from "./HolidaysManager"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface UserData {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_admin: boolean
  is_approved: boolean
  created_at: string
}

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"users" | "holidays">("users")
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

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
  }, [])

  const handleApprove = async (userId: string) => {
    try {


      const { data, error } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', userId)
        .select()



      if (error) throw error

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
  }

  const handleReject = async (userId: string) => {
    try {


      const { data, error } = await supabase
        .from('profiles')
        .update({ is_approved: false })
        .eq('id', userId)
        .select()



      if (error) throw error

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_approved: false } : u))
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

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return email.charAt(0).toUpperCase()
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
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#1F2937]">Admin Panel</h1>
            <p className="text-sm text-[#6B7280]">Felhasználók és szünnapok kezelése</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-1 shadow-sm inline-flex">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer ${activeTab === "users"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-[#6B7280] hover:text-[#1F2937]"
              }`}
          >
            <User className="w-4 h-4" />
            Felhasználók
          </button>
          <button
            onClick={() => setActiveTab("holidays")}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer ${activeTab === "holidays"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-[#6B7280] hover:text-[#1F2937]"
              }`}
          >
            <Calendar className="w-4 h-4" />
            Szünnapok
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === "holidays" ? (
        <HolidaysManager />
      ) : (
        <>
          {/* Info Card */}
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

          {/* Pending Users */}
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
                    {/* Unified Mobile-style layout */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-amber-100 text-amber-700 text-sm font-medium">
                            {getInitials(user.full_name, user.email)}
                          </AvatarFallback>
                        </Avatar>
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
                          onClick={() => handleApprove(user.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-9 cursor-pointer"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Engedélyez
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(user.id)}
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

          {/* Approved Users */}
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
                    {/* Unified Mobile-style layout */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-medium">
                            {getInitials(user.full_name, user.email)}
                          </AvatarFallback>
                        </Avatar>
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
                      {!user.is_admin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(user.id)}
                          className="w-full border-rose-300 text-rose-600 hover:bg-rose-50 rounded-lg h-9 cursor-pointer"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Visszavon
                        </Button>
                      )}
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
    </div>
  )
}
