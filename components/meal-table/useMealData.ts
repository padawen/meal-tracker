import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { calculatePeriodStats, PeriodStats } from "@/lib/stats-utils"
import { supabase } from '@/lib/supabase/client'
import { formatDateOnly, parseDateOnly } from "@/lib/utils"
import {
    fetchMealRangeData,
    fetchProfilesByIds,
    type MealDayData as DayData,
    buildMealDayDataRange,
} from "@/lib/meal-domain"
import {
    countElapsedEmptyDays,
    canNavigateMealBack,
    expandLoadedMealRange,
    getCurrentMonthStatsDays,
    getCurrentWeekStatsDays,
    getInitialMealFetchRange,
    getMonthDays,
    getRequiredMealRange,
    getWeekDays,
    getWeekStartForDate,
    getYearDays,
    mergeMealDayData,
    replaceMealDay,
} from "@/lib/meal-view-domain"

interface UseMealDataReturn {
    loading: boolean
    allRecords: DayData[]
    setAllRecords: (records: DayData[]) => void
    currentWeekDays: DayData[]
    currentMonthDays: DayData[]
    currentYearDays: DayData[]
    weekStats: PeriodStats
    monthStats: PeriodStats
    totalEmptyDays: number
    weekOffset: number
    monthOffset: number
    yearOffset: number
    setWeekOffset: (offset: number | ((prev: number) => number)) => void
    setMonthOffset: (offset: number | ((prev: number) => number)) => void
    setYearOffset: (offset: number | ((prev: number) => number)) => void
    getWeekStart: (offset: number) => Date
    canNavigateBack: (view: "week" | "month" | "year") => boolean
    formatDateStr: (date: Date) => string
}

import { useMealDataContext } from "./MealDataContext"

export function useMealData(): UseMealDataReturn {
    const router = useRouter()
    const { loading, allRecords, setAllRecords, ensureRangeLoaded } = useMealDataContext()
    const [weekOffset, setWeekOffset] = useState(0)
    const [monthOffset, setMonthOffset] = useState(0)
    const [yearOffset, setYearOffset] = useState(0)

    const today = useMemo(() => new Date(), [])
    const getWeekStart = useCallback((offset: number) => getWeekStartForDate(today, offset), [today])
    const canNavigateBack = useCallback(
        (view: "week" | "month" | "year") => canNavigateMealBack(view, today, weekOffset, monthOffset, yearOffset),
        [monthOffset, today, weekOffset, yearOffset]
    )

    useEffect(() => {
        const requiredRange = getRequiredMealRange(today, weekOffset, monthOffset, yearOffset)
        ensureRangeLoaded(requiredRange.start, requiredRange.end)
    }, [ensureRangeLoaded, monthOffset, today, weekOffset, yearOffset])

    const recordsByDate = useMemo(
        () => new Map(allRecords.map((day) => [formatDateOnly(day.date), day])),
        [allRecords]
    )

    const currentWeekDays = useMemo(() => {
        return getWeekDays(recordsByDate, today, weekOffset)
    }, [recordsByDate, today, weekOffset])

    const currentMonthDays = useMemo(() => {
        const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
        return getMonthDays(allRecords, targetDate)
    }, [allRecords, monthOffset, today])

    const currentYearDays = useMemo(() => {
        return getYearDays(allRecords, today.getFullYear() + yearOffset)
    }, [allRecords, today, yearOffset])

    const currentActualWeekDays = useMemo(() => getCurrentWeekStatsDays(allRecords, today), [allRecords, today])
    const currentActualMonthDays = useMemo(() => getCurrentMonthStatsDays(allRecords, today), [allRecords, today])

    const weekStats = useMemo(() => calculatePeriodStats(currentActualWeekDays, today), [currentActualWeekDays])
    const monthStats = useMemo(() => calculatePeriodStats(currentActualMonthDays, today), [currentActualMonthDays])

    const totalEmptyDays = useMemo(() => countElapsedEmptyDays(allRecords, today), [allRecords, today])

    return {
        loading, allRecords, setAllRecords,
        currentWeekDays, currentMonthDays, currentYearDays,
        weekStats, monthStats, totalEmptyDays,
        weekOffset, monthOffset, yearOffset, setWeekOffset, setMonthOffset, setYearOffset,
        getWeekStart, canNavigateBack, formatDateStr: formatDateOnly
    }
}
