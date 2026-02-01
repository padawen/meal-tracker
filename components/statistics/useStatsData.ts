import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { calculatePeriodStats, PeriodStats, DayData as StatsDay } from "@/lib/stats-utils"

interface DayData {
    date: Date
    status: "volt" | "nem" | "empty"
    team?: "A" | "B"
    isHoliday?: boolean
}

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
    rawRecords: Array<{ date: string; had_meal: boolean; team: string | null }>
    holidays: Array<{ date: string, name: string }>
}

export function useStatsData(): UseStatsDataReturn {
    const [loading, setLoading] = useState(true)
    const [allDays, setAllDays] = useState<DayData[]>([])
    const [rawRecords, setRawRecords] = useState<Array<{ date: string; had_meal: boolean; team: string | null }>>([])
    const [holidays, setHolidays] = useState<Array<{ date: string, name: string }>>([])

    const today = new Date()

    const formatDateStr = (date: Date): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    useEffect(() => {
        const fetchStatistics = async () => {
            try {
                // Fetch full current year + previous year to cover history needs reasonably well without over-fetching initially
                // Ideally we would fetch distinct years first, but for now let's expand the range to cover the FULL current year at least.
                // User pointed out 120 days -> that was likely the 6mo back + 3mo forward range clipping the year.

                const currentYear = today.getFullYear()
                const startDate = new Date(currentYear, 0, 1) // Jan 1st of current year
                const endDate = new Date(currentYear, 11, 31) // Dec 31st of current year

                // If we want history to work for previous years immediately without refetching, we might want to fetch more.
                // But for "Year Stats" (current year) to be correct (365/366), we MUST have 1 Jan - 31 Dec.

                // Let's expand just a bit to be safe for near history, but correct year stats is priority.
                // Actually, let's keep it simple: Ensure we have the FULL current year.
                // For history of OTHER years, if the user selects them, we might rely on the fact this hook fetches 'enough' or we might need to refactor to fetch based on selected year.
                // However, the prompt implies "Year Stats" (current year) is the issue.
                // Let's broaden to include last year too, just in case they look back.

                const fetchStart = new Date(currentYear - 1, 0, 1)
                const fetchEnd = new Date(currentYear, 11, 31)

                const startDateStr = formatDateStr(fetchStart)
                const endDateStr = formatDateStr(fetchEnd)

                const [recordsResult, holidaysResult] = await Promise.all([
                    supabase.from('meal_records').select('date, had_meal, team')
                        .gte('date', startDateStr).lte('date', endDateStr)
                        .returns<Array<{ date: string; had_meal: boolean; team: string | null }>>(),
                    supabase.from('holidays').select('date, name')
                        .gte('date', startDateStr).lte('date', endDateStr)
                ])

                if (recordsResult.error) throw recordsResult.error
                if (holidaysResult.error) throw holidaysResult.error

                const records = recordsResult.data || []
                const holidaysData = holidaysResult.data || []

                setRawRecords(records)
                setHolidays(holidaysData)

                const holidaysMap = new Map(holidaysData.map(h => [h.date, h.name]))
                const recordsMap = new Map(records.map(r => [r.date, r]))

                const daysArray: DayData[] = []
                const currentDate = new Date(fetchStart)

                while (currentDate <= fetchEnd) {
                    const dateStr = formatDateStr(currentDate)
                    const record = recordsMap.get(dateStr)
                    const holidayName = holidaysMap.get(dateStr)

                    let status: "volt" | "nem" | "empty" = "empty"
                    let team: "A" | "B" | undefined

                    if (record) {
                        status = record.had_meal ? "volt" : "nem"
                        team = (record.team as "A" | "B") || undefined
                    }

                    daysArray.push({
                        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
                        status, team, isHoliday: !!holidayName
                    })

                    currentDate.setDate(currentDate.getDate() + 1)
                }

                setAllDays(daysArray)
            } catch (error) {
                console.error('Error fetching statistics:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchStatistics()
    }, [])

    const getWeekStart = () => {
        const date = new Date(today)
        const day = date.getDay()
        const diff = day === 0 ? -6 : 1 - day
        date.setDate(date.getDate() + diff)
        date.setHours(0, 0, 0, 0)
        return date
    }

    const weekStart = getWeekStart()
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const currentWeekDays = allDays.filter(day => {
        const dayTime = day.date.getTime()
        return dayTime >= weekStart.getTime() && dayTime < weekEnd.getTime()
    })

    // Ensure strict filtering for current month/year to avoid boundary issues
    const currentMonthDays = allDays.filter(day =>
        day.date.getMonth() === today.getMonth() && day.date.getFullYear() === today.getFullYear()
    )

    const currentYearDays = allDays.filter(day => day.date.getFullYear() === today.getFullYear())

    const weekStats = useMemo(() => calculatePeriodStats(currentWeekDays as StatsDay[], today), [currentWeekDays])
    const monthStats = useMemo(() => calculatePeriodStats(currentMonthDays as StatsDay[], today), [currentMonthDays])
    const yearStats = useMemo(() => calculatePeriodStats(currentYearDays as StatsDay[], today), [currentYearDays])

    const getTeamStats = (team: "A" | "B", days: DayData[]): PeriodStats => {
        const teamRecordDays = days.filter(d => d.team === team)
        return {
            hadMeal: teamRecordDays.filter(d => d.status === "volt").length,
            noMeal: teamRecordDays.filter(d => d.status === "nem").length,
            unfilled: 0, holidays: 0,
            totalDays: teamRecordDays.length,
            elapsedDays: teamRecordDays.length
        }
    }

    const teamAWeekStats = useMemo(() => getTeamStats("A", currentWeekDays), [currentWeekDays])
    const teamBWeekStats = useMemo(() => getTeamStats("B", currentWeekDays), [currentWeekDays])
    const teamAMonthStats = useMemo(() => getTeamStats("A", currentMonthDays), [currentMonthDays])
    const teamBMonthStats = useMemo(() => getTeamStats("B", currentMonthDays), [currentMonthDays])
    const teamAYearStats = useMemo(() => getTeamStats("A", currentYearDays), [currentYearDays])
    const teamBYearStats = useMemo(() => getTeamStats("B", currentYearDays), [currentYearDays])

    const historyYears = useMemo(() => {
        const uniqueYears = Array.from(new Set(rawRecords.map(r => new Date(r.date).getFullYear()))).sort((a, b) => b - a)
        if (!uniqueYears.includes(new Date().getFullYear())) {
            uniqueYears.unshift(new Date().getFullYear())
        }
        return uniqueYears.map(String)
    }, [rawRecords])

    return {
        loading,
        weekStats, monthStats, yearStats,
        teamAWeekStats, teamBWeekStats,
        teamAMonthStats, teamBMonthStats,
        teamAYearStats, teamBYearStats,
        historyYears, rawRecords, holidays
    }
}
