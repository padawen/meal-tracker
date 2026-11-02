'use client'

import { useEffect, useState } from 'react'
import { fetchMealNeighbor, type MealDayData } from '@/lib/meal-domain'
import { formatDateOnly, parseDateOnly } from '@/lib/utils'
import { useMealDataContext } from './MealDataContext'

export function useMealGallery(day: MealDayData | null, voting: boolean) {
  const { cache, images, ensureRangeLoaded, allRecords } = useMealDataContext()
  const [result, setResult] = useState<{
    key: string; previous: string | null; next: string | null; error: boolean
  } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const date = day ? formatDateOnly(day.date) : null
  const enabled = Boolean(day && (day.hasImage || voting))
  const key = `${date}:${voting}`
  // A canonical mutation invalidates neighbor membership without downloading photos.
  const revision = allRecords.filter((record) => record.status === 'volt').map((record) => `${record.recordId}:${record.hasImage}`).join(',')
  useEffect(() => {
    if (!date || !enabled) return
    let active = true
    void (async () => {
      const [previous, next] = await Promise.all([
        fetchMealNeighbor(date, 'previous', voting), fetchMealNeighbor(date, 'next', voting),
      ])
      const neighbors = [previous, next].filter((record) => record !== null)
      await Promise.all(neighbors.map((record) => ensureRangeLoaded(parseDateOnly(record.date), parseDateOnly(record.date))))
      if (!active) return
      setResult({ key, previous: previous?.date ?? null, next: next?.date ?? null, error: false })
      for (const neighbor of neighbors) {
        const record = cache.getSnapshot().records.find((record) => record.id === neighbor.id)
        if (record?.has_image) void images.load(record.id, 2)
      }
    })().catch(() => {
      if (active) setResult({ key, previous: null, next: null, error: true })
    })
    return () => { active = false }
  }, [attempt, cache, date, enabled, ensureRangeLoaded, images, key, voting, revision])
  const current = result?.key === key ? result : null
  return {
    previous: allRecords.find((record) => current?.previous === formatDateOnly(record.date)),
    next: allRecords.find((record) => current?.next === formatDateOnly(record.date)),
    loading: enabled && !current,
    error: Boolean(current?.error),
    retry: () => setAttempt((attempt) => attempt + 1),
  }
}
