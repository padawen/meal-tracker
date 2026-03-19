"use client"

import { useState, useEffect, useTransition } from "react"
import { UtensilsCrossed, LogOut, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import { UserAvatar, TabNavigation } from "@/components/shared"
import { useAuth } from "@/components/auth/AuthGuard"
import { supabase } from '@/lib/supabase/client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { updateProfileAction } from "@/app/actions/user-actions"

interface TopBarProps {
  currentPage: "kaja" | "stats" | "admin"
  onPageChange: (page: "kaja" | "stats" | "admin") => void
  isAdmin: boolean
}

export function TopBar({ currentPage, onPageChange, isAdmin }: TopBarProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [dbName, setDbName] = useState<string | null>(null)
  const [nicknameInput, setNicknameInput] = useState("")
  const [isPending, startTransition] = useTransition()


  useEffect(() => {
    if (user?.id) {
      supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle().then(({ data }) => {
        if (data?.full_name) {
          setDbName(data.full_name)
        }
      })
    }
  }, [user?.id])

  const handleSaveProfile = async () => {
    if (!user) return

    let newName = nicknameInput.trim()
    if (newName === "") {
      newName = user.user_metadata?.full_name || ""
    }

    const finalValue = newName === "" ? null : newName

    startTransition(async () => {
      try {
        await updateProfileAction(finalValue, user.id)
        setDbName(finalValue)
        setIsProfileOpen(false)
      } catch (error) {
        console.error('Error updating profile:', error)
      }
    })
  }

  const openProfileSettings = () => {
    setNicknameInput(dbName || "")
    setIsProfileOpen(true)
  }

  const pageTitle = {
    kaja: "Kaja tábla",
    stats: "Statisztika",
    admin: "Admin",
  }

  const firstGoogleName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Felhasználó'

  const displayFirstName = dbName ? dbName.split(' ')[0] : firstGoogleName
  const displayFullName = dbName || user?.user_metadata?.full_name || firstGoogleName
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#E5E7EB]">
      <div className="max-w-lg mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => {
              sessionStorage.removeItem('auth_checked');
              router.push('/');
            }}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <UtensilsCrossed className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-[#1F2937]">Személyzeti</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                <span className="text-sm text-[#6B7280]">
                  Szia, <span className="font-medium text-[#1F2937]">{displayFirstName}</span>
                </span>
                <UserAvatar avatarUrl={avatarUrl} name={displayFirstName} size="md" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{displayFullName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={openProfileSettings} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Profil beállítások</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Kijelentkezés</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-center pb-3 -mt-1">
          <TabNavigation
            tabs={[
              { key: "kaja", label: "Kaja" },
              { key: "stats", label: "Statisztika" },
              ...(isAdmin ? [{ key: "admin" as const, label: "Admin" }] : []),
            ]}
            activeTab={currentPage}
            onTabChange={onPageChange}
            size="sm"
          />
        </div>
      </div>

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Profil beállítások</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="nickname" className="text-sm font-medium text-gray-700">
                Becenév / Teljes név
              </label>
              <Input
                id="nickname"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder="Pl.: Niki, vagy Minta János..."
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Ha üresen hagyod, az eredeti regisztrált neved (vagy email címed) fog megjelenni.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileOpen(false)} disabled={isPending} className="cursor-pointer">
              Mégse
            </Button>
            <Button onClick={handleSaveProfile} disabled={isPending} className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white">
              {isPending ? "Mentés..." : "Mentés"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  )
}
