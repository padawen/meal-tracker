"use client"

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import { formatDateOnly, parseDateOnly } from '@/lib/utils'
import { useAuth } from '@/components/auth/AuthGuard'
import { MealCache } from '@/lib/meal-cache'
import { MealImageCache } from '@/lib/meal-image-cache'
import {
  buildMealDayDataRange, fetchMealImage, fetchMealRangeData, fetchProfilesByIds, MEAL_TRACKING_START,
} from '@/lib/meal-domain'

function createMealStores() {
  const images = new MealImageCache(fetchMealImage)
  const cache = new MealCache(async ({ start, end }) => {
    const result = await fetchMealRangeData(parseDateOnly(start), parseDateOnly(end))
    const profiles = await fetchProfilesByIds(result.records.map((record) => record.recorded_by))
    return { ...result, profiles }
  })
  return { cache, images }
}

function useMealStoreValue() {
  const [stores] = useState(createMealStores)
  const { cache, images } = stores
  const { profile } = useAuth()
  const snapshot = useSyncExternalStore(cache.subscribe, cache.getSnapshot, cache.getSnapshot)
  const profilesMap = useMemo(() => new Map([...snapshot.profiles, [profile.id, profile] as const]), [profile, snapshot.profiles])
  const allRecords = useMemo(() => snapshot.ranges.flatMap((range) => buildMealDayDataRange(
    parseDateOnly(range.start), parseDateOnly(range.end), snapshot.records, snapshot.holidays, profilesMap,
  )), [snapshot, profilesMap])
  const ensureRangeLoaded = useMemo(() => (start: Date, end: Date, priority = 0) => cache.ensure({
    start: formatDateOnly(start < MEAL_TRACKING_START ? MEAL_TRACKING_START : start), end: formatDateOnly(end),
  }, priority), [cache])
  const getRangeStatus = (start: Date, end: Date) => cache.status({
    start: formatDateOnly(start < MEAL_TRACKING_START ? MEAL_TRACKING_START : start), end: formatDateOnly(end),
  })
  return { cache, images, allRecords, rawRecords: snapshot.records, holidays: snapshot.holidays,
    profilesMap, ensureRangeLoaded, getRangeStatus, snapshot }
}

const MealDataContext = createContext<ReturnType<typeof useMealStoreValue> | null>(null)

function MealDataSession({ children }: { children: ReactNode }) {
  const value = useMealStoreValue()
  const { cache, images } = value
  useEffect(() => {
    let active = true
    const refresh = async (date: string) => {
      const record = cache.getSnapshot().records.find((record) => record.date === date)
      if (record) images.invalidate(record.id)
      if (active) await cache.refresh(date)
    }
    const stringField = (value: unknown, key: string) => {
      if (!value || typeof value !== 'object') return undefined
      const field = (value as Record<string, unknown>)[key]
      return typeof field === 'string' ? field : undefined
    }
    const channel = supabase.channel(`meal-cache:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_records' }, (payload) => {
        const date = stringField(payload.new, 'date') || stringField(payload.old, 'date')
        const id = stringField(payload.new, 'id') || stringField(payload.old, 'id')
        const cachedDate = id && cache.getSnapshot().records.find((record) => record.id === id)?.date
        if (date || cachedDate) void refresh(date || cachedDate!).catch(console.error)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_ratings' }, (payload) => {
        const id = stringField(payload.new, 'meal_record_id') || stringField(payload.old, 'meal_record_id')
        if (!id) return
        void (async () => {
          const cached = cache.getSnapshot().records.find((record) => record.id === id)
          const date = cached?.date || (await supabase.from('meal_records').select('date').eq('id', id).maybeSingle()).data?.date
          if (date && active) await cache.refresh(date)
        })().catch(console.error)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'holidays' }, (payload) => {
        const id = stringField(payload.old, 'id')
        const oldDate = id && cache.getSnapshot().holidays.find((holiday) => holiday.id === id)?.date
        const date = stringField(payload.new, 'date') || stringField(payload.old, 'date') || oldDate
        if (date && active) void cache.refresh(date).catch(console.error)
      }).subscribe()
    return () => { active = false; void supabase.removeChannel(channel) }
  }, [cache, images])
  return <MealDataContext.Provider value={value}>{children}</MealDataContext.Provider>
}

export function MealDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return <MealDataSession key={user.id}>{children}</MealDataSession>
}

export function useMealDataContext() {
  const context = useContext(MealDataContext)
  if (!context) throw new Error('useMealDataContext must be used within MealDataProvider')
  return context
}
