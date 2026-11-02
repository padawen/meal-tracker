import { useState, useMemo, useCallback } from 'react'
import { calculatePeriodStats } from '@/lib/stats-utils'
import { formatDateOnly } from '@/lib/utils'
import { MEAL_TRACKING_START } from '@/lib/meal-domain'
import {
  countElapsedEmptyDays, canNavigateMealBack, getCurrentMonthStatsDays, getCurrentWeekStatsDays,
  getMonthDays, getRequiredMealRange, getWeekDays, getWeekStartForDate, getYearDays,
} from '@/lib/meal-view-domain'
import { useMealDataContext } from './MealDataContext'
import { useMealRange } from './useMealRange'

export function useMealData(view: 'week' | 'month' | 'year') {
  const { allRecords, cache, images } = useMealDataContext()
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  const [yearOffset, setYearOffset] = useState(0)
  const today = useMemo(() => new Date(), [])
  const offset = view === 'week' ? weekOffset : view === 'month' ? monthOffset : yearOffset
  const required = getRequiredMealRange(today, view, offset)
  const viewState = useMealRange(required.start, required.end)
  const week = getRequiredMealRange(today, 'week', 0)
  const month = getRequiredMealRange(today, 'month', 0)
  const weekState = useMealRange(week.start, week.end)
  const monthState = useMealRange(month.start, month.end, 1)
  const missingState = useMealRange(MEAL_TRACKING_START, today, 1)
  const getWeekStart = useCallback((offset: number) => getWeekStartForDate(today, offset), [today])
  const canNavigateBack = useCallback(
    (view: 'week' | 'month' | 'year') => canNavigateMealBack(view, today, weekOffset, monthOffset, yearOffset),
    [monthOffset, today, weekOffset, yearOffset],
  )
  const recordsByDate = useMemo(() => new Map(allRecords.map((day) => [formatDateOnly(day.date), day])), [allRecords])
  const currentWeekDays = useMemo(() => getWeekDays(recordsByDate, today, weekOffset), [recordsByDate, today, weekOffset])
  const currentMonthDays = useMemo(() => getMonthDays(allRecords, new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)), [allRecords, monthOffset, today])
  const currentYearDays = useMemo(() => getYearDays(allRecords, today.getFullYear() + yearOffset), [allRecords, today, yearOffset])
  const weekStats = useMemo(() => calculatePeriodStats(getCurrentWeekStatsDays(allRecords, today), today), [allRecords, today])
  const monthStats = useMemo(() => calculatePeriodStats(getCurrentMonthStatsDays(allRecords, today), today), [allRecords, today])
  const totalEmptyDays = useMemo(() => countElapsedEmptyDays(allRecords, today), [allRecords, today])
  return {
    allRecords, cache, images, viewState, weekState, monthState, missingState,
    currentWeekDays, currentMonthDays, currentYearDays, weekStats, monthStats, totalEmptyDays,
    weekOffset, monthOffset, yearOffset, setWeekOffset, setMonthOffset, setYearOffset,
    getWeekStart, canNavigateBack, formatDateStr: formatDateOnly,
  }
}
