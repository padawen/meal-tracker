import { expect, it } from 'vitest'
import { thumbnailPixels } from '../supabase/functions/migrate-meal-photos/thumbnail'

it('downsamples pixels and preserves the image aspect ratio without enlarging it', () => {
  const data = new Uint8Array(800 * 400 * 4).fill(255)
  const resized = thumbnailPixels({ width: 800, height: 400, data })
  expect([resized.width, resized.height]).toEqual([384, 192])
  expect(resized.data.every(value => value === 255)).toBe(true)
  expect(thumbnailPixels({ width: 2, height: 1, data: new Uint8Array(8).fill(128) }).width).toBe(2)
})
