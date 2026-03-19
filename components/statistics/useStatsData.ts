import { useState, useEffect, useMemo } from "react"
import { supabase } from '@/lib/supabase/client'
import { calculatePeriodStats, PeriodStats, DayData as StatsDay } from "@/lib/stats-utils"

interface DayData {
    date: Date
    status: "volt" | "nem" | "empty"
    team?: "A" | "B"
    isHoliday?: boolean
}

interface UserStat {
    userId: string
    fullName: string
    avatarUrl?: string | null
    recordCount: number
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
    rawRecords: Array<{ date: string; had_meal: boolean; team: string | null; recorded_by: string }>
    holidays: Array<{ date: string, name: string }>
    allUsers: Map<string, { full_name: string | null; email: string; avatar_url?: string | null }>
    userStats: UserStat[]
    elapsedDaysOfYear: number
    totalDaysOfYear: number
    elapsedHolidaysOfYear: number
    totalHolidaysOfYear: number
}

export function useStatsData(): UseStatsDataReturn {
    const [loading, setLoading] = useState(true)
    const [allDays, setAllDays] = useState<DayData[]>([])
    const [rawRecords, setRawRecords] = useState<Array<{ date: string; had_meal: boolean; team: string | null; recorded_by: string }>>([])
    const [holidays, setHolidays] = useState<Array<{ date: string, name: string }>>([])
    const [userStats, setUserStats] = useState<UserStat[]>([])
    const [allUsers, setAllUsers] = useState<Map<string, { full_name: string | null; email: string; avatar_url?: string | null }>>(new Map())

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
                const currentYear = today.getFullYear()
                const fetchStart = new Date(currentYear - 1, 0, 1)
                const fetchEnd = new Date(currentYear, 11, 31)

                const startDateStr = formatDateStr(fetchStart)
                const endDateStr = formatDateStr(fetchEnd)

                const [recordsResult, holidaysResult] = await Promise.all([
                    supabase.from('meal_records').select('date, had_meal, team, recorded_by')
                        .gte('date', startDateStr).lte('date', endDateStr)
                        .returns<Array<{ date: string; had_meal: boolean; team: string | null; recorded_by: string }>>(),
                    supabase.from('holidays').select('date, name')
                        .gte('date', startDateStr).lte('date', endDateStr)
                ])

                if (recordsResult.error) throw recordsResult.error
                if (holidaysResult.error) throw holidaysResult.error

                const records = recordsResult.data || []
                const holidaysData = holidaysResult.data || []

                setRawRecords(records)
                setHolidays(holidaysData)

                // Filter records to CURRENT YEAR ONLY for user stats (best fillers of this year)
                const currentYearRecords = records.filter(r => new Date(r.date).getFullYear() === currentYear)

                // Fetch profiles for users in records
                const uniqueUserIds = Array.from(new Set(records.map(r => r.recorded_by)))
                let profiles: Array<{ id: string; full_name: string | null; email: string; avatar_url?: string | null }> = []
                if (uniqueUserIds.length > 0) {
                    const profilesResult = await supabase
                        .from('profiles')
                        .select('id, full_name, email, avatar_url')
                        .in('id', uniqueUserIds)
                    profiles = profilesResult.data || []
                }

                const profilesMap = new Map(profiles.map(p => [p.id, { full_name: p.full_name, email: p.email, avatar_url: p.avatar_url }]))
                setAllUsers(profilesMap)

                // Calculate User Stats for CURRENT YEAR
                const counts = new Map<string, number>()
                currentYearRecords.forEach(r => {
                    counts.set(r.recorded_by, (counts.get(r.recorded_by) || 0) + 1)
                })

                const stats: UserStat[] = Array.from(new Set(currentYearRecords.map(r => r.recorded_by))).map(uid => {
                    const profile = profilesMap.get(uid)
                    const fullName = profile?.full_name || profile?.email?.split('@')[0] || 'Névtelen'
                    return {
                        userId: uid,
                        fullName,
                        avatarUrl: profile?.avatar_url,
                        recordCount: counts.get(uid) || 0
                    }
                }).sort((a, b) => b.recordCount - a.recordCount)

                setUserStats(stats)

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

    const startOfYearSnapshot = new Date(today.getFullYear(), 0, 1)
    const endOfYearSnapshot = new Date(today.getFullYear(), 11, 31)

    const elapsedDaysOfYear = Math.floor((today.getTime() - startOfYearSnapshot.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const totalDaysOfYear = Math.floor((endOfYearSnapshot.getTime() - startOfYearSnapshot.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const currentYearHolidays = holidays.filter(h => new Date(h.date).getFullYear() === today.getFullYear())
    const elapsedHolidaysOfYear = currentYearHolidays.filter(h => new Date(h.date) <= today).length
    const totalHolidaysOfYear = currentYearHolidays.length

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
