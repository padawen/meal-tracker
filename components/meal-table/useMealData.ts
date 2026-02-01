import { useState, useEffect, useMemo, useRef, useCallback } from "react"
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
    const [loading, setLoading] = useState(true)
    const [allRecords, setAllRecords] = useState<DayData[]>([])
    const [weekOffset, setWeekOffset] = useState(0)
    const [monthOffset, setMonthOffset] = useState(0)
    const { toast } = useToast()
    
    // Track loaded date range
    const loadedRangeRef = useRef<{ start: Date; end: Date } | null>(null)
    const loadingRangeRef = useRef(false)

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
        const year2026Start = new Date(2026, 0, 1)
        if (view === "week") {
            const weekStart = getWeekStart(weekOffset - 1)
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekEnd.getDate() + 6)
            return weekEnd >= year2026Start
        } else {
            const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset - 1, 1)
            return targetDate >= year2026Start
        }
    }

    // Fetch data for a specific date range
    const fetchDateRange = useCallback(async (startDate: Date, endDate: Date): Promise<DayData[]> => {
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
        let profilesMap = new Map<string, { id: string; full_name: string | null; email: string }>()
        
        if (uniqueUserIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', uniqueUserIds)
                .returns<Array<{ id: string; full_name: string | null; email: string }>>()
            profilesMap = new Map(profiles?.map(p => [p.id, p]) || [])
        }

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

        return daysArray
    }, [])

    // Initial data load with timeout
    useEffect(() => {
        let timeoutId: NodeJS.Timeout

        const fetchInitialRecords = async () => {
            try {
                // Timeout after 10 seconds
                timeoutId = setTimeout(() => {
                    console.warn('Fetch timeout - setting loading to false')
                    setLoading(false)
                }, 10000)

                const startDate = new Date(2026, 0, 1) // Always start from Jan 2026
                const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0)
                
                const daysArray = await fetchDateRange(startDate, endDate)
                setAllRecords(daysArray)
                loadedRangeRef.current = { start: startDate, end: endDate }
            } catch (error) {
                console.error('Error fetching meal records:', error)
                toast({
                    title: "Hiba",
                    description: "Nem sikerült betölteni az étkezési adatokat",
                    variant: "destructive"
                })
            } finally {
                clearTimeout(timeoutId)
                setLoading(false)
            }
        }

        fetchInitialRecords()

        return () => clearTimeout(timeoutId)
    }, [])

    // Check if we need to load more data when navigating
    useEffect(() => {
        const checkAndLoadMoreData = async () => {
            if (!loadedRangeRef.current || loadingRangeRef.current) return

            // Calculate required date range based on current view
            // Always require +3 months ahead of viewed date
            let requiredStart: Date
            let requiredEnd: Date

            if (monthOffset !== 0) {
                const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
                // Load -3 months before and +3 months after viewed month
                requiredStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth() - 3, 1)
                requiredEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 4, 0)
            } else {
                const weekStart = getWeekStart(weekOffset)
                // Load -3 months before and +3 months after viewed week
                requiredStart = new Date(weekStart.getFullYear(), weekStart.getMonth() - 3, 1)
                requiredEnd = new Date(weekStart.getFullYear(), weekStart.getMonth() + 4, 0)
            }

            // Ensure we don't go before 2026
            const minDate = new Date(2026, 0, 1)
            if (requiredStart < minDate) requiredStart = minDate

            const { start: loadedStart, end: loadedEnd } = loadedRangeRef.current

            // Check if required range is outside loaded range
            if (requiredStart < loadedStart || requiredEnd > loadedEnd) {
                loadingRangeRef.current = true

                try {
                    // Expand the range to load
                    const newStart = requiredStart < loadedStart 
                        ? new Date(requiredStart.getFullYear(), requiredStart.getMonth() - 1, 1)
                        : loadedStart
                    const newEnd = requiredEnd > loadedEnd
                        ? new Date(requiredEnd.getFullYear(), requiredEnd.getMonth() + 1, 0)
                        : loadedEnd

                    // Ensure minimum date
                    if (newStart < minDate) newStart.setTime(minDate.getTime())

                    // Load the missing ranges
                    let newDays: DayData[] = []
                    
                    if (requiredStart < loadedStart) {
                        // Load earlier dates
                        const fetchEnd = new Date(loadedStart)
                        fetchEnd.setDate(fetchEnd.getDate() - 1)
                        newDays = await fetchDateRange(newStart, fetchEnd)
                    }
                    
                    if (requiredEnd > loadedEnd) {
                        // Load later dates
                        const fetchStart = new Date(loadedEnd)
                        fetchStart.setDate(fetchStart.getDate() + 1)
                        const laterDays = await fetchDateRange(fetchStart, newEnd)
                        newDays = [...newDays, ...laterDays]
                    }

                    if (newDays.length > 0) {
                        // Merge with existing records and sort by date
                        setAllRecords(prev => {
                            const combined = [...prev, ...newDays]
                            combined.sort((a, b) => a.date.getTime() - b.date.getTime())
                            // Remove duplicates
                            const unique = combined.filter((day, index, arr) => 
                                index === 0 || day.date.getTime() !== arr[index - 1].date.getTime()
                            )
                            return unique
                        })
                        loadedRangeRef.current = { start: newStart, end: newEnd }
                    }
                } catch (error) {
                    console.error('Error loading more data:', error)
                } finally {
                    loadingRangeRef.current = false
                }
            }
        }

        checkAndLoadMoreData()
    }, [weekOffset, monthOffset])

    const currentWeekDays = useMemo(() => {
        const weekStart = getWeekStart(weekOffset)
        const weekDays: DayData[] = []
        for (let i = 0; i < 7; i++) {
            const targetDate = new Date(weekStart)
            targetDate.setDate(weekStart.getDate() + i)
            // Only include dates from 2026 onwards
            if (targetDate >= new Date(2026, 0, 1)) {
                const found = allRecords.find(d => d.date.toDateString() === targetDate.toDateString())
                if (found) weekDays.push(found)
            }
        }
        return weekDays
    }, [allRecords, weekOffset])

    const currentMonthDays = useMemo(() => {
        const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
        return allRecords.filter(day =>
            day.date.getMonth() === targetDate.getMonth() &&
            day.date.getFullYear() === targetDate.getFullYear()
        )
    }, [allRecords, monthOffset])

    const currentActualWeekStart = getWeekStart(0)
    const currentActualWeekDays = allRecords.filter(day => {
        const dayTime = day.date.getTime()
        const weekStartTime = currentActualWeekStart.getTime()
        const weekEndTime = weekStartTime + (7 * 24 * 60 * 60 * 1000)
        return dayTime >= weekStartTime && dayTime < weekEndTime
    })

    const currentActualMonthDays = allRecords.filter(day =>
        day.date.getMonth() === today.getMonth() &&
        day.date.getFullYear() === today.getFullYear()
    )

    const weekStats = useMemo(() => calculatePeriodStats(currentActualWeekDays, today), [currentActualWeekDays])
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
