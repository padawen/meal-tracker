import { formatDateOnly } from '@/lib/utils'
import { type MealDayData, MEAL_TRACKING_START } from '@/lib/meal-domain'

interface DateRange {
  start: Date
  end: Date
}

export function getInitialMealFetchRange(today: Date): DateRange {
  const weekStart = getWeekStartForDate(today, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  return {
    start: weekStart < MEAL_TRACKING_START ? new Date(MEAL_TRACKING_START) : weekStart,
    end: weekEnd,
  }
}

export function getMealPrefetchRange(today: Date): DateRange {
  return getMealWeekPrefetchRange(today, 0)
}

export function getMealViewPrefetchRange(
  today: Date,
  view: 'week' | 'month' | 'year',
  offset: number
): DateRange {
  if (view === 'year') {
    const targetYear = today.getFullYear() + offset
    return clampRangeStart({
      start: new Date(targetYear - 1, 0, 1),
      end: new Date(targetYear + 2, 0, 0),
    })
  }

  if (view === 'month') {
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + offset, 1)
    return clampRangeStart({
      start: new Date(targetMonth.getFullYear(), targetMonth.getMonth() - 1, 1),
      end: new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 2, 0),
    })
  }

  return getMealWeekPrefetchRange(today, offset)
}

function getMealWeekPrefetchRange(today: Date, weekOffset: number): DateRange {
  const currentWeekStart = getWeekStartForDate(today, weekOffset)
  const prefetchStart = new Date(currentWeekStart)
  prefetchStart.setDate(prefetchStart.getDate() - 7)

  const prefetchEnd = new Date(prefetchStart)
  prefetchEnd.setDate(prefetchStart.getDate() + 4 * 7 - 1)

  return clampRangeStart({
    start: prefetchStart,
    end: prefetchEnd,
  })
}

export function getRequiredMealRange(
  today: Date,
  view: 'week' | 'month' | 'year',
  offset: number
): DateRange {
  if (view === 'year') {
    const targetYear = today.getFullYear() + offset
    return clampRangeStart({
      start: new Date(targetYear, 0, 1),
      end: new Date(targetYear, 11, 31),
    })
  }

  if (view === 'month') {
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + offset, 1)
    return clampRangeStart({
      start: new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1),
      end: new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0),
    })
  }

  const weekStart = getWeekStartForDate(today, offset)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  return clampRangeStart({
    start: weekStart,
    end: weekEnd,
  })
}

export function getWeekStartForDate(baseDate: Date, offset = 0) {
  const date = new Date(baseDate)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day

  date.setDate(date.getDate() + diff + offset * 7)
  date.setHours(0, 0, 0, 0)

  return date
}

export function canNavigateMealBack(view: 'week' | 'month' | 'year', today: Date, weekOffset: number, monthOffset: number, yearOffset: number) {
  if (view === 'week') {
    const previousWeekStart = getWeekStartForDate(today, weekOffset - 1)
    const previousWeekEnd = new Date(previousWeekStart)
    previousWeekEnd.setDate(previousWeekEnd.getDate() + 6)

    return previousWeekEnd >= MEAL_TRACKING_START
  }

  if (view === 'year') {
    const previousYearEnd = new Date(today.getFullYear() + yearOffset - 1, 11, 31)
    return previousYearEnd >= MEAL_TRACKING_START
  }

  const previousMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset - 1, 1)
  return previousMonth >= MEAL_TRACKING_START
}

export function mergeMealDayData(existing: MealDayData[], incoming: MealDayData[]) {
  const combined = [...existing, ...incoming]
  combined.sort((a, b) => a.date.getTime() - b.date.getTime())

  return combined.filter((day, index, days) => index === 0 || day.date.getTime() !== days[index - 1].date.getTime())
}

export function replaceMealDay(existing: MealDayData[], nextDay: MealDayData) {
  const nextDate = formatDateOnly(nextDay.date)
  const index = existing.findIndex((day) => formatDateOnly(day.date) === nextDate)

  if (index === -1) {
    return existing
  }

  const copy = [...existing]
  copy[index] = nextDay
  return copy
}

export function getWeekDays(recordsByDate: Map<string, MealDayData>, today: Date, weekOffset: number) {
  const weekStart = getWeekStartForDate(today, weekOffset)
  const weekDays: MealDayData[] = []

  for (let index = 0; index < 7; index += 1) {
    const targetDate = new Date(weekStart)
    targetDate.setDate(weekStart.getDate() + index)

    if (targetDate >= MEAL_TRACKING_START) {
      const found = recordsByDate.get(formatDateOnly(targetDate))
      if (found) {
        weekDays.push(found)
      }
    }
  }

  return weekDays
}

export function getMonthDays(allRecords: MealDayData[], targetDate: Date) {
  return allRecords.filter(
    (day) => day.date.getMonth() === targetDate.getMonth() && day.date.getFullYear() === targetDate.getFullYear()
  )
}

export function getYearDays(allRecords: MealDayData[], targetYear: number) {
  return allRecords.filter((day) => day.date.getFullYear() === targetYear)
}

export function getCurrentWeekStatsDays(allRecords: MealDayData[], today: Date) {
  const currentWeekStart = getWeekStartForDate(today)
  const weekStartTime = currentWeekStart.getTime()
  const weekEndTime = weekStartTime + 7 * 24 * 60 * 60 * 1000

  return allRecords.filter((day) => {
    const dayTime = day.date.getTime()
    return dayTime >= weekStartTime && dayTime < weekEndTime
  })
}

export function getCurrentMonthStatsDays(allRecords: MealDayData[], today: Date) {
  return getMonthDays(allRecords, today)
}

export function countElapsedEmptyDays(allRecords: MealDayData[], today: Date) {
  return allRecords.filter((day) => day.status === 'empty' && day.date <= today && !day.isHoliday).length
}

export function expandLoadedMealRange(loadedRange: DateRange, requiredRange: DateRange) {
  const shouldFetchBefore = requiredRange.start < loadedRange.start
  const shouldFetchAfter = requiredRange.end > loadedRange.end

  const nextStart = shouldFetchBefore ? new Date(requiredRange.start) : new Date(loadedRange.start)
  const nextEnd = shouldFetchAfter ? new Date(requiredRange.end) : new Date(loadedRange.end)

  if (nextStart < MEAL_TRACKING_START) {
    nextStart.setTime(MEAL_TRACKING_START.getTime())
  }

  return {
    nextRange: { start: nextStart, end: nextEnd },
    fetchBefore: shouldFetchBefore
      ? {
          start: nextStart,
          end: new Date(loadedRange.start.getFullYear(), loadedRange.start.getMonth(), loadedRange.start.getDate() - 1),
        }
      : null,
    fetchAfter: shouldFetchAfter
      ? {
          start: new Date(loadedRange.end.getFullYear(), loadedRange.end.getMonth(), loadedRange.end.getDate() + 1),
          end: nextEnd,
        }
      : null,
  }
}

function clampRangeStart(range: DateRange): DateRange {
  if (range.start < MEAL_TRACKING_START) {
    return {
      start: new Date(MEAL_TRACKING_START),
      end: range.end,
    }
  }

  return range
}
