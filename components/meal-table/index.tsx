"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Search, X } from "lucide-react"
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
import { fetchLatestVotingMeal } from "@/lib/meal-domain"
import { formatDateOnly, parseDateOnly } from "@/lib/utils"
import { useMealDataContext } from "./MealDataContext"
import { useMealGallery } from "./useMealGallery"
import { LoadingState } from "./LoadingState"
import { getWeekStartForDate } from "@/lib/meal-view-domain"

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
    const [isVotingMode, setIsVotingMode] = useState(false)
    const [isVotingModeLoading, setIsVotingModeLoading] = useState(false)
    const { user } = useAuth()
    const { ensureRangeLoaded } = useMealDataContext()
    const { toast } = useToast()

    const {
        allRecords, viewState, weekState, monthState, missingState,
        currentWeekDays, currentMonthDays, currentYearDays,
        weekStats, monthStats, totalEmptyDays,
        weekOffset, monthOffset, yearOffset, setWeekOffset, setMonthOffset, setYearOffset,
        getWeekStart, canNavigateBack, formatDateStr
    } = useMealData(view)

    const today = new Date()
    const { confettiVariant, handleDelete, handleSave, handleRate, pendingAction } = useMealTableMutations({
        setSelectedDay,
        toast,
        userId: user.id,
    })

    const currentDay = selectedDay
        ? allRecords.find((day) => formatDateStr(day.date) === formatDateStr(selectedDay.date)) || selectedDay
        : null
    const gallery = useMealGallery(currentDay, isVotingMode)

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
    const handleOpenVotingMode = async () => {
        setIsVotingModeLoading(true)
        try {
            const latest = await fetchLatestVotingMeal()
            if (!latest) {
                toast({ title: "Nincs étkezés", description: "Még nincs értékelhető étkezés." })
                return
            }
            const date = parseDateOnly(latest.date)
            await ensureRangeLoaded(date, date)
            setIsVotingMode(true)
            setSelectedDay({ date, recordId: latest.id, status: "volt" })
        } catch {
            toast({ title: "Hiba", description: "Nem sikerült megnyitni a szavazást. Próbáld újra.", variant: "destructive" })
        } finally {
            setIsVotingModeLoading(false)
        }
    }
    const normalizedSearch = view === "year" ? normalizeSearchText(searchQuery) : ""
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

    const handleImageNavigate = (direction: "previous" | "next") => {
        if (!selectedDay) return

        const nextImageDay = direction === "previous" ? gallery.previous : gallery.next
        if (!nextImageDay) return

        setSelectedDay(nextImageDay)

        if (view === "week") {
            const currentWeekStart = getWeekStartForDate(today)
            const targetWeekStart = getWeekStartForDate(nextImageDay.date)
            const weekOffset = Math.round(
                (targetWeekStart.getTime() - currentWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
            )
            setWeekOffset(weekOffset)
        } else if (view === "month") {
            const monthOffset =
                (nextImageDay.date.getFullYear() - today.getFullYear()) * 12 +
                nextImageDay.date.getMonth() - today.getMonth()
            setMonthOffset(monthOffset)
        } else {
            setYearOffset(nextImageDay.date.getFullYear() - today.getFullYear())
        }
    }

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

    return (
        <div className="space-y-4">
            {confettiVariant && <ConfettiEffect variant={confettiVariant} />}

            <MealOverviewCards
                allRecords={allRecords}
                monthStats={monthStats}
                today={today}
                totalEmptyDays={totalEmptyDays}
                weekStats={weekStats}
                weekState={weekState}
                monthState={monthState}
                missingState={missingState}
            />

            <button
                type="button"
                onClick={() => void handleOpenVotingMode()}
                disabled={isVotingModeLoading}
                aria-busy={isVotingModeLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 transition hover:border-amber-300 hover:bg-amber-100 cursor-pointer"
            >
                {isVotingModeLoading ? "Szavazás megnyitása..." : "Szavazás mód"}
            </button>

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
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="inline-flex items-center justify-center text-[#9CA3AF] hover:text-[#6B7280] transition-colors cursor-pointer"
                                aria-label="Keresés törlése"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
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

            <LoadingState {...viewState} className="min-h-[400px]">
            <div className="space-y-3">
                {filteredDays.map((day) => (
                    <DayItem key={formatDateOnly(day.date)} day={day} allowImageLoad={!currentDay} onClick={() => handleDayClick(day)} />
                ))}
                {filteredDays.length === 0 && (
                    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-5 py-6 text-center">
                        <p className="text-sm font-medium text-[#1F2937]">Nincs találat</p>
                        <p className="mt-1 text-xs text-[#6B7280]">Próbálj másik napra, ételre vagy névre keresni.</p>
                    </div>
                )}
            </div>

            </LoadingState>

            {currentDay && (
                <DayModal
                    day={currentDay}
                    isVotingMode={isVotingMode}
                    onClose={() => {
                        setSelectedDay(null)
                        setIsVotingMode(false)
                    }}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    onRate={handleRate}
                    isSaving={pendingAction === "save"}
                    isDeletePending={pendingAction === "delete"}
                    isRatingPending={pendingAction === "rate"}
                    canMovePrevious={Boolean(gallery.previous)}
                    canMoveNext={Boolean(gallery.next)}
                    navigationLoading={gallery.loading}
                    navigationError={gallery.error}
                    onRetryNavigation={gallery.retry}
                    onImageNavigate={handleImageNavigate}
                />
            )}
        </div>
    )
}
