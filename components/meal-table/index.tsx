"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react"
import { DayModal } from "./DayModal"
import { ConfettiEffect } from "./ConfettiEffect"
import { MealOverviewCards } from "./MealOverviewCards"
import { useMealTableMutations } from "./useMealTableMutations"
import { useAuth } from "@/components/auth/AuthGuard"
import { useToast } from "@/hooks/use-toast"
import { Nav } from "@/components/shared"
import { ViewToggle } from "./ViewToggle"
import { DayItem, DayData } from "./DayItem"
import { useMealData } from "./useMealData"

export function MealTable() {
    const [view, setView] = useState<"week" | "month">("week")
    const [selectedDay, setSelectedDay] = useState<DayData | null>(null)
    const { user } = useAuth()
    const router = useRouter()
    const { toast } = useToast()

    const {
        loading, allRecords, setAllRecords,
        currentWeekDays, currentMonthDays,
        weekStats, monthStats, totalEmptyDays,
        weekOffset, monthOffset, setWeekOffset, setMonthOffset,
        getWeekStart, canNavigateBack, formatDateStr
    } = useMealData()

    const today = new Date()
    const { confettiVariant, handleDelete, handleSave, pendingAction } = useMealTableMutations({
        allRecords,
        currentUserName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Ismeretlen',
        formatDateStr,
        setAllRecords,
        setSelectedDay,
        toast,
        userId: user.id,
    })


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

            const minDate = new Date(2026, 0, 1)
            const actualStart = weekStart < minDate ? minDate : weekStart

            const startMonth = actualStart.toLocaleDateString("hu-HU", { month: "short" }).replace('.', '')
            const endMonth = weekEnd.toLocaleDateString("hu-HU", { month: "short" }).replace('.', '')
            const startYear = actualStart.getFullYear()
            const endYear = weekEnd.getFullYear()

            if (startYear !== endYear) {
                return `${startYear}. ${startMonth} ${actualStart.getDate()} – ${endYear}. ${endMonth} ${weekEnd.getDate()}`
            }
            if (actualStart.getMonth() === weekEnd.getMonth()) {
                return `${startYear}. ${startMonth} ${actualStart.getDate()}–${weekEnd.getDate()}`
            }
            return `${startYear}. ${startMonth} ${actualStart.getDate()} – ${endMonth} ${weekEnd.getDate()}`
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
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-sm text-gray-500 animate-pulse">Adatok betöltése...</p>
                <button
                    onClick={() => {
                        router.refresh();
                    }}
                    className="text-xs text-indigo-500 hover:text-indigo-700 underline cursor-pointer"
                >
                    Túl sokáig tart? Frissítés
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {confettiVariant && <ConfettiEffect variant={confettiVariant} />}

            <MealOverviewCards
                allRecords={allRecords}
                monthStats={monthStats}
                today={today}
                totalEmptyDays={totalEmptyDays}
                weekStats={weekStats}
            />

            <ViewToggle view={view} onViewChange={handleViewChange} />


            <Nav
                label={getPeriodLabel()}
                onPrev={navigateBack}
                onNext={navigateForward}
                canPrev={canNavigateBack(view)}
                canNext={true}
            />

            {((view === "month" && monthOffset !== 0) || (view === "week" && weekOffset !== 0)) && (
                <div className="flex justify-center">
                    <div className="bg-[#F3F4F6] rounded-xl p-1 inline-flex">
                        <button
                            onClick={() => {
                                setWeekOffset(0)
                                setMonthOffset(0)
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer bg-white text-[#1F2937] shadow-sm"
                        >
                            <div className="flex items-center justify-center">
                                {(view === "week" ? weekOffset < 0 : monthOffset < 0)
                                    ? <ArrowRight className="w-4 h-4" />
                                    : <ArrowLeft className="w-4 h-4" />
                                }
                            </div>
                            <span>
                                {(view === "week" ? weekOffset < 0 : monthOffset < 0) ? "Előre a mai napra" : "Vissza a mai napra"}
                            </span>
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {displayDays.map((day, index) => (
                    <DayItem key={index} day={day} onClick={() => handleDayClick(day)} />
                ))}
            </div>

            {selectedDay && (
                <DayModal
                    day={selectedDay}
                    onClose={() => setSelectedDay(null)}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    isSaving={pendingAction === "save"}
                    isDeletePending={pendingAction === "delete"}
                />
            )}
        </div>
    )
}
