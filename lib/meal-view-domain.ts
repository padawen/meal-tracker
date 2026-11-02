import { formatDateOnly } from '@/lib/utils'
import { type MealDayData, MEAL_TRACKING_START } from '@/lib/meal-domain'

interface DateRange {
  start: Date
  end: Date
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
  const weekEnd = new Date(currentWeekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const weekEndTime = weekEnd.getTime()

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

function clampRangeStart(range: DateRange): DateRange {
  if (range.start < MEAL_TRACKING_START) {
    return {
      start: new Date(MEAL_TRACKING_START),
      end: range.end,
    }
  }

  return range
}
