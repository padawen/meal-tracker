"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { formatDateOnly, parseDateOnly } from "@/lib/utils"
import {
  fetchMealRangeData,
  fetchProfilesByIds,
  type MealDayData as DayData,
  type HolidayRow,
  type MealRecordRow,
  type ProfileSummary,
  buildMealDayDataRange,
} from "@/lib/meal-domain"
import {
  expandLoadedMealRange,
  getInitialMealFetchRange,
  getRequiredMealRange,
  mergeMealDayData,
  replaceMealDay,
} from "@/lib/meal-view-domain"

interface MealDataContextValue {
  loading: boolean
  allRecords: DayData[]
  rawRecords: MealRecordRow[]
  holidays: HolidayRow[]
  profilesMap: Map<string, ProfileSummary>
  setAllRecords: React.Dispatch<React.SetStateAction<DayData[]>>
  ensureRangeLoaded: (requiredStart: Date, requiredEnd: Date) => Promise<void>
}

const MealDataContext = createContext<MealDataContextValue | null>(null)

export function MealDataProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [allRecords, setAllRecords] = useState<DayData[]>([])
  const [rawRecords, setRawRecords] = useState<MealRecordRow[]>([])
  const [holidays, setHolidays] = useState<HolidayRow[]>([])
  const [profilesMap, setProfilesMap] = useState<Map<string, ProfileSummary>>(new Map())

  const loadedRangeRef = useRef<{ start: Date; end: Date } | null>(null)
  const loadingRangeRef = useRef(false)

  const fetchDateRange = useCallback(async (startDate: Date, endDate: Date): Promise<{ days: DayData[]; records: MealRecordRow[]; holidaysData: HolidayRow[]; profiles: Map<string, ProfileSummary> }> => {
    const { records, holidays: holidaysData } = await fetchMealRangeData(startDate, endDate)
    const profiles = await fetchProfilesByIds(records.map((r) => r.recorded_by))
    const days = buildMealDayDataRange(startDate, endDate, records, holidaysData, profiles)
    return { days, records, holidaysData, profiles }
  }, [])

  const ensureRangeLoaded = useCallback(
    async (requiredStart: Date, requiredEnd: Date) => {
      if (!loadedRangeRef.current || loadingRangeRef.current) return
      const loadedRange = loadedRangeRef.current

      if (requiredStart < loadedRange.start || requiredEnd > loadedRange.end) {
        loadingRangeRef.current = true

        try {
          const requiredRange = { start: requiredStart, end: requiredEnd }
          const { fetchAfter, fetchBefore, nextRange } = expandLoadedMealRange(loadedRange, requiredRange)

          const [beforeRes, afterRes] = await Promise.all([
            fetchBefore ? fetchDateRange(fetchBefore.start, fetchBefore.end) : Promise.resolve(null),
            fetchAfter ? fetchDateRange(fetchAfter.start, fetchAfter.end) : Promise.resolve(null),
          ])

          const newDays = [...(beforeRes?.days || []), ...(afterRes?.days || [])]
          const newRecords = [...(beforeRes?.records || []), ...(afterRes?.records || [])]
          const newHolidays = [...(beforeRes?.holidaysData || []), ...(afterRes?.holidaysData || [])]

          if (newDays.length > 0) {
            setAllRecords((prev) => mergeMealDayData(prev, newDays))
          }
          if (newRecords.length > 0) {
            setRawRecords((prev) => [...prev, ...newRecords])
          }
          if (newHolidays.length > 0) {
            setHolidays((prev) => [...prev, ...newHolidays])
          }
          if (beforeRes?.profiles || afterRes?.profiles) {
            setProfilesMap((prev) => {
              const next = new Map(prev)
              beforeRes?.profiles.forEach((v, k) => next.set(k, v))
              afterRes?.profiles.forEach((v, k) => next.set(k, v))
              return next
            })
          }

          loadedRangeRef.current = nextRange
        } catch (err) {
          console.error("Error expanding meal data range:", err)
        } finally {
          loadingRangeRef.current = false
        }
      }
    },
    [fetchDateRange]
  )

  useEffect(() => {
    let isMounted = true

    const initCache = async () => {
      try {
        const today = new Date()
        const { start, end } = getInitialMealFetchRange(today)
        const { days, records, holidaysData, profiles } = await fetchDateRange(start, end)

        if (isMounted) {
          setAllRecords(days)
          setRawRecords(records)
          setHolidays(holidaysData)
          setProfilesMap(profiles)
          loadedRangeRef.current = { start, end }
          setLoading(false)

          // Background prefetch for current month range without blocking UI
          const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
          const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          ensureRangeLoaded(currentMonthStart, currentMonthEnd)
        }
      } catch (err) {
        console.error("Failed to initialize meal cache:", err)
        if (isMounted) setLoading(false)
      }
    }

    initCache()
    return () => { isMounted = false }
  }, [ensureRangeLoaded, fetchDateRange])

  useEffect(() => {
    const channel = supabase
      .channel("meal_records_cache_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "meal_records" }, async (payload) => {
        const dateStr = payload.new ? (payload.new as any).date : (payload.old as any)?.date
        if (!dateStr) return

        const d = parseDateOnly(dateStr)
        try {
          const { days, records } = await fetchDateRange(d, d)
          if (days && days.length > 0) {
            setAllRecords((prev) => replaceMealDay(prev, days[0]))
          }
          if (records && records.length > 0) {
            setRawRecords((prev) => {
              const idx = prev.findIndex((r) => r.date === dateStr)
              if (idx === -1) return [...prev, records[0]]
              const copy = [...prev]
              copy[idx] = records[0]
              return copy
            })
          }
        } catch (err) {
          console.error("Realtime cache update error:", err)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchDateRange])

  return (
    <MealDataContext.Provider
      value={{
        loading,
        allRecords,
        rawRecords,
        holidays,
        profilesMap,
        setAllRecords,
        ensureRangeLoaded,
      }}
    >
      {children}
    </MealDataContext.Provider>
  )
}

export function useMealDataContext() {
  const ctx = useContext(MealDataContext)
  if (!ctx) throw new Error("useMealDataContext must be used within MealDataProvider")
  return ctx
}
