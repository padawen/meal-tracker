import { useState, useEffect, useMemo } from "react"
import {
    buildStatsDayRange,
    fetchMealRangeData,
    fetchProfilesByIds,
    type HolidayRow,
    type MealRecordRow,
    type ProfileSummary,
} from "@/lib/meal-domain"
import { PeriodStats } from "@/lib/stats-utils"
import {
    buildHistoryYears,
    buildUserStats,
    calculateStatsForDays,
    calculateTeamPeriodStats,
    getCurrentMonthDays,
    getCurrentWeekDays,
    getCurrentYearDays,
    getStatisticsFetchRange,
    getYearProgress,
    type UserStat,
} from "@/lib/statistics-domain"

interface UseStatsDataReturn {
    loading: boolean
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

export function useStatsData(): UseStatsDataReturn {
    const { loading, rawRecords, holidays, profilesMap: allUsers, ensureRangeLoaded } = useMealDataContext()
    const today = useMemo(() => new Date(), [])

    useEffect(() => {
        const { start, end } = getStatisticsFetchRange(today)
        ensureRangeLoaded(start, end)
    }, [ensureRangeLoaded, today])
    const allDays = useMemo(() => {
        const { start, end } = getStatisticsFetchRange(today)
        return buildStatsDayRange(start, end, rawRecords, holidays)
    }, [holidays, rawRecords, today])

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

    const historyYears = useMemo(() => buildHistoryYears(rawRecords, today.getFullYear()), [rawRecords, today])
    const userStats = useMemo(() => buildUserStats(rawRecords, allUsers, today.getFullYear()), [allUsers, rawRecords, today])
    const { elapsedDaysOfYear, totalDaysOfYear, elapsedHolidaysOfYear, totalHolidaysOfYear } = useMemo(
        () => getYearProgress(holidays, today),
        [holidays, today]
    )

    return {
        loading,
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
