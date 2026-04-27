import { calculatePeriodStats, type DayData as StatsDay, type PeriodStats } from '@/lib/stats-utils'
import { formatDateOnly, parseDateOnly } from '@/lib/utils'
import {
  type HolidayRow,
  type MealRecordRow,
  type ProfileSummary,
  type StatsCalendarDay,
  type TeamCode,
} from '@/lib/meal-domain'
import { getWeekStartForDate } from '@/lib/meal-view-domain'

export interface UserStat {
  userId: string
  fullName: string
  avatarUrl?: string | null
  recordCount: number
}

interface YearProgressSummary {
  elapsedDaysOfYear: number
  totalDaysOfYear: number
  elapsedHolidaysOfYear: number
  totalHolidaysOfYear: number
}

export interface HistoryMonthlyStat {
  name: string
  teamA: { had: number; no: number }
  teamB: { had: number; no: number }
  total: {
    had: number
    no: number
    unfilled: number
    holidays: number
  }
  daysInMonth: number
  elapsedDays: number
}

export interface HistoryYearSummary {
  elapsedDays: number
  totalDays: number
  elapsedHolidays: number
  totalHolidays: number
  isCurrentYear: boolean
}

export interface TeamRecordSummary {
  had: number
  no: number
}

export interface RecordsSummary {
  teamA: TeamRecordSummary
  teamB: TeamRecordSummary
  totalHad: number
  totalNo: number
}

const MONTH_NAMES = [
  'Január',
  'Február',
  'Március',
  'Április',
  'Május',
  'Június',
  'Július',
  'Augusztus',
  'Szeptember',
  'Október',
  'November',
  'December',
]

export function getStatisticsFetchRange(today: Date) {
  const currentYear = today.getFullYear()

  return {
    start: new Date(currentYear - 1, 0, 1),
    end: new Date(currentYear, 11, 31),
  }
}

export function getCurrentWeekDays(allDays: StatsCalendarDay[], today: Date) {
  const weekStart = getWeekStartForDate(today)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  return allDays.filter((day) => {
    const dayTime = day.date.getTime()
    return dayTime >= weekStart.getTime() && dayTime < weekEnd.getTime()
  })
}

export function getCurrentMonthDays(allDays: StatsCalendarDay[], today: Date) {
  return allDays.filter(
    (day) => day.date.getMonth() === today.getMonth() && day.date.getFullYear() === today.getFullYear()
  )
}

export function getCurrentYearDays(allDays: StatsCalendarDay[], year: number) {
  return allDays.filter((day) => day.date.getFullYear() === year)
}

export function calculateStatsForDays(days: StatsCalendarDay[], today: Date) {
  return calculatePeriodStats(days as StatsDay[], today)
}

export function calculateTeamPeriodStats(team: TeamCode, days: StatsCalendarDay[]): PeriodStats {
  const teamRecordDays = days.filter((day) => day.team === team)

  return {
    hadMeal: teamRecordDays.filter((day) => day.status === 'volt').length,
    noMeal: teamRecordDays.filter((day) => day.status === 'nem').length,
    unfilled: 0,
    holidays: 0,
    totalDays: teamRecordDays.length,
    elapsedDays: teamRecordDays.length,
  }
}

export function buildHistoryYears(records: Pick<MealRecordRow, 'date'>[], currentYear: number) {
  const uniqueYears = Array.from(new Set(records.map((record) => parseDateOnly(record.date).getFullYear()))).sort(
    (a, b) => b - a
  )

  if (!uniqueYears.includes(currentYear)) {
    uniqueYears.unshift(currentYear)
  }

  return uniqueYears.map(String)
}

export function buildUserStats(
  records: Pick<MealRecordRow, 'date' | 'recorded_by'>[],
  profilesMap: Map<string, ProfileSummary>,
  year: number
) {
  const currentYearRecords = records.filter((record) => parseDateOnly(record.date).getFullYear() === year)
  return buildUserStatsFromRecords(currentYearRecords, profilesMap)
}

export function buildUserStatsFromRecords(
  records: Pick<MealRecordRow, 'recorded_by'>[],
  profilesMap: Map<string, ProfileSummary>
) {
  const counts = new Map<string, number>()

  records.forEach((record) => {
    counts.set(record.recorded_by, (counts.get(record.recorded_by) || 0) + 1)
  })

  return Array.from(new Set(records.map((record) => record.recorded_by)))
    .map((userId) => {
      const profile = profilesMap.get(userId)
      const fullName = profile?.full_name || profile?.email?.split('@')[0] || 'Névtelen'

      return {
        userId,
        fullName,
        avatarUrl: profile?.avatar_url,
        recordCount: counts.get(userId) || 0,
      }
    })
    .sort((a, b) => b.recordCount - a.recordCount)
}

export function buildHistoryMonthlyStats(
  historyYear: string,
  today: Date,
  records: Pick<MealRecordRow, 'date' | 'had_meal' | 'team'>[],
  holidays: Pick<HolidayRow, 'date'>[]
) {
  const yearRecords = records.filter((record) => parseDateOnly(record.date).getFullYear().toString() === historyYear)
  const yearHolidays = holidays.filter((holiday) => parseDateOnly(holiday.date).getFullYear().toString() === historyYear)
  const stats: HistoryMonthlyStat[] = []
  const yearNumber = Number(historyYear)

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const monthStart = new Date(yearNumber, monthIndex, 1)
    const monthEnd = new Date(yearNumber, monthIndex + 1, 0)
    const monthRecords = yearRecords.filter((record) => parseDateOnly(record.date).getMonth() === monthIndex)
    const visibleHolidays = yearHolidays.filter((holiday) => parseDateOnly(holiday.date).getMonth() === monthIndex).length
    const unfilledCount = countUnfilledDaysInMonth(monthStart, monthEnd, today, yearRecords, yearHolidays)
    const elapsedDaysInMonth = getElapsedDaysInMonth(monthStart, monthEnd, today)
    const totalHad = monthRecords.filter((record) => record.had_meal).length
    const totalNo = monthRecords.filter((record) => !record.had_meal).length

    if (monthRecords.length > 0 || visibleHolidays > 0) {
      stats.push({
        name: MONTH_NAMES[monthIndex],
        teamA: {
          had: monthRecords.filter((record) => record.team === 'A' && record.had_meal).length,
          no: monthRecords.filter((record) => record.team === 'A' && !record.had_meal).length,
        },
        teamB: {
          had: monthRecords.filter((record) => record.team === 'B' && record.had_meal).length,
          no: monthRecords.filter((record) => record.team === 'B' && !record.had_meal).length,
        },
        total: {
          had: totalHad,
          no: totalNo,
          unfilled: unfilledCount,
          holidays: visibleHolidays,
        },
        daysInMonth: monthEnd.getDate(),
        elapsedDays: elapsedDaysInMonth,
      })
    }
  }

  return stats
}

export function summarizeHistoryMonthlyStats(stats: HistoryMonthlyStat[]) {
  return stats.reduce(
    (acc, stat) => ({
      teamAHad: acc.teamAHad + stat.teamA.had,
      teamANo: acc.teamANo + stat.teamA.no,
      teamBHad: acc.teamBHad + stat.teamB.had,
      teamBNo: acc.teamBNo + stat.teamB.no,
      totalHad: acc.totalHad + stat.total.had,
      totalNo: acc.totalNo + stat.total.no,
      totalHolidays: acc.totalHolidays + stat.total.holidays,
    }),
    { teamAHad: 0, teamANo: 0, teamBHad: 0, teamBNo: 0, totalHad: 0, totalNo: 0, totalHolidays: 0 }
  )
}

export function buildHistoryYearSummary(historyYear: string, today: Date, holidays: Pick<HolidayRow, 'date'>[]) {
  const year = Number(historyYear)
  const isCurrentYear = year === today.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const endOfYear = new Date(year, 11, 31)
  const totalDays = Math.floor((endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1

  let elapsedDays = 0
  if (isCurrentYear) {
    elapsedDays = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1
  } else if (year < today.getFullYear()) {
    elapsedDays = totalDays
  }

  const yearHolidays = holidays.filter((holiday) => parseDateOnly(holiday.date).getFullYear() === year)

  return {
    elapsedDays,
    totalDays,
    elapsedHolidays: yearHolidays.filter((holiday) => parseDateOnly(holiday.date) <= today).length,
    totalHolidays: yearHolidays.length,
    isCurrentYear,
  }
}

export function summarizeRecordsByTeam(records: Pick<MealRecordRow, 'team' | 'had_meal'>[]): RecordsSummary {
  return {
    teamA: {
      had: records.filter((record) => record.team === 'A' && record.had_meal).length,
      no: records.filter((record) => record.team === 'A' && !record.had_meal).length,
    },
    teamB: {
      had: records.filter((record) => record.team === 'B' && record.had_meal).length,
      no: records.filter((record) => record.team === 'B' && !record.had_meal).length,
    },
    totalHad: records.filter((record) => record.had_meal).length,
    totalNo: records.filter((record) => !record.had_meal).length,
  }
}

export function getYearProgress(holidays: Pick<HolidayRow, 'date'>[], today: Date): YearProgressSummary {
  const startOfYear = new Date(today.getFullYear(), 0, 1)
  const endOfYear = new Date(today.getFullYear(), 11, 31)

  const elapsedDaysOfYear =
    Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const totalDaysOfYear =
    Math.floor((endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1

  const currentYearHolidays = holidays.filter((holiday) => parseDateOnly(holiday.date).getFullYear() === today.getFullYear())

  return {
    elapsedDaysOfYear,
    totalDaysOfYear,
    elapsedHolidaysOfYear: currentYearHolidays.filter((holiday) => parseDateOnly(holiday.date) <= today).length,
    totalHolidaysOfYear: currentYearHolidays.length,
  }
}

function countUnfilledDaysInMonth(
  monthStart: Date,
  monthEnd: Date,
  today: Date,
  yearRecords: Pick<MealRecordRow, 'date'>[],
  yearHolidays: Pick<HolidayRow, 'date'>[]
) {
  let currentDate = new Date(monthStart)
  let unfilledCount = 0

  while (currentDate <= monthEnd) {
    if (currentDate <= today) {
      const dateString = formatDateOnly(currentDate)
      const hasRecord = yearRecords.some((record) => record.date === dateString)
      const isHoliday = yearHolidays.some((holiday) => holiday.date === dateString)

      if (!hasRecord && !isHoliday) {
        unfilledCount += 1
      }
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return unfilledCount
}

function getElapsedDaysInMonth(monthStart: Date, monthEnd: Date, today: Date) {
  if (monthStart > today) {
    return 0
  }

  const monthEndDate = monthEnd < today ? monthEnd : today
  let elapsedDays = 0
  const countDate = new Date(monthStart)

  while (countDate <= monthEndDate && countDate <= monthEnd) {
    elapsedDays += 1
    countDate.setDate(countDate.getDate() + 1)
  }

  return elapsedDays
}
