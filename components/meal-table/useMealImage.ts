'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useMealDataContext } from './MealDataContext'
import type { MealImageVariant } from '@/lib/meal-image-storage'

export function useMealImage(recordId?: string, enabled = true, priority = 0, variant: MealImageVariant = 'full') {
  const { images } = useMealDataContext()
  const getSnapshot = useCallback(() => images.get(recordId, variant), [images, recordId, variant])
  const state = useSyncExternalStore(images.subscribe, getSnapshot, getSnapshot)
  useEffect(() => {
    if (!enabled || !recordId) return
    if (state.status === 'idle') void images.load(recordId, priority, variant)
    const expires = images.getExpiresAt(recordId, variant)
    if (state.status === 'ready' && expires) {
      const timer = setTimeout(() => images.invalidate(recordId, variant), Math.max(0, expires - Date.now()))
      return () => clearTimeout(timer)
    }
  }, [enabled, images, priority, recordId, state.status, variant])
  const retry = () => { if (recordId) void images.load(recordId, priority, variant) }
  return { ...state, retry }
}
