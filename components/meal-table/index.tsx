"use client"

import { useState } from "react"
import { CheckCircle2, Calendar, AlertCircle } from "lucide-react"
import { DayModal } from "./DayModal"
import { ConfettiEffect } from "./ConfettiEffect"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth/AuthGuard"
import { useToast } from "@/hooks/use-toast"
import { Header, Nav, PeriodStatsCard } from "@/components/shared"
import { ViewToggle } from "./ViewToggle"
import { DayItem, DayData } from "./DayItem"
import { useMealData } from "./useMealData"
import { Loader2 } from "lucide-react"

export function MealTable() {
    const [view, setView] = useState<"week" | "month">("week")
    const [selectedDay, setSelectedDay] = useState<DayData | null>(null)
    const [showConfetti, setShowConfetti] = useState(false)
    const { user } = useAuth()
    const { toast } = useToast()

    const {
        loading, allRecords, setAllRecords,
        currentWeekDays, currentMonthDays,
        weekStats, monthStats, totalEmptyDays,
        weekOffset, monthOffset, setWeekOffset, setMonthOffset,
        getWeekStart, canNavigateBack, formatDateStr
    } = useMealData()

    const today = new Date()

    const getEmptyEmoji = () => {
        if (totalEmptyDays === 0) return "😊"
        if (totalEmptyDays === 1) return "😕"
        if (totalEmptyDays === 2) return "😟"
        return "😢"
    }

    const handleSave = async (dayData: DayData, hadFood: boolean, details: string, team?: "A" | "B") => {
        if (!user) return

        try {
            const dateStr = formatDateStr(dayData.date)

            const { error } = await supabase
                .from('meal_records')
                .upsert({
                    date: dateStr,
                    had_meal: hadFood,
                    meal_name: hadFood ? details : null,
                    reason: !hadFood ? details : null,
                    recorded_by: user.id,
                    team: team || null,
                }, { onConflict: 'date' })

            if (error) throw error

            if (hadFood) {
                setShowConfetti(true)
                setTimeout(() => setShowConfetti(false), 3000)
            }

            const indexToUpdate = allRecords.findIndex(d => formatDateStr(d.date) === dateStr)
            if (indexToUpdate !== -1) {
                const updatedRecords = [...allRecords]
                updatedRecords[indexToUpdate] = {
                    ...updatedRecords[indexToUpdate],
                    status: hadFood ? "volt" : "nem",
                    food: hadFood ? details : undefined,
                    reason: !hadFood ? details : undefined,
                    team: team,
                }
                setAllRecords(updatedRecords)
            }

            toast({ title: "Sikeres mentés", description: "Frissítve" })
            setSelectedDay(null)
        } catch (error) {
            console.error('Error saving meal record:', error)
            toast({ title: "Hiba", description: "Nem sikerült menteni az adatokat", variant: "destructive" })
        }
    }

    const handleDelete = async (dayData: DayData) => {
        if (!user) return

        try {
            const dateStr = formatDateStr(dayData.date)
            const { error } = await supabase.from('meal_records').delete().eq('date', dateStr)
            if (error) throw error

            const indexToUpdate = allRecords.findIndex(d => formatDateStr(d.date) === dateStr)
            if (indexToUpdate !== -1) {
                const updatedRecords = [...allRecords]
                updatedRecords[indexToUpdate] = {
                    ...updatedRecords[indexToUpdate],
                    status: "empty",
                    food: undefined,
                    reason: undefined,
                    team: undefined,
                }
                setAllRecords(updatedRecords)
            }

            toast({ title: "Sikeres törlés", description: "Törölve" })
        } catch (error) {
            console.error('Error deleting meal record:', error)
            toast({ title: "Hiba", description: "Nem sikerült törölni a rekordot", variant: "destructive" })
        }
    }

    const handleDayClick = (day: DayData) => {
        if (day.isHoliday) {
            toast({ title: "Szünnap", description: `${day.holidayName} - Ezen a napon nem lehet kajat rögzíteni`, variant: "destructive" })
            return
        }
        const isFutureDate = (date: Date) => {
            const d = new Date(date); d.setHours(0, 0, 0, 0)
            const t = new Date(); t.setHours(0, 0, 0, 0)
            return d.getTime() > t.getTime()
        }
        if (isFutureDate(day.date)) {
            toast({ title: "Nem módosítható", description: "Jövőbeli dátumokat nem lehet módosítani", variant: "destructive" })
            return
        }
        setSelectedDay(day)
    }

    const displayDays = view === "week" ? currentWeekDays : currentMonthDays

    const getPeriodLabel = () => {
        if (view === "week") {
            const weekStart = getWeekStart(weekOffset)
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekStart.getDate() + 6)
            const startMonth = weekStart.toLocaleDateString("hu-HU", { month: "short" }).replace('.', '')
            const endMonth = weekEnd.toLocaleDateString("hu-HU", { month: "short" }).replace('.', '')
            const year = weekStart.getFullYear()
            if (weekStart.getMonth() === weekEnd.getMonth()) {
                return `${year}. ${startMonth} ${weekStart.getDate()}–${weekEnd.getDate()}`
            }
            return `${year}. ${startMonth} ${weekStart.getDate()} – ${endMonth} ${weekEnd.getDate()}`
        }
        const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
        return targetDate.toLocaleDateString("hu-HU", { year: "numeric", month: "long" })
    }

    const navigateBack = () => {
        if (!canNavigateBack(view)) return
        view === "week" ? setWeekOffset(p => p - 1) : setMonthOffset(p => p - 1)
    }

    const navigateForward = () => {
        view === "week" ? setWeekOffset(p => p + 1) : setMonthOffset(p => p + 1)
    }

    const handleViewChange = (newView: "week" | "month") => {
        setView(newView)
        newView === "week" ? setWeekOffset(0) : setMonthOffset(0)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {showConfetti && <ConfettiEffect />}

            <Header
                title="Kaja tábla"
                description="A napokra kattintva rögzíthető vagy módosítható, hogy volt-e személyzeti étkezés."
                icon={<Calendar className="w-6 h-6 text-indigo-600" />}
            />

            <div className="grid grid-cols-1 gap-3">
                <PeriodStatsCard
                    title="Ez a hét"
                    stats={weekStats}
                    icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                    iconBgColor="bg-emerald-100"
                />
                <PeriodStatsCard
                    title="Ez a hónap"
                    stats={monthStats}
                    icon={<Calendar className="w-5 h-5 text-indigo-600" />}
                    iconBgColor="bg-indigo-100"
                />
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-[#6B7280] font-medium">Kitöltetlen</p>
                            <p className="text-lg font-semibold text-[#1F2937]">{totalEmptyDays} nap</p>
                        </div>
                        <div className="text-2xl">{getEmptyEmoji()}</div>
                    </div>
                </div>
            </div>

            <ViewToggle view={view} onViewChange={handleViewChange} />

            <Nav
                label={getPeriodLabel()}
                onPrev={navigateBack}
                onNext={navigateForward}
                canPrev={canNavigateBack(view)}
                canNext={true}
            />

            <div className="space-y-3">
                {displayDays.map((day, index) => (
                    <DayItem key={index} day={day} onClick={() => handleDayClick(day)} />
                ))}
            </div>

            {selectedDay && <DayModal day={selectedDay} onClose={() => setSelectedDay(null)} onSave={handleSave} onDelete={handleDelete} />}
        </div>
    )
}
