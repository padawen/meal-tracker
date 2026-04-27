import { useState, useEffect, useMemo, useRef, useCallback } from "react"
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
    mergeMealDayData,
    replaceMealDay,
} from "@/lib/meal-view-domain"

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

    const loadedRangeRef = useRef<{ start: Date; end: Date } | null>(null)
    const loadingRangeRef = useRef(false)

    const today = new Date()
    const getWeekStart = useCallback((offset: number) => getWeekStartForDate(today, offset), [today])
    const canNavigateBack = useCallback(
        (view: "week" | "month") => canNavigateMealBack(view, today, weekOffset, monthOffset),
        [monthOffset, today, weekOffset]
    )

    const fetchDateRange = useCallback(async (startDate: Date, endDate: Date): Promise<DayData[]> => {
        const { records, holidays } = await fetchMealRangeData(startDate, endDate)
        const profilesMap = await fetchProfilesByIds(records.map((record) => record.recorded_by))

        return buildMealDayDataRange(startDate, endDate, records, holidays, profilesMap)
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

                const { start: startDate, end: endDate } = getInitialMealFetchRange(today)

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
            const requiredRange = getRequiredMealRange(today, weekOffset, monthOffset)
            const loadedRange = loadedRangeRef.current

            if (requiredRange.start < loadedRange.start || requiredRange.end > loadedRange.end) {
                loadingRangeRef.current = true

                try {
                    const { fetchAfter, fetchBefore, nextRange } = expandLoadedMealRange(loadedRange, requiredRange)
                    let newDays: DayData[] = []

                    if (fetchBefore) {
                        newDays = await fetchDateRange(fetchBefore.start, fetchBefore.end)
                    }

                    if (fetchAfter) {
                        const laterDays = await fetchDateRange(fetchAfter.start, fetchAfter.end)
                        newDays = [...newDays, ...laterDays]
                    }

                    if (newDays.length > 0) {
                        setAllRecords(prev => mergeMealDayData(prev, newDays))
                    }
                    loadedRangeRef.current = nextRange
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
                
                const d = parseDateOnly(dateStr)
                
                try {
                    const newData = await fetchDateRange(d, d);
                    
                    if (newData && newData.length > 0) {
                        setAllRecords(prev => replaceMealDay(prev, newData[0]));
                    }
                } catch (error) {
                    console.error('Error fetching realtime update:', error);
                }
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [fetchDateRange])

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

    const currentActualWeekDays = useMemo(() => getCurrentWeekStatsDays(allRecords, today), [allRecords, today])
    const currentActualMonthDays = useMemo(() => getCurrentMonthStatsDays(allRecords, today), [allRecords, today])

    const weekStats = useMemo(() => calculatePeriodStats(currentActualWeekDays, today), [currentActualWeekDays])
    const monthStats = useMemo(() => calculatePeriodStats(currentActualMonthDays, today), [currentActualMonthDays])

    const totalEmptyDays = useMemo(() => countElapsedEmptyDays(allRecords, today), [allRecords, today])

    return {
        loading, allRecords, setAllRecords,
        currentWeekDays, currentMonthDays,
        weekStats, monthStats, totalEmptyDays,
        weekOffset, monthOffset, setWeekOffset, setMonthOffset,
        getWeekStart, canNavigateBack, formatDateStr: formatDateOnly
    }
}
