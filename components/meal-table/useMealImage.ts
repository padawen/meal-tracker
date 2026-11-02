'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useMealDataContext } from './MealDataContext'

export function useMealImage(recordId?: string, enabled = true, priority = 0) {
  const { images } = useMealDataContext()
  const getSnapshot = useCallback(() => images.get(recordId), [images, recordId])
  const state = useSyncExternalStore(images.subscribe, getSnapshot, getSnapshot)
  useEffect(() => {
    if (enabled && recordId && state.status === 'idle') void images.load(recordId, priority)
  }, [enabled, images, priority, recordId, state.status])
  const retry = () => { if (recordId) void images.load(recordId, priority) }
  return { ...state, retry }
}
