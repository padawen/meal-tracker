"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Calendar, AlertCircle, ArrowLeft, ArrowRight } from "lucide-react"
import { DayModal } from "./DayModal"
import { ConfettiEffect } from "./ConfettiEffect"
import { useAuth } from "@/components/auth/AuthGuard"
import { useToast } from "@/hooks/use-toast"
import { Header, Nav, PeriodStatsCard } from "@/components/shared"
import { ViewToggle } from "./ViewToggle"
import { DayItem, DayData } from "./DayItem"
import { useMealData } from "./useMealData"
import { Loader2 } from "lucide-react"
import { saveMealAction } from "@/app/actions/meal-actions"

export function MealTable() {
    const [view, setView] = useState<"week" | "month">("week")
    const [selectedDay, setSelectedDay] = useState<DayData | null>(null)
    const [showConfetti, setShowConfetti] = useState(false)
    const [isPending, startTransition] = useTransition()
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

    const getEmptyEmoji = () => {
        if (totalEmptyDays === 0) return "😊"
        if (totalEmptyDays === 1) return "😕"
        if (totalEmptyDays === 2) return "😟"
        return "😢"
    }

    const handleSave = async (dayData: DayData, hadFood: boolean, details: string, team?: "A" | "B") => {
        if (!user) return

        const dateStr = formatDateStr(dayData.date)

        startTransition(async () => {
            try {
                await saveMealAction({
                    date: dateStr,
                    had_meal: hadFood,
                    meal_name: hadFood ? details : null,
                    reason: !hadFood ? details : null,
                    team: team || null,
                }, user.id)

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
        })
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
                        sessionStorage.removeItem('auth_checked');
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
            {showConfetti && <ConfettiEffect />}



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
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${totalEmptyDays === 0 ? "bg-emerald-100" : "bg-amber-100"}`}>
                            {totalEmptyDays === 0 ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                            )}
                        </div>
                        <div className="flex-1">
                            {totalEmptyDays === 0 ? (
                                <>
                                    <p className="text-xs text-[#6B7280] font-medium">Gratulálunk!</p>
                                    <p className="text-lg font-semibold text-[#1F2937]">Minden kitöltve!</p>
                                </>
                            ) : totalEmptyDays === 1 && allRecords.find(d =>
                                d.date.getDate() === today.getDate() &&
                                d.date.getMonth() === today.getMonth() &&
                                d.date.getFullYear() === today.getFullYear() &&
                                d.status === "empty" && !d.isHoliday
                            ) ? (
                                <>
                                    <p className="text-xs text-[#6B7280] font-medium">Már csak egy!</p>
                                    <p className="text-lg font-semibold text-[#1F2937]">Csak a mai hiányzik!</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-xs text-[#6B7280] font-medium">Kitöltetlen</p>
                                    <p className="text-lg font-semibold text-[#1F2937]">{totalEmptyDays} nap</p>
                                </>
                            )}
                        </div>
                        <div className="text-2xl">
                            {totalEmptyDays === 0 ? "🥳" : getEmptyEmoji()}
                        </div>
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

            {selectedDay && <DayModal day={selectedDay} onClose={() => setSelectedDay(null)} onSave={handleSave} />}
        </div>
    )
}
