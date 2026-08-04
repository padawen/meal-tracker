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
  getMealPrefetchRange,
  mergeMealDayData,
  replaceMealDay,
} from "@/lib/meal-view-domain"

interface LoadedMealRange {
  start: Date
  end: Date
}

interface MealDataContextValue {
  loading: boolean
  allRecords: DayData[]
  rawRecords: MealRecordRow[]
  holidays: HolidayRow[]
  profilesMap: Map<string, ProfileSummary>
  loadedRange: LoadedMealRange | null
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
  const [loadedRange, setLoadedRange] = useState<LoadedMealRange | null>(null)

  const loadedRangeRef = useRef<{ start: Date; end: Date } | null>(null)
  const pendingRangeRef = useRef<LoadedMealRange | null>(null)
  const rangeLoadPromiseRef = useRef<Promise<void> | null>(null)

  const fetchDateRange = useCallback(async (startDate: Date, endDate: Date): Promise<{ days: DayData[]; records: MealRecordRow[]; holidaysData: HolidayRow[]; profiles: Map<string, ProfileSummary> }> => {
    const { records, holidays: holidaysData } = await fetchMealRangeData(startDate, endDate)
    const profiles = await fetchProfilesByIds(records.map((r) => r.recorded_by))
    const days = buildMealDayDataRange(startDate, endDate, records, holidaysData, profiles)
    return { days, records, holidaysData, profiles }
  }, [])

  const ensureRangeLoaded = useCallback(
    async (requiredStart: Date, requiredEnd: Date) => {
      const currentPendingRange = pendingRangeRef.current
      pendingRangeRef.current = currentPendingRange
        ? {
            start: requiredStart < currentPendingRange.start ? requiredStart : currentPendingRange.start,
            end: requiredEnd > currentPendingRange.end ? requiredEnd : currentPendingRange.end,
          }
        : { start: requiredStart, end: requiredEnd }

      if (rangeLoadPromiseRef.current) {
        return rangeLoadPromiseRef.current
      }

      const loadPendingRanges = async () => {
        while (pendingRangeRef.current) {
          const requiredRange = pendingRangeRef.current
          pendingRangeRef.current = null

          const currentLoadedRange = loadedRangeRef.current
          if (!currentLoadedRange) {
            pendingRangeRef.current = requiredRange
            break
          }

          if (requiredRange.start >= currentLoadedRange.start && requiredRange.end <= currentLoadedRange.end) {
            continue
          }

          try {
            const { fetchAfter, fetchBefore, nextRange } = expandLoadedMealRange(currentLoadedRange, requiredRange)

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
              setRawRecords((prev) => {
                const recordsByDate = new Map(prev.map((record) => [record.date, record]))
                newRecords.forEach((record) => recordsByDate.set(record.date, record))
                return Array.from(recordsByDate.values())
              })
            }
            if (newHolidays.length > 0) {
              setHolidays((prev) => {
                const holidaysByDate = new Map(prev.map((holiday) => [holiday.date, holiday]))
                newHolidays.forEach((holiday) => holidaysByDate.set(holiday.date, holiday))
                return Array.from(holidaysByDate.values())
              })
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
            setLoadedRange(nextRange)
          } catch (err) {
            console.error("Error expanding meal data range:", err)
          }
        }
      }

      const promise = loadPendingRanges().finally(() => {
        rangeLoadPromiseRef.current = null
      })
      rangeLoadPromiseRef.current = promise
      return promise
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
          setLoadedRange({ start, end })
          setLoading(false)

          // Keep the first paint fast, then warm a four-week navigation window in the background.
          const prefetchRange = getMealPrefetchRange(today)
          ensureRangeLoaded(prefetchRange.start, prefetchRange.end)
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
        loadedRange,
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
