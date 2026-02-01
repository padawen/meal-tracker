import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { DayData, FoodStatus } from "./DayItem"
import { calculatePeriodStats, PeriodStats } from "@/lib/stats-utils"

interface UseMealDataReturn {
    loading: boolean
    allRecords: DayData[]
    setAllRecords: (records: DayData[]) => void
    currentWeekDays: DayData[]
    currentMonthDays: DayData[]
    weekStats: PeriodStats
    monthStats: PeriodStats
    totalEmptyDays: number
    weekOffset: number
    monthOffset: number
    setWeekOffset: (offset: number | ((prev: number) => number)) => void
    setMonthOffset: (offset: number | ((prev: number) => number)) => void
    getWeekStart: (offset: number) => Date
    canNavigateBack: (view: "week" | "month") => boolean
    formatDateStr: (date: Date) => string
}

export function useMealData(): UseMealDataReturn {
    // Initialize loading from localStorage if available, otherwise true
    const [loading, setLoading] = useState(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('meal_data_loaded')
            return cached !== 'true'
        }
        return true
    })
    const [allRecords, setAllRecords] = useState<DayData[]>([])
    const [weekOffset, setWeekOffset] = useState(0)
    const [monthOffset, setMonthOffset] = useState(0)
    const { toast } = useToast()

    const today = new Date()

    const formatDateStr = (date: Date): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    const getWeekStart = (offset: number) => {
        const date = new Date(today)
        const day = date.getDay()
        const diff = day === 0 ? -6 : 1 - day
        date.setDate(date.getDate() + diff + (offset * 7))
        date.setHours(0, 0, 0, 0)
        return date
    }

    const canNavigateBack = (view: "week" | "month") => {
        const year2026Start = new Date(2026, 0, 1) // January 1, 2026
        year2026Start.setHours(0, 0, 0, 0)
        
        if (view === "week") {
            const weekStart = getWeekStart(weekOffset - 1)
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekEnd.getDate() + 6)
            return weekEnd >= year2026Start
        } else {
            // For month view, calculate what month we would navigate to
            const currentYear = today.getFullYear()
            const currentMonth = today.getMonth()
            const targetMonth = currentMonth + monthOffset - 1
            
            // Calculate the actual year and month after offset
            const targetDate = new Date(currentYear, targetMonth, 1)
            targetDate.setHours(0, 0, 0, 0)
            
            console.log('canNavigateBack check:', {
                currentYear,
                currentMonth,
                monthOffset,
                targetMonth,
                targetDate: targetDate.toISOString(),
                year2026Start: year2026Start.toISOString(),
                canGo: targetDate >= year2026Start
            })
            
            return targetDate >= year2026Start
        }
    }

    useEffect(() => {
        const fetchAllRecords = async () => {
            try {
                const startDate = new Date(today.getFullYear(), today.getMonth() - 6, 1)
                if (startDate < new Date(2026, 0, 1)) {
                    startDate.setFullYear(2026)
                    startDate.setMonth(0)
                    startDate.setDate(1)
                }
                const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0)
                const startDateStr = formatDateStr(startDate)
                const endDateStr = formatDateStr(endDate)

                const [recordsResult, holidaysResult] = await Promise.all([
                    supabase
                        .from('meal_records')
                        .select('*')
                        .gte('date', startDateStr)
                        .lte('date', endDateStr)
                        .returns<Array<{
                            id: string; date: string; had_meal: boolean; meal_name: string | null
                            reason: string | null; recorded_by: string; created_at: string; team: string | null
                        }>>(),
                    supabase
                        .from('holidays')
                        .select('date, name')
                        .gte('date', startDateStr)
                        .lte('date', endDateStr)
                ])

                if (recordsResult.error) throw recordsResult.error
                if (holidaysResult.error) throw holidaysResult.error

                const records = recordsResult.data
                const holidays = holidaysResult.data

                const holidaysMap = new Map(holidays?.map(h => [h.date, h.name]) || [])
                const recordsMap = new Map(records?.map(r => [r.date, r]) || [])

                const uniqueUserIds = Array.from(new Set(records?.map(r => r.recorded_by) || []))
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .in('id', uniqueUserIds)
                    .returns<Array<{ id: string; full_name: string | null; email: string }>>()

                const profilesMap = new Map(profiles?.map(p => [p.id, p]) || [])

                const daysArray: DayData[] = []
                const currentDate = new Date(startDate)

                while (currentDate <= endDate) {
                    const dateStr = formatDateStr(currentDate)
                    const record = recordsMap.get(dateStr)
                    const holidayName = holidaysMap.get(dateStr)

                    let status: FoodStatus = "empty"
                    let food: string | undefined
                    let reason: string | undefined
                    let recordedBy: string | undefined
                    let recordedAt: string | undefined
                    let team: "A" | "B" | undefined

                    if (record) {
                        status = record.had_meal ? "volt" : "nem"
                        food = record.meal_name || undefined
                        reason = record.reason || undefined
                        team = (record.team as "A" | "B") || undefined
                        const profile = profilesMap.get(record.recorded_by)
                        recordedBy = profile?.full_name || profile?.email?.split('@')[0] || 'Ismeretlen'
                        recordedAt = new Date(record.created_at).toLocaleTimeString('hu-HU', {
                            hour: '2-digit', minute: '2-digit'
                        })
                    }

                    daysArray.push({
                        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
                        status, food, reason, recordedBy, recordedAt, team,
                        isHoliday: !!holidayName, holidayName
                    })

                    currentDate.setDate(currentDate.getDate() + 1)
                }

                setAllRecords(daysArray)
                // Mark data as loaded in localStorage
                if (typeof window !== 'undefined') {
                    localStorage.setItem('meal_data_loaded', 'true')
                }
            } catch (error) {
                console.error('Error fetching meal records:', error)
                toast({
                    title: "Hiba",
                    description: "Nem sikerült betölteni az étkezési adatokat",
                    variant: "destructive"
                })
            } finally {
                setLoading(false)
            }
        }

        fetchAllRecords()

        // Handle page visibility changes - reset loading state when page becomes visible
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && loading) {
                // If we were loading and page becomes visible, check localStorage
                const cached = localStorage.getItem('meal_data_loaded')
                if (cached === 'true') {
                    setLoading(false)
                }
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [])
    const monthStats = useMemo(() => calculatePeriodStats(currentActualMonthDays, today), [currentActualMonthDays])

    const totalEmptyDays = allRecords.filter((d) =>
        d.status === "empty" && d.date <= today && !d.isHoliday
    ).length

    return {
        loading, allRecords, setAllRecords,
        currentWeekDays, currentMonthDays,
        weekStats, monthStats, totalEmptyDays,
        weekOffset, monthOffset, setWeekOffset, setMonthOffset,
        getWeekStart, canNavigateBack, formatDateStr
    }
}
