import { useMemo } from "react"
import {
    buildStatsDayRange,
    MEAL_TRACKING_START,
    type HolidayRow,
    type MealRecordRow,
    type ProfileSummary,
} from "@/lib/meal-domain"
import { PeriodStats } from "@/lib/stats-utils"
import {
    buildUserStats,
    calculateStatsForDays,
    calculateTeamPeriodStats,
    getCurrentMonthDays,
    getCurrentWeekDays,
    getCurrentYearDays,
    getYearProgress,
    type UserStat,
} from "@/lib/statistics-domain"

interface UseStatsDataReturn {
    status: import("@/lib/meal-cache").RangeStatus
    retry: () => void
    weekStats: PeriodStats
    monthStats: PeriodStats
    yearStats: PeriodStats
    teamAWeekStats: PeriodStats
    teamBWeekStats: PeriodStats
    teamAMonthStats: PeriodStats
    teamBMonthStats: PeriodStats
    teamAYearStats: PeriodStats
    teamBYearStats: PeriodStats
    historyYears: string[]
    rawRecords: MealRecordRow[]
    holidays: HolidayRow[]
    allUsers: Map<string, ProfileSummary>
    userStats: UserStat[]
    elapsedDaysOfYear: number
    totalDaysOfYear: number
    elapsedHolidaysOfYear: number
    totalHolidaysOfYear: number
}

import { useMealDataContext } from "@/components/meal-table/MealDataContext"
import { useMealRange } from "@/components/meal-table/useMealRange"
import { getWeekStartForDate } from "@/lib/meal-view-domain"
import { formatDateOnly, parseDateOnly } from "@/lib/utils"

export function useStatsData(activeTab: 'general' | 'teams' | 'users' | 'history' | 'alltime', historyYear: string): UseStatsDataReturn {
    const { rawRecords: cachedRecords, holidays: cachedHolidays, profilesMap: allUsers } = useMealDataContext()
    const today = useMemo(() => new Date(), [])
    const year = activeTab === 'history' ? Number(historyYear) : today.getFullYear()
    let start = activeTab === 'alltime' ? MEAL_TRACKING_START : new Date(year, 0, 1)
    let end = new Date(year, 11, 31)
    if (activeTab === 'general' || activeTab === 'teams') {
        const weekStart = getWeekStartForDate(today)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        if (weekStart < start) start = weekStart
        if (weekEnd > end) end = weekEnd
    }
    if (start < MEAL_TRACKING_START) start = MEAL_TRACKING_START
    const { status, retry } = useMealRange(start, end)
    const startKey = formatDateOnly(start)
    const endKey = formatDateOnly(end)
    const rawRecords = useMemo(() => cachedRecords.filter((record) => record.date >= startKey && record.date <= endKey), [cachedRecords, endKey, startKey])
    const holidays = useMemo(() => cachedHolidays.filter((holiday) => holiday.date >= startKey && holiday.date <= endKey), [cachedHolidays, endKey, startKey])
    const allDays = useMemo(() => buildStatsDayRange(parseDateOnly(startKey), parseDateOnly(endKey), rawRecords, holidays), [startKey, endKey, rawRecords, holidays])

    const currentWeekDays = useMemo(() => getCurrentWeekDays(allDays, today), [allDays, today])
    const currentMonthDays = useMemo(() => getCurrentMonthDays(allDays, today), [allDays, today])
    const currentYearDays = useMemo(() => getCurrentYearDays(allDays, today.getFullYear()), [allDays, today])

    const weekStats = useMemo(() => calculateStatsForDays(currentWeekDays, today), [currentWeekDays, today])
    const monthStats = useMemo(() => calculateStatsForDays(currentMonthDays, today), [currentMonthDays, today])
    const yearStats = useMemo(() => calculateStatsForDays(currentYearDays, today), [currentYearDays, today])

    const teamAWeekStats = useMemo(() => calculateTeamPeriodStats("A", currentWeekDays), [currentWeekDays])
    const teamBWeekStats = useMemo(() => calculateTeamPeriodStats("B", currentWeekDays), [currentWeekDays])
    const teamAMonthStats = useMemo(() => calculateTeamPeriodStats("A", currentMonthDays), [currentMonthDays])
    const teamBMonthStats = useMemo(() => calculateTeamPeriodStats("B", currentMonthDays), [currentMonthDays])
    const teamAYearStats = useMemo(() => calculateTeamPeriodStats("A", currentYearDays), [currentYearDays])
    const teamBYearStats = useMemo(() => calculateTeamPeriodStats("B", currentYearDays), [currentYearDays])

    const historyYears = useMemo(() => Array.from(
        { length: today.getFullYear() - MEAL_TRACKING_START.getFullYear() + 1 },
        (_, index) => String(today.getFullYear() - index),
    ), [today])
    const userStats = useMemo(() => buildUserStats(rawRecords, allUsers, today.getFullYear()), [allUsers, rawRecords, today])
    const { elapsedDaysOfYear, totalDaysOfYear, elapsedHolidaysOfYear, totalHolidaysOfYear } = useMemo(
        () => getYearProgress(holidays, today),
        [holidays, today]
    )

    return {
        status, retry,
        weekStats, monthStats, yearStats,
        teamAWeekStats, teamBWeekStats,
        teamAMonthStats, teamBMonthStats,
        teamAYearStats, teamBYearStats,
        historyYears, rawRecords, holidays,
        allUsers, userStats,
        elapsedDaysOfYear, totalDaysOfYear,
        elapsedHolidaysOfYear, totalHolidaysOfYear
    }
}
