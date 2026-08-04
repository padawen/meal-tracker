import { supabase } from '@/lib/supabase/client'
import { formatDateOnly } from '@/lib/utils'

export type FoodStatus = 'volt' | 'nem' | 'empty'
export type TeamCode = 'A' | 'B'
export const MEAL_TRACKING_START = new Date(2026, 0, 1)

export interface MealDayData {
  date: Date
  recordId?: string
  status: FoodStatus
  food?: string
  mealImageUrl?: string
  reason?: string
  recordedBy?: string
  recordedByUserId?: string
  recordedAt?: string
  team?: TeamCode
  isHoliday?: boolean
  holidayName?: string
  ratingAverage?: number | null
  ratingCount?: number
  ratingSum?: number
  myRating?: number | null
}

export interface StatsCalendarDay {
  date: Date
  status: FoodStatus
  team?: TeamCode
  isHoliday?: boolean
  holidayName?: string
  ratingAverage?: number | null
  ratingCount?: number
  ratingSum?: number
}

export interface MealRatingSummary {
  meal_record_id: string
  meal_date: string
  rating_sum: number
  rating_count: number
  rating_average: number | null
  my_rating: number | null
}

export interface MealRecordRow {
  id: string
  date: string
  had_meal: boolean
  meal_name: string | null
  meal_image_url: string | null
  reason: string | null
  recorded_by: string
  created_at: string
  team: string | null
  rating_sum?: number
  rating_count?: number
  rating_average?: number | null
  my_rating?: number | null
}

export interface HolidayRow {
  date: string
  name: string
}

export interface ProfileSummary {
  id: string
  full_name: string | null
  email: string
  avatar_url?: string | null
}

export async function fetchMealRangeData(startDate: Date, endDate: Date) {
  const startDateStr = formatDateOnly(startDate)
  const endDateStr = formatDateOnly(endDate)

  const [recordsResult, holidaysResult, ratingsResult] = await Promise.all([
    supabase
      .from('meal_records')
      .select('*')
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .returns<MealRecordRow[]>(),
    supabase
      .from('holidays')
      .select('date, name')
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .returns<HolidayRow[]>(),
    supabase
      .rpc('get_meal_rating_summaries', { p_start_date: startDateStr, p_end_date: endDateStr })
      .returns<MealRatingSummary[]>(),
  ])

  if (recordsResult.error) throw recordsResult.error
  if (holidaysResult.error) throw holidaysResult.error
  if (ratingsResult.error) throw ratingsResult.error

  const ratingsByRecordId = new Map((ratingsResult.data || []).map((rating) => [rating.meal_record_id, rating]))
  const records = (recordsResult.data || []).map((record) => {
    const rating = ratingsByRecordId.get(record.id)
    return rating
      ? { ...record, rating_sum: rating.rating_sum, rating_count: rating.rating_count, rating_average: rating.rating_average, my_rating: rating.my_rating }
      : record
  })

  return {
    records,
    holidays: holidaysResult.data || [],
  }
}

export async function fetchProfilesByIds(userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds))

  if (uniqueUserIds.length === 0) {
    return new Map<string, ProfileSummary>()
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', uniqueUserIds)
    .returns<ProfileSummary[]>()

  if (error) throw error

  return new Map((profiles || []).map((profile) => [profile.id, profile]))
}

function formatRecordedAt(createdAt: string) {
  return new Date(createdAt)
    .toLocaleString('hu-HU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(/-/g, '.')
}

export function buildMealDayDataRange(
  startDate: Date,
  endDate: Date,
  records: MealRecordRow[],
  holidays: HolidayRow[],
  profilesById: Map<string, ProfileSummary>
) {
  const holidaysMap = new Map(holidays.map((holiday) => [holiday.date, holiday.name]))
  const recordsMap = new Map(records.map((record) => [record.date, record]))
  const days: MealDayData[] = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dateStr = formatDateOnly(currentDate)
    const record = recordsMap.get(dateStr)
    const holidayName = holidaysMap.get(dateStr)

    let status: FoodStatus = 'empty'
    let food: string | undefined
    let reason: string | undefined
    let mealImageUrl: string | undefined
    let recordedBy: string | undefined
    let recordedByUserId: string | undefined
    let recordedAt: string | undefined
    let team: TeamCode | undefined

    if (record) {
      status = record.had_meal ? 'volt' : 'nem'
      food = record.meal_name || undefined
      mealImageUrl = record.meal_image_url || undefined
      reason = record.reason || undefined
      recordedByUserId = record.recorded_by
      team = (record.team as TeamCode) || undefined

      const profile = profilesById.get(record.recorded_by)
      recordedBy = profile?.full_name || profile?.email?.split('@')[0] || 'Ismeretlen'
      recordedAt = formatRecordedAt(record.created_at)
    }

    days.push({
      date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
      recordId: record?.id,
      status,
      food,
      mealImageUrl,
      reason,
      recordedBy,
      recordedByUserId,
      recordedAt,
      team,
      ratingAverage: record?.rating_average,
      ratingCount: record?.rating_count || 0,
      ratingSum: record?.rating_sum || 0,
      myRating: record?.my_rating,
      isHoliday: Boolean(holidayName),
      holidayName,
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return days
}

export function buildStatsDayRange(
  startDate: Date,
  endDate: Date,
  records: MealRecordRow[],
  holidays: HolidayRow[]
) {
  const holidaysMap = new Map(holidays.map((holiday) => [holiday.date, holiday.name]))
  const recordsMap = new Map(records.map((record) => [record.date, record]))
  const days: StatsCalendarDay[] = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dateStr = formatDateOnly(currentDate)
    const record = recordsMap.get(dateStr)
    const holidayName = holidaysMap.get(dateStr)

    days.push({
      date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
      status: record ? (record.had_meal ? 'volt' : 'nem') : 'empty',
      team: (record?.team as TeamCode) || undefined,
      ratingAverage: record?.rating_average,
      ratingCount: record?.rating_count || 0,
      ratingSum: record?.rating_sum || 0,
      isHoliday: Boolean(holidayName),
      holidayName,
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return days
}
