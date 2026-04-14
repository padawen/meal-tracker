import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { DayData, FoodStatus } from "./DayItem"
import { calculatePeriodStats, PeriodStats } from "@/lib/stats-utils"
import { supabase } from '@/lib/supabase/client'

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
            let recordedByUserId: string | undefined
            let recordedAt: string | undefined
            let team: "A" | "B" | undefined

            if (record) {
                status = record.had_meal ? "volt" : "nem"
                food = record.meal_name || undefined
                reason = record.reason || undefined
                recordedByUserId = record.recorded_by
                team = (record.team as "A" | "B") || undefined
                const profile = profilesMap.get(record.recorded_by)
                recordedBy = profile?.full_name || profile?.email?.split('@')[0] || 'Ismeretlen'
                recordedAt = new Date(record.created_at).toLocaleString('hu-HU', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit'
                }).replace(/-/g, '.')
            }

            daysArray.push({
                date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
                status, food, reason, recordedBy, recordedByUserId, recordedAt, team,
                isHoliday: !!holidayName, holidayName
            })

            currentDate.setDate(currentDate.getDate() + 1)
        }

        return daysArray
    }, [])

    useEffect(() => {
        let isMounted = true;
        let timeoutId: NodeJS.Timeout;

        const fetchInitialRecords = async () => {
            timeoutId = setTimeout(() => {
                if (isMounted) {
                    console.warn('Initial fetch timeout - showing UI anyway');
                    setLoading(false);
                }
            }, 3000);

            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    if (isMounted) setLoading(false);
                    return;
                }

                const startDate = new Date(2026, 0, 1);
                const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0);

                const daysArray = await fetchDateRange(startDate, endDate);

                if (isMounted) {
                    setAllRecords(daysArray);
                    loadedRangeRef.current = { start: startDate, end: endDate };
                }
            } catch (error) {
                console.error('Critical fetch error:', error);
            } finally {
                if (isMounted) {
                    clearTimeout(timeoutId);
                    setLoading(false);
                }
            }
        };

        fetchInitialRecords();
        return () => { isMounted = false; clearTimeout(timeoutId); };
    }, []);

    useEffect(() => {
        const checkAndLoadMoreData = async () => {
            if (!loadedRangeRef.current || loadingRangeRef.current) return
            let requiredStart: Date
            let requiredEnd: Date

            if (monthOffset !== 0) {
                const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
                requiredStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth() - 3, 1)
                requiredEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 4, 0)
            } else {
                const weekStart = getWeekStart(weekOffset)
                requiredStart = new Date(weekStart.getFullYear(), weekStart.getMonth() - 3, 1)
                requiredEnd = new Date(weekStart.getFullYear(), weekStart.getMonth() + 4, 0)
            }

            const minDate = new Date(2026, 0, 1)
            if (requiredStart < minDate) requiredStart = minDate

            const { start: loadedStart, end: loadedEnd } = loadedRangeRef.current

            if (requiredStart < loadedStart || requiredEnd > loadedEnd) {
                loadingRangeRef.current = true

                try {
                    const newStart = requiredStart < loadedStart
                        ? new Date(requiredStart.getFullYear(), requiredStart.getMonth() - 1, 1)
                        : loadedStart
                    const newEnd = requiredEnd > loadedEnd
                        ? new Date(requiredEnd.getFullYear(), requiredEnd.getMonth() + 1, 0)
                        : loadedEnd

                    if (newStart < minDate) newStart.setTime(minDate.getTime())

                    let newDays: DayData[] = []

                    if (requiredStart < loadedStart) {
                        const fetchEnd = new Date(loadedStart)
                        fetchEnd.setDate(fetchEnd.getDate() - 1)
                        newDays = await fetchDateRange(newStart, fetchEnd)
                    }

                    if (requiredEnd > loadedEnd) {
                        const fetchStart = new Date(loadedEnd)
                        fetchStart.setDate(fetchStart.getDate() + 1)
                        const laterDays = await fetchDateRange(fetchStart, newEnd)
                        newDays = [...newDays, ...laterDays]
                    }

                    if (newDays.length > 0) {
                        setAllRecords(prev => {
                            const combined = [...prev, ...newDays]
                            combined.sort((a, b) => a.date.getTime() - b.date.getTime())
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

    useEffect(() => {
        const channel = supabase.channel('meal_records_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_records' }, async (payload) => {
                const dateStr = payload.new ? (payload.new as any).date : (payload.old as any)?.date;
                if (!dateStr) return;
                
                const [year, month, day] = dateStr.split('-');
                const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                
                try {
                    const newData = await fetchDateRange(d, d);
                    
                    if (newData && newData.length > 0) {
                        setAllRecords(prev => {
                            const idx = prev.findIndex(r => formatDateStr(r.date) === dateStr);
                            if (idx !== -1) {
                                const copy = [...prev];
                                copy[idx] = newData[0];
                                return copy;
                            }
                            return prev;
                        });
                    }
                } catch (error) {
                    console.error('Error fetching realtime update:', error);
                }
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [fetchDateRange])

    const currentWeekDays = useMemo(() => {
        const weekStart = getWeekStart(weekOffset)
        const weekDays: DayData[] = []
        for (let i = 0; i < 7; i++) {
            const targetDate = new Date(weekStart)
            targetDate.setDate(weekStart.getDate() + i)
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
