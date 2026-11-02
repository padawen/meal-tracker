import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchMealRangeData } from '@/lib/meal-domain'

const mock = vi.hoisted(() => ({ calls: [] as { table: string; select: string; limit: number }[], rpc: vi.fn() }))
const fixtures = Array.from({ length: 201 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10)
  return { id: `meal-${index}`, date, had_meal: true, meal_name: 'Leves', reason: null,
    recorded_by: 'user', created_at: `${date}T12:00:00Z`, team: 'A', meal_image_url: 'data:image/png;base64,PHOTO_PAYLOAD' }
})
vi.mock('@/lib/supabase/client', () => ({ supabase: {
  from: (table: string) => {
    let columns = '', limit = 1000
    const filters: ((row: Record<string, unknown>) => boolean)[] = []
    const query = {
      select: (value: string) => { columns = value; return query },
      gte: (key: string, value: string) => { filters.push((row) => String(row[key]) >= value); return query },
      lte: (key: string, value: string) => { filters.push((row) => String(row[key]) <= value); return query },
      gt: (key: string, value: string) => { filters.push((row) => String(row[key]) > value); return query },
      eq: (key: string, value: string) => { filters.push((row) => row[key] === value); return query },
      not: () => query, neq: () => query, or: () => query, order: () => query,
      limit: (value: number) => { limit = value; return query },
      then: (resolve: (value: unknown) => unknown) => {
        mock.calls.push({ table, select: columns, limit })
        const rows = table === 'holidays' ? fixtures.map((row) => ({ date: row.date, name: 'Szünnap' })) : fixtures
        const data = rows.filter((row) => filters.every((filter) => filter(row))).slice(0, limit)
          .map((row) => Object.fromEntries(columns.split(',').map((column) => [column, (row as Record<string, unknown>)[column]])))
        return Promise.resolve({ data, error: null }).then(resolve)
      },
    }
    return query
  },
  rpc: (...args: unknown[]) => ({ returns: () => mock.rpc(...args) }),
} }))

beforeEach(() => {
  mock.calls.length = 0
  mock.rpc.mockReset().mockImplementation(async (_name: string, range: { p_start_date: string; p_end_date: string }) => ({
    data: fixtures.filter((row) => row.date >= range.p_start_date && row.date <= range.p_end_date)
      .map((row) => ({ meal_record_id: row.id, rating_sum: 4, rating_count: 1, rating_average: 4, my_rating: 4 })), error: null,
  }))
})
describe('meal data request boundaries', () => {
  it('pages records, image presence and holidays at 200 without fetching photo payloads', async () => {
    const result = await fetchMealRangeData(new Date(2026, 0, 1), new Date(2026, 11, 31))
    expect(result.records).toHaveLength(201)
    expect(result.holidays).toHaveLength(201)
    expect(result.records.every((row) => row.has_image && row.my_rating === 4)).toBe(true)
    expect(JSON.stringify(result)).not.toContain('PHOTO_PAYLOAD')
    expect(mock.calls.every((call) => call.limit === 200 && !call.select.includes('meal_image_url') && call.select !== '*')).toBe(true)
    expect(mock.calls.filter((call) => call.select === 'id,date')).toHaveLength(2)
    expect(mock.rpc).toHaveBeenCalledTimes(2)
  })
})
