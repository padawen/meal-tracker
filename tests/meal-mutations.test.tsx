import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { MealCache } from '@/lib/meal-cache'
import { MealImageCache } from '@/lib/meal-image-cache'
import type { MealRecordRow } from '@/lib/meal-domain'
import { useMealTableMutations } from '@/components/meal-table/useMealTableMutations'

const mocks = vi.hoisted(() => ({ context: null as unknown, save: vi.fn(), remove: vi.fn(), rate: vi.fn() }))
vi.mock('@/components/meal-table/MealDataContext', () => ({ useMealDataContext: () => mocks.context }))
vi.mock('@/app/actions/meal-actions', () => ({ saveMealAction: mocks.save, deleteMealAction: mocks.remove, saveMealRatingAction: mocks.rate }))
const row: MealRecordRow = { id: 'one', date: '2026-11-02', had_meal: true, has_image: true, meal_name: 'Leves',
  reason: null, recorded_by: 'user', created_at: '2026-11-02T10:00:00Z', team: 'A', rating_count: 0, rating_sum: 0, my_rating: null }
const day = { date: new Date(2026, 10, 2), recordId: row.id, status: 'volt' as const, hasImage: true }
let cache: MealCache
let images: MealImageCache
beforeEach(async () => {
  cache = new MealCache(async () => ({ records: [row], holidays: [], profiles: new Map() }))
  images = new MealImageCache(async () => 'original-photo')
  await cache.ensure({ start: row.date, end: row.date })
  images.seed(row.id, 'original-photo')
  vi.spyOn(cache, 'refresh').mockResolvedValue()
  mocks.context = { cache, images }
  mocks.save.mockReset().mockResolvedValue({ success: true, recordId: row.id, timestamp: row.created_at })
  mocks.remove.mockReset().mockResolvedValue({ success: true })
  mocks.rate.mockReset().mockResolvedValue({ success: true })
})
const options = () => ({ userId: 'user', toast: vi.fn(), setSelectedDay: vi.fn() })
it('replaces/removes photos and updates the canonical calendar/statistics record on save', async () => {
  const { result } = renderHook(() => useMealTableMutations(options()))
  await act(async () => { await result.current.handleSave(day, true, 'Új étel', 'B', 'new-photo') })
  expect(cache.getSnapshot().records[0]).toMatchObject({ meal_name: 'Új étel', team: 'B', has_image: true })
  expect(images.get(row.id)).toEqual({ status: 'ready', url: 'new-photo' })
  await act(async () => { await result.current.handleSave(day, false, 'Szünnap', 'B') })
  expect(cache.getSnapshot().records[0]).toMatchObject({ had_meal: false, has_image: false, reason: 'Szünnap' })
  expect(images.get(row.id)).toEqual({ status: 'ready', url: null })
})
it('deletes the canonical record and invalidates its photo', async () => {
  const { result } = renderHook(() => useMealTableMutations(options()))
  await act(async () => { await result.current.handleDelete(day) })
  expect(cache.getSnapshot().records).toEqual([])
  expect(images.get(row.id).status).toBe('idle')
})
it('does not count a vote twice when Realtime beats the server acknowledgement', async () => {
  let acknowledge!: (value: unknown) => void
  mocks.rate.mockImplementation(() => new Promise((done) => { acknowledge = done }))
  const { result } = renderHook(() => useMealTableMutations(options()))
  let rating!: Promise<void>
  act(() => { rating = result.current.handleRate(day, 4) })
  await waitFor(() => expect(mocks.rate).toHaveBeenCalled())
  cache.update(row.date, { rating_count: 1, rating_sum: 4, rating_average: 4, my_rating: 4 })
  await act(async () => { acknowledge({ success: true }); await rating })
  expect(cache.getSnapshot().records[0]).toMatchObject({ rating_count: 1, rating_sum: 4, my_rating: 4 })
})
