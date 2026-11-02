import { describe, expect, it, vi } from 'vitest'
import { MealCache, missingRanges, type MealRangeResult } from '@/lib/meal-cache'
import type { MealRecordRow } from '@/lib/meal-domain'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}
const range = (start: string, end = start) => ({ start, end })
const record: MealRecordRow = { id: 'one', date: '2026-11-02', had_meal: true, meal_name: 'Leves',
  has_image: true, reason: null, recorded_by: 'user', created_at: '2026-11-02T12:00:00Z', team: 'A' }
const result = (records = [record]): MealRangeResult => ({ records, holidays: [], profiles: new Map() })

describe('canonical metadata cache', () => {
  it('keeps disjoint gaps unknown and handles local calendar boundaries', () => {
    expect(missingRanges(range('2026-10-24', '2026-10-28'), [range('2026-10-24'), range('2026-10-26', '2026-10-28')]))
      .toEqual([range('2026-10-25')])
  })
  it('deduplicates overlapping requests, without marking partial totals ready', async () => {
    const first = deferred<MealRangeResult>()
    const fetch = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(result([]))
    const cache = new MealCache(fetch)
    const a = cache.ensure(range('2026-11-02', '2026-11-08'))
    const b = cache.ensure(range('2026-11-01', '2026-11-08'))
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(cache.status(range('2026-11-01', '2026-11-08'))).toBe('loading')
    first.resolve(result())
    await Promise.all([a, b])
    expect(fetch.mock.calls.map(([part]) => part)).toEqual([range('2026-11-02', '2026-11-08'), range('2026-11-01')])
    expect(cache.status(range('2026-11-01', '2026-11-08'))).toBe('ready')
    expect(cache.getSnapshot().records).toEqual([record])
  })
  it('exposes a recoverable error and only completes a successful retry', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(result())
    const cache = new MealCache(fetch)
    await expect(cache.ensure(range(record.date))).rejects.toThrow('offline')
    expect(cache.status(range(record.date))).toBe('error')
    await cache.ensure(range(record.date))
    expect(cache.status(range(record.date))).toBe('ready')
  })
  it('does not overwrite a newer save or deletion with an older range response', async () => {
    const pending = deferred<MealRangeResult>()
    const cache = new MealCache(() => pending.promise)
    const loading = cache.ensure(range(record.date))
    cache.update(record.date, { ...record, meal_name: 'Új étel' })
    pending.resolve(result())
    await loading
    expect(cache.getSnapshot().records[0].meal_name).toBe('Új étel')
    const refresh = deferred<MealRangeResult>()
    const second = new MealCache(() => refresh.promise)
    const waiting = second.ensure(range(record.date))
    second.update(record.date, null)
    refresh.resolve(result())
    await waiting
    expect(second.getSnapshot().records).toEqual([])
  })
  it('uses the latest refresh even when responses arrive out of order', async () => {
    const old = deferred<MealRangeResult>()
    const fresh = deferred<MealRangeResult>()
    const cache = new MealCache(vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise))
    const a = cache.refresh(record.date)
    const b = cache.refresh(record.date)
    fresh.resolve(result([{ ...record, rating_count: 2 }]))
    await b
    old.resolve(result([{ ...record, rating_count: 1 }]))
    await a
    expect(cache.getSnapshot().records[0].rating_count).toBe(2)
  })
})
