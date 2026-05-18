"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Loader2, Search } from "lucide-react"
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

function normalizeSearchText(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("hu-HU")
        .trim()
}

function isToday(date: Date) {
    const candidate = new Date(date)
    const today = new Date()
    candidate.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    return candidate.getTime() === today.getTime()
}

export function MealTable() {
    const [view, setView] = useState<"week" | "month" | "year">("week")
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedDay, setSelectedDay] = useState<DayData | null>(null)
    const { user } = useAuth()
    const router = useRouter()
    const { toast } = useToast()

    const {
        loading, allRecords, setAllRecords,
        currentWeekDays, currentMonthDays, currentYearDays,
        weekStats, monthStats, totalEmptyDays,
        weekOffset, monthOffset, yearOffset, setWeekOffset, setMonthOffset, setYearOffset,
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

    const displayDays = view === "week" ? currentWeekDays : view === "month" ? currentMonthDays : currentYearDays
    const normalizedSearch = normalizeSearchText(searchQuery)
    const filteredDays = useMemo(() => {
        if (!normalizedSearch) {
            return displayDays
        }

        return displayDays.filter((day) => {
            if (view === "year" && day.status === "empty" && !isToday(day.date)) {
                return false
            }

            const teamLabel = day.team === "A" ? "zs csapat" : day.team === "B" ? "r csapat" : ""
            const searchableText = [
                day.date.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" }),
                day.date.toLocaleDateString("hu-HU", { weekday: "long" }),
                day.food,
                day.reason,
                day.recordedBy,
                teamLabel,
                day.holidayName,
            ]
                .filter(Boolean)
                .join(" ")
            const normalizedDayText = normalizeSearchText(searchableText)

            return normalizedDayText.includes(normalizedSearch)
        })
    }, [displayDays, normalizedSearch])

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
        if (view === "month") {
            const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
            return targetDate.toLocaleDateString("hu-HU", { year: "numeric", month: "long" })
        }

        return `${today.getFullYear() + yearOffset}. év`
    }

    const navigateBack = () => {
        if (!canNavigateBack(view)) return
        if (view === "week") {
            setWeekOffset(p => p - 1)
            return
        }
        if (view === "month") {
            setMonthOffset(p => p - 1)
            return
        }
        setYearOffset(p => p - 1)
    }

    const navigateForward = () => {
        if (view === "week") {
            setWeekOffset(p => p + 1)
            return
        }
        if (view === "month") {
            setMonthOffset(p => p + 1)
            return
        }
        setYearOffset(p => p + 1)
    }

    const handleViewChange = (newView: "week" | "month" | "year") => {
        setView(newView)
        if (newView === "week") {
            setWeekOffset(0)
            return
        }
        if (newView === "month") {
            setMonthOffset(0)
            return
        }
        setYearOffset(0)
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

            {view === "year" && (
                <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-2">
                    <div className="flex items-center gap-3 rounded-xl bg-[#F3F4F6] px-4 py-3">
                        <Search className="w-4 h-4 text-[#6B7280]" />
                        <input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Keresés napra, ételre, emberre..."
                            className="w-full bg-transparent text-sm text-[#1F2937] placeholder:text-[#9CA3AF] outline-none"
                        />
                    </div>
                </div>
            )}

            {((view === "month" && monthOffset !== 0) || (view === "week" && weekOffset !== 0) || (view === "year" && yearOffset !== 0)) && (
                <div className="flex justify-center">
                    <div className="bg-[#F3F4F6] rounded-xl p-1 inline-flex">
                        <button
                            onClick={() => {
                                setWeekOffset(0)
                                setMonthOffset(0)
                                setYearOffset(0)
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer bg-white text-[#1F2937] shadow-sm"
                        >
                            <div className="flex items-center justify-center">
                                {(view === "week" ? weekOffset < 0 : view === "month" ? monthOffset < 0 : yearOffset < 0)
                                    ? <ArrowRight className="w-4 h-4" />
                                    : <ArrowLeft className="w-4 h-4" />
                                }
                            </div>
                            <span>
                                {(view === "week" ? weekOffset < 0 : view === "month" ? monthOffset < 0 : yearOffset < 0) ? "Előre a mai napra" : "Vissza a mai napra"}
                            </span>
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {filteredDays.map((day, index) => (
                    <DayItem key={index} day={day} onClick={() => handleDayClick(day)} />
                ))}
                {filteredDays.length === 0 && (
                    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-5 py-6 text-center">
                        <p className="text-sm font-medium text-[#1F2937]">Nincs találat</p>
                        <p className="mt-1 text-xs text-[#6B7280]">Próbálj másik napra, ételre vagy névre keresni.</p>
                    </div>
                )}
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
