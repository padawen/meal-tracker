import { formatDateOnly } from '@/lib/utils'
import { type MealDayData, MEAL_TRACKING_START } from '@/lib/meal-domain'

interface DateRange {
  start: Date
  end: Date
}

export function getInitialMealFetchRange(today: Date): DateRange {
  return {
    start: new Date(MEAL_TRACKING_START),
    end: new Date(today.getFullYear(), today.getMonth() + 3, 0),
  }
}

export function getRequiredMealRange(today: Date, weekOffset: number, monthOffset: number): DateRange {
  if (monthOffset !== 0) {
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
    return clampRangeStart({
      start: new Date(targetMonth.getFullYear(), targetMonth.getMonth() - 3, 1),
      end: new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 4, 0),
    })
  }

  const weekStart = getWeekStartForDate(today, weekOffset)
  return clampRangeStart({
    start: new Date(weekStart.getFullYear(), weekStart.getMonth() - 3, 1),
    end: new Date(weekStart.getFullYear(), weekStart.getMonth() + 4, 0),
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

export function canNavigateMealBack(view: 'week' | 'month', today: Date, weekOffset: number, monthOffset: number) {
  if (view === 'week') {
    const previousWeekStart = getWeekStartForDate(today, weekOffset - 1)
    const previousWeekEnd = new Date(previousWeekStart)
    previousWeekEnd.setDate(previousWeekEnd.getDate() + 6)

    return previousWeekEnd >= MEAL_TRACKING_START
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

  const nextStart = shouldFetchBefore
    ? new Date(requiredRange.start.getFullYear(), requiredRange.start.getMonth() - 1, 1)
    : loadedRange.start
  const nextEnd = shouldFetchAfter
    ? new Date(requiredRange.end.getFullYear(), requiredRange.end.getMonth() + 1, 0)
    : loadedRange.end

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
