"use client"

import { useState, useEffect } from "react"
import { Calendar, CheckCircle2, XCircle, AlertCircle, Flame, Loader2 } from "lucide-react"
import { DayModal } from "@/components/day-modal"
import { ConfettiEffect } from "@/components/confetti-effect"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-guard"
import { useToast } from "@/hooks/use-toast"

type FoodStatus = "volt" | "nem" | "empty"

interface DayData {
  date: Date
  status: FoodStatus
  food?: string
  reason?: string
  recordedBy?: string
  recordedAt?: string
  team?: "A" | "B"
  isHoliday?: boolean
  holidayName?: string
}

export function MealTable() {
  const [view, setView] = useState<"week" | "month">("week")
  const [days, setDays] = useState<DayData[]>([])
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  const today = new Date()

  // Fetch meal records from Supabase
  useEffect(() => {
    const fetchMealRecords = async () => {
      try {
        // Calculate the start of the current week (Monday)
        const dayOfWeek = today.getDay()
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Adjust when day is Sunday
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() + diff)
        startOfWeek.setHours(0, 0, 0, 0)

        // Get the start of current month
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

        // Use the earlier date (either start of week or start of month)
        let startDate = startOfWeek < startOfMonth ? startOfWeek : startOfMonth

        // Don't show dates before 2026
        const year2026Start = new Date('2026-01-01')
        if (startDate < year2026Start) {
          startDate = year2026Start
        }

        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 34) // Get 35 days

        const { data: records, error } = await supabase
          .from('meal_records')
          .select('*')
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0])
          .returns<Array<{
            id: string
            date: string
            had_meal: boolean
            meal_name: string | null
            reason: string | null
            recorded_by: string
            created_at: string
            updated_at: string
            team: string | null
          }>>()

        if (error) throw error

        // Fetch holidays
        const { data: holidays, error: holidaysError } = await supabase
          .from('holidays')
          .select('date, name')
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0])

        if (holidaysError) throw holidaysError

        // Create a map of holidays by date
        const holidaysMap = new Map(
          holidays?.map(h => [h.date, h.name]) || []
        )

        // Create a map of records by date
        const recordsMap = new Map(
          records?.map(r => [r.date, r]) || []
        )

        // Generate days array starting from startDate
        const daysArray: DayData[] = []
        for (let i = 0; i < 35; i++) {
          const date = new Date(startDate)
          date.setDate(date.getDate() + i)
          const dateStr = date.toISOString().split('T')[0]
          const record = recordsMap.get(dateStr)
          const holidayName = holidaysMap.get(dateStr)

          let status: FoodStatus = "empty"
          let food: string | undefined
          let reason: string | undefined
          let recordedBy: string | undefined
          let recordedAt: string | undefined
          let team: "A" | "B" | undefined

          if (record) {
            status = record.had_meal ? "volt" : "nem"
            food = record.meal_name || undefined
            reason = record.reason || undefined
            team = (record.team as "A" | "B") || undefined

            // Get the user who recorded it
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', record.recorded_by)
              .single<{ full_name: string | null; email: string }>()

            recordedBy = profile?.full_name || profile?.email?.split('@')[0] || 'Ismeretlen'
            recordedAt = new Date(record.created_at).toLocaleTimeString('hu-HU', {
              hour: '2-digit',
              minute: '2-digit'
            })
          }

          daysArray.push({
            date,
            status,
            food,
            reason,
            recordedBy,
            recordedAt,
            team,
            isHoliday: !!holidayName,
            holidayName
          })
        }

        setDays(daysArray)
      } catch (error) {
        console.error('Error fetching meal records:', error)
        toast({
          title: "Hiba",
          description: "Nem sikerült betölteni az étkezési adatokat",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchMealRecords()
  }, [])

  // Calculate current week (Monday to Sunday containing today)
  const getCurrentWeekDays = () => {
    const dayOfWeek = today.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Monday is start of week
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() + diff)
    startOfWeek.setHours(0, 0, 0, 0)

    return days.filter(day => {
      const dayTime = day.date.getTime()
      const weekStart = startOfWeek.getTime()
      const weekEnd = weekStart + (7 * 24 * 60 * 60 * 1000) // 7 days later
      return dayTime >= weekStart && dayTime < weekEnd
    })
  }

  const currentWeekDays = getCurrentWeekDays()

  // For monthly view: show January 2026 if we're still in 2025, otherwise show current month
  const targetMonth = today.getFullYear() < 2026 ? 0 : today.getMonth() // 0 = January
  const targetYear = today.getFullYear() < 2026 ? 2026 : today.getFullYear()

  const currentMonthDays = days.filter(day =>
    day.date.getMonth() === targetMonth &&
    day.date.getFullYear() === targetYear
  )

  const weekFoodDays = currentWeekDays.filter((d) => d.status === "volt").length
  const monthFoodDays = currentMonthDays.filter((d) => d.status === "volt").length
  const emptyDays = currentMonthDays.filter((d) => d.status === "empty" && d.date <= today).length

  const handleSave = async (dayData: DayData, hadFood: boolean, details: string, team?: "A" | "B") => {
    if (!user) return

    try {
      const dateStr = dayData.date.toISOString().split('T')[0]

      const { error } = await supabase
        .from('meal_records')
        .upsert({
          date: dateStr,
          had_meal: hadFood,
          meal_name: hadFood ? details : null,
          reason: !hadFood ? details : null,
          recorded_by: user.id,
          team: team || null
        } as never, {
          onConflict: 'date'
        })

      if (error) throw error

      // Update local state
      setDays((prev) =>
        prev.map((d) =>
          d.date.toDateString() === dayData.date.toDateString()
            ? {
              ...d,
              status: hadFood ? "volt" : "nem",
              food: hadFood ? details : undefined,
              reason: !hadFood ? details : undefined,
              recordedBy: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Te',
              recordedAt: new Date().toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" }),
              team: team || undefined,
            }
            : d,
        ),
      )

      setSelectedDay(null)

      if (hadFood) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 3000)
      }

      toast({
        title: hadFood ? "Kaja rögzítve! 🍽️" : "Rögzítve",
        description: hadFood ? `${details} sikeresen mentve` : "Az adat sikeresen mentve"
      })
    } catch (error) {
      console.error('Error saving meal record:', error)
      toast({
        title: "Hiba",
        description: "Nem sikerült menteni az adatot",
        variant: "destructive"
      })
    }
  }

  const handleDelete = async (dayData: DayData) => {
    if (!user) return

    try {
      const dateStr = dayData.date.toISOString().split('T')[0]

      const { error } = await supabase
        .from('meal_records')
        .delete()
        .eq('date', dateStr)

      if (error) throw error

      // Update local state
      setDays((prev) =>
        prev.map((d) =>
          d.date.toDateString() === dayData.date.toDateString()
            ? {
              ...d,
              status: "empty",
              food: undefined,
              reason: undefined,
              recordedBy: undefined,
              recordedAt: undefined,
              team: undefined,
            }
            : d,
        ),
      )

      setSelectedDay(null)

      toast({
        title: "Törölve",
        description: "A rekord sikeresen törölve"
      })
    } catch (error) {
      console.error('Error deleting meal record:', error)
      toast({
        title: "Hiba",
        description: "Nem sikerült törölni a rekordot",
        variant: "destructive"
      })
    }
  }

  const getStatusStyles = (status: FoodStatus) => {
    switch (status) {
      case "volt":
        return "bg-emerald-50 border-emerald-200 hover:border-emerald-300"
      case "nem":
        return "bg-rose-50 border-rose-200 hover:border-rose-300"
      default:
        return "bg-amber-50 border-amber-200 hover:border-amber-300"
    }
  }

  const getStatusIcon = (status: FoodStatus) => {
    switch (status) {
      case "volt":
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      case "nem":
        return <XCircle className="w-5 h-5 text-rose-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-amber-500" />
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("hu-HU", { month: "long", day: "numeric" })
  }

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString()
  }

  const isFutureDate = (date: Date) => {
    return date > today
  }

  const handleDayClick = (day: DayData) => {
    if (day.isHoliday) {
      toast({
        title: "Szünnap",
        description: `${day.holidayName} - Ezen a napon nem lehet kajat rögzíteni`,
        variant: "destructive"
      })
      return
    }
    if (isFutureDate(day.date)) {
      toast({
        title: "Nem módosítható",
        description: "Jövőbeli dátumokat nem lehet módosítani",
        variant: "destructive"
      })
      return
    }
    setSelectedDay(day)
  }

  const displayDays = view === "week" ? currentWeekDays : currentMonthDays

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showConfetti && <ConfettiEffect />}

      {/* Intro Card */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 md:p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-semibold text-[#1F2937] mb-1">Kaja tábla</h2>
            <p className="text-sm text-[#6B7280]">
              A napokra kattintva rögzíthető vagy módosítható, hogy volt-e személyzeti étkezés.
            </p>
          </div>
        </div>
      </div>

      {/* Stat Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-[#6B7280] font-medium">Ez a hét</p>
              <p className="text-lg font-semibold text-[#1F2937]">{weekFoodDays} nap volt kaja</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-[#6B7280] font-medium">Ez a hónap</p>
              <p className="text-lg font-semibold text-[#1F2937]">{monthFoodDays} nap volt kaja</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-[#6B7280] font-medium">Kitöltetlen</p>
              <p className="text-lg font-semibold text-[#1F2937]">{emptyDays} nap</p>
            </div>
          </div>
        </div>
      </div>

      {/* Streak Indicator */}
      <div className="flex items-center gap-2 px-1">
        <Flame className="w-4 h-4 text-orange-500" />
        <span className="text-sm font-medium text-[#6B7280]">5 napos sorozat!</span>
      </div>

      {/* View Toggle */}
      <div className="flex justify-center">
        <div className="bg-[#F3F4F6] rounded-xl p-1 inline-flex">
          <button
            onClick={() => setView("week")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${view === "week" ? "bg-white text-[#1F2937] shadow-sm" : "text-[#6B7280] hover:text-[#1F2937]"
              }`}
          >
            Heti nézet
          </button>
          <button
            onClick={() => setView("month")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${view === "month" ? "bg-white text-[#1F2937] shadow-sm" : "text-[#6B7280] hover:text-[#1F2937]"
              }`}
          >
            Havi nézet
          </button>
        </div>
      </div>

      {/* Calendar Grid - Desktop */}
      <div className="hidden md:grid grid-cols-7 gap-3">
        {displayDays.map((day, index) => (
          <button
            key={index}
            onClick={() => handleDayClick(day)}
            disabled={isFutureDate(day.date) || day.isHoliday}
            className={`p-4 rounded-2xl border-2 transition-all duration-200 text-left ${day.isHoliday
              ? 'opacity-75 cursor-not-allowed bg-purple-50 border-purple-300'
              : isFutureDate(day.date)
                ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200'
                : getStatusStyles(day.status)
              } ${isToday(day.date) ? "ring-2 ring-indigo-500 ring-offset-2" : ""}`}
          >
            <div className="flex items-center justify-between mb-2">
              {getStatusIcon(day.status)}
              {isToday(day.date) && (
                <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Ma</span>
              )}
              {day.isHoliday && (
                <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">Szünnap</span>
              )}
            </div>
            <p className="text-sm font-semibold text-[#1F2937] mb-1">{formatDate(day.date)}</p>
            {day.isHoliday && (
              <p className="text-xs text-purple-600 font-medium truncate">
                {day.holidayName}
              </p>
            )}
            {day.recordedBy && !day.isHoliday && (
              <p className="text-xs text-[#6B7280] truncate">
                {day.recordedBy} · {day.recordedAt}
              </p>
            )}
          </button>
        ))}
      </div>

      {/* Calendar List - Mobile */}
      <div className="md:hidden space-y-3">
        {displayDays.map((day, index) => (
          <button
            key={index}
            onClick={() => handleDayClick(day)}
            disabled={isFutureDate(day.date) || day.isHoliday}
            className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 text-left flex items-center gap-4 ${day.isHoliday
              ? 'opacity-75 cursor-not-allowed bg-purple-50 border-purple-300'
              : isFutureDate(day.date)
                ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200'
                : getStatusStyles(day.status)
              } ${isToday(day.date) ? "ring-2 ring-indigo-500 ring-offset-2" : ""}`}
          >
            {getStatusIcon(day.status)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[#1F2937]">{formatDate(day.date)}</p>
                {isToday(day.date) && (
                  <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Ma</span>
                )}
              </div>
              {day.isHoliday && (
                <p className="text-xs text-purple-600 font-medium">
                  {day.holidayName}
                </p>
              )}
              {day.recordedBy && !day.isHoliday && (
                <p className="text-xs text-[#6B7280]">
                  {day.recordedBy} · {day.recordedAt}
                </p>
              )}
            </div>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${day.isHoliday
                ? "bg-purple-100 text-purple-700"
                : day.status === "volt"
                  ? "bg-emerald-100 text-emerald-700"
                  : day.status === "nem"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-amber-100 text-amber-700"
                }`}
            >
              {day.isHoliday ? "Szünnap" : day.status === "volt" ? "Volt" : day.status === "nem" ? "Nem volt" : "Kitöltetlen"}
            </span>
          </button>
        ))}
      </div>

      {/* Day Modal */}
      {selectedDay && <DayModal day={selectedDay} onClose={() => setSelectedDay(null)} onSave={handleSave} onDelete={handleDelete} />}
    </div>
  )
}
