"use client"

import { UtensilsCrossed, Check, LogOut } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/components/auth-guard"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TopBarProps {
  currentPage: "kaja" | "stats" | "admin"
  onPageChange: (page: "kaja" | "stats" | "admin") => void
  isAdmin: boolean
}

export function TopBar({ currentPage, onPageChange, isAdmin }: TopBarProps) {
  const { user, signOut } = useAuth()

  const pageTitle = {
    kaja: "Kaja tábla",
    stats: "Statisztika",
    admin: "Admin",
  }

  // Get first name from user metadata
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Felhasználó'
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + App Name */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <div className="relative">
                <UtensilsCrossed className="w-4 h-4 text-white" />
                <Check className="w-2.5 h-2.5 text-white absolute -bottom-0.5 -right-1 stroke-[3]" />
              </div>
            </div>
            <span className="font-semibold text-[#1F2937] hidden sm:block">Személyzeti</span>
          </div>

          {/* Center Title - Mobile Only */}
          <h1 className="text-base font-semibold text-[#1F2937] md:hidden absolute left-1/2 -translate-x-1/2">Személyzeti</h1>

          {/* Navigation */}
          <nav className="flex items-center gap-2">
            <div className="hidden md:flex items-center bg-[#F3F4F6] rounded-xl p-1">
              <button
                onClick={() => onPageChange("kaja")}
                className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${currentPage === "kaja" ? "bg-white text-[#1F2937] shadow-sm" : "text-[#6B7280] hover:text-[#1F2937]"
                  }`}
              >
                Kaja tábla
              </button>
              <button
                onClick={() => onPageChange("stats")}
                className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${currentPage === "stats" ? "bg-white text-[#1F2937] shadow-sm" : "text-[#6B7280] hover:text-[#1F2937]"
                  }`}
              >
                Statisztika
              </button>
              {isAdmin && (
                <button
                  onClick={() => onPageChange("admin")}
                  className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${currentPage === "admin"
                    ? "bg-white text-[#1F2937] shadow-sm"
                    : "text-[#6B7280] hover:text-[#1F2937]"
                    }`}
                >
                  Admin
                </button>
              )}
            </div>

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <span className="text-sm text-[#6B7280]">
                    Szia, <span className="hidden md:inline font-medium text-[#1F2937]">{firstName}</span>
                  </span>
                  <Avatar className="w-9 h-9 ring-2 ring-[#E5E7EB] ring-offset-2">
                    <AvatarImage src={avatarUrl} alt={firstName} />
                    <AvatarFallback className="bg-indigo-100 text-indigo-600 text-sm font-medium">
                      {firstName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.user_metadata?.full_name || firstName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Kijelentkezés</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center justify-center pb-3 -mt-1">
          <div className="flex items-center bg-[#F3F4F6] rounded-xl p-1">
            <button
              onClick={() => onPageChange("kaja")}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${currentPage === "kaja" ? "bg-white text-[#1F2937] shadow-sm" : "text-[#6B7280]"
                }`}
            >
              Kaja
            </button>
            <button
              onClick={() => onPageChange("stats")}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${currentPage === "stats" ? "bg-white text-[#1F2937] shadow-sm" : "text-[#6B7280]"
                }`}
            >
              Statisztika
            </button>
            {isAdmin && (
              <button
                onClick={() => onPageChange("admin")}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${currentPage === "admin" ? "bg-white text-[#1F2937] shadow-sm" : "text-[#6B7280]"
                  }`}
              >
                Admin
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
