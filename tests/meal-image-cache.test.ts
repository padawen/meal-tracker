import { describe, expect, it, vi } from 'vitest'
import { MealImageCache } from '@/lib/meal-image-cache'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

describe('photo cache', () => {
  it('keeps thumbnails independent from full images and invalidates both on replacement', async () => {
    const fetch = vi.fn(async (id: string, variant: string) => `${id}:${variant}`)
    const cache = new MealImageCache(fetch)
    await cache.load('a', 1, 'thumbnail')
    await cache.load('a', 0, 'full')
    expect(cache.get('a', 'thumbnail')).toEqual({ status: 'ready', url: 'a:thumbnail' })
    expect(cache.get('a')).toEqual({ status: 'ready', url: 'a:full' })
    cache.invalidate('a')
    expect(cache.get('a', 'thumbnail').status).toBe('idle')
    expect(cache.get('a').status).toBe('idle')
  })
  it('refreshes signed URLs before expiry instead of returning stale cached URLs', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_000)
    const cache = new MealImageCache(async () => 'signed-photo')
    await cache.load('a')
    clock.mockReturnValue(1_000 + 15 * 60 * 1_000 + 1)
    expect(cache.get('a').status).toBe('idle')
    await cache.load('a')
    expect(cache.get('a')).toEqual({ status: 'ready', url: 'signed-photo' })
    clock.mockRestore()
  })
  it('deduplicates a selected photo and limits downloads to two', async () => {
    const a = deferred<string>(), b = deferred<string>(), c = deferred<string>()
    const fetch = vi.fn().mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise).mockReturnValueOnce(c.promise)
    const cache = new MealImageCache(fetch)
    const first = cache.load('a')
    expect(cache.load('a')).toBe(first)
    const second = cache.load('b')
    const third = cache.load('c')
    expect(fetch).toHaveBeenCalledTimes(2)
    a.resolve('photo-a')
    await first
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(3))
    b.resolve('photo-b'); c.resolve('photo-c')
    await Promise.all([second, third])
  })
  it('keeps twelve settled payloads and reuses a cached photo', async () => {
    const fetch = vi.fn(async (id: string) => `photo-${id}`)
    const cache = new MealImageCache(fetch)
    for (let i = 0; i < 12; i++) await cache.load(String(i))
    await cache.load('0')
    await cache.load('12')
    expect(cache.get('0').status).toBe('ready')
    expect(cache.get('1').status).toBe('idle')
    expect(fetch).toHaveBeenCalledTimes(13)
  })
  it('does not restore a replaced/deleted image from a stale response', async () => {
    const old = deferred<string>()
    const cache = new MealImageCache(() => old.promise)
    const loading = cache.load('a')
    cache.seed('a', 'replacement')
    old.resolve('old-photo')
    await loading
    expect(cache.get('a')).toEqual({ status: 'ready', url: 'replacement' })
    cache.invalidate('a')
    expect(cache.get('a').status).toBe('idle')
  })
  it('distinguishes a missing photo from an error and supports retry', async () => {
    const cache = new MealImageCache(vi.fn().mockRejectedValueOnce(new Error()).mockResolvedValueOnce(null))
    await cache.load('a')
    expect(cache.get('a').status).toBe('error')
    await cache.load('a')
    expect(cache.get('a')).toEqual({ status: 'ready', url: null })
  })
})
