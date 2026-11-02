import { beforeEach, expect, it, vi } from 'vitest'
import { fetchMealImage } from '@/lib/meal-domain'

const mock = vi.hoisted(() => ({ columns: [] as string[], path: null as string | null, legacy: null as string | null, sign: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ supabase: {
  from: () => ({ select: (columns: string) => {
    mock.columns.push(columns)
    return { eq: () => ({ maybeSingle: async () => ({ data: columns === 'meal_image_path' ? { meal_image_path: mock.path } : { meal_image_url: mock.legacy }, error: null }) }) }
  } }),
  storage: { from: (bucket: string) => ({ createSignedUrl: (...args: unknown[]) => mock.sign(bucket, ...args) }) },
} }))
const path = '11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222'
beforeEach(() => {
  mock.columns.length = 0
  mock.path = path
  mock.legacy = 'data:image/jpeg;base64,LEGACY_PAYLOAD'
  mock.sign.mockReset().mockResolvedValue({ data: { signedUrl: 'https://private.example/signed-photo' }, error: null })
})
it('signs only the requested thumbnail without downloading the legacy full photo', async () => {
  expect(await fetchMealImage('record', 'thumbnail')).toBe('https://private.example/signed-photo')
  expect(mock.sign).toHaveBeenCalledWith('meal-photos', `${path}/thumbnail.jpg`, 1200)
  expect(mock.columns).toEqual(['meal_image_path'])
})
it('still reads an unmigrated legacy photo', async () => {
  mock.path = null
  expect(await fetchMealImage('record')).toBe(mock.legacy)
  expect(mock.sign).not.toHaveBeenCalled()
})
it('does not fall back to a large legacy payload when signing fails', async () => {
  mock.sign.mockResolvedValue({ data: null, error: new Error('denied') })
  await expect(fetchMealImage('record')).rejects.toThrow('denied')
  expect(mock.columns).toEqual(['meal_image_path'])
})
