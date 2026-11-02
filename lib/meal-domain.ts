import { supabase } from '@/lib/supabase/client'
import { formatDateOnly } from '@/lib/utils'
import { MEAL_IMAGE_BUCKET, MEAL_IMAGE_URL_TTL, mealImageObjectPath, type MealImageVariant } from './meal-image-storage'

export type FoodStatus = 'volt' | 'nem' | 'empty'
export type TeamCode = 'A' | 'B'
export const MEAL_TRACKING_START = new Date(2026, 0, 1)

export interface MealDayData {
  date: Date
  recordId?: string
  status: FoodStatus
  food?: string
  hasImage?: boolean
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
  has_image: boolean
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
  id?: string
  date: string
  name: string
}

export interface ProfileSummary {
  id: string
  full_name: string | null
  email: string
  avatar_url?: string | null
}

// Photo payloads never belong in calendar/statistics responses.
export const MEAL_SUMMARY_COLUMNS = 'id,date,had_meal,meal_name,reason,recorded_by,created_at,team'
const PAGE_SIZE = 200

async function fetchMealSummaries(start: string, end: string) {
  const records: MealRecordRow[] = []
  let cursor: string | undefined
  while (true) {
    let query = supabase.from('meal_records').select(MEAL_SUMMARY_COLUMNS)
      .gte('date', start).lte('date', end).order('date').limit(PAGE_SIZE)
    if (cursor) query = query.gt('date', cursor)
    const { data, error } = await query
    if (error) throw error
    const page = data || []
    records.push(...page.map((record) => ({ ...record, has_image: false })))
    if (page.length < PAGE_SIZE) break
    cursor = page[page.length - 1].date
  }
  return records
}

async function fetchImageDates(start: string, end: string) {
  const dates = new Set<string>()
  let cursor: string | undefined
  while (true) {
    let query = supabase.from('meal_records').select('id,date')
      .gte('date', start).lte('date', end)
      .or('meal_image_path.not.is.null,and(meal_image_url.not.is.null,meal_image_url.neq.)')
      .order('date').limit(PAGE_SIZE)
    if (cursor) query = query.gt('date', cursor)
    const { data, error } = await query
    if (error) throw error
    const page = data || []
    page.forEach((record) => dates.add(record.date))
    if (page.length < PAGE_SIZE) break
    cursor = page[page.length - 1].date
  }
  return dates
}

async function fetchHolidays(start: string, end: string) {
  const rows: HolidayRow[] = []
  let cursor: string | undefined
  while (true) {
    let query = supabase.from('holidays').select('id,date,name')
      .gte('date', start).lte('date', end).order('date').limit(PAGE_SIZE)
    if (cursor) query = query.gt('date', cursor)
    const { data, error } = await query
    if (error) throw error
    const page = data || []
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
    cursor = page[page.length - 1].date
  }
  return rows
}

export async function fetchMealRangeData(startDate: Date, endDate: Date) {
  const start = formatDateOnly(startDate)
  const end = formatDateOnly(endDate)
  const [records, holidays, imageDates] = await Promise.all([
    fetchMealSummaries(start, end), fetchHolidays(start, end), fetchImageDates(start, end),
  ])
  // Bound RPC responses too, so a multi-year range cannot silently hit the API row cap.
  const ratings: MealRatingSummary[] = []
  for (let offset = 0; offset < records.length; offset += PAGE_SIZE) {
    const page = records.slice(offset, offset + PAGE_SIZE)
    const { data, error } = await supabase.rpc('get_meal_rating_summaries', {
      p_start_date: page[0].date, p_end_date: page[page.length - 1].date,
    }).returns<MealRatingSummary[]>()
    if (error) throw error
    ratings.push(...(data || []))
  }
  const ratingsById = new Map(ratings.map((rating) => [rating.meal_record_id, rating]))
  return {
    records: records.map((record) => {
      const rating = ratingsById.get(record.id)
      return {
        ...record, has_image: imageDates.has(record.date),
        rating_sum: rating?.rating_sum || 0, rating_count: rating?.rating_count || 0,
        rating_average: rating?.rating_average ?? null, my_rating: rating?.my_rating ?? null,
      }
    }),
    holidays,
  }
}

export async function fetchMealNeighbor(date: string, direction: 'previous' | 'next', voting: boolean) {
  let query = supabase.from('meal_records').select('id,date').eq('had_meal', true)
    .gte('date', formatDateOnly(MEAL_TRACKING_START))
    .lte('date', formatDateOnly(new Date()))
  if (!voting) query = query.or('meal_image_path.not.is.null,and(meal_image_url.not.is.null,meal_image_url.neq.)')
  query = direction === 'previous' ? query.lt('date', date) : query.gt('date', date)
  const { data, error } = await query.order('date', { ascending: direction === 'next' }).limit(1).maybeSingle()
  if (error) throw error
  return data
}

export async function fetchLatestVotingMeal() {
  const { data, error } = await supabase.from('meal_records').select('id,date')
    .eq('had_meal', true).gte('date', formatDateOnly(MEAL_TRACKING_START))
    .lte('date', formatDateOnly(new Date())).order('date', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  return data
}

export async function fetchMealImage(recordId: string, variant: MealImageVariant = 'full') {
  const { data: image, error: pathError } = await supabase.from('meal_records').select('meal_image_path')
    .eq('id', recordId).maybeSingle()
  if (pathError) throw pathError
  if (image?.meal_image_path) {
    const { data, error } = await supabase.storage.from(MEAL_IMAGE_BUCKET)
      .createSignedUrl(mealImageObjectPath(image.meal_image_path, variant), MEAL_IMAGE_URL_TTL)
    if (error) throw error
    if (!data?.signedUrl) throw new Error('Nem sikerült betölteni a képet')
    return data.signedUrl
  }
  // During rollout the old application still reads this field. Never select it
  // for migrated records: it can contain hundreds of kilobytes of base64.
  const { data, error } = await supabase.from('meal_records').select('meal_image_url')
    .eq('id', recordId).maybeSingle()
  if (error) throw error
  return data?.meal_image_url || null
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
    let recordedBy: string | undefined
    let recordedByUserId: string | undefined
    let recordedAt: string | undefined
    let team: TeamCode | undefined

    if (record) {
      status = record.had_meal ? 'volt' : 'nem'
      food = record.meal_name || undefined
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
      hasImage: record?.has_image ?? false,
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
