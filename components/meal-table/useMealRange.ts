'use client'

import { useCallback, useEffect } from 'react'
import { formatDateOnly, parseDateOnly } from '@/lib/utils'
import { useMealDataContext } from './MealDataContext'

export function useMealRange(start: Date, end: Date, priority = 0) {
  const { ensureRangeLoaded, getRangeStatus } = useMealDataContext()
  const startKey = formatDateOnly(start)
  const endKey = formatDateOnly(end)
  const retry = useCallback(() => {
    void ensureRangeLoaded(parseDateOnly(startKey), parseDateOnly(endKey), priority).catch(() => {
      // The cache exposes a recoverable error state for this range.
    })
  }, [endKey, ensureRangeLoaded, priority, startKey])
  useEffect(retry, [retry])
  return { status: getRangeStatus(start, end), retry }
}
